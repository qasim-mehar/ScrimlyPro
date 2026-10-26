"use client";

import { useActionState } from "react";

import { createInviteAction } from "@/app/orgs/[id]/actions";
import { buttonStyles, fieldStyles } from "@/components/app/ui";
import { AlertIcon } from "@/components/dashboard/icons";
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
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgId" value={orgId} />
      <div>
        <label htmlFor="invite-role" className={fieldStyles.label}>
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="member"
          className={fieldStyles.input}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label htmlFor="invite-email" className={fieldStyles.label}>
          Email label{" "}
          <span className="font-normal text-dash-ink3">(optional)</span>
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          placeholder="who-is-this-for@example.com"
          className={fieldStyles.input}
          autoComplete="email"
        />
        <p className={fieldStyles.help}>
          Only a label for your own reference — no email is sent.
        </p>
      </div>
      <button type="submit" disabled={pending} className={buttonStyles.secondary}>
        {pending ? "Creating link…" : "Create invite link"}
      </button>

      {state.kind === "link" ? (
        <div className="rounded-dash-sm bg-dash-lime/35 p-3">
          <p className="mb-2 text-[13px] font-semibold text-dash-ink">
            Link ready — copy it now
          </p>
          <CopyField
            value={state.url}
            label="Works once and expires in 7 days. It won’t be shown again."
          />
        </div>
      ) : null}
      {state.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-dash-sm bg-dash-danger-bg px-3 py-2.5 text-[13px] leading-5 text-dash-danger-ink"
        >
          <AlertIcon width="15" height="15" className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
