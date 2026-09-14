"use client";

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
      <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
        Standings appear after the first confirmed match
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[340px] border-collapse text-sm">
        <caption className="sr-only">Cumulative standings</caption>
        <thead>
          <tr className="bg-surface-2 text-left text-xs tracking-widest text-muted">
            <th scope="col" className="px-2 py-2 font-semibold">
              RANK
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              TEAM
            </th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">
              WWCD
            </th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">
              PP
            </th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">
              KP
            </th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr
              key={row.teamId}
              className={
                row.rank === 1
                  ? "border-t border-line bg-gold/10 text-gold"
                  : "border-t border-line bg-surface odd:bg-surface-2/40"
              }
            >
              <td className="px-2 py-2 font-semibold">{row.rank}</td>
              <td className="max-w-[140px] px-2 py-2">
                <span className="flex min-h-[44px] items-center gap-2">
                  {row.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URLs: raw img required
                    <img
                      src={row.logoUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="h-[44px] w-[44px] shrink-0 rounded object-contain"
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{row.teamName}</span>
                </span>
              </td>
              <td className="px-2 py-2 text-center">{row.wwcd}</td>
              <td className="px-2 py-2 text-center">{row.pp}</td>
              <td className="px-2 py-2 text-center">{row.kp}</td>
              <td className="px-2 py-2 text-center font-semibold">
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
