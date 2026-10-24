"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup" | "forgot" | "reset";

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

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

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
          const next = params.get("next");
          router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
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
          <span className="text-sm font-semibold text-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-bg px-3 text-base "
          />
          {fieldErrors.email && (
            <span className="text-xs text-red-400">{fieldErrors.email}</span>
          )}
        </label>
      )}
      {mode !== "forgot" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">
            {mode === "reset" ? "New password" : "Password"}
          </span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-bg px-3 text-base "
          />
          {fieldErrors.password && (
            <span className="text-xs text-red-400">{fieldErrors.password}</span>
          )}
        </label>
      )}
      {failure && <p className="text-sm text-red-400">{failure}</p>}
      {notice && <p className="text-sm text-muted">{notice}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg disabled:opacity-50"
      >
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
