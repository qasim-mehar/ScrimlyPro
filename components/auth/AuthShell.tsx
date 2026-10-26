import Link from "next/link";
import type { ReactNode } from "react";

import { CheckIcon } from "@/components/app/icons";
import { LogoMark, TrophyIcon } from "@/components/dashboard/icons";

/**
 * Shared light shell for the secondary auth screens (signup, forgot, reset,
 * auth error). Login deliberately keeps its existing dark page.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="app-shell min-h-dvh">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[440px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-dash-ink"
            >
              <span className="flex size-8 items-center justify-center rounded-[9px] bg-dash-ink text-white">
                <LogoMark width="17" height="17" />
              </span>
              ScrimlyPro
            </Link>

            <div className="mt-9">
              {eyebrow ? (
                <p className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-1 text-balance text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-dash-ink sm:text-[34px]">
                {title}
              </h1>
              <p className="mt-2 max-w-[44ch] text-sm leading-6 text-dash-ink3">
                {description}
              </p>
            </div>

            <div className="mt-6 rounded-dash-lg bg-dash-surface p-5 sm:p-7">
              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-sm text-dash-ink3">{footer}</div>
            ) : null}

            <p className="mt-8 text-[12px] leading-5 text-dash-ink4">
              Scrims, results, and share links — no noise.
            </p>
          </div>
        </section>

        <div className="hidden p-4 lg:block">
          <aside className="relative sticky top-4 flex h-[calc(100dvh-2rem)] flex-col justify-between overflow-hidden rounded-dash-lg bg-dash-ink p-7 text-white">
            <div aria-hidden="true" className="app-grid absolute inset-0" />
            <div className="relative">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
                <TrophyIcon width="15" height="15" />
                ScrimlyPro
              </p>
              <h2 className="mt-3 text-balance text-[26px] leading-[1.15] font-bold tracking-[-0.025em]">
                From screenshots to final standings.
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-white/55">
                The organizer flow that keeps the crew moving.
              </p>

              <ol className="mt-7 flex flex-col gap-3">
                {[
                  ["01", "Upload the result screens", "Placements, kills, and names get read."],
                  ["02", "Confirm the mapping", "Check the AI read, then lock the numbers."],
                  ["03", "Share the standings", "One link. No account needed to view."],
                ].map(([step, label, detail]) => (
                  <li
                    key={step}
                    className="rounded-dash bg-white/[0.06] px-4 py-3"
                  >
                    <p className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className="text-[11px] tabular-nums text-dash-lime">
                        {step}
                      </span>
                      {label}
                    </p>
                    <p className="mt-0.5 pl-6 text-[12px] leading-5 text-white/45">
                      {detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative rounded-dash-sm bg-white/[0.05] p-3">
              <p className="flex items-start gap-2 text-[12px] leading-5 text-white/60">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
                  <CheckIcon width="12" height="12" />
                </span>
                Built for PUBG Mobile scrim organizers who would rather run
                the lobby than the spreadsheet.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
