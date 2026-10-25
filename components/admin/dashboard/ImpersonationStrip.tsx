import { GlobalStopButton } from "@/components/admin/GlobalStopButton";
import type { ActiveImpersonationRow } from "@/lib/admin/dashboard-queries";

/**
 * Active-impersonation strip (§5: "dashboard row context"): the support
 * sessions live right now, with the existing audited stop control. Hidden
 * entirely when none are active (0-badge-hidden rule).
 */
export function ImpersonationStrip({
  rows,
}: {
  rows: ActiveImpersonationRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section
      id="impersonations"
      className="hq-card overflow-hidden"
      aria-label="Active impersonations"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-3 pt-5">
        <h2 className="text-[16px] font-bold text-[var(--hq-ink)]">
          Active impersonations
        </h2>
        <p className="text-[13px] text-[var(--hq-ink-3)]">
          {rows.length} live · 30-minute expiry
        </p>
      </div>
      <ul className="border-t border-[var(--hq-bg)]">
        {rows.map((row) => (
          <li
            key={row.id}
            className="hq-table-row flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4"
          >
            <span className="min-w-[180px] truncate text-[14px] font-semibold text-[var(--hq-ink)]">
              {row.targetEmail}
            </span>
            <span className="min-w-[160px] flex-1 truncate text-[13px] text-[var(--hq-ink-3)]">
              {row.reason}
            </span>
            <span className="text-[13px] text-[var(--hq-ink-3)]">
              expires{" "}
              {new Date(row.expiresAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <GlobalStopButton impersonationId={row.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
