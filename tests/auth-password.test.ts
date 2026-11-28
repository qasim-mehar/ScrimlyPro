import { describe, expect, it } from "vitest";

import { passwordStrength } from "@/lib/auth/password";

/**
 * Strength feedback is advisory: it must describe the password without
 * inventing requirements the signup endpoint does not enforce.
 */
describe("passwordStrength", () => {
  it("scores an empty password as weak with no checks met", () => {
    const result = passwordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Weak");
    expect(result.checks.every((check) => !check.met)).toBe(true);
  });

  it("scores a short mixed password fairly, never as strong", () => {
    const result = passwordStrength("Ab1!");
    expect(result.score).toBe(3);
    expect(result.label).toBe("Good");
    expect(result.checks.find((check) => check.id === "length")?.met).toBe(false);
  });

  it("scores a long varied password as strong", () => {
    const result = passwordStrength("Scrimly#2026");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Strong");
    expect(result.checks.every((check) => check.met)).toBe(true);
  });

  it("treats non-ASCII symbols as symbols, not as letters", () => {
    const result = passwordStrength("password·");
    expect(result.checks.find((check) => check.id === "symbol")?.met).toBe(true);
  });
});
