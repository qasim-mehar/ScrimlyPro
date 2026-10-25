import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/lib/auth/origin-guard";

function withEnv(env: "production" | "development" | "test", fn: () => unknown) {
  const envObj = process.env as Record<string, string | undefined>;
  const original = envObj.NODE_ENV;
  envObj.NODE_ENV = env;
  try {
    return fn();
  } finally {
    envObj.NODE_ENV = original;
  }
}

function req(method: string, headers: Record<string, string>): Request {
  return new Request("https://app.example.com/api/thing", { method, headers });
}

describe("assertSameOrigin", () => {
  it("allows GET regardless of origin", () => {
    expect(assertSameOrigin(req("GET", { origin: "https://evil.example" }))).toBe(
      true,
    );
  });

  it("accepts exact host match", () => {
    expect(
      assertSameOrigin(
        req("POST", { origin: "https://app.example.com", host: "app.example.com" }),
      ),
    ).toBe(true);
  });

  it("accepts localhost port-pair mismatch in dev", () => {
    expect(
      assertSameOrigin(
        req("POST", { origin: "http://localhost:3042", host: "localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("rejects cross-origin POST", () => {
    expect(
      assertSameOrigin(
        req("POST", { origin: "https://evil.example", host: "app.example.com" }),
      ),
    ).toBe(false);
  });

  it("rejects lookalike host", () => {
    expect(
      assertSameOrigin(
        req("POST", {
          origin: "https://app.example.com.evil.example",
          host: "app.example.com",
        }),
      ),
    ).toBe(false);
  });

  it("rejects missing Origin without test opt-in", () => {
    expect(assertSameOrigin(req("POST", { host: "app.example.com" }))).toBe(
      false,
    );
  });

  it("allows missing Origin only with test header in non-production", () => {
    expect(
      assertSameOrigin(
        req("POST", { host: "app.example.com", "x-scrimly-no-origin-test": "1" }),
      ),
    ).toBe(true);
  });

  it("rejects missing Origin even with test header in production", () => {
    expect(
      withEnv("production", () =>
        assertSameOrigin(
          req("POST", {
            host: "app.example.com",
            "x-scrimly-no-origin-test": "1",
          }),
        ),
      ),
    ).toBe(false);
  });

  it("rejects localhost port-pair mismatch in production", () => {
    expect(
      withEnv("production", () =>
        assertSameOrigin(
          req("POST", { origin: "http://localhost:3042", host: "localhost:3000" }),
        ),
      ),
    ).toBe(false);
  });

  it("rejects missing host", () => {
    expect(
      assertSameOrigin(req("POST", { origin: "https://app.example.com" })),
    ).toBe(false);
  });

  it("rejects garbage origin", () => {
    expect(
      assertSameOrigin(req("POST", { origin: "not-a-url", host: "app.example.com" })),
    ).toBe(false);
  });

  it("rejects PUT/PATCH/DELETE cross-origin too", () => {
    for (const m of ["PUT", "PATCH", "DELETE"]) {
      expect(
        assertSameOrigin(
          req(m, { origin: "https://evil.example", host: "app.example.com" }),
        ),
      ).toBe(false);
    }
  });
});
