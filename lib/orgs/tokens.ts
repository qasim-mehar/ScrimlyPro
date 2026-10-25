import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Invite/share token plumbing (M2 security law):
 * - raw tokens are 32 random bytes, base64url — shown exactly ONCE at
 *   creation, never stored, never logged, never committed;
 * - only the SHA-256 hash lands in the database (unique index);
 * - comparison re-hashes both sides and uses timingSafeEqual on the
 *   fixed-length digests (length-safe + constant-time).
 */

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Constant-time equality of two raw tokens (via their SHA-256 digests). */
export function tokensMatch(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

function digest(raw: string): Buffer {
  return createHash("sha256").update(raw, "utf8").digest();
}
