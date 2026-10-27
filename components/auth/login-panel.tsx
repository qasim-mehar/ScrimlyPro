"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { AuthForm } from "@/components/auth/AuthForm";
import s from "./login-panel.module.css";

/** Cascade stagger (see login-panel.module.css). */
const d = (delay: string) => ({ "--d": delay }) as CSSProperties;

/**
 * /login + /signup split-screen shell (Ness editorial system): blank mint
 * photo slot at 41.5%, centered 400px form column, top-right account-switch
 * row. Pure UI — the credential form is the existing AuthForm
 * (variant="login"); no auth logic lives here.
 */
export function LoginPanel({
  mode = "login",
  disabledNotice,
}: {
  mode?: "login" | "signup";
  disabledNotice?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIso(() => setMounted(true), []);
  const signup = mode === "signup";

  return (
    <main className={`${s.root} ${mounted ? s.in : ""}`}>
      <div className={s.topBar}>
        <span className={s.topBarText}>
          {signup ? "Already have an account?" : "Don\u2019t have an account?"}
        </span>
        <a href={signup ? "/login" : "/signup"} className={s.signUp}>
          {signup ? "Sign in" : "Sign up"}
        </a>
      </div>

      <div className={s.leftCell}>
        {/* photo slot — product visual */}
        <div className={s.photoSlot}>
          <Image
            src="/machine.png"
            alt=""
            width={1600}
            height={1600}
            priority
            className={s.slotArt}
          />
        </div>
      </div>

      <div className={s.rightCell}>
        <div className={s.column}>
          <h1 className={s.h1}>{signup ? "Sign up" : "Sign in"}</h1>
          {disabledNotice && (
            <p className={s.notice} role="status">
              {disabledNotice}
            </p>
          )}

          <p className={s.label} style={d("0.12s")}>
            {signup ? "Sign up with Google account" : "Sign in with Google account"}
          </p>
          {/* TODO(backend): Google OAuth via Supabase GoTrue — out of scope here. */}
          <button
            type="button"
            className={s.googleBtn}
            aria-label={
              signup
                ? "Sign up with Google (coming soon)"
                : "Sign in with Google (coming soon)"
            }
            style={d("0.12s")}
            onClick={() => {}}
          >
            <span className={s.gMark} aria-hidden />
            <span className={s.googleLabel}>Google</span>
          </button>

          <div className={s.divider} style={d("0.16s")} />

          <Suspense>
            <AuthForm mode={mode} variant="login" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

/**
 * /forgot-password — same design system, solo composition: a single centered
 * column (no split screen, no photo slot art) with a mint key badge, the
 * existing subcopy, and a "Back to sign in" row.
 */
export function ForgotPanel() {
  const [mounted, setMounted] = useState(false);
  const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIso(() => setMounted(true), []);

  return (
    <main className={`${s.rootSolo} ${mounted ? s.in : ""}`}>
      <div className={s.column}>
        <div className={s.badge} aria-hidden>
          <span className={s.icon}>
            <span className={s.iconKey}>
              <span className={s.tooth} />
            </span>
          </span>
        </div>
        <h1 className={s.h1}>Forgot password?</h1>
        <p className={s.subcopy}>
          Enter your email and we&rsquo;ll send a reset link.
        </p>

        <Suspense>
          <AuthForm mode="forgot" variant="login" />
        </Suspense>

        <div className={s.forgotRow}>
          <a href="/login" className={s.forgotLink}>
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
