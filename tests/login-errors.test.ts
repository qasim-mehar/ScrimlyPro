import { describe, expect, it } from "vitest";
import { describeLoginError, isAuthInfrastructureError } from "@/lib/auth/route-helpers";
import {
  ACCOUNT_SUSPENDED_COPY,
  AUTH_FAILED_COPY,
  AUTH_UNAVAILABLE_COPY,
  EMAIL_NOT_CONFIRMED_COPY,
  INVALID_CREDENTIALS_COPY,
} from "@/lib/auth/responses";

/**
 * A failed sign-in must report the REAL reason. Only a credential mismatch is
 * enumeration-safe; provider outages and unconfirmed emails are actionable and
 * used to be flattened into "Invalid email or password".
 */
describe("describeLoginError", () => {
  it("reports an unreachable auth provider as 503, not bad credentials", () => {
    const fetchFailure = describeLoginError({
      name: "AuthRetryableFetchError",
      message: "fetch failed",
      status: 0,
    });
    expect(fetchFailure).toEqual({
      status: 503,
      body: { error: "auth_unavailable", message: AUTH_UNAVAILABLE_COPY },
    });
    expect(describeLoginError({ status: 500, message: "boom" }).status).toBe(503);
    expect(
      describeLoginError({ status: 502, message: "bad gateway" }).body.error,
    ).toBe("auth_unavailable");
  });

  it("keeps unknown email and wrong password byte-identical (401)", () => {
    const hosted = describeLoginError({
      code: "invalid_credentials",
      status: 400,
      message: "Invalid login credentials",
    });
    // The local dev stub answers without an error_code.
    const stub = describeLoginError({
      status: 400,
      message: "Invalid login credentials",
    });
    expect(hosted).toEqual(stub);
    expect(hosted.status).toBe(401);
    expect(hosted.body).toEqual({
      error: "invalid_credentials",
      message: INVALID_CREDENTIALS_COPY,
    });
  });

  it("tells unconfirmed users to confirm instead of blaming the password", () => {
    const failure = describeLoginError({
      code: "email_not_confirmed",
      status: 400,
      message: "Email not confirmed",
    });
    expect(failure.status).toBe(403);
    expect(failure.body).toEqual({
      error: "email_not_confirmed",
      message: EMAIL_NOT_CONFIRMED_COPY,
    });
  });

  it("surfaces suspension and provider rate limits", () => {
    const banned = describeLoginError({
      code: "user_banned",
      status: 403,
      message: "User is banned",
    });
    expect(banned.status).toBe(403);
    expect(banned.body.message).toBe(ACCOUNT_SUSPENDED_COPY);

    const limited = describeLoginError({
      code: "over_request_rate_limit",
      status: 429,
      message: "Too many requests",
    });
    expect(limited.status).toBe(429);
    expect(limited.headers?.["Retry-After"]).toBe("60");
    expect(limited.body.message).toContain("failed sign-in attempts");
  });

  it("never echoes raw provider internals for unknown failures", () => {
    const failure = describeLoginError({
      status: 400,
      message: "unexpected_failure: relation auth.secret leaked",
    });
    expect(failure.status).toBe(502);
    expect(failure.body).toEqual({ error: "auth_failed", message: AUTH_FAILED_COPY });
    expect(failure.body.message).not.toContain("auth.secret");
  });

  it("classifies infrastructure errors separately from credential errors", () => {
    expect(isAuthInfrastructureError({ status: 0 })).toBe(true);
    expect(
      isAuthInfrastructureError({ name: "AuthRetryableFetchError", status: 503 }),
    ).toBe(true);
    expect(isAuthInfrastructureError({ status: 400 })).toBe(false);
  });
});
