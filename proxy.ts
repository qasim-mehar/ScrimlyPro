import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicPath } from "@/lib/auth/public-paths";
import { sanitizeNext } from "@/lib/auth/next-url";

/**
 * Next 16 proxy (the renamed middleware convention) — convenience layer ONLY:
 * - refreshes auth tokens on every request,
 * - redirects unauthenticated page requests to /login?next=<sanitized>.
 *
 * It NEVER authorizes: every page that renders tenant data re-checks auth
 * server-side, and every /api/* route independently enforces its own guard
 * (401 JSON), per the defense-in-depth law in the M1 brief.
 *
 * Edge-safe: imports nothing from drizzle/postgres or the DB layer.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Misconfigured deployment: fail closed for everything but the public
    // surface and static assets rather than leaking tenant pages.
    const { pathname } = request.nextUrl;
    if (!isPublicPath(pathname)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validates the JWT with the auth server (not just cookie decoding).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isApi = pathname === "/api" || pathname.startsWith("/api/");

  if (!user && !isPublicPath(pathname) && !isApi) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    const next = sanitizeNext(pathname + search) ?? "/";
    redirect.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  // Exclude only static assets. /api/* is deliberately INCLUDED: the proxy
  // refreshes tokens there but never grants access — routes re-check auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff|woff2)$).*)",
  ],
};
