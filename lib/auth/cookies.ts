import type { CookieOptions } from "@supabase/ssr";

/**
 * Single source of truth for auth cookie attributes (server client + proxy).
 * HttpOnly: browser JS can never read the session token (XSS hardening).
 * Secure:   HTTPS-only transport in production (dev over http still works).
 * SameSite Lax: CSRF baseline for top-level navigations.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};
