"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeNextOr } from "@/lib/auth/next-url";
import { INVALID_CREDENTIALS_COPY } from "@/lib/auth/responses";
import panel from "./login-panel.module.css";

import { AlertIcon } from "@/components/dashboard/icons";
import { buttonStyles, fieldStyles } from "@/components/app/ui";

type Mode = "login" | "signup" | "forgot" | "reset";
type Tone = "dark" | "light";

/** Cascade stagger for the /login variant (see login-panel.module.css). */
const d = (delay: string) => ({ "--d": delay }) as CSSProperties;

const ENDPOINT: Record<Mode, string> = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  forgot: "/api/auth/forgot-password",
  reset: "/api/auth/reset-password",
};

const FAILURE_COPY: Record<Mode, string> = {
  login: INVALID_CREDENTIALS_COPY,
  signup: "Could not sign up. Check the form and try again.",
  forgot: "Could not send the reset link. Try again shortly.",
  reset: "Could not update the password. Try again shortly.",
};

/**
 * Shared auth form. `tone` defaults to the original dark treatment so login
 * is untouched; the secondary screens opt into the light app vocabulary.
 * `variant="login"` renders the slim split-screen panel design
 * (see login-panel.module.css); the reset-password screen keeps `tone`.
 */
export function AuthForm({
  mode,
  tone = "dark",
  variant = "default",
}: {
  mode: Mode;
  tone?: Tone;
  variant?: "default" | "login";
}) {
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
      if (data.fields && Object.keys(data.fields).length > 0) {
        setFieldErrors(data.fields);
        return;
      }
      if (res.status === 429) {
        // The server computes the real wait time (per-email lockout included).
        setFailure(
          data.message ?? "Too many attempts. Wait a bit and try again.",
        );
        return;
      }
      // Show the server's actionable reason (unconfirmed email, provider
      // unreachable, …); the generic copy is only a fallback.
      setFailure(data.message ?? FAILURE_COPY[mode]);
    } catch {
      setFailure("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (
    variant === "login" &&
    (mode === "login" || mode === "signup" || mode === "forgot")
  ) {
    const isLogin = mode === "login";
    return (
      <form onSubmit={onSubmit}>
        {mode !== "forgot" && (
          <p className={panel.emailLabel} style={d("0.2s")}>
            Or continue with email address
          </p>
        )}
        <div className={`${panel.field} ${panel.dEmailField}`} style={d("0.2s")}>
          <span className={panel.icon} aria-hidden>
            <span className={panel.iconMail} />
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            className={panel.input}
          />
        </div>
        {fieldErrors.email && (
          <p className={panel.fieldError}>{fieldErrors.email}</p>
        )}
        {mode !== "forgot" && (
          <div className={`${panel.field} ${panel.dPasswordField}`} style={d("0.24s")}>
            <span className={panel.icon} aria-hidden>
              <span className={panel.iconKey}>
                <span className={panel.tooth} />
              </span>
            </span>
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className={panel.input}
            />
          </div>
        )}
        {fieldErrors.password && mode !== "forgot" && (
          <p className={panel.fieldError}>{fieldErrors.password}</p>
        )}
        {isLogin && (
          <div className={panel.forgotRow} style={d("0.28s")}>
            <a href="/forgot-password" className={panel.forgotLink}>
              Forgot password?
            </a>
          </div>
        )}
        {notice && (
          <p className={panel.successBanner} role="status">
            {notice}
          </p>
        )}
        {failure && (
          <p className={panel.errorBanner} role="alert">
            {failure}
          </p>
        )}
        <button type="submit" disabled={pending} className={panel.submit} style={d("0.28s")}>
          {pending ? (
            <>
              <span className={panel.spinner} aria-hidden />
              {isLogin ? "Signing in…" : mode === "signup" ? "Creating account…" : "Working…"}
            </>
          ) : isLogin ? (
            "Login"
          ) : mode === "signup" ? (
            "Create account"
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    );
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
