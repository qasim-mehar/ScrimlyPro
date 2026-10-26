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
 * M6: restyled into the light shell — actions and semantics unchanged.
 */
export function FlagForm() {
  const [state, submit, pending] = useActionState<FlagActionResult | null, FormData>(
    setFlagAction,
    null,
  );

  const input =
    "min-h-10 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-sm text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)]";

  return (
    <form action={submit} className="hq-card space-y-4 p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <label className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hq-ink-3)]">
          Subject type
          <select name="subjectType" className={`mt-1.5 ${input}`} defaultValue="user">
            <option value="user">user</option>
            <option value="org">org</option>
            <option value="global">global</option>
          </select>
        </label>
        <label className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hq-ink-3)]">
          Subject id (uuid; empty for global)
          <input name="subjectId" className={`mt-1.5 ${input}`} placeholder="—" />
        </label>
        <label className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hq-ink-3)]">
          Flag
          <input name="flag" className={`mt-1.5 ${input}`} placeholder="e.g. beta_graphic" />
        </label>
        <label className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hq-ink-3)]">
          Value (JSON object)
          <input name="value" className={`mt-1.5 ${input}`} defaultValue="{}" />
        </label>
      </div>
      <p className="text-[12px] leading-relaxed text-[var(--hq-ink-3)]">
        Reserved: the <code className="rounded bg-[var(--hq-bg)] px-1 font-semibold text-[var(--hq-ink-2)]">disabled</code> flag
        on a user is the kill switch (presence = locked out of every authed
        surface; the value is metadata only). This editor REFUSES it — the
        Tenants console toggle is the single audited disable path.
        Org-subject flags (
        <code className="rounded bg-[var(--hq-bg)] px-1 text-[var(--hq-ink-2)]">subject_type=&quot;org&quot;</code>
        ) exist for org-level markers (e.g. the dashboard status tag); the
        dashboard reads only the reserved <code className="rounded bg-[var(--hq-bg)] px-1 text-[var(--hq-ink-2)]">disabled</code> name.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-[var(--hq-ink)] px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save flag
        </button>
        {state && !state.ok && (
          <span className="text-[13px] text-[var(--hq-danger-ink)]">{state.error}</span>
        )}
        {state && state.ok && (
          <span className="text-[13px] font-medium text-[var(--hq-success)]">Saved.</span>
        )}
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
        className="min-h-8 rounded-full border border-[var(--hq-line)] px-3 text-xs font-semibold text-[var(--hq-danger-ink)] hover:bg-[var(--hq-danger-bg)] disabled:opacity-50"
      >
        Delete
      </button>
      {state && !state.ok && (
        <span className="ml-2 text-xs text-[var(--hq-danger-ink)]">{state.error}</span>
      )}
    </form>
  );
}
