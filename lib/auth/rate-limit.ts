/**
 * In-memory sliding-window rate limiter with an injectable clock (tests).
 *
 * M1 scope: single-instance only (resets on restart, not shared across
 * replicas). Documented spoofing caveat: the IP key trusts x-forwarded-for /
 * x-real-ip headers, which a direct client can forge — durable per-IP limits
 * move to Redis in M4. Never log the key material of auth failures.
 */
export type RateLimitRule = { windowMs: number; max: number };

export const RATE_LIMITS = {
  signup: { windowMs: 3_600_000, max: 5 },
  login: { windowMs: 900_000, max: 15 },
  forgot: { windowMs: 3_600_000, max: 5 },
  reset: { windowMs: 3_600_000, max: 10 },
  api: { windowMs: 60_000, max: 120 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitKind = keyof typeof RATE_LIMITS;

const MAX_BUCKETS = 10_000;

export class SlidingWindowRateLimiter {
  private buckets = new Map<string, number[]>();

  constructor(
    private rule: RateLimitRule,
    private now: () => number = Date.now,
  ) {}

  /** Records the hit when under the limit; reports Retry-After when hit. */
  check(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
    const t = this.now();
    const windowStart = t - this.rule.windowMs;

    if (this.buckets.size > MAX_BUCKETS) this.sweep(windowStart);

    const hits = (this.buckets.get(key) ?? []).filter((ts) => ts > windowStart);
    if (hits.length >= this.rule.max) {
      const oldest = hits[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + this.rule.windowMs - t) / 1000),
      );
      return { ok: false, retryAfterSeconds };
    }
    hits.push(t);
    this.buckets.set(key, hits);
    return { ok: true };
  }

  /** Drops stale buckets so memory stays bounded. */
  private sweep(windowStart: number) {
    for (const [key, hits] of this.buckets) {
      const alive = hits.filter((ts) => ts > windowStart);
      if (alive.length === 0) this.buckets.delete(key);
      else this.buckets.set(key, alive);
    }
  }
}

/**
 * Per-kind limiters keyed by client IP (x-forwarded-for first hop, then
 * x-real-ip, then "unknown"). The api kind is keyed by user id instead —
 * see lib/auth/route-guard.ts (WP6).
 */
const limiters = new Map<RateLimitKind, SlidingWindowRateLimiter>(
  Object.entries(RATE_LIMITS).map(([kind, rule]) => [
    kind as RateLimitKind,
    new SlidingWindowRateLimiter(rule),
  ]),
);

export function clientIpKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(
  kind: RateLimitKind,
  req: Request,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  return limiters.get(kind)!.check(clientIpKey(req));
}

/** Test hook: replace the limiter for a kind (injectable clock). */
export function setRateLimiterForTests(
  kind: RateLimitKind,
  limiter: SlidingWindowRateLimiter,
) {
  limiters.set(kind, limiter);
}
