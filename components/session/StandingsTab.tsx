"use client";

import clsx from "clsx";

import { EmptyState } from "@/components/app/ui";
import { ChartIcon } from "@/components/dashboard/icons";
import type { StandingRow } from "@/lib/scoring";

type RankedStanding = StandingRow & { rank: number };

export function StandingsTab({
  standings,
  confirmedCount,
}: {
  standings: RankedStanding[];
  confirmedCount: number;
}) {
  if (confirmedCount === 0) {
    return (
      <EmptyState
        icon={<ChartIcon width="22" height="22" />}
        title="Standings unlock after match one"
        description="Confirm the first match and the cumulative table appears here automatically."
        className="bg-dash-bg py-10"
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-dash-ink">Overall standings</h2>
        <p className="text-[13px] text-dash-ink3">
          After {confirmedCount} confirmed match{confirmedCount === 1 ? "" : "es"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-dash border border-dash-line">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">
            Cumulative standings after {confirmedCount} confirmed matches
          </caption>
          <thead>
            <tr className="bg-dash-bg text-left text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Rank
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Team
              </th>
              <th
                scope="col"
                className="px-2 py-2.5 text-center font-semibold"
                title="Winner winner chicken dinner"
              >
                WWCD
              </th>
              <th scope="col" className="px-2 py-2.5 text-center font-semibold">
                PP
              </th>
              <th scope="col" className="px-2 py-2.5 text-center font-semibold">
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
            {standings.map((row) => (
              <tr
                key={row.teamId}
                className={clsx(
                  "border-t border-dash-bg",
                  row.rank === 1
                    ? "bg-dash-lime/35"
                    : "odd:bg-dash-subtle/60 hover:bg-dash-bg/70",
                )}
              >
                <td className="px-3 py-2.5">
                  <span
                    className={clsx(
                      "flex size-7 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                      row.rank === 1
                        ? "bg-dash-ink text-white"
                        : row.rank <= 3
                          ? "bg-dash-lime text-dash-lime-ink"
                          : "text-dash-ink3",
                    )}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="max-w-[180px] px-3 py-2.5">
                  <span className="flex min-h-[36px] items-center gap-2.5">
                    {row.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URLs: raw img required
                      <img
                        src={row.logoUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-[8px] object-contain"
                      />
                    ) : null}
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
                  className={clsx(
                    "px-3 py-2.5 text-right font-bold tabular-nums",
                    row.rank === 1 ? "text-dash-ink" : "text-dash-ink2",
                  )}
                >
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-dash-ink3">
        WWCD = winner winner chicken dinner · PP = placement points · KP =
        elimination points. Ties break on WWCD, then eliminations, then
        placement points.
      </p>
    </div>
  );
}
