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
export const INVALID_CREDENTIALS_COPY =
  "Incorrect email or password. Check both and try again, or reset your password if you've forgotten it.";

/** Correct password, but the address was never confirmed (hosted GoTrue only). */
export const EMAIL_NOT_CONFIRMED_COPY =
  "This email address hasn't been confirmed yet. Open the confirmation link we sent you, then sign in again.";

/** The auth provider could not be reached (down, misconfigured URL, DNS/TLS). */
export const AUTH_UNAVAILABLE_COPY =
  "Sign-in is temporarily unavailable: the authentication service can't be reached. Try again in a moment.";

/** Provider rejected the account itself rather than the credentials. */
export const ACCOUNT_SUSPENDED_COPY =
  "This account has been suspended. Contact support if you think this is a mistake.";

/** Unknown provider failure — never echo raw provider internals to the client. */
export const AUTH_FAILED_COPY =
  "Sign-in failed for an unexpected reason. Try again, and contact support if it keeps happening.";

/** Per-email failure lockout copy (429) with a concrete wait time. */
export function tooManyLoginAttemptsCopy(retryAfterSeconds: number): string {
  const mins = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many failed sign-in attempts for this email. Try again in ${mins} minute${
    mins === 1 ? "" : "s"
  }, or reset your password to get back in.`;
}
