import process from "node:process";

/**
 * Absolute-origin resolution for links we hand back once (invite links,
 * share links). Same anti-phishing order as the recovery-link flow
 * (app/api/auth/forgot-password/route.ts):
 *   1. APP_ORIGIN env — the configured public origin (production);
 *   2. forwarded host headers, ONLY in dev and only for localhost;
 *   3. the request URL origin as last resort.
 */
export function appOriginFromRequest(req: Request): string {
  const envOrigin = process.env.APP_ORIGIN;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    const host =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host?.startsWith("localhost")) return `http://${host}`;
  }
  return new URL(req.url).origin;
}
