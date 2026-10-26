"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeNextOr } from "@/lib/auth/next-url";

import { AlertIcon } from "@/components/dashboard/icons";
import { buttonStyles, fieldStyles } from "@/components/app/ui";

type Mode = "login" | "signup" | "forgot" | "reset";
type Tone = "dark" | "light";

const ENDPOINT: Record<Mode, string> = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  forgot: "/api/auth/forgot-password",
  reset: "/api/auth/reset-password",
};

const FAILURE_COPY: Record<Mode, string> = {
  login: "Invalid email or password.",
  signup: "Could not sign up. Check the form and try again.",
  forgot: "Could not send the reset link. Try again shortly.",
  reset: "Could not update the password. Try again shortly.",
};

/**
 * Shared auth form. `tone` defaults to the original dark treatment so login
 * is untouched; the secondary screens opt into the light app vocabulary.
 */
export function AuthForm({ mode, tone = "dark" }: { mode: Mode; tone?: Tone }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const light = tone === "light";
  const labelClass = light
    ? "text-sm font-medium text-dash-ink2"
    : "text-sm font-semibold text-muted";
  const inputClass = light
    ? fieldStyles.input
    : "min-h-11 rounded-lg border border-line bg-bg px-3 text-base ";
  const fieldErrorClass = light
    ? fieldStyles.error
    : "text-xs text-red-400";
  const buttonClass = light
    ? `${buttonStyles.primary} w-full`
    : "flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg disabled:opacity-50";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setNotice(null);
    setFailure(null);
    try {
      const res = await fetch(ENDPOINT[mode], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "reset" ? { password } : { email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        fields?: Record<string, string>;
      };
      if (res.ok && data.ok) {
        if (mode === "login" || mode === "reset") {
          // Same audited sanitizer as the server (first-segment allowlist,
          // scheme/backslash/encoded-slash rejection).
          router.push(sanitizeNextOr(params.get("next"), "/"));
          router.refresh();
          return;
        }
        setNotice(data.message ?? "Done.");
        return;
      }
      if (res.status === 429) {
        setFailure("Too many attempts. Wait a bit and try again.");
        return;
      }
      if (data.fields && Object.keys(data.fields).length > 0) {
        setFieldErrors(data.fields);
        return;
      }
      setFailure(
        res.status === 401 && mode === "login"
          ? FAILURE_COPY.login
          : FAILURE_COPY[mode],
      );
    } catch {
      setFailure("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      {mode !== "reset" && (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          {fieldErrors.email && (
            <span className={fieldErrorClass}>{fieldErrors.email}</span>
          )}
        </label>
      )}
      {mode !== "forgot" && (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>
            {mode === "reset" ? "New password" : "Password"}
          </span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {fieldErrors.password && (
            <span className={fieldErrorClass}>{fieldErrors.password}</span>
          )}
          {light && mode !== "login" ? (
            <span className={fieldStyles.help}>At least 8 characters.</span>
          ) : null}
        </label>
      )}
      {failure ? (
        light ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-dash-sm bg-dash-danger-bg px-3 py-2.5 text-[13px] leading-5 text-dash-danger-ink"
          >
            <AlertIcon width="15" height="15" className="mt-0.5 shrink-0" />
            {failure}
          </p>
        ) : (
          <p className="text-sm text-red-400">{failure}</p>
        )
      ) : null}
      {notice ? (
        light ? (
          <p
            role="status"
            className="rounded-dash-sm bg-dash-lime/35 px-3 py-2.5 text-[13px] leading-5 text-dash-ink"
          >
            {notice}
          </p>
        ) : (
          <p className="text-sm text-muted">{notice}</p>
        )
      ) : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending
          ? "Working…"
          : mode === "login"
            ? "Sign in"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Update password"}
      </button>
    </form>
  );
}
