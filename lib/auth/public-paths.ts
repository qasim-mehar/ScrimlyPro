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
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/error",
] as const;

/** Exact-match public API paths. Liveness only — never tenant data. */
export const PUBLIC_API_PATHS = ["/api/health"] as const;

export function isPublicPath(pathname: string): boolean {
  if ((PUBLIC_API_PATHS as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}
