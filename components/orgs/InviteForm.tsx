"use client";

import { useActionState } from "react";

import { createInviteAction } from "@/app/orgs/[id]/actions";
import { CopyField } from "./CopyField";

export type InviteFormState =
  | { kind: "idle" }
  | { kind: "link"; url: string; expiresAt: string }
  | { kind: "error"; message: string };

const INITIAL: InviteFormState = { kind: "idle" };

/**
 * Admin invite form. The returned link is shown ONCE via CopyField — the
 * raw token lives only in this component's state (the server stores just
 * its hash).
 */
export function InviteForm({ orgId }: { orgId: string }) {
  const [state, formAction, pending] = useActionState(
    async (prev: InviteFormState, formData: FormData) =>
      createInviteAction(prev, formData),
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orgId" value={orgId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-role" className="text-sm text-muted">
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="member"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-sm text-muted">
          Email (optional label — no email is sent)
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          placeholder="who-is-this-for@example.com"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-gold font-semibold text-bg disabled:opacity-50"
      >
        {pending ? "Creating link…" : "Create invite link"}
      </button>

      {state.kind === "link" ? (
        <CopyField
          value={state.url}
          label="Share this link — it works once and expires in 7 days:"
        />
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="text-sm text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
