import Link from "next/link";

import { getTenantList } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { TenantActions } from "./tenant-actions";

export const dynamic = "force-dynamic";

/**
 * Tenant console: searchable user list with usage counts and the disable /
 * impersonate controls (wired to the audited admin API routes).
 * M6: restyled into the light shell — queries, guards and actions unchanged.
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
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--hq-ink-3)] transition-colors hover:text-[var(--hq-ink)] lg:hidden"
        >
          ← Overview
        </Link>
        <h1 className="text-[24px] font-bold text-[var(--hq-ink)]">Users</h1>
        <p className="mt-1 text-[13px] text-[var(--hq-ink-3)]">
          Read-only list · disable/impersonate actions are audited
        </p>
      </div>

      <form method="get" action="/admin/tenants" className="flex w-full max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by email or user id…"
          className="h-10 min-w-0 flex-1 rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-sm text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)]"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-[var(--hq-ink)] px-5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <section className="hq-card overflow-hidden" aria-label="Tenants">
        {tenants.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--hq-ink-3)]">
            No users match.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="hq-table-head">
                <th scope="col" className="px-6 py-2.5 font-medium">
                  Email
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Created
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Sessions
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Matches
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="hq-table-row">
                  <td className="max-w-[240px] px-6 py-4">
                    <span className="block truncate text-[14px] font-semibold text-[var(--hq-ink)]">
                      {t.email ?? "(no email)"}
                    </span>
                    <span className="mt-0.5 block font-mono text-[12px] text-[var(--hq-ink-3)]">
                      {t.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-[13px] text-[var(--hq-ink-3)]">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 pr-4 text-[14px] font-semibold text-[var(--hq-ink)]">
                    {t.sessionCount}
                  </td>
                  <td className="py-4 pr-4 text-[14px] text-[var(--hq-ink-2)]">
                    {t.matchCount}
                  </td>
                  <td className="py-4 pr-4">
                    {t.disabled ? (
                      <span className="hq-chip bg-[var(--hq-danger-bg)] text-[var(--hq-danger-ink)]">
                        Disabled
                      </span>
                    ) : (
                      <span className="hq-chip bg-[var(--hq-bg)] text-[var(--hq-ink-3)]">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <TenantActions userId={t.id} email={t.email} disabled={t.disabled} />
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
