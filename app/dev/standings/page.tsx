import { and, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";

import { StandingsPreview } from "@/components/graphics/StandingsPreview";
import { getDb } from "@/lib/db/client";
import { matchResults, matches, sessions, teams } from "@/lib/db/schema";
import { standingsSubtitle } from "@/lib/graphics/standings";
import { computeStandings } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const SEED_SESSION_ID = "seed-00000000-0000-4000-8000-000000000001";

export default async function DevStandingsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // WP6: authenticated users only (dev pages render fixtures; no tenant reads).
  await requireUser();

  const db = getDb();
  const session =
    (
      await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, SEED_SESSION_ID))
        .limit(1)
    )[0] ?? null;
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="text-lg font-bold tracking-widest text-gold">STANDINGS GRAPHIC — SEED SESSION</h1>
        <p className="text-sm text-muted">Seed DB missing — run `npm run db:seed` first.</p>
      </main>
    );
  }

  // Confirmed matches only — F4: standings derive exclusively from confirmed
  // match_results (ERD §5: never stored, always derived).
  const confirmedIds = (
    await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.sessionId, session.id), eq(matches.status, "confirmed")))
  ).map((m) => m.id);

  // ResultRow subset — matchResults.players (notNull JSON) is deliberately not selected.
  const results =
    confirmedIds.length > 0
      ? await db
          .select({
            teamId: matchResults.teamId,
            placement: matchResults.placement,
            kills: matchResults.kills,
            placementPoints: matchResults.placementPoints,
          })
          .from(matchResults)
          .where(inArray(matchResults.matchId, confirmedIds))
      : [];

  const teamRows = await db
    .select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
    .from(teams)
    .where(eq(teams.sessionId, session.id));

  const standings = computeStandings(results, teamRows, session.scoringRules);
  const subtitle = standingsSubtitle(confirmedIds.length, session.status === "completed");

  return (
    <main className="mx-auto max-w-2xl p-4">
      <StandingsPreview
        title={session.name}
        subtitle={subtitle}
        organizer={null}
        standings={standings}
        matchCount={confirmedIds.length}
        isFinal={session.status === "completed"}
      />
    </main>
  );
}
