import { getTenantList } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { TenantActions } from "./tenant-actions";

export const dynamic = "force-dynamic";

/**
 * Tenant console: searchable user list with usage counts and the disable /
 * impersonate controls (wired to the audited admin API routes).
 */
export default async function AdminTenants({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = q ?? "";
  const tenants = await getTenantList(query);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-wide text-white">
        Tenants
      </h1>

      <form method="get" action="/admin/tenants" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by email or user id…"
          className="min-h-10 w-full max-w-md rounded-lg border border-line bg-surface px-3 text-sm text-white placeholder:text-muted"
        />
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-gold px-4 font-display text-sm font-semibold text-bg"
        >
          Search
        </button>
      </form>

      {tenants.length === 0 ? (
        <p className="text-sm text-muted">No users match.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Sessions</th>
              <th className="py-2 pr-4">Matches</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-line/50">
                <td className="py-2 pr-4">
                  <span className="text-white">{t.email ?? "(no email)"}</span>
                  <span className="ml-2 font-mono text-xs text-muted">
                    {t.id.slice(0, 8)}…
                  </span>
                </td>
                <td className="py-2 pr-4 text-muted">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4 text-white">{t.sessionCount}</td>
                <td className="py-2 pr-4 text-white">{t.matchCount}</td>
                <td className="py-2 pr-4">
                  {t.disabled ? (
                    <span className="rounded bg-red-950 px-2 py-0.5 text-xs font-semibold text-red-400">
                      disabled
                    </span>
                  ) : (
                    <span className="text-xs text-muted">active</span>
                  )}
                </td>
                <td className="py-2">
                  <TenantActions userId={t.id} disabled={t.disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
