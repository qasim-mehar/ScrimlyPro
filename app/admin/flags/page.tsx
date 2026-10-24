import { getFlagRows } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";

import { DeleteFlagButton, FlagForm } from "./flag-form";

export const dynamic = "force-dynamic";

/**
 * Feature-flag console: list + editor. Every write is an audited server
 * action (admin.flag.set / admin.flag.delete). The reserved `disabled`
 * semantics are documented in the editor UI and in the M3 report §5.
 */
export default async function AdminFlags() {
  await requireAdmin();
  const flags = await getFlagRows();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-wide text-white">
        Feature flags
      </h1>

      <FlagForm />

      {flags.length === 0 ? (
        <p className="text-sm text-muted">No flags set.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Flag</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2 pr-4">Updated</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-line/50">
                <td className="py-2 pr-4">
                  <span className="text-white">{f.subjectType}</span>
                  {f.subjectId && (
                    <span className="ml-2 font-mono text-xs text-muted">
                      {f.subjectId.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {f.flag === "disabled" ? (
                    <span className="font-semibold text-red-400">{f.flag}</span>
                  ) : (
                    <span className="text-white">{f.flag}</span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-muted">
                  {JSON.stringify(f.value).slice(0, 80)}
                </td>
                <td className="py-2 pr-4 text-muted">
                  {new Date(f.updatedAt).toLocaleString()}
                </td>
                <td className="py-2">
                  <DeleteFlagButton id={f.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
