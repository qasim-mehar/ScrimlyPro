/**
 * Open-redirect guard for `next`-style redirect parameters (login, signup,
 * password reset, auth callback). Accepts ONLY same-origin relative paths.
 * Unit-tested against the attack list in the M1 brief (Appendix A / G6).
 */
const MAX_LEN = 512;

// First path segment allowlist — everything routable in the app. `next` values
// pointing anywhere else can never be a legitimate in-app destination.
const FIRST_SEGMENTS = new Set([
  "",
  "sessions",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "auth",
  "dev",
]);

function hasControlChars(s: string): boolean {
  return /[\x00-\x1f\x7f]/.test(s);
}

/**
 * Returns a safe in-app path, or null when `raw` is anything else.
 * Callers fall back to "/" (or the login page) on null.
 */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length > MAX_LEN) return null;
  if (hasControlChars(raw)) return null;
  if (!raw.startsWith("/")) return null; // no scheme-relative, no absolute URLs
  if (raw.startsWith("//")) return null; // protocol-relative //evil.com
  if (raw.startsWith("/\\")) return null; // /\evil.com (backslash browsers treat as slash)
  if (raw.includes("\\")) return null; // any backslash at all
  if (raw.includes("://")) return null; // embedded scheme
  // Percent-encoded slash/backslash variants are rejected outright.
  if (/%2f|%5c/i.test(raw)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null; // malformed escapes
  }
  if (decoded !== raw) {
    if (hasControlChars(decoded)) return null;
    if (decoded.includes("//") || decoded.includes("\\")) return null;
    if (!decoded.startsWith("/")) return null;
    if (decoded.includes("://")) return null;
  }
  const path = decoded === raw ? raw : decoded;
  const segment = path.slice(1).split("/")[0].split("?")[0].toLowerCase();
  if (!FIRST_SEGMENTS.has(segment)) return null;
  return path;
}

/** Fallback helper: sanitize or default. */
export function sanitizeNextOr(raw: string | null | undefined, fallback: string): string {
  return sanitizeNext(raw) ?? fallback;
}
