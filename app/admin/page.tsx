import { GlobalStopButton } from "@/components/admin/GlobalStopButton";
import { getDashboardMetrics } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/**
 * Admin dashboard: platform usage counters + live impersonation sessions.
 * Plain tables, zero chart deps (operator console brief §5).
 */
export default async function AdminDashboard() {
  await requireAdmin();
  const m = await getDashboardMetrics();

  const stats = [
    { label: "Users", value: m.users },
    { label: "Sessions", value: m.sessions },
    { label: "Matches", value: m.matches },
    {
      label: "OCR calls (7d)",
      // M3-INT (wave1(9)): wired to usage_events (per-user enforcement,
      // platform-wide rollup shown here).
      value: m.ocrCalls7d,
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold tracking-wide text-white">
        Platform dashboard
      </h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-line bg-surface p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {s.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-white">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold text-white">
          Active impersonations
        </h2>
        {m.activeImpersonations.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None active.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2 pr-4">Viewing as</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Started</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2">Stop</th>
              </tr>
            </thead>
            <tbody>
              {m.activeImpersonations.map((imp) => (
                <tr key={imp.id} className="border-b border-line/50">
                  <td className="py-2 pr-4 font-mono text-xs text-muted">
                    {imp.adminUserId.slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-4 text-white">{imp.targetEmail}</td>
                  <td className="py-2 pr-4 text-muted">{imp.reason}</td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(imp.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(imp.expiresAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <GlobalStopButton impersonationId={imp.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
