import { notFound } from "next/navigation";

import { GreetingRow } from "@/components/dashboard/greeting-row";
import { Sidebar, type NavCounts } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { resolveActiveOrg } from "@/lib/dashboard/org";
import { getDashboardData, parseRange } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

/**
 * Member dashboard (M5). Guarded by the one true requireUser path; all data
 * reads run through withUserDb (org-scoped RLS). A `?org=` param that is not
 * one of the caller's memberships renders the 404 page — foreign and
 * not-found are indistinguishable (404 law). `?range=` scopes the stat
 * cards + pipeline (today / 7d / 30d).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; range?: string }>;
}) {
  const user = await requireUser();
  const { org: orgParam } = await searchParams;
  const range = parseRange((await searchParams).range);
  const { orgs, active } = await withUserDb({ sub: user.id }, (userDb) =>
    resolveActiveOrg(userDb, user.id, orgParam),
  );
  if (orgParam !== undefined && !active) notFound();

  const data = active
    ? await withUserDb({ sub: user.id }, (userDb) =>
        getDashboardData(userDb, active.id, user.id, range),
      )
    : null;

  const counts: NavCounts = {
    sessions: data?.nav.sessions ?? 0,
    matches: data?.nav.matchesWeek ?? 0,
    drafts: data?.nav.drafts ?? 0,
    attention: data?.nav.attention ?? 0,
  };

  return (
    <div className="mx-auto flex gap-6 p-6">
      <Sidebar orgs={orgs} activeOrg={active} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <TopBar />

        {active ? (
          <>
            <GreetingRow
              email={user.email}
              needsAttention={data?.stats.needsAttention ?? 0}
              nowHour={new Date().getHours()}
            />

            <main className="grid grid-cols-[3fr_2fr] gap-6">
              <div className="flex flex-col gap-6">
                {/* WP5 featured session card. */}
                <section className="rounded-dash bg-dash-surface p-6">
                  <h2 className="text-lg font-bold">Featured session</h2>
                  <p className="mt-2 text-sm text-dash-ink3">
                    Wired in WP5 — newest active session card + readiness gauge.
                  </p>
                </section>
                {/* WP6 needs-attention table. */}
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
          </>
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
