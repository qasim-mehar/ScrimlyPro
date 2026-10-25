import Link from "next/link";

import type { AttentionSessionRow } from "@/lib/dashboard/queries";

/**
 * Needs-attention table (M5 §4.4): sessions with unresolved items. Rows are
 * links to the session detail. Stage chips map to real states only —
 * "OCR pending" (stale draft, amber) and "Finalizing" (completed, unshared,
 * neutral); the reference's red "Read failed" has no data source (failed
 * OCR attempts are never recorded) and is not rendered.
 */

function StageChip({ stage }: { stage: AttentionSessionRow["stage"] }) {
  if (stage === "ocr-pending") {
    return (
      <span className="rounded-dash-chip bg-dash-amber-bg px-2 py-1 text-xs font-semibold text-dash-amber-ink">
        OCR pending
      </span>
    );
  }
  return (
    <span className="rounded-dash-chip bg-dash-subtle px-2 py-1 text-xs font-semibold text-dash-ink2 ring-1 ring-dash-line">
      Finalizing
    </span>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function AttentionTable({
  rows,
  renderedAt,
}: {
  rows: AttentionSessionRow[];
  renderedAt: Date;
}) {
  return (
    <section id="attention" className="rounded-dash bg-dash-surface">
      <div className="px-6 pb-1 pt-5">
        <h2 className="text-xl font-bold text-dash-ink">Needs attention</h2>
        <p className="mt-1 text-[13px] text-dash-ink3">
          {rows.length} session{rows.length === 1 ? "" : "s"} flagged ·
          updated {formatTime(renderedAt)}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 pb-6 pt-4 text-sm text-dash-ink3">
          Nothing needs attention
        </p>
      ) : (
        <table className="mt-3 w-full text-left">
          <thead>
            <tr className="bg-dash-subtle text-[13px] font-medium text-dash-ink3">
              <th scope="col" className="px-6 py-2.5 font-medium">
                Session
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Detail
              </th>
              <th scope="col" className="px-6 py-2.5 text-right font-medium">
                Stage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sessionId} className="border-t border-dash-bg hover:bg-dash-subtle">
                <td className="px-6 py-4 align-middle">
                  <Link href={`/sessions/${row.sessionId}`} className="block">
                    <span className="block text-sm font-bold text-dash-ink">
                      {row.code}
                    </span>
                    <span className="block truncate text-[13px] text-dash-ink3">
                      {row.name}
                    </span>
                  </Link>
                </td>
                <td className="max-w-0 px-3 py-4 align-middle">
                  <span className="block truncate text-sm font-semibold text-dash-ink">
                    {row.primary}
                  </span>
                  <span className="block truncate text-[13px] text-dash-ink3">
                    {row.secondary}
                  </span>
                </td>
                <td className="px-6 py-4 text-right align-middle">
                  <StageChip stage={row.stage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
