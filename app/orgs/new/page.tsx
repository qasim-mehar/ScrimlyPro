import { CreateOrgForm } from "@/components/orgs/CreateOrgForm";
import { requireUser } from "@/lib/auth/action-guard";
import { PageHeader } from "@/components/app/ui";
import { CheckIcon } from "@/components/app/icons";

/**
 * /orgs/new — authenticated only (createOrgAction re-verifies and scopes
 * everything server-side under withUserDb).
 */
export default async function NewOrgPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        backHref="/orgs"
        backLabel="Organizations"
        title="New Organization"
        description="An organization holds your members, scrims, and monthly limits. You become its first owner."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section className="rounded-dash-lg bg-dash-surface p-5 sm:p-6">
          <CreateOrgForm />
        </section>

        <aside className="relative overflow-hidden rounded-dash-lg bg-dash-ink p-5 text-white">
          <div aria-hidden="true" className="app-grid absolute inset-0" />
          <div className="relative">
            <p className="text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
              What changes
            </p>
            <h2 className="mt-1.5 text-lg font-bold tracking-[-0.01em]">
              One org, one shared home.
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {[
                "Members and invites are scoped to the org.",
                "Every scrim and result lives under it.",
                "Plan limits are shared across the crew.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[13px] leading-5 text-white/70">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
                    <CheckIcon width="12" height="12" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-white/10 pt-3 text-[12px] leading-5 text-white/45">
              You can be in more than one org. Switch from the header or the
              dashboard.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
