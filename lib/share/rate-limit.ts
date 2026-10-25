import { SlidingWindowRateLimiter } from "@/lib/auth/rate-limit";

/**
 * Public share-page limiter (M2 brief: 60/IP/min). Key material is the
 * x-forwarded-for first hop (same spoofing caveat as lib/auth/rate-limit —
 * documented; durable per-IP limits move to Redis later).
 */
const limiter = new SlidingWindowRateLimiter({ windowMs: 60_000, max: 60 });

export function checkShareRateLimit(ip: string): {
  ok: true;
} | {
  ok: false;
  retryAfterSeconds: number;
} {
  return limiter.check(ip);
}

export function shareIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
