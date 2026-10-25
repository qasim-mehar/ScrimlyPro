import { notFound } from "next/navigation";

import { Sidebar, type NavCounts } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { resolveActiveOrg } from "@/lib/dashboard/org";

export const dynamic = "force-dynamic";

/**
 * Member dashboard (M5). Guarded by the one true requireUser path; all data
 * reads run through withUserDb (org-scoped RLS). A `?org=` param that is not
 * one of the caller's memberships renders the 404 page — foreign and
 * not-found are indistinguishable (404 law).
 *
 * WP1: shell + placeholders. Sections light up per work package (WP3 wires
 * lib/dashboard/queries.ts; WP4–WP9 build the sections; WP10 palette +
 * notifications; WP11 empty states).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await requireUser();
  const { org: orgParam } = await searchParams;
  const { orgs, active } = await withUserDb({ sub: user.id }, (userDb) =>
    resolveActiveOrg(userDb, user.id, orgParam),
  );
  if (orgParam !== undefined && !active) notFound();

  // WP3 replaces these with real counts from getDashboardData.
  const counts: NavCounts = {
    sessions: 0,
    matches: 0,
    drafts: 0,
    attention: 0,
  };

  return (
    <div className="mx-auto flex gap-6 p-6">
      <Sidebar orgs={orgs} activeOrg={active} counts={counts} />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <TopBar />

        {active ? (
          <main className="grid grid-cols-[3fr_2fr] gap-6">
            <div className="flex flex-col gap-6">
              {/* WP4 greeting row · WP5 featured session card · WP6
                  needs-attention table (section id="attention"). */}
              <section className="rounded-dash bg-dash-surface p-6">
                <h1 className="text-xl font-bold">Greeting row</h1>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP4 — time-aware greeting + attention pill.
                </p>
              </section>
              <section className="rounded-dash bg-dash-surface p-6">
                <h2 className="text-lg font-bold">Featured session</h2>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP5 — newest active session card + readiness gauge.
                </p>
              </section>
              <section
                id="attention"
                className="rounded-dash bg-dash-surface p-6"
              >
                <h2 className="text-lg font-bold">Needs attention</h2>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP6 — flagged sessions table.
                </p>
              </section>
            </div>
            <div className="flex flex-col gap-6">
              <section className="rounded-dash bg-dash-surface p-6">
                <h2 className="text-lg font-bold">Stats + filter</h2>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP7 — Today / 7 days / 30 days + stat cards.
                </p>
              </section>
              <section className="rounded-dash bg-dash-surface p-6">
                <h2 className="text-lg font-bold">Scrim pipeline</h2>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP8 — stage bar + ranked attention list.
                </p>
              </section>
              <section className="rounded-dash bg-dash-surface p-6">
                <h2 className="text-lg font-bold">Scrimly AI</h2>
                <p className="mt-2 text-sm text-dash-ink3">
                  Wired in WP9 — OCR queue facts card.
                </p>
              </section>
            </div>
          </main>
        ) : (
          <main className="rounded-dash bg-dash-surface p-6">
            <h1 className="text-xl font-bold">Create your organization</h1>
            <p className="mt-2 text-sm text-dash-ink3">
              ScrimlyPro organizes scrims per organization. Create one to get
              started.
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
