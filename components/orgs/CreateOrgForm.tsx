"use client";

import { useActionState } from "react";

import { createOrgAction } from "@/app/orgs/new/actions";
import { buttonStyles, fieldStyles } from "@/components/app/ui";
import { AlertIcon } from "@/components/dashboard/icons";

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(
    async (prev: { message: string | null }, formData: FormData) =>
      createOrgAction(prev, formData),
    { message: null } as { message: string | null },
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="org-name" className={fieldStyles.label}>
          Organization name
        </label>
        <input
          id="org-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="e.g. Wassup Community Scrims"
          className={fieldStyles.input}
          autoComplete="organization"
        />
        <p className={fieldStyles.help}>
          This is what members see in the org switcher and on invites.
        </p>
      </div>
      {state.message ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-dash-sm bg-dash-danger-bg px-3 py-2.5 text-[13px] leading-5 text-dash-danger-ink"
        >
          <AlertIcon width="15" height="15" className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonStyles.primary}>
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
