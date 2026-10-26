import Link from "next/link";

import { TimeFilter } from "@/components/admin/dashboard/TimeFilter";
import {
  getOrgRows,
  parseRange,
  RANGE_LABELS,
} from "@/lib/admin/dashboard-queries";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/**
 * Organizations (NEW, read-only — §6): org table sorted by in-range
 * activity — name, owner email, members, sessions/AI reads in range, and
 * the Active / Quota warnings / Disabled status. Row action: open the owner
 * on /admin/tenants. No org mutations exist anywhere on this page.
 */

function statusChip(status: "active" | "quota" | "disabled") {
  if (status === "disabled") {
    return <span className="hq-chip bg-[var(--hq-ink)] text-white">Disabled</span>;
  }
  if (status === "quota") {
    return (
      <span className="hq-chip bg-[var(--hq-amber-ink)] text-white">Quota warnings</span>
    );
  }
  return (
    <span className="hq-chip bg-[var(--hq-lime)] text-[var(--hq-lime-ink)]">
      Active
    </span>
  );
}

export default async function AdminOrgs({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; q?: string }>;
}) {
  await requireAdmin();
  const { range: rangeParam, q } = await searchParams;
  const range = parseRange(rangeParam);
  const all = await getOrgRows(range);
  const needle = (q ?? "").trim().toLowerCase();
  const rows = needle
    ? all.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.ownerEmail ?? "").toLowerCase().includes(needle),
      )
    : all;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--hq-ink-3)] transition-colors hover:text-[var(--hq-ink)] lg:hidden"
          >
            ← Overview
          </Link>
          <h1 className="text-[24px] font-bold text-[var(--hq-ink)]">
            Organizations
          </h1>
          <p className="mt-1 text-[13px] text-[var(--hq-ink-3)]">
            Read-only · sorted by activity · {RANGE_LABELS[range]} window
          </p>
        </div>
        <TimeFilter range={range} basePath="/admin/orgs" />
      </div>

      <form method="get" action="/admin/orgs" className="flex w-full max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter by org or owner email…"
          className="h-10 min-w-0 flex-1 rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-sm text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)]"
        />
        <input type="hidden" name="range" value={range} />
        <button
          type="submit"
          className="h-10 rounded-full bg-[var(--hq-ink)] px-5 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>

      <section className="hq-card overflow-hidden" aria-label="Organizations">
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--hq-ink-3)]">
            {all.length === 0
              ? "No organizations yet. They appear here as organizers create them."
              : "No organizations match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="hq-table-head">
                <th scope="col" className="px-6 py-2.5 font-medium">
                  Organization
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Owner
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Members
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Sessions · {RANGE_LABELS[range]}
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  AI reads · {RANGE_LABELS[range]}
                </th>
                <th scope="col" className="px-6 py-2.5 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hq-table-row">
                  <td className="max-w-[240px] px-6 py-4">
                    <span className="block truncate text-[14px] font-semibold text-[var(--hq-ink)]">
                      {r.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[var(--hq-ink-3)]">
                      Created{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {r.slug}
                    </span>
                  </td>
                  <td className="max-w-[200px] py-4 pr-4">
                    {r.ownerEmail ? (
                      <Link
                        href={`/admin/tenants?q=${encodeURIComponent(r.ownerEmail)}`}
                        className="block truncate text-[13px] text-[var(--hq-ink-2)] underline-offset-2 hover:underline"
                      >
                        {r.ownerEmail}
                      </Link>
                    ) : (
                      <span className="text-[13px] text-[var(--hq-ink-3)]">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-[14px] font-semibold text-[var(--hq-ink)]">
                    {r.members}
                  </td>
                  <td className="py-4 pr-4 text-[14px] text-[var(--hq-ink-2)]">
                    {r.sessionsInRange}
                  </td>
                  <td className="py-4 pr-4 text-[14px] text-[var(--hq-ink-2)]">
                    {r.readsInRange.toLocaleString("en-US")}
                  </td>
                  <td className="px-6 py-4 text-right">{statusChip(r.status)}</td>
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
