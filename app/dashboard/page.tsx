import { notFound } from "next/navigation";

import { AiCard } from "@/components/dashboard/ai-card";
import { AttentionTable } from "@/components/dashboard/attention-table";
import { FeaturedCard } from "@/components/dashboard/featured-card";
import { Pipeline, AttentionList } from "@/components/dashboard/pipeline";
import { GreetingRow } from "@/components/dashboard/greeting-row";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";
import { RangeFilter, StatCards } from "@/components/dashboard/stat-cards";
import { Sidebar, type NavCounts } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import type { DashboardStats } from "@/lib/dashboard/queries";
import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { resolveActiveOrg } from "@/lib/dashboard/org";
import { getDashboardData, parseRange } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

const EMPTY_STATS: DashboardStats = {
  activeSessions: 0,
  matchesInPlay: 0,
  matchesProcessed: 0,
  matchesDelta: 0,
  draftsAwaiting: 0,
  oldestDraftHours: null,
  needsAttention: 0,
};

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
      <Sidebar
        orgs={orgs}
        activeOrg={active}
        counts={counts}
        readsLeft={data?.quota.readsLeft ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <TopBar
          orgParam={orgParam}
          notifications={data?.notifications ?? []}
        />

        {active ? (
          <>
            <GreetingRow
              email={user.email}
              needsAttention={data?.stats.needsAttention ?? 0}
              nowHour={new Date().getHours()}
            />

            <main className="grid grid-cols-[3fr_2fr] gap-6">
              <div className="flex flex-col gap-6">
                {data?.featured ? (
                  <FeaturedCard session={data.featured} />
                ) : (
                  <section className="rounded-dash bg-dash-surface p-6">
                    <h2 className="text-lg font-bold">No active session</h2>
                    <p className="mt-2 text-sm text-dash-ink3">
                      Create a session to see its live standings here.
                    </p>
                  </section>
                )}
                {/* WP6 needs-attention table. */}
                <AttentionTable
                  rows={data?.attentionSessions ?? []}
                  renderedAt={new Date()}
                />
              </div>
              <div className="flex flex-col gap-6">
                <RangeFilter active={range} orgParam={orgParam} />
                <StatCards stats={data?.stats ?? EMPTY_STATS} />
                <Pipeline
                  counts={data?.pipeline ?? { upcoming: 0, drafts: 0, scored: 0 }}
                  avgProcessingSeconds={data?.avgProcessingSeconds ?? null}
                  featuredSessionId={data?.featured?.id}
                />
                <AttentionList items={data?.attentionList ?? []} />
                {data && <AiCard data={data} />}
                {data?.featured && <ReadinessGauge session={data.featured} />}
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
