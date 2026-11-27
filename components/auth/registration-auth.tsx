"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type SVGProps } from "react";

import { CheckIcon, EyeIcon, LockIcon } from "@/components/app/icons";
import { AlertIcon, LogoMark } from "@/components/dashboard/icons";
import { sanitizeNext, sanitizeNextOr } from "@/lib/auth/next-url";
import { INVALID_CREDENTIALS_COPY, SIGNUP_OK } from "@/lib/auth/responses";
import { validateEmail, validatePassword } from "@/lib/auth/validate";

import s from "./registration-auth.module.css";

type Mode = "login" | "signup";
type FieldErrors = Record<string, string>;

const ENDPOINT: Record<Mode, string> = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
};

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </Icon>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10.6 6.8A9.8 9.8 0 0 1 12 6.5c5.5 0 8.5 5.5 8.5 5.5a15 15 0 0 1-2.2 2.8M6.2 8.2A15 15 0 0 0 3.5 12S6.5 17.5 12 17.5c1 0 1.9-.2 2.7-.5" />
      <path d="M10 10a2.75 2.75 0 0 0 3.9 3.9M3.5 3.5l17 17" />
    </Icon>
  );
}

/** Two comma shapes — a drawn quote mark, not a glyph standing in for an icon. */
function QuoteMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9.4 5.5C6.3 7 4.5 9.8 4.5 13.6c0 3 1.7 4.9 4 4.9 2 0 3.5-1.4 3.5-3.4 0-1.9-1.3-3.2-3.1-3.2-.3 0-.7 0-.9.1.4-1.7 1.5-3.1 3-4l-1.6-2.5Zm9.8 0C16.1 7 14.3 9.8 14.3 13.6c0 3 1.7 4.9 4 4.9 2 0 3.5-1.4 3.5-3.4 0-1.9-1.3-3.2-3.1-3.2-.3 0-.7 0-.9.1.4-1.7 1.5-3.1 3-4l-1.6-2.5Z"
      />
    </svg>
  );
}

function friendlyEmailError(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === "email is required") return "Enter your email address.";
  if (raw === "email is invalid") return "That email address doesn’t look right.";
  if (raw === "email is too long") return "That email address is too long.";
  return raw;
}

function friendlyPasswordError(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === "password is required") return "Enter your password.";
  if (raw.startsWith("password must be at least")) return "Use at least 8 characters.";
  if (raw === "password is too long") return "Use 128 characters or fewer.";
  return raw;
}

