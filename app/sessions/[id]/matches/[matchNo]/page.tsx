import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { matches, rosters, sessions, teams } from "@/lib/db/schema";
import { sanitizeSquads } from "@/lib/matches/mapping";
import { suggestMappings } from "@/lib/matching";
import { ReviewForm, type ReviewSuggestion } from "@/components/matches/ReviewForm";
import { UploadPanel } from "@/components/matches/UploadPanel";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string; matchNo: string }>;
}) {
  const { id: sessionId, matchNo: matchNoRaw } = await params;
  const matchNo = Number(matchNoRaw);

  const db = getDb();
  const session = db
    .select({
      id: sessions.id,
      name: sessions.name,
      plannedMatches: sessions.plannedMatches,
      teamCount: sessions.teamCount,
      status: sessions.status,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!session) notFound();
  if (!Number.isInteger(matchNo) || matchNo < 1 || matchNo > session.plannedMatches) {
    notFound();
  }

  const match = db
    .select({
      id: matches.id,
      status: matches.status,
      rawSquadData: matches.rawSquadData,
    })
    .from(matches)
    .where(and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)))
    .get();

  // Confirmed matches are edited via Unlock on the session page.
  if (match && match.status === "confirmed") {
    redirect(`/sessions/${sessionId}`);
  }

  const squads = match?.rawSquadData ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <nav>
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-muted"
        >
          ← {session.name}
        </Link>
      </nav>
      <h1 className="font-display text-2xl font-semibold">Match {matchNo}</h1>
      {squads ? (
        <MatchReview
          sessionId={sessionId}
          matchNo={matchNo}
          teamCount={session.teamCount}
        />
      ) : (
        <UploadPanel sessionId={sessionId} matchNo={matchNo} />
      )}
    </main>
  );
}

async function MatchReview({
  sessionId,
  matchNo,
  teamCount,
}: {
  sessionId: string;
  matchNo: number;
  teamCount: number;
}) {
  const db = getDb();
  const match = db
    .select({ rawSquadData: matches.rawSquadData })
    .from(matches)
    .where(and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)))
    .get();
  const squads = match?.rawSquadData;
  if (!squads) return <UploadPanel sessionId={sessionId} matchNo={matchNo} />;

  const teamRows = db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .orderBy(asc(teams.name))
    .all();

  const teamIds = teamRows.map((team) => team.id);
  const rosterRows =
    teamIds.length > 0
      ? db
          .select({
            teamId: rosters.teamId,
            playerNorm: rosters.playerNorm,
            displayName: rosters.displayName,
          })
          .from(rosters)
          .where(inArray(rosters.teamId, teamIds))
          .all()
      : [];

  const ordered = sanitizeSquads(squads);
  const suggestions: ReviewSuggestion[] = suggestMappings(
    ordered,
    teamRows,
    rosterRows,
  ).map((suggestion) => ({ teamId: suggestion.teamId, tier: suggestion.tier }));

  return (
    <ReviewForm
      sessionId={sessionId}
      matchNo={matchNo}
      teamCount={teamCount}
      teams={teamRows}
      initialSquads={ordered}
      suggestions={suggestions}
    />
  );
}
