/**
 * Same-origin guard for state-changing API requests (POST/PUT/PATCH/DELETE).
 * A mismatching or (in production) missing Origin header → reject with 403
 * and no detail leakage.
 *
 * Missing-Origin policy: browser cross-site form posts DO send Origin, so a
 * state-changing request without Origin is not a browser — allowed only in
 * non-production AND with the explicit `x-scrimly-no-origin-test: 1` header
 * (curl-based verification suites). In production, missing Origin = 403.
 */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TEST_NO_ORIGIN_HEADER = "x-scrimly-no-origin-test";

export function assertSameOrigin(req: Request): boolean {
  if (!UNSAFE_METHODS.has(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) {
    if (
      process.env.NODE_ENV !== "production" &&
      req.headers.get(TEST_NO_ORIGIN_HEADER) === "1"
    ) {
      return true;
    }
    return false;
  }
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    const originHost = new URL(origin).host;
    // Host header may include the port (localhost:3042); exact match required.
    if (originHost === host) return true;
    // Local dev: any localhost/127.0.0.1 port pair is same-machine.
    if (
      process.env.NODE_ENV !== "production" &&
      (originHost.startsWith("localhost:") ||
        originHost.startsWith("127.0.0.1:") ||
        originHost === "localhost" ||
        originHost === "127.0.0.1") &&
      (host.startsWith("localhost:") ||
        host.startsWith("127.0.0.1:") ||
        host === "localhost" ||
        host === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
