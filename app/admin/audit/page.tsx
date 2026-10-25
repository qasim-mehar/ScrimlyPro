import { getAuditRows } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/**
 * Audit log viewer (admin console, read-only). Filterable by action prefix
 * and actor id. ip_hash is stored for correlation but deliberately NOT
 * rendered (PII discipline — rule 9).
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
      <h1 className="font-display text-2xl font-bold tracking-wide text-white">
        Audit log
      </h1>

      <form method="get" action="/admin/audit" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="action"
          defaultValue={action ?? ""}
          placeholder="Action prefix (e.g. admin.impersonation)"
          className="min-h-10 w-72 rounded-lg border border-line bg-surface px-3 text-sm text-white placeholder:text-muted"
        />
        <input
          type="search"
          name="actor"
          defaultValue={actor ?? ""}
          placeholder="Actor user id (uuid)"
          className="min-h-10 w-72 rounded-lg border border-line bg-surface px-3 text-sm text-white placeholder:text-muted"
        />
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-gold px-4 font-display text-sm font-semibold text-bg"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No audit rows match.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Actor</th>
              <th className="py-2 pr-4">Effective</th>
              <th className="py-2 pr-4">Target</th>
              <th className="py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/50 align-top">
                <td className="py-2 pr-4 text-muted">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-white">{r.action}</td>
                <td className="py-2 pr-4 font-mono text-xs text-muted">
                  {r.actorUserId ? `${r.actorUserId.slice(0, 8)}…` : "—"}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-muted">
                  {r.effectiveUserId ? `${r.effectiveUserId.slice(0, 8)}…` : "—"}
                </td>
                <td className="py-2 pr-4 text-muted">
                  {r.targetType ?? "—"}
                  {r.targetId && (
                    <span className="ml-1 font-mono text-xs">{r.targetId.slice(0, 8)}…</span>
                  )}
                </td>
                <td className="py-2 font-mono text-xs text-muted">
                  {JSON.stringify(r.metadata).slice(0, 120)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
