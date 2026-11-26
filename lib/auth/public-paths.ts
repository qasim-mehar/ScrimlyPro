/**
 * Single source of truth for the public (session-less) surface.
 *
 * PAGES below are reachable without a session — the proxy redirects everything
 * else to /login. API routes are deliberately NOT listed here: every /api/*
 * route independently re-checks auth (defense in depth); the proxy never
 * grants API access, it only refreshes tokens there.
 *
 * The single exception is the liveness health endpoint (PUBLIC_API_PATHS): it
 * must answer even when the auth env is misconfigured — exactly the moment a
 * health check matters — so the proxy's fail-closed branch lets it through.
 */
export const PUBLIC_PAGES = [
  // Public marketing landing: anonymous visitors see app/page.tsx;
  // authenticated users are role-redirected by that page. Tenant pages and
  // every /api/* route stay guarded exactly as before.
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/error",
  // M2 (Lane B): public share + invite surfaces. Both are server-guarded in
  // their own right — /invite/[token] redirects anonymous users to login
  // before any state change, and /share/[token] renders only the token's
  // public standings projection (no auth, no tenant data).
  "/invite",
  "/share",
] as const;

/** Exact-match public API paths. Liveness only — never tenant data.
 *  Matching is EXACT (never prefix): a new public API path must be added
 *  here explicitly and will never match by accident. */
export const PUBLIC_API_PATHS = ["/api/health"] as const;

export function isPublicPath(pathname: string): boolean {
  if ((PUBLIC_API_PATHS as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}