export function RegistrationAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const signup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const disabledNotice = !signup && params.get("disabled") ? (
    <p className={s.notice} role="status">
      Account disabled. Contact support if you believe this is a mistake.
    </p>
  ) : null;

  const emailError =
    (touched.email && friendlyEmailError(validateEmail(email))) || serverErrors.email || null;
  const passwordHint = signup
    ? validatePassword(password)
    : password.length === 0
      ? "password is required"
      : null;
  const passwordError =
    (touched.password && friendlyPasswordError(passwordHint)) || serverErrors.password || null;
  const confirmError =
    signup && touched.confirm
      ? !confirm
        ? "Confirm your password."
        : confirm !== password
          ? "Passwords don’t match yet."
          : null
      : null;

  const next = sanitizeNext(params.get("next"));
  const switchHref = next
    ? `${signup ? "/login" : "/signup"}?next=${encodeURIComponent(next)}`
    : signup
      ? "/login"
      : "/signup";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (signup && !termsAccepted)) return;

    setTouched({ email: true, password: true, confirm: true });
    setServerErrors({});
    setFailure(null);
    setNotice(null);

    const errors: FieldErrors = {};
    const emailProblem = friendlyEmailError(validateEmail(email));
    if (emailProblem) errors.email = emailProblem;
    const passwordProblem = friendlyPasswordError(passwordHint);
    if (passwordProblem) errors.password = passwordProblem;
    if (signup) {
      if (!confirm) errors.confirm = "Confirm your password.";
      else if (confirm !== password) errors.confirm = "Passwords don’t match yet.";
    }
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch(ENDPOINT[mode], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        fields?: Record<string, string>;
      };

      if (response.ok && data.ok) {
        if (!signup) {
          router.push(sanitizeNextOr(next, "/"));
          router.refresh();
          return;
        }
        setNotice(data.message ?? SIGNUP_OK.message);
        setPassword("");
        setConfirm("");
        setTouched({});
        setShowPassword(false);
        setShowConfirm(false);
        return;
      }
      if (data.fields && Object.keys(data.fields).length > 0) {
        setServerErrors(data.fields);
        return;
      }
      setFailure(
        data.message ??
          (signup
            ? "Could not sign up. Check the form and try again."
            : INVALID_CREDENTIALS_COPY),
      );
    } catch {
      setFailure("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={s.root}>
      <section className={s.formPane}>
        <Link href="/" className={s.brand} aria-label="ScrimlyPro home">
          <span className={s.brandMark}>
            <LogoMark width="14" height="14" />
          </span>
          <span>ScrimlyPro</span>
        </Link>

        <h1 className={s.title}>{signup ? "Create an account" : "Welcome back"}</h1>

        {disabledNotice}

        <form className={s.form} onSubmit={onSubmit} noValidate>
          <label className={s.field}>
            <span className={s.label}>Email</span>
            <span className={`${s.inputShell} ${emailError ? s.inputShellError : ""}`}>
              <MailIcon className={s.fieldIcon} />
              <input
                id="reg2-email"
                className={s.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "reg2-email-error" : undefined}
                disabled={pending}
              />
            </span>
            {emailError && (
              <span className={s.fieldError} id="reg2-email-error" role="alert">
                {emailError}
              </span>
            )}
          </label>

          <div className={signup ? s.pair : undefined}>
            <label className={s.field}>
              <span className={s.label}>Password</span>
              <span className={`${s.inputShell} ${passwordError ? s.inputShellError : ""}`}>
                <LockIcon className={s.fieldIcon} />
                <input
                  id="reg2-password"
                  className={s.input}
                  type={showPassword ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "reg2-password-error" : undefined}
                  disabled={pending}
                />
                <button
                  type="button"
                  className={s.reveal}
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={pending}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </span>
              {passwordError && (
                <span className={s.fieldError} id="reg2-password-error" role="alert">
                  {passwordError}
                </span>
              )}
            </label>

            {signup && (
              <label className={s.field}>
                <span className={s.label}>Confirm password</span>
                <span className={`${s.inputShell} ${confirmError ? s.inputShellError : ""}`}>
                  <LockIcon className={s.fieldIcon} />
                  <input
                    id="reg2-confirm"
                    className={s.input}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                    aria-invalid={Boolean(confirmError)}
                    aria-describedby={confirmError ? "reg2-confirm-error" : undefined}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className={s.reveal}
                    onClick={() => setShowConfirm((shown) => !shown)}
                    aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                    aria-pressed={showConfirm}
                    disabled={pending}
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </span>
                {confirmError && (
                  <span className={s.fieldError} id="reg2-confirm-error" role="alert">
                    {confirmError}
                  </span>
                )}
              </label>
            )}
          </div>

          {signup && (
            <div className={s.termsCheck}>
              <input
                id="accept-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                disabled={pending}
              />
              <label htmlFor="accept-terms">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.termsLink}
                >
                  Terms and Conditions
                </Link>
                .
              </label>
            </div>
          )}

          {notice && (
            <p className={s.success} role="status">
              <CheckIcon width="17" height="17" />
              {notice}
            </p>
          )}
          {failure && (
            <p className={s.failure} role="alert">
              <AlertIcon width="17" height="17" />
              {failure}
            </p>
          )}

          <button
            className={s.submit}
            type="submit"
            disabled={pending || (signup && !termsAccepted)}
            aria-busy={pending}
          >
            {pending
              ? signup
                ? "Creating account…"
                : "Signing in…"
              : signup
                ? "Create an account"
                : "Sign in"}
          </button>
        </form>

        <p className={s.terms}>
          {signup ? "Already have an account? " : "New to ScrimlyPro? "}
          <Link href={switchHref} className={s.termsLink}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>

      <aside className={s.storyPane}>
        <div className={s.storyGrid} aria-hidden="true" />
        <div className={s.storyContent}>
          <p className={s.quote}>
            Upload your match screenshots. Check the results. Download a standings graphic you can share.
          </p>
          <div className={s.author}>
            <span className={s.quoteBadge}>
              <QuoteMark />
            </span>
            <span>
              <strong>ScrimlyPro</strong>
              <small>Built for PUBG Mobile scrim organizers</small>
            </span>
          </div>
        </div>
        <div className={s.artFrame}>
          <Image
            src="/regtable.png"
            alt="Overall rankings table from a PUBG Mobile scrim"
            width={1119}
            height={1406}
            className={s.artImage}
            priority
          />
        </div>
      </aside>
    </main>
  );
}
