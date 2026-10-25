"use client";

import { useActionState } from "react";

import { createOrgAction } from "@/app/orgs/new/actions";

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(
    async (prev: { message: string | null }, formData: FormData) =>
      createOrgAction(prev, formData),
    { message: null } as { message: string | null },
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="org-name" className="text-sm text-muted">
          Organization name
        </label>
        <input
          id="org-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="e.g. Wassup Community Scrims"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base focus:border-gold focus:outline-none"
        />
      </div>
      {state.message ? (
        <p role="alert" className="text-sm text-red-400">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-lg bg-gold font-display text-lg font-semibold text-bg disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
