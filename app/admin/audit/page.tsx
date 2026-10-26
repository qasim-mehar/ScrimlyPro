import Link from "next/link";

import { getAuditRows } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/**
 * Audit log viewer (admin console, read-only). Filterable by action prefix
 * and actor id. ip_hash is stored for correlation but deliberately NOT
 * rendered (PII discipline — rule 9).
 * M6: restyled into the light shell — queries and filters unchanged.
 */
export default async function AdminAudit({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string }>;
}) {
  await requireAdmin();
  const { action, actor } = await searchParams;
  const rows = await getAuditRows({ actionPrefix: action ?? "", actorUserId: actor ?? "" });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--hq-ink-3)] transition-colors hover:text-[var(--hq-ink)] lg:hidden"
        >
          ← Overview
        </Link>
        <h1 className="text-[24px] font-bold text-[var(--hq-ink)]">Audit log</h1>
        <p className="mt-1 text-[13px] text-[var(--hq-ink-3)]">
          Append-only security events · ip_hash deliberately not rendered
          {rows.length === 200
            ? " · showing the latest 200 — narrow with a filter to see more"
            : ""}
        </p>
      </div>

      <form method="get" action="/admin/audit" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="action"
          defaultValue={action ?? ""}
          placeholder="Action prefix (e.g. admin.impersonation)"
          className="h-10 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-sm text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)] sm:w-72"
        />
        <input
          type="search"
          name="actor"
          defaultValue={actor ?? ""}
          placeholder="Actor user id (uuid)"
          className="h-10 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-sm text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)] sm:w-72"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-[var(--hq-ink)] px-5 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>

      <section className="hq-card overflow-hidden" aria-label="Audit log">
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--hq-ink-3)]">
            No audit rows match.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="hq-table-head">
                <th scope="col" className="px-6 py-2.5 font-medium">Time</th>
                <th scope="col" className="py-2.5 font-medium">Action</th>
                <th scope="col" className="py-2.5 font-medium">Actor</th>
                <th scope="col" className="py-2.5 font-medium">Effective</th>
                <th scope="col" className="py-2.5 font-medium">Target</th>
                <th scope="col" className="px-6 py-2.5 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hq-table-row align-top">
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] text-[var(--hq-ink-3)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4 pr-4">
                    <span className="hq-chip bg-[var(--hq-bg)] font-mono text-[11px] text-[var(--hq-ink-2)]">
                      {r.action}
                    </span>
                  </td>
                  <td className="py-4 pr-4 font-mono text-[12px] text-[var(--hq-ink-3)]">
                    {r.actorUserId ? `${r.actorUserId.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="py-4 pr-4 font-mono text-[12px] text-[var(--hq-ink-3)]">
                    {r.effectiveUserId ? `${r.effectiveUserId.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="py-4 pr-4 text-[13px] text-[var(--hq-ink-3)]">
                    {r.targetType ?? "—"}
                    {r.targetId && (
                      <span className="ml-1 font-mono text-[12px]">
                        {r.targetId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="max-w-[260px] py-4 pr-6">
                    <span className="block truncate font-mono text-[12px] text-[var(--hq-ink-3)]">
                      {JSON.stringify(r.metadata).slice(0, 120)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
