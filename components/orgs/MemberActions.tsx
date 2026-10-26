"use client";

import { useActionState, useState } from "react";

import {
  removeMemberAction,
  revokeInviteAction,
} from "@/app/orgs/[id]/actions";

export type MemberActionState = { message: string | null };

const INITIAL: MemberActionState = { message: null };

/**
 * Remove-member button (admin+). Two-step inline confirm — removal kicks
 * the person out of the org immediately. Server-side last-owner protection
 * is the authority; the returned error renders inline.
 */
export function RemoveMemberButton({
  orgId,
  userId,
  label,
}: {
  orgId: string;
  userId: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: MemberActionState, formData: FormData) =>
      removeMemberAction(prev, formData),
    INITIAL,
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold text-dash-danger-ink transition-colors hover:bg-dash-danger-bg"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="userId" value={userId} />
      <span className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-dash-ink2">
          Remove from org?
        </span>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-9 items-center justify-center rounded-full bg-dash-danger-bg px-3 text-xs font-semibold text-dash-danger-ink transition-colors hover:bg-red-200 disabled:opacity-40"
        >
          {pending ? "Removing…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-semibold text-dash-ink2 transition-colors hover:bg-dash-bg disabled:opacity-40"
        >
          Cancel
        </button>
      </span>
      {state.message ? (
        <p
          role="alert"
          className="max-w-[180px] text-right text-[11px] leading-4 text-dash-danger-ink"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Revoke-invite button (admin+): deletes the pending invite row. */
export function RevokeInviteButton({
  orgId,
  inviteId,
}: {
  orgId: string;
  inviteId: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: MemberActionState, formData: FormData) =>
      revokeInviteAction(prev, formData),
    INITIAL,
  );
  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-semibold text-dash-ink3 transition-colors hover:bg-dash-bg hover:text-dash-danger-ink disabled:opacity-40"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {state.message ? (
        <p
          role="alert"
          className="max-w-[180px] text-right text-[11px] leading-4 text-dash-danger-ink"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
