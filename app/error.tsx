"use client";

import { useEffect } from "react";

import { ButtonLink, buttonStyles } from "@/components/app/ui";
import { AlertIcon, LogoMark } from "@/components/dashboard/icons";

/**
 * Root route-segment error boundary. Next 16.3 exposes `retry` (stable) and
 * `reset`; prefer `retry` when present, fall back to `reset` so the fallback
 * UI works across both prop shapes.
 */
export default function Error({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const recover = retry ?? reset;

  return (
    <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="mx-auto flex w-fit items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-dash-ink">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-dash-ink text-white">
            <LogoMark width="17" height="17" />
          </span>
          ScrimlyPro
        </p>

        <section className="mt-5 rounded-dash-lg bg-dash-surface p-6 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-dash bg-dash-danger-bg text-dash-danger-ink">
            <AlertIcon width="22" height="22" />
          </span>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-[-0.025em] text-dash-ink sm:text-3xl">
            Something went wrong.
          </h1>
          <p className="mt-2 max-w-[48ch] text-sm leading-6 text-dash-ink3">
            An unexpected error interrupted this page. Nothing was lost — try
            the same action again.
          </p>

          {process.env.NODE_ENV === "development" ? (
            <p className="mt-4 break-words rounded-dash-sm bg-dash-bg p-3 text-left font-mono text-[12px] leading-5 text-dash-danger-ink">
              {error.message}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {recover ? (
              <button
                type="button"
                onClick={() => recover()}
                className={buttonStyles.primary}
              >
                Try again
              </button>
            ) : null}
            <ButtonLink href="/dashboard" variant="secondary">
              Go to dashboard
            </ButtonLink>
          </div>
        </section>

        <p className="mt-4 text-center text-[12px] leading-5 text-dash-ink4">
          Still stuck? Reload the page or head back to the dashboard.
        </p>
      </div>
    </main>
  );
}
