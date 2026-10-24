import packageJson from "../../../package.json";
import { noStore } from "@/lib/http";

/**
 * Liveness-only health endpoint — the ONE intentionally public API route.
 *
 * Public by design: uptime monitors and hosting platforms probe it without a
 * session. Registered in PUBLIC_API_PATHS (lib/auth/public-paths.ts).
 *
 * Rate-limit exempt by design: health checks are high-frequency, fixed-source
 * GETs — rate limiting them would turn a monitoring interval into an outage
 * signal. GET is also a safe method, so the origin guard never applies.
 *
 * Leaks nothing: a constant body of `status` + the app version (from
 * package.json). No DB ping, no DSNs, no user counts, no uptime internals —
 * a DB-coupled check is a READINESS probe and belongs to the platform's
 * own checks (added later at the hosting layer), not to a public endpoint.
 */
export async function GET() {
  return noStore({ status: "ok", version: packageJson.version });
}
