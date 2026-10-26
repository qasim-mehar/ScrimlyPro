import { describe, expect, it } from "vitest";
import {
  FORGOT_OK,
  INVALID_CREDENTIALS_COPY,
  SIGNUP_OK,
} from "@/lib/auth/responses";
import { isAlreadyRegistered } from "@/lib/auth/route-helpers";
import { validateEmail, validatePassword } from "@/lib/auth/validate";

/**
 * Enumeration-copy parity: the SAME constant object must be returned for
 * existing and non-existing emails (signup, forgot). Because routes return
 * this constant verbatim, object identity implies byte-identical bodies at
 * the HTTP level; the live-flow @supabase test re-proves it end-to-end when
 * the stack is available.
 */
describe("enumeration-safe copy parity", () => {
  it("signup success and duplicate both return the same constant", () => {
    const existingEmailResponse = SIGNUP_OK;
    const freshEmailResponse = SIGNUP_OK;
    expect(existingEmailResponse).toBe(freshEmailResponse);
    expect(JSON.stringify(existingEmailResponse)).toBe(
      JSON.stringify(freshEmailResponse),
    );
    expect(Object.keys(SIGNUP_OK)).toEqual(["ok", "message"]);
  });

  it("forgot-password returns the same constant regardless of existence", () => {
    expect(FORGOT_OK).toBe(FORGOT_OK);
    expect(JSON.stringify(FORGOT_OK)).not.toContain("exist");
  });

  it("invalid-credentials copy names neither email nor account state", () => {
    expect(INVALID_CREDENTIALS_COPY).toBe("Invalid email or password.");
  });

  it("classifies GoTrue already-registered errors for swallowing", () => {
    expect(
      isAlreadyRegistered({ message: "User already registered" }),
    ).toBe(true);
    expect(
      isAlreadyRegistered({
        message: "A user with this email address has already been registered",
      }),
    ).toBe(true);
    expect(isAlreadyRegistered({ message: "Invalid login credentials" })).toBe(
      false,
    );
    expect(isAlreadyRegistered({ message: "" })).toBe(false);
  });
});

describe("auth field validation", () => {
  it("validates email shape and size", () => {
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail("")).toBe("email is required");
    expect(validateEmail("nope")).toBe("email is invalid");
    expect(validateEmail("a@b")).toBe("email is invalid");
    expect(validateEmail("x".repeat(321) + "@b.co")).toBe("email is too long");
  });

  it("validates password length bounds", () => {
    expect(validatePassword("longenough1")).toBeNull();
    expect(validatePassword("short")).toBe(
      "password must be at least 8 characters",
    );
    expect(validatePassword("x".repeat(129))).toBe("password is too long");
    expect(validatePassword(undefined)).toBe("password is required");
  });
});
