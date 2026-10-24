"use client";

import { useActionState } from "react";

import {
  deleteFlagAction,
  setFlagAction,
  type FlagActionResult,
} from "./actions";

/**
 * Feature-flag editor (client form → audited server actions). The reserved
 * `disabled` semantics are surfaced here on purpose: presence of the row is
 * the kill switch, value is metadata only.
 */
export function FlagForm() {
  const [state, submit, pending] = useActionState<FlagActionResult | null, FormData>(
    setFlagAction,
    null,
  );

  const input =
    "min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-white placeholder:text-muted";

  return (
    <form action={submit} className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Subject type
          <select name="subjectType" className={`mt-1 ${input}`} defaultValue="user">
            <option value="user">user</option>
            <option value="org">org</option>
            <option value="global">global</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Subject id (uuid; empty for global)
          <input name="subjectId" className={`mt-1 ${input}`} placeholder="—" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Flag
          <input name="flag" className={`mt-1 ${input}`} placeholder="e.g. beta_graphic" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Value (JSON object)
          <input name="value" className={`mt-1 ${input}`} defaultValue="{}" />
        </label>
      </div>
      <p className="text-xs text-muted">
        Reserved: the <code className="text-gold">disabled</code> flag on a user is the
        kill switch (presence = locked out of every authed surface; the value is
        metadata only). This editor REFUSES it — the Tenants console toggle is the
        single audited disable path. Org-subject flags
        (<code className="text-gold">subject_type=&quot;org&quot;</code>) are
        schema-reserved until M4 — no runtime probe reads them yet (Lane AB review
        C-3 decision).
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-lg bg-gold px-4 font-display text-sm font-semibold text-bg disabled:opacity-50"
        >
          Save flag
        </button>
        {state && !state.ok && <span className="text-xs text-red-400">{state.error}</span>}
        {state && state.ok && <span className="text-xs text-green-400">Saved.</span>}
      </div>
    </form>
  );
}

export function DeleteFlagButton({ id }: { id: string }) {
  const [state, submit, pending] = useActionState<FlagActionResult | null, FormData>(
    deleteFlagAction,
    null,
  );
  return (
    <form action={submit} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-8 rounded-md border border-red-700 px-2.5 text-xs font-semibold text-red-300 hover:text-red-200 disabled:opacity-50"
      >
        Delete
      </button>
      {state && !state.ok && (
        <span className="ml-2 text-xs text-red-400">{state.error}</span>
      )}
    </form>
  );
}
