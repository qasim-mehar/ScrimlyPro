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
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}
