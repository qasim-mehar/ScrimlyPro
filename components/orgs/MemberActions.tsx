"use client";

import { useActionState } from "react";

import {
  removeMemberAction,
  revokeInviteAction,
} from "@/app/orgs/[id]/actions";

export type MemberActionState = { message: string | null };

const INITIAL: MemberActionState = { message: null };

/**
 * Remove-member button (admin+). Server-side last-owner protection is the
 * authority; the returned error renders inline.
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
  const [state, formAction, pending] = useActionState(
    async (prev: MemberActionState, formData: FormData) =>
      removeMemberAction(prev, formData),
    INITIAL,
  );
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg border border-line px-3 text-sm text-muted disabled:opacity-50"
      >
        {pending ? "Removing…" : label}
      </button>
      {state.message ? (
        <p role="alert" className="text-xs text-red-400">
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
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg border border-line px-3 text-sm text-muted disabled:opacity-50"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {state.message ? (
        <p role="alert" className="text-xs text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
