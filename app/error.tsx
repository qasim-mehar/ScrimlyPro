"use client";

import { useEffect } from "react";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-4xl font-bold tracking-widest text-gold">
        SCRIMLY PRO
      </p>
      <section className="w-full rounded-lg border border-line bg-surface p-4">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error interrupted this page.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-3 break-words rounded-md bg-surface-2 p-2 text-left text-xs text-red-400">
            {error.message}
          </p>
        ) : null}
        {recover ? (
          <button
            type="button"
            onClick={() => recover()}
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
          >
            Try again
          </button>
        ) : null}
      </section>
    </main>
  );
}
