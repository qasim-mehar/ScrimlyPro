import Link from "next/link";

import { IconCheck } from "@/components/admin/shell/icons";
import type { AttentionEntity } from "@/lib/admin/dashboard-queries";

/**
 * Needs-attention table (§4.4): flagged users/orgs from the deterministic
 * rules, entity + detail + status chip. Rows link to /admin/tenants (user
 * rows) or /admin/orgs (org rows). Empty state: nothing flagged.
 */

function statusChip(status: string) {
  // Red-tint: Disabled / High · amber: Quota · neutral: Stale
  if (status === "Disabled" || status === "High") {
    return (
      <span className="hq-chip bg-[var(--hq-danger-bg)] text-[var(--hq-danger-ink)]">
        {status}
      </span>
    );
  }
  if (status === "Quota") {
    return (
      <span className="hq-chip bg-[var(--hq-amber-bg)] text-[var(--hq-amber-ink)]">
        {status}
      </span>
    );
  }
  return (
    <span className="hq-chip bg-[var(--hq-bg)] text-[var(--hq-ink-3)]">
      {status}
    </span>
  );
}

export function NeedsAttentionTable({
  rows,
}: {
  rows: AttentionEntity[];
}) {
  // The dashboard is force-dynamic — data is generated per request, so the
  // stream is always live at render time ("updated just now" is literal).
  const updatedLabel = "just now";

  return (
    <section className="hq-card overflow-hidden" aria-label="Needs attention">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-3 pt-5">
        <h2 className="text-[20px] font-bold text-[var(--hq-ink)]">
          Needs attention
        </h2>
        <p className="text-[13px] text-[var(--hq-ink-3)]">
          {rows.length === 0
            ? "Nothing flagged"
            : `${rows.length} entit${rows.length === 1 ? "y" : "ies"} flagged`}{" "}
          · updated {updatedLabel}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-[var(--hq-bg)] px-6 py-10 text-sm text-[var(--hq-ink-3)]">
          <IconCheck size={16} />
          Nothing needs attention.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="hq-table-head">
              <th scope="col" className="px-6 py-2.5 font-medium">
                Entity
              </th>
              <th scope="col" className="py-2.5 font-medium">
                Detail
              </th>
              <th scope="col" className="px-6 py-2.5 text-right font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="hq-table-row">
                <td className="max-w-[220px] px-6 py-4">
                  <Link
                    href={row.href}
                    className="block truncate text-[14px] font-semibold text-[var(--hq-ink)] hover:underline"
                  >
                    {row.entityName}
                  </Link>
                  <span className="mt-0.5 block truncate text-[13px] text-[var(--hq-ink-3)]">
                    {row.entitySub}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className="block truncate text-[14px] font-semibold text-[var(--hq-ink-2)]">
                    {row.detail}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-[var(--hq-ink-3)]">
                    {row.detailSub}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">{statusChip(row.status)}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
