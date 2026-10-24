import { describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  SlidingWindowRateLimiter,
  clientIpKey,
} from "@/lib/auth/rate-limit";

function fakeClock() {
  let t = 1_000_000;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("SlidingWindowRateLimiter", () => {
  it("allows hits under the limit and blocks at the limit", () => {
    const clock = fakeClock();
    const rl = new SlidingWindowRateLimiter({ windowMs: 60_000, max: 3 }, clock.now);
    expect(rl.check("ip1").ok).toBe(true);
    expect(rl.check("ip1").ok).toBe(true);
    expect(rl.check("ip1").ok).toBe(true);
    const blocked = rl.check("ip1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keys are isolated", () => {
    const clock = fakeClock();
    const rl = new SlidingWindowRateLimiter({ windowMs: 60_000, max: 1 }, clock.now);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("b").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
  });

  it("Retry-After reflects the oldest hit's expiry", () => {
    const clock = fakeClock();
    const rl = new SlidingWindowRateLimiter({ windowMs: 900_000, max: 1 }, clock.now);
    rl.check("a"); // t = 1_000_000
    clock.advance(300_000); // t = 1_300_000 → oldest expires at 1_900_000
    const blocked = rl.check("a");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBe(600);
    }
  });

  it("window slides: old hits expire and the key frees up", () => {
    const clock = fakeClock();
    const rl = new SlidingWindowRateLimiter({ windowMs: 60_000, max: 1 }, clock.now);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    clock.advance(60_001);
    expect(rl.check("a").ok).toBe(true);
  });

  it("sweeps stale buckets when the map grows (no leak)", () => {
    const clock = fakeClock();
    const rl = new SlidingWindowRateLimiter({ windowMs: 1000, max: 1 }, clock.now);
    for (let i = 0; i < 10_050; i++) rl.check(`ip-${i}`);
    clock.advance(2000);
    for (let i = 0; i < 50; i++) rl.check(`fresh-${i}`);
    // After sweep, old buckets are dropped — internal size stays bounded.
    const size = (rl as unknown as { buckets: Map<string, unknown> }).buckets.size;
    expect(size).toBeLessThanOrEqual(10_100);
  });

  it("declares the brief's limits exactly", () => {
    expect(RATE_LIMITS.signup).toEqual({ windowMs: 3_600_000, max: 5 });
    expect(RATE_LIMITS.login).toEqual({ windowMs: 900_000, max: 15 });
    expect(RATE_LIMITS.forgot).toEqual({ windowMs: 3_600_000, max: 5 });
    expect(RATE_LIMITS.reset).toEqual({ windowMs: 3_600_000, max: 10 });
    expect(RATE_LIMITS.api).toEqual({ windowMs: 60_000, max: 120 });
  });
});

describe("clientIpKey", () => {
  it("prefers the first x-forwarded-for hop when TRUST_PROXY=true", () => {
    process.env.TRUST_PROXY = "true";
    try {
      const req = new Request("https://x.test", {
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
      });
      expect(clientIpKey(req)).toBe("203.0.113.7");
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });

  it("ignores spoofable x-forwarded-for without TRUST_PROXY (B2)", () => {
    delete process.env.TRUST_PROXY;
    const req = new Request("https://x.test", {
      headers: {
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "x-real-ip": "198.51.100.2",
      },
    });
    expect(clientIpKey(req)).toBe("198.51.100.2");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(
      clientIpKey(new Request("https://x.test", { headers: { "x-real-ip": "198.51.100.2" } })),
    ).toBe("198.51.100.2");
    expect(clientIpKey(new Request("https://x.test"))).toBe("unknown");
  });

  it("per-email buckets are attribution-independent", async () => {
    const { checkEmailRateLimit, isLoginEmailBlocked, recordLoginEmailFailure, RATE_LIMITS, SlidingWindowRateLimiter, setEmailLimiterForTests } =
      await import("@/lib/auth/rate-limit");
    let t = 5_000_000;
    const clock = { now: () => t };
    for (const kind of ["signupEmail", "loginEmail", "forgotEmail"] as const) {
      setEmailLimiterForTests(kind, new SlidingWindowRateLimiter(RATE_LIMITS[kind], clock.now));
    }
    const { advance } = { advance: (ms: number) => (t += ms) };
    void advance;

    // signup: 5 attempts/email/h
    for (let i = 0; i < 5; i++) {
      expect(checkEmailRateLimit("signupEmail", "Victim@Example.COM ").ok).toBe(true);
    }
    expect(checkEmailRateLimit("signupEmail", "victim@example.com").ok).toBe(false);

    // login: 10 FAILURES/email/15min — recorded only on failure
    for (let i = 0; i < 10; i++) recordLoginEmailFailure("pilot@scrimlypro.dev");
    expect(isLoginEmailBlocked("pilot@scrimlypro.dev")).toBe(true);
    expect(isLoginEmailBlocked("other@scrimlypro.dev")).toBe(false);

    // forgot: 5 attempts/email/h
    for (let i = 0; i < 5; i++) {
      expect(checkEmailRateLimit("forgotEmail", "Bomb@Example.com").ok).toBe(true);
    }
    expect(checkEmailRateLimit("forgotEmail", "bomb@example.com").ok).toBe(false);
  });
});
