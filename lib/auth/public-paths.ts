/**
 * Single source of truth for the public (session-less) surface.
 *
 * PAGES below are reachable without a session — the proxy redirects everything
 * else to /login. API routes are deliberately NOT listed here: every /api/*
 * route independently re-checks auth (defense in depth); the proxy never
 * grants API access, it only refreshes tokens there.
 */
export const PUBLIC_PAGES = [
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

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}
