import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sanitizeNextOr } from "@/lib/auth/next-url";

/**
 * PKCE exchange for signup-confirmation and password-recovery links.
 * On success: cookie session established, redirect to sanitized `next` or "/".
 * On failure: redirect to /auth/error?reason=<whitelisted code> — never echo
 * the raw provider error back into the URL.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/error?reason=missing_code", requestUrl.origin),
    );
  }

  try {
    // Response is created up front (before the client) so the cookie sink
    // exists whenever the library flushes cookies during the exchange.
    const target = new URL(sanitizeNextOr(rawNext, "/"), requestUrl.origin);
    const response = NextResponse.redirect(target);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookies(request.headers.get("cookie"));
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/auth/error?reason=exchange_failed", requestUrl.origin),
      );
    }
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/auth/error?reason=unexpected", requestUrl.origin),
    );
  }
}

function parseCookies(header: string | null): Array<{
  name: string;
  value: string;
}> {
  if (!header) return [];
  return header.split(";").flatMap((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return [];
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    return name ? [{ name, value }] : [];
  });
}
