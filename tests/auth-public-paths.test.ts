import { describe, expect, it } from "vitest";
import { PUBLIC_PAGES, isPublicPath } from "@/lib/auth/public-paths";

describe("public path classifier", () => {
  it("exposes exactly the brief's public page list", () => {
    expect([...PUBLIC_PAGES].sort()).toEqual(
      [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/callback",
        "/auth/error",
      ].sort(),
    );
  });

  it("classifies public pages and sub-paths", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/error")).toBe(true);
  });

  it("never classifies API routes or tenant pages as public", () => {
    expect(isPublicPath("/api/ocr")).toBe(false);
    expect(isPublicPath("/api/auth/login")).toBe(false);
    expect(isPublicPath("/sessions")).toBe(false);
    expect(isPublicPath("/sessions/abc")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/logina")).toBe(false);
    expect(isPublicPath("/auth/callback-evil")).toBe(false);
    expect(isPublicPath("/dev/standings")).toBe(false);
  });
});
