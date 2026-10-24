/**
 * Enumeration-safe API response bodies (M1 brief §WP4.2).
 *
 * These constants are returned BYTE-IDENTICAL regardless of whether the email
 * exists, so response parity tests can assert object equality. Never add
 * per-request fields to them.
 */
export const SIGNUP_OK = {
  ok: true,
  message: "Check your email for a confirmation link.",
} as const;

export const FORGOT_OK = {
  ok: true,
  message: "If that email is registered, a reset link has been sent.",
} as const;

export const RESET_OK = { ok: true, message: "Password updated." } as const;

export const LOGOUT_OK = { ok: true } as const;

/** UI copy for invalid login — identical for unknown email and wrong password. */
export const INVALID_CREDENTIALS_COPY = "Invalid email or password.";
