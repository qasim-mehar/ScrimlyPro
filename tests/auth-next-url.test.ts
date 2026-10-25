import { describe, expect, it } from "vitest";
import { sanitizeNext, sanitizeNextOr } from "@/lib/auth/next-url";

const ACCEPTED = [
  ["/", "/"],
  ["/sessions", "/sessions"],
  ["/sessions/abc-123", "/sessions/abc-123"],
  ["/sessions/abc-123/matches/2", "/sessions/abc-123/matches/2"],
  ["/sessions?x=1&y=%20z", "/sessions?x=1&y= z"],
  ["/dev/standings", "/dev/standings"],
];

// Appendix A / G6 attack list — every vector must be rejected with null.
const REJECTED = [
  "//evil.com",
  "/\\evil.com",
  "https://evil.com",
  "http://evil.com/path",
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "/sessions%2F%2Fevil",
  "%2F%2Fevil.com",
  "/sessions/..%2f..%2fetc",
  "\\\\evil.com",
  "/evil\\evil",
  "/\tevil",
  "/sessions\nX",
  "/unknown-segment",
  "/SessionsAdmin",
  "/sessionss",
  "/sessions#//evil.com?x=1",
  "/" + "a".repeat(600),
  "/sessions?next=" + encodeURIComponent("//evil.com"),
  "",
  null,
  undefined,
  "sessions/1",
];

describe("sanitizeNext", () => {
  it.each(ACCEPTED)("accepts same-origin relative path %j", (raw, expected) => {
    expect(sanitizeNext(raw)).toBe(expected);
  });

  it.each(REJECTED)("rejects attack/invalid vector %j", (raw) => {
    expect(sanitizeNext(raw as string)).toBeNull();
  });

  it("rejects percent-encoded backslash", () => {
    expect(sanitizeNext("/sessions%5Cevil")).toBeNull();
  });

  it("rejects embedded scheme after first segment", () => {
    expect(sanitizeNext("/sessions/https://evil.com")).toBeNull();
  });

  it("falls back via sanitizeNextOr", () => {
    expect(sanitizeNextOr("//evil.com", "/fallback")).toBe("/fallback");
    expect(sanitizeNextOr("/sessions/1", "/fallback")).toBe("/sessions/1");
  });

  it("allows decoded forms that decode to safe paths", () => {
    // %20 is a harmless space — decodes to a safe same-origin path.
    expect(sanitizeNext("/sessions/my%20scrim")).toBe("/sessions/my scrim");
  });
});
