import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { ShareStandingsPreview } from "@/components/graphics/ShareStandingsPreview";
import { getTemplate } from "@/lib/graphics";
import { standingsSubtitle } from "@/lib/graphics/standings";
import { getSharedStandings } from "@/lib/share/public-reader";
import { checkShareRateLimit, shareIpFromHeaders } from "@/lib/share/rate-limit";
import { ButtonLink } from "@/components/app/ui";
import { ArrowUpRightIcon, ChartIcon, LogoMark, TrophyIcon } from "@/components/dashboard/icons";
import { GlobeIcon } from "@/components/app/icons";

export const dynamic = "force-dynamic";

// robots: the share surface is unlisted — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * /share/[token] — public standings page. Server-guarded by design:
 * - token is hashed and looked up through lib/share/public-reader.ts (the
 *   ONLY request-path admin-client consumer) → EXACTLY one session's public
 *   projection: standings rows, team names, scrim name, match counts.
 * - unknown / revoked / expired tokens all render the 404 page
 *   (indistinguishable).
 * - 60 req/IP/min limiter; force-dynamic renders carry no-store semantics;
 *   robots noindex above.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const limit = checkShareRateLimit(shareIpFromHeaders(await headers()));
  if (!limit.ok) {
    return (
      <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-dash-lg bg-dash-surface p-6 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-dash-sm bg-dash-amber-bg text-dash-amber-ink">
            <ChartIcon width="20" height="20" />
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-dash-ink">
            Too many requests
          </h1>
          <p className="mt-2 text-sm leading-6 text-dash-ink3">
            Slow down a little and reload in{" "}
            {Math.ceil(limit.retryAfterSeconds / 5) * 5}s.
          </p>
          <ButtonLink href="/" variant="secondary" className="mt-5">
            Go to ScrimlyPro
          </ButtonLink>
        </section>
      </main>
    );
  }

  const data = await getSharedStandings(token);
  if (!data) notFound();

  const config = getTemplate(
    data.templateId as Parameters<typeof getTemplate>[0],
  );
  const subtitle = standingsSubtitle(
    data.confirmedCount,
    data.confirmedCount >= data.plannedMatches,
  );
  const isFinal = data.confirmedCount >= data.plannedMatches;

  return (
    <main className="app-shell min-h-dvh">
      <header className="border-b border-dash-line bg-dash-surface">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-bold tracking-[-0.01em] text-dash-ink"
          >
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-dash-ink text-white">
              <LogoMark width="15" height="15" />
            </span>
            ScrimlyPro
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-dash-chip bg-dash-bg px-2.5 py-1 text-[11px] font-semibold text-dash-ink2">
            <GlobeIcon width="13" height="13" />
            Public standings
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-dash-ink text-white">
        <div aria-hidden="true" className="app-grid absolute inset-0" />
        <div className="relative mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
            <TrophyIcon width="15" height="15" />
            {isFinal
              ? "Final standings"
              : data.confirmedCount === 0
                ? "Standings preview"
                : "Standings in progress"}
          </p>
          <h1 className="mt-2 max-w-[22ch] text-balance break-words text-[30px] leading-[1.1] font-bold tracking-[-0.03em] sm:text-[40px]">
            {data.scrimName}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-dash-chip bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {data.confirmedCount}/{data.plannedMatches} matches confirmed
            </span>
            <span className="rounded-dash-chip bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {data.standings.length} teams
            </span>
            <span className="rounded-dash-chip bg-dash-lime px-2.5 py-1 text-[11px] font-semibold text-dash-ink">
              {isFinal
                ? "Complete"
                : data.confirmedCount === 0
                  ? "Awaiting results"
                  : "Live"}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <section
            aria-labelledby="table-heading"
            className="min-w-0 rounded-dash-lg bg-dash-surface p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2
                  id="table-heading"
                  className="text-lg font-bold tracking-[-0.01em] text-dash-ink"
                >
                  Overall standings
                </h2>
                <p className="mt-0.5 text-[12px] text-dash-ink3">
                  {isFinal
                    ? "All planned matches confirmed."
                    : `After ${data.confirmedCount} confirmed match${
                        data.confirmedCount === 1 ? "" : "es"
                      }.`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-dash-chip bg-dash-bg px-2.5 py-1 text-[11px] font-semibold text-dash-ink2">
                <ChartIcon width="13" height="13" />
                Readable table
              </span>
            </div>

            <div className="mt-4 max-w-full overflow-x-auto rounded-dash border border-dash-line">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <caption className="sr-only">
                  Overall standings for {data.scrimName} after{" "}
                  {data.confirmedCount} confirmed matches. Ranked by total
                  points.
                </caption>
                <thead>
                  <tr className="bg-dash-bg text-left text-[10px] font-semibold tracking-wide text-dash-ink3 uppercase">
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Rank
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Team
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2.5 text-center font-semibold"
                      aria-label="WWCD — winner winner chicken dinner"
                    >
                      WWCD
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2.5 text-center font-semibold"
                      aria-label="Placement points"
                    >
                      PP
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2.5 text-center font-semibold"
                      aria-label="Kill points"
                    >
                      KP
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-right font-semibold"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.standings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10 text-center text-[13px] text-dash-ink3"
                      >
                        No confirmed results yet. The table fills in as the
                        organizer confirms matches.
                      </td>
                    </tr>
                  ) : (
                    data.standings.map((row) => (
                      <tr
                        key={row.teamId}
                        className={
                          row.rank === 1
                            ? "border-t border-dash-bg bg-dash-lime/35"
                            : "border-t border-dash-bg odd:bg-dash-subtle/60 hover:bg-dash-bg/70"
                        }
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              row.rank === 1
                                ? "flex size-7 items-center justify-center rounded-full bg-dash-ink text-xs font-bold tabular-nums text-white"
                                : row.rank <= 3
                                  ? "flex size-7 items-center justify-center rounded-full bg-dash-lime text-xs font-bold tabular-nums text-dash-lime-ink"
                                  : "flex size-7 items-center justify-center rounded-full text-xs font-bold tabular-nums text-dash-ink3"
                            }
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-3 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-dash-bg text-[10px] font-bold text-dash-ink2"
                            >
                              {row.teamName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="min-w-0 truncate font-semibold text-dash-ink">
                              {row.teamName}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-dash-ink2">
                          {row.wwcd}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-dash-ink2">
                          {row.pp}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-dash-ink2">
                          {row.kp}
                        </td>
                        <td
                          className={
                            row.rank === 1
                              ? "px-3 py-2.5 text-right font-bold tabular-nums text-dash-ink"
                              : "px-3 py-2.5 text-right font-bold tabular-nums text-dash-ink2"
                          }
                        >
                          {row.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-dash-ink3 sm:hidden">
              Swipe the table sideways for all six columns.
            </p>
            <p className="mt-3 text-[11px] leading-5 text-dash-ink3">
              WWCD = winner winner chicken dinner · PP = placement points · KP
              = kill points. Ties break on WWCD, then eliminations, then
              placement points.
            </p>
          </section>

          <ShareStandingsPreview
            config={config}
            title={data.scrimName}
            subtitle={subtitle}
            standings={data.standings}
            confirmedCount={data.confirmedCount}
          />
        </div>

        <footer className="mt-6 flex flex-col gap-2 border-t border-dash-line py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-5 text-dash-ink3">
            Shared via ScrimlyPro — standings only; no accounts or personal
            data.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-dash-ink2 hover:text-dash-ink"
          >
            scrimlypro.com
            <ArrowUpRightIcon width="13" height="13" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
