"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type SVGProps } from "react";

import { ArrowLeftIcon, CheckIcon, EyeIcon, LockIcon } from "@/components/app/icons";
import { AlertIcon, LogoMark } from "@/components/dashboard/icons";
import { sanitizeNext, sanitizeNextOr } from "@/lib/auth/next-url";
import { passwordStrength } from "@/lib/auth/password";
import { INVALID_CREDENTIALS_COPY, SIGNUP_OK } from "@/lib/auth/responses";
import { validateEmail, validatePassword } from "@/lib/auth/validate";

import s from "./credential-pass.module.css";

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

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Icon>
  );
}

/** Embossed medallion printed on the pass — brand geometry, drawn not stock. */
function PassEmblem() {
  return (
    <svg viewBox="0 0 72 72" className={s.emblemSvg} aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r="34" className={s.emblemRing} />
      <circle cx="36" cy="36" r="28.5" className={s.emblemPlate} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="36"
          y1="3.5"
          x2="36"
          y2="8"
          className={s.emblemTick}
          transform={`rotate(${angle} 36 36)`}
        />
      ))}
      <rect x="21" y="21" width="13" height="13" rx="3.5" className={s.emblemSquare} />
      <rect x="38" y="21" width="13" height="13" rx="6.5" className={s.emblemSquareRound} />
      <rect x="21" y="38" width="13" height="13" rx="6.5" className={s.emblemSquareRound} />
      <rect x="38" y="38" width="13" height="13" rx="3.5" className={s.emblemGold} />
      <path
        className={s.emblemStar}
        d="M12 1.7l2.5 7.8 7.8 2.5-7.8 2.5L12 22.3l-2.5-7.8-7.8-2.5 7.8-2.5z"
        transform="translate(51 -4) scale(0.4)"
      />
    </svg>
  );
}

/** Circular ink seal, set on the pass rather than a plain text badge. */
function PassSeal() {
  return (
    <svg viewBox="0 0 88 88" className={s.sealSvg} aria-hidden="true" focusable="false">
      <defs>
        <path
          id="pass-seal-arc"
          d="M44 44 m-32 0 a32 32 0 1 1 64 0 a32 32 0 1 1 -64 0"
        />
      </defs>
      <circle cx="44" cy="44" r="41" className={s.sealOuter} />
      <circle cx="44" cy="44" r="24" className={s.sealInner} />
      <text className={s.sealText}>
        <textPath href="#pass-seal-arc" startOffset="50%" textAnchor="middle">
          ORGANIZER ACCESS · SCRIMLYPRO ·
        </textPath>
      </text>
      <path
        className={s.sealStar}
        d="M12 1.7l2.5 7.8 7.8 2.5-7.8 2.5L12 22.3l-2.5-7.8-7.8-2.5 7.8-2.5z"
        transform="translate(29 29) scale(0.62)"
      />
    </svg>
  );
}

/** Fine security weave behind the printed credential — material, not ornament. */
function LaminatePattern() {
  return (
    <svg className={s.laminateSvg} viewBox="0 0 440 620" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id="pass-laminate"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(18)"
        >
          <path d="M0 13 Q6.5 4 13 13 T26 13" className={s.laminateWave} />
          <path d="M0 0 V26" className={s.laminateRule} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pass-laminate)" />
    </svg>
  );
}

function LanyardWeave() {
  return (
    <svg className={s.weaveSvg} viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="pass-weave" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0l8 8M8 0L0 8" className={s.weaveLine} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pass-weave)" />
    </svg>
  );
}

/** Printed verification strip on the stub — decorative data, not a real code. */
function Barcode() {
  const widths = [2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2];
  let x = 0;
  return (
    <svg width="96" height="30" viewBox="0 0 96 30" aria-hidden="true" focusable="false" className={s.barcode}>
      {widths.map((width, index) => {
        const at = x;
        x += width + 1;
        return <rect key={index} x={at} y="0" width={width} height="22" className={s.barcodeBar} />;
      })}
      <text x="0" y="29" className={s.barcodeText}>
        SP · ACCESS
      </text>
    </svg>
  );
}

/** A brand asset with four official colours, never a generic glyph. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
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

/**
 * Login and signup as an issued organizer pass. Credentials are still sent to
 * the audited `/api/auth/*` routes; this component owns presentation only.
 */
