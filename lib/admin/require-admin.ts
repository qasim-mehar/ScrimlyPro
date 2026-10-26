import { notFound } from "next/navigation";

import { assertSameOrigin } from "@/lib/auth/origin-guard";
import { isPlatformAdmin } from "@/lib/auth/platform-role";
import { getAuthedUser, type AuthedUser } from "@/lib/supabase/server";

/**
 * Admin gate (Lane C brief rule 3): server-verified identity (getAuthedUser,
 * which validates the JWT with the auth server) PLUS the role read from the
 * `profiles` table INSIDE this request (isPlatformAdmin — the single shared
 * predicate in lib/auth/platform-role.ts). The role never comes from a
 * cookie, header, claim, or client state.
 *
 * Failure is a 404 — never 403, never a redirect, never an explanatory
 * body — so /admin is indistinguishable from a route that does not exist
 * (no existence leak). `notFound()` throws Next's own 404 fallback, which
 * renders the standard not-found page for pages/actions and serves a plain
 * 404 for route handlers.
 *
 * REAL identity only: getAuthedUser (not getEffectiveUser) — an active
 * impersonation session must NEVER reach /admin or act as the admin, even
 * though the browser technically holds the admin's auth session.
 */

export const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

/**
 * Pages + server actions. Returns the REAL admin identity or renders the
 * standard 404 (same UI as any missing route, no explanation).
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user || !(await isPlatformAdmin(user.id))) notFound();
  return user;
}

/**
 * Route handlers. Adds the same-origin assertion FIRST — a cross-origin
 * probe gets the identical 404, so even the origin guard's existence is
 * not observable. Returns the REAL admin identity or serves a 404.
 */
export async function requireAdminApi(req: Request): Promise<AuthedUser> {
  if (!assertSameOrigin(req)) notFound();
  const user = await getAuthedUser();
  if (!user || !(await isPlatformAdmin(user.id))) notFound();
  return user;
}
