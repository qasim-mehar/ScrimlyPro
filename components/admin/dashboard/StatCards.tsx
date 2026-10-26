import type { AdminDashboardData } from "@/lib/admin/dashboard-queries";
import { RANGE_LABELS } from "@/lib/admin/dashboard-queries";

/**
 * Stat cards (§4.4): dark hero card (total users) + three light cards —
 * sessions in range with the honest prior-window delta, AI reads in range
 * (amber sub = users near quota; failed reads are not metered so the
 * reference's "failed" sub-label is honestly replaced), and the derived
 * needs-attention count.
 */

function DeltaLabel({ delta, range }: { delta: number | null; range: string }) {
  if (delta == null || delta === 0) {
    return <span className="text-[13px] text-[var(--hq-ink-3)]">No change · {range}</span>;
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--hq-success)]">
        ↑ +{delta} vs prior {range}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-[var(--hq-ink-3)]">
      ↓ {delta} vs prior {range}
    </span>
  );
}

export function StatCards({
  stats,
  ai,
  range,
}: {
  stats: AdminDashboardData["stats"];
  ai: AdminDashboardData["ai"];
  range: AdminDashboardData["range"];
}) {
  const rangeLabel = RANGE_LABELS[range].toLowerCase();

  return (
    <div className="grid grid-cols-2 gap-4 min-[1920px]:grid-cols-4">
      {/* Dark hero: total users. */}
      <div className="rounded-[20px] bg-[var(--hq-ink)] p-5">
        <p className="text-[13px] font-medium text-white/50">Total users</p>
        <p className="mt-2 text-[36px] font-bold leading-none text-white">
          {stats.users.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-[13px] text-white/60">
          {stats.orgs.toLocaleString("en-US")} organization
          {stats.orgs === 1 ? "" : "s"}
        </p>
      </div>

      <div className="hq-card p-5">
        <p className="text-[13px] font-medium text-[var(--hq-ink-3)]">
          Sessions · {RANGE_LABELS[range]}
        </p>
        <p className="mt-2 text-[32px] font-bold leading-none text-[var(--hq-ink)]">
          {stats.sessionsInRange.toLocaleString("en-US")}
        </p>
        <p className="mt-2">
          <DeltaLabel delta={stats.sessionsDelta} range={rangeLabel} />
        </p>
      </div>

      <div className="hq-card p-5">
        <p className="text-[13px] font-medium text-[var(--hq-ink-3)]">
          AI reads · {RANGE_LABELS[range]}
        </p>
        <p className="mt-2 text-[32px] font-bold leading-none text-[var(--hq-ink)]">
          {stats.readsInRange.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-[13px] text-[var(--hq-ink-3)]">
          {ai.nearQuotaCount > 0 ? (
            <span className="font-semibold text-[var(--hq-amber-ink)]">
              {ai.nearQuotaCount} user{ai.nearQuotaCount === 1 ? "" : "s"} near quota
            </span>
          ) : (
            "Metered reads"
          )}
        </p>
      </div>

      <div className="hq-card p-5">
        <p className="text-[13px] font-medium text-[var(--hq-ink-3)]">
          Needs attention
        </p>
        <p className="mt-2 text-[32px] font-bold leading-none text-[var(--hq-ink)]">
          {stats.attentionCount.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-[13px] text-[var(--hq-ink-3)]">
          {stats.attentionCount > 0 ? "Needs action today" : "All clear"}
        </p>
      </div>
    </div>
  );
}