export function CredentialPass({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const signup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const disabledNotice = !signup && params.get("disabled") ? (
    <p className={s.notice} role="status">
      Account disabled. Contact support if you believe this is a mistake.
    </p>
  ) : null;

  const emailError =
    (touched.email && friendlyEmailError(validateEmail(email))) ||
    serverErrors.email ||
    null;
  const passwordHint = signup
    ? validatePassword(password)
    : password.length === 0
      ? "password is required"
      : null;
  const passwordError =
    (touched.password && friendlyPasswordError(passwordHint)) ||
    serverErrors.password ||
    null;
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
    if (pending) return;

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
      <div className={s.backdrop} aria-hidden="true">
        <span className={s.ghostWord}>SCRIMLYPRO</span>
        <span className={s.ghostRule} />
      </div>

      <section className={s.pass} aria-label={signup ? "Create an account" : "Sign in"}>
        <div className={s.lanyard} aria-hidden="true">
          <LanyardWeave />
          <span className={s.hole} />
          <span className={s.clip} />
          <span className={s.hole} />
        </div>

        <div className={s.body}>
          <LaminatePattern />

          <div className={s.brandRow}>
            <span className={s.brandMark}>
              <LogoMark width="14" height="14" />
            </span>
            <span className={s.brandName}>ScrimlyPro</span>
            <PassSeal />
          </div>

          <div className={s.identity}>
            <div className={s.emblem}>
              <PassEmblem />
            </div>
            <div className={s.headings}>
              <h1 className={s.title}>
                {signup ? "Issue your pass." : "Your pass to the lobby."}
              </h1>
              <p className={s.lede}>
                {signup
                  ? "One account, then every match is screenshots in and standings out."
                  : "Sign in to pick up the last match where you left it."}
              </p>
            </div>
          </div>

          {disabledNotice}

          <div className={s.googleRow}>
            <button
              type="button"
              className={s.google}
              disabled
              title="Google sign-in is not enabled yet"
              aria-label={`Sign ${signup ? "up" : "in"} with Google — coming soon`}
            >
              <GoogleMark />
              <span>Google</span>
              <span className={s.soon}>Soon</span>
            </button>
            <div className={s.divider}>
              <span>or use your email</span>
            </div>
          </div>

          <form className={s.form} onSubmit={onSubmit} noValidate>
            <div className={s.field}>
              <label className={s.label} htmlFor="pass-email">
                Email address
              </label>
              <div className={`${s.inputShell} ${emailError ? s.inputShellError : ""}`}>
                <MailIcon className={s.fieldIcon} />
                <input
                  id="pass-email"
                  className={s.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "pass-email-error" : undefined}
                  disabled={pending}
                />
              </div>
              {emailError && (
                <p className={s.fieldError} id="pass-email-error" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="pass-password">
                Password
              </label>
              <div className={`${s.inputShell} ${passwordError ? s.inputShellError : ""}`}>
                <LockIcon className={s.fieldIcon} />
                <input
                  id="pass-password"
                  className={s.input}
                  type={showPassword ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder={signup ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "pass-password-error" : undefined}
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
              </div>
              {passwordError && (
                <p className={s.fieldError} id="pass-password-error" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {signup && (
              <>
                <div className={s.strength} aria-live="polite">
                  <div className={s.strengthTop}>
                    <span>Passphrase strength</span>
                    <span className={s.strengthLabel} data-score={strength.score}>
                      {password.length === 0 ? "—" : strength.label}
                    </span>
                  </div>
                  <div className={s.meter} aria-hidden="true">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`${s.meterStep} ${step <= strength.score ? s.meterActive : ""}`}
                        data-score={strength.score}
                      />
                    ))}
                  </div>
                  <ul className={s.requirements}>
                    {strength.checks.map((check) => (
                      <li
                        key={check.id}
                        className={check.met ? s.requirementMet : s.requirement}
                      >
                        {check.met ? (
                          <CheckIcon width="14" height="14" />
                        ) : (
                          <Icon width="14" height="14">
                            <circle cx="12" cy="12" r="7.5" />
                          </Icon>
                        )}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={s.field}>
                  <label className={s.label} htmlFor="pass-confirm">
                    Confirm password
                  </label>
                  <div className={`${s.inputShell} ${confirmError ? s.inputShellError : ""}`}>
                    <LockIcon className={s.fieldIcon} />
                    <input
                      id="pass-confirm"
                      className={s.input}
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                      aria-invalid={Boolean(confirmError)}
                      aria-describedby={confirmError ? "pass-confirm-error" : undefined}
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
                  </div>
                  {confirmError && (
                    <p className={s.fieldError} id="pass-confirm-error" role="alert">
                      {confirmError}
                    </p>
                  )}
                </div>
              </>
            )}

            {!signup && (
              <Link className={s.forgot} href="/forgot-password">
                Forgot password?
              </Link>
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

            <button className={s.submit} type="submit" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  {signup ? "Issuing pass…" : "Checking pass…"}
                </>
              ) : (
                <>
                  {signup ? "Create account" : "Sign in"}
                  <ArrowRightIcon width="18" height="18" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className={s.stub}>
          <span className={s.perforation} aria-hidden="true" />
          <div className={s.stubRow}>
            <Barcode />
            <p className={s.switch}>
              {signup ? "Already hold a pass? " : "New to ScrimlyPro? "}
              <Link href={switchHref} className={s.switchLink}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </div>
          <Link href="/" className={s.home}>
            <ArrowLeftIcon width="14" height="14" />
            Back to the site
          </Link>
        </div>
      </section>
    </main>
  );
}
