import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client (route handlers + server components).
 * Cookie storage is wired through next/headers; token refresh happens in the
 * proxy. Authorization identity ALWAYS comes from supabase.auth.getUser()
 * (see getAuthedUser) — never getSession().
 */
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase env is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component render — cookies are read-only
          // there. Token refresh is handled by the proxy client instead.
        }
      },
    },
  });
}

export type AuthedUser = { id: string; email: string | null };

/**
 * The ONLY source of authorization identity in the app. Validates the JWT
 * with the auth server (getUser) — never trusts session cookies alone.
 * Returns null for missing/invalid/expired sessions.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
