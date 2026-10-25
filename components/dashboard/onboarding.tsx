import Link from "next/link";

import { PlusIcon, SparklesIcon } from "@/components/dashboard/icons";

/**
 * Onboarding variants (M5 §5 empty-state column): the designed empty states
 * for the two cold-start cases — no organization at all, and an org with no
 * active session yet. Both CTAs route to real flows only.
 */

export function CreateOrgCard() {
  return (
    <section className="rounded-dash-lg bg-dash-surface p-8">
      <span className="flex size-12 items-center justify-center rounded-dash-sm bg-dash-lime text-dash-ink">
        <SparklesIcon width="24" height="24" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-dash-ink">
        Create your organization
      </h2>
      <p className="mt-2 max-w-md text-sm text-dash-ink3">
        ScrimlyPro organizes scrims, invites, and quotas per organization.
        Create one to unlock the dashboard — it takes a few seconds.
      </p>
      <Link
        href="/orgs/new"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-dash-ink px-5 text-sm font-semibold text-white hover:opacity-90"
      >
        <PlusIcon width="18" height="18" />
        New organization
      </Link>
    </section>
  );
}

export function NoSessionsCard() {
  return (
    <section className="rounded-dash border-2 border-dashed border-dash-line bg-dash-surface p-8">
      <span className="flex size-12 items-center justify-center rounded-dash-sm bg-dash-ink text-white">
        <PlusIcon width="24" height="24" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-dash-ink">
        Start your first scrim
      </h2>
      <p className="mt-2 max-w-md text-sm text-dash-ink3">
        Your newest active session will live here — live standings, match
        progress, and its readiness gauge. Create one to begin.
      </p>
      <Link
        href="/sessions/new"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-dash-ink px-5 text-sm font-semibold text-white hover:opacity-90"
      >
        <PlusIcon width="18" height="18" />
        New session
      </Link>
    </section>
  );
}
