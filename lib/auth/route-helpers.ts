import { noStore } from "@/lib/http";
import {
  ACCOUNT_SUSPENDED_COPY,
  AUTH_FAILED_COPY,
  AUTH_UNAVAILABLE_COPY,
  EMAIL_NOT_CONFIRMED_COPY,
  INVALID_CREDENTIALS_COPY,
  tooManyLoginAttemptsCopy,
} from "@/lib/auth/responses";

/** Loose shape of a Supabase AuthError (stub + hosted GoTrue both map). */
export type AuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

export type LoginFailure = {
  status: number;
  body: { error: string; message: string };
  headers?: Record<string, string>;
};

/**
 * True when the sign-in failed for reasons that have nothing to do with the
 * submitted credentials (provider down / unreachable / 5xx). These must NOT be
 * counted against the per-email failure bucket.
 */
export function isAuthInfrastructureError(error: AuthErrorLike): boolean {
  const status = error.status ?? 0;
  return error.name === "AuthRetryableFetchError" || status === 0 || status >= 500;
}

/**
 * Maps a Supabase auth error onto an actionable HTTP failure.
 *
 * Only the credential-mismatch case keeps enumeration-safe copy; every other
 * branch reports the real, actionable reason (unconfirmed email, lockout,
 * provider unreachable) instead of pretending the password was wrong.
 */
export function describeLoginError(error: AuthErrorLike): LoginFailure {
  const status = error.status ?? 0;
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (isAuthInfrastructureError(error)) {
    return {
      status: 503,
      body: { error: "auth_unavailable", message: AUTH_UNAVAILABLE_COPY },
    };
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return {
      status: 403,
      body: { error: "email_not_confirmed", message: EMAIL_NOT_CONFIRMED_COPY },
    };
  }
  if (code === "user_banned" || message.includes("banned")) {
    return {
      status: 403,
      body: { error: "user_banned", message: ACCOUNT_SUSPENDED_COPY },
    };
  }
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid_grant")
  ) {
    return {
      status: 401,
      body: { error: "invalid_credentials", message: INVALID_CREDENTIALS_COPY },
    };
  }
  if (status === 429 || code.includes("rate_limit")) {
    return {
      status: 429,
      body: { error: "too_many_attempts", message: tooManyLoginAttemptsCopy(60) },
      headers: { "Retry-After": "60" },
    };
  }
  // Unknown provider failure: log-safe summary only, never raw provider text.
  return {
    status: 502,
    body: { error: "auth_failed", message: AUTH_FAILED_COPY },
  };
}

/** True when GoTrue rejected signup because the email already exists. */
export function isAlreadyRegistered(error: { message?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  return m.includes("already been registered") || m.includes("already registered");
}

export function forbidden() {
  return noStore({ error: "forbidden" }, { status: 403 });
}

export function rateLimited(retryAfterSeconds: number) {
  return noStore({ error: "rate_limited" }, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}

export function validationError(fields: Record<string, string>) {
  return noStore({ error: "validation_error", fields }, { status: 400 });
}

export function badRequest() {
  return noStore({ error: "bad_request" }, { status: 400 });
}

export function authUnavailable() {
  return noStore({ error: "auth_unavailable" }, { status: 503 });
}
