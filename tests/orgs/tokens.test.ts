import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashToken, generateToken, tokensMatch } from "@/lib/orgs/tokens";

/**
 * Token law (M2 §3.7): 32-byte raw tokens, SHA-256 at rest, constant-time
 * comparison. These are pure unit tests — no DB.
 */

describe("org/share token plumbing", () => {
  it("generates URL-safe base64 tokens of ~43 chars (32 bytes)", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{40,48}$/);
    // 32 bytes base64url = 43 chars without padding.
    expect(t).toHaveLength(43);
  });

  it("generates distinct tokens (no reuse across calls)", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(seen.size).toBe(200);
  });

  it("hashes to SHA-256 hex; the raw token never equals or contains the hash", () => {
    const t = generateToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
    expect(createHash("sha256").update(t, "utf8").digest("hex")).toBe(h);
  });

  it("tokensMatch is true only for equal tokens (constant-time path)", () => {
    const a = generateToken();
    const b = generateToken();
    expect(tokensMatch(a, a)).toBe(true);
    expect(tokensMatch(a, b)).toBe(false);
    // Length-mismatched inputs must not throw (digest comparison).
    expect(tokensMatch(a, "short")).toBe(false);
    expect(tokensMatch("", "")).toBe(true);
  });
});
