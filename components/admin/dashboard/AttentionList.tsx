import Link from "next/link";

import { IconSparkles } from "@/components/admin/shell/icons";
import type { AttentionEntity } from "@/lib/admin/dashboard-queries";

/**
 * Attention list (§4.4): the top-6 ranked attention entities with risk
 * chips and honest due dates. "Ranked by Scrimly AI" is deterministic rule
 * branding — severity, then the longest-standing issue first.
 */

function riskChip(severity: AttentionEntity["severity"]) {
  return severity === "high" ? (
    <span className="hq-chip bg-[var(--hq-danger-bg)] text-[var(--hq-danger-ink)]">
      High
    </span>
  ) : (
    <span className="hq-chip bg-[var(--hq-amber-bg)] text-[var(--hq-amber-ink)]">
      Medium
    </span>
  );
}

function dueLabel(dueAt: string | null): string {
  if (!dueAt) return "—";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AttentionList({ rows }: { rows: AttentionEntity[] }) {
  const top = rows.slice(0, 6);

  return (
    <section className="hq-card overflow-hidden" aria-label="Attention list">
      <div className="flex flex-wrap items-center gap-2 px-6 pb-3 pt-5">
        <h2 className="text-[16px] font-bold text-[var(--hq-ink)]">Attention</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hq-lime)] px-2.5 py-1 text-[12px] font-semibold text-[var(--hq-ink)]">
          <IconSparkles size={12} />
          Ranked by Scrimly AI
        </span>
        <span className="ml-auto text-[13px] text-[var(--hq-ink-3)]">
          {rows.length} open
        </span>
      </div>

      {top.length === 0 ? (
        <div className="border-t border-[var(--hq-bg)] px-6 py-10 text-sm text-[var(--hq-ink-3)]">
          Nothing at risk.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="hq-table-head">
              <th scope="col" className="px-6 py-2 font-medium">
                Blocker
              </th>
              <th scope="col" className="py-2 font-medium">
                Risk
              </th>
              <th scope="col" className="px-6 py-2 text-right font-medium">
                Due
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((row) => (
              <tr key={row.key} className="hq-table-row">
                <td className="max-w-[260px] px-6 py-4">
                  <span className="block truncate text-[14px] text-[var(--hq-ink-2)]">
                    {row.detail} · <span className="font-semibold">{row.entityName}</span>
                  </span>
                </td>
                <td className="py-4 pr-4">{riskChip(row.severity)}</td>
                <td className="px-6 py-4 text-right text-[14px] text-[var(--hq-ink-2)]">
                  {dueLabel(row.dueAt)}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}

      {rows.length > 6 && (
        <div className="border-t border-[var(--hq-bg)] px-6 py-3">
          <Link
            href="/admin/tenants"
            className="text-[14px] font-semibold text-[var(--hq-ink)] hover:underline"
          >
            View all →
          </Link>
        </div>
      )}
    </section>
  );
}
