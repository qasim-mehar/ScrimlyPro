/**
 * Hand-rolled field validation for auth request bodies.
 *
 * Deviation note (recorded in the M1 report): the brief's 400s reference zod,
 * but zod is not on the M1 dependency allowlist, so validation follows the
 * repo's existing hand-rolled pattern (lib/ocr/form.ts) with equivalent
 * field-level errors and identical no-leakage guarantees.
 */
export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 320;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function validateEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return "email is required";
  if (value.length > MAX_EMAIL) return "email is too long";
  if (!EMAIL_RE.test(value)) return "email is invalid";
  return null;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0)
    return "password is required";
  if (value.length < MIN_PASSWORD)
    return `password must be at least ${MIN_PASSWORD} characters`;
  if (value.length > MAX_PASSWORD) return "password is too long";
  return null;
}

export function validateString(
  value: unknown,
  field: string,
  maxLen: number,
): string | null {
  if (typeof value !== "string" || value.length === 0)
    return `${field} is required`;
  if (value.length > maxLen) return `${field} is too long`;
  return null;
}
