import Link from "next/link";

import type { AdminDashboardData } from "@/lib/admin/dashboard-queries";
import { RANGE_LABELS } from "@/lib/admin/dashboard-queries";

/**
 * User lifecycle pipeline (§4.4): stacked 40px bar, five segments with the
 * reference color rhythm (gray, lime, gray, gray, black), widths = counts
 * (min 4% when nonzero). "Average activation" is the honest mean of
 * (first org join − profile creation) for members who joined in range —
 * "—" when nobody joined (timestamps don't support a number).
 */
export function LifecyclePipeline({
  lifecycle,
  range,
}: {
  lifecycle: AdminDashboardData["lifecycle"];
  range: AdminDashboardData["range"];
}) {
  const stages = [
    { key: "signups", label: "Signups", count: lifecycle.signups, color: "var(--hq-line)" },
    { key: "joined", label: "Joined org", count: lifecycle.joinedOrg, color: "var(--hq-lime)" },
    { key: "active", label: `Active · ${RANGE_LABELS[range]}`, count: lifecycle.activeInRange, color: "var(--hq-line)" },
    { key: "quota", label: "Quota ≥80%", count: lifecycle.nearQuota, color: "var(--hq-line)" },
    { key: "disabled", label: "Disabled", count: lifecycle.disabled, color: "var(--hq-ink)" },
  ];
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const widths = stages.map((s) => {
    if (total === 0) return 0;
    if (s.count === 0) return 0;
    return Math.max(4, (s.count / total) * 100);
  });

  return (
    <section className="hq-card p-6" aria-label="User lifecycle">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[var(--hq-ink)]">User lifecycle</h2>
        <div className="flex items-baseline gap-4">
          <span className="text-[13px] text-[var(--hq-ink-4)]">
            Average activation{" "}
            {lifecycle.averageActivationDays == null
              ? "—"
              : `${lifecycle.averageActivationDays}d`}
          </span>
          <Link
            href="/admin/tenants"
            className="text-[14px] font-semibold text-[var(--hq-ink)] hover:underline"
          >
            Open →
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-4">
          <div className="h-2 rounded-[12px] bg-[var(--hq-line)]" aria-hidden />
          <p className="mt-3 text-[13px] text-[var(--hq-ink-4)]">
            No users in range.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex h-10 gap-1" role="img" aria-label="Lifecycle funnel bar">
            {stages.map((s, i) =>
              widths[i] > 0 ? (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.count}`}
                  className="flex h-full items-center justify-center overflow-hidden rounded-[12px]"
                  style={{ width: `${widths[i]}%`, backgroundColor: s.color }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {stages.map((s) => (
              <div key={s.key} className="min-w-0">
                <p className="text-[14px] font-bold text-[var(--hq-ink)]">
                  {s.count.toLocaleString("en-US")}
                </p>
                <p className="truncate text-[13px] text-[var(--hq-ink-4)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
