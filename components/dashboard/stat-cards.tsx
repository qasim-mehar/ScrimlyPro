import Link from "next/link";

import type { DashboardRange } from "@/lib/dashboard/queries";
import { RANGES } from "@/lib/dashboard/queries";
import type { DashboardStats } from "@/lib/dashboard/queries";

/**
 * Segmented time filter (M5 §4.4): Today / 7 days / 30 days as plain Links
 * (server round-trip — the queries are range-scoped server-side). The org
 * param survives navigation.
 */

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
};

export function RangeFilter({
  active,
  orgParam,
}: {
  active: DashboardRange;
  orgParam?: string;
}) {
  const base = orgParam ? `/dashboard?org=${orgParam}&` : "/dashboard?";
  return (
    <div
      role="group"
      aria-label="Time range"
      className="flex w-fit gap-1 rounded-full bg-dash-bg p-1"
    >
      {RANGES.map((r) => {
        const cls =
          r === active
            ? "rounded-full bg-dash-ink px-4 py-1.5 text-sm font-semibold text-white"
            : "rounded-full px-4 py-1.5 text-sm font-medium text-dash-ink2 hover:text-dash-ink";
        return (
          <Link key={r} href={`${base}range=${r}`} className={cls} aria-current={r === active ? "true" : undefined}>
            {RANGE_LABEL[r]}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Stat cards (M5 §4.4): card 1 dark hero, 2–4 subtle; every number comes
 * from getDashboardData (honesty audit §8). Sub-labels are honest: the
 * delta appears only when there is one; amber only when a draft is ≥24h old.
 */

export function StatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <div className="rounded-dash bg-dash-ink p-5">
        <p className="text-[13px] font-medium text-dash-ink4">Active sessions</p>
        <p className="mt-2 text-4xl font-bold text-white">
          {stats.activeSessions}
        </p>
        <p className="mt-1 text-[13px] text-white/60">
          {stats.matchesInPlay} match{stats.matchesInPlay === 1 ? "" : "es"} in
          play
        </p>
      </div>

      <div className="rounded-dash bg-dash-subtle p-5">
        <p className="text-[13px] font-medium text-dash-ink3">
          Matches processed
        </p>
        <p className="mt-2 text-4xl font-bold text-dash-ink">
          {stats.matchesProcessed}
        </p>
        {stats.matchesDelta > 0 ? (
          <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-dash-success">
            <span aria-hidden="true">↑</span> +{stats.matchesDelta} vs previous
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-dash-ink3">confirmed in range</p>
        )}
      </div>

      <div className="rounded-dash bg-dash-subtle p-5">
        <p className="text-[13px] font-medium text-dash-ink3">
          Awaiting confirmation
        </p>
        <p className="mt-2 text-4xl font-bold text-dash-ink">
          {stats.draftsAwaiting}
        </p>
        {stats.oldestDraftHours !== null && stats.oldestDraftHours >= 24 ? (
          <p className="mt-1 text-[13px] font-medium text-dash-amber-ink">
            oldest {stats.oldestDraftHours}h ago
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-dash-ink3">
            {stats.draftsAwaiting === 0
              ? "no drafts"
              : `${stats.draftsAwaiting} draft${stats.draftsAwaiting === 1 ? "" : "s"} ready`}
          </p>
        )}
      </div>

      <div className="rounded-dash bg-dash-subtle p-5">
        <p className="text-[13px] font-medium text-dash-ink3">Needs attention</p>
        <p className="mt-2 text-4xl font-bold text-dash-ink">
          {stats.needsAttention}
        </p>
        <p className="mt-1 text-[13px] text-dash-ink3">
          {stats.needsAttention > 0 ? "needs action today" : "all clear"}
        </p>
      </div>
    </div>
  );
}
