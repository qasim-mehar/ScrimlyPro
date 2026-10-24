import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";
import SessionView from "@/components/session/SessionView";
import { withUserDb } from "@/lib/db/user";
import { standingsSubtitle, withRanks } from "@/lib/graphics/standings";
import { computeStandings } from "@/lib/scoring";
import { getSessionPageData, nextMatchNumber, sessionNudge } from "@/lib/sessions/queries";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // WP6: verified user or /login (defense in depth — the proxy gates too).
  const user = await requireUser();
  const { id } = await params;

  // Tenant read under RLS + explicit ownership predicate; a missing or
  // foreign session is indistinguishable — both render the 404 page.
  const data = await withUserDb({ sub: user.id }, (userDb) =>
    getSessionPageData(userDb, id, user.id),
  );
  if (!data) notFound();

  const standings = withRanks(
    computeStandings(data.results, data.teams, data.session.scoringRules),
  );
  const subtitle = standingsSubtitle(
    data.confirmedCount,
    data.session.status === "completed",
  );
  const next = nextMatchNumber(
    data.matches.length,
    data.session.plannedMatches,
  );
  const nudge = sessionNudge(
    data.session.status,
    data.confirmedCount,
    data.session.plannedMatches,
    data.mvp.locked,
  );

  return (
    <SessionView
      session={data.session}
      teams={data.teams}
      matches={data.matches}
      confirmedCount={data.confirmedCount}
      standings={standings}
      subtitle={subtitle}
      nextMatch={next}
      mvp={data.mvp}
      nudge={nudge}
    />
  );
}
