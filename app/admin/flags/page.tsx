import { getFlagRows } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";

import { DeleteFlagButton, FlagForm } from "./flag-form";

export const dynamic = "force-dynamic";

/**
 * Feature-flag console: list + editor. Every write is an audited server
 * action (admin.flag.set / admin.flag.delete). The reserved `disabled`
 * semantics are documented in the editor UI and in the M3 report §5.
 * M6: restyled into the light shell — queries, actions and semantics
 * unchanged.
 */
export default async function AdminFlags() {
  await requireAdmin();
  const flags = await getFlagRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[var(--hq-ink)]">AI &amp; Flags</h1>
        <p className="mt-1 text-[13px] text-[var(--hq-ink-3)]">
          Platform flags · every change is audited (admin.flag.set / delete)
        </p>
      </div>

      <FlagForm />

      <section className="hq-card overflow-hidden" aria-label="Feature flags">
        {flags.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--hq-ink-3)]">
            No flags set.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="hq-table-head">
                <th scope="col" className="px-6 py-2.5 font-medium">
                  Subject
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Flag
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Value
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Updated
                </th>
                <th scope="col" className="px-6 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="hq-table-row">
                  <td className="max-w-[200px] px-6 py-4">
                    <span className="text-[14px] font-semibold text-[var(--hq-ink)]">
                      {f.subjectType}
                    </span>
                    {f.subjectId && (
                      <span className="ml-2 font-mono text-[12px] text-[var(--hq-ink-3)]">
                        {f.subjectId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {f.flag === "disabled" ? (
                      <span className="hq-chip bg-[var(--hq-danger-bg)] text-[var(--hq-danger-ink)]">
                        {f.flag}
                      </span>
                    ) : (
                      <span className="text-[14px] text-[var(--hq-ink)]">{f.flag}</span>
                    )}
                  </td>
                  <td className="max-w-[220px] py-4 pr-4">
                    <span className="block truncate font-mono text-[12px] text-[var(--hq-ink-3)]">
                      {JSON.stringify(f.value).slice(0, 80)}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-[13px] text-[var(--hq-ink-3)]">
                    {new Date(f.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DeleteFlagButton id={f.id} />
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
