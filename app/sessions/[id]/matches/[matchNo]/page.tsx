import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { matches, rosters, sessions, teams, type RawSquad } from "@/lib/db/schema";
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
  // WP6: verified user or /login (defense in depth — the proxy gates too).
  const user = await requireUser();
  const { id: sessionId, matchNo: matchNoRaw } = await params;
  const matchNo = Number(matchNoRaw);

  // Tenant reads under RLS + explicit ownership predicate; a missing or
  // foreign session is indistinguishable — both render the 404 page.
  const data = await withUserDb({ sub: user.id }, async (userDb) => {
    const session =
      (
        await userDb
          .select({
            id: sessions.id,
            name: sessions.name,
            plannedMatches: sessions.plannedMatches,
            teamCount: sessions.teamCount,
            status: sessions.status,
          })
          .from(sessions)
          .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
          .limit(1)
      )[0] ?? null;
    if (!session) return null;
    if (
      !Number.isInteger(matchNo) ||
      matchNo < 1 ||
      matchNo > session.plannedMatches
    ) {
      return null;
    }

    const match =
      (
        await userDb
          .select({
            id: matches.id,
            status: matches.status,
            rawSquadData: matches.rawSquadData,
          })
          .from(matches)
          .where(and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)))
          .limit(1)
      )[0] ?? null;

    // Confirmed matches are edited via Unlock on the session page.
    if (match && match.status === "confirmed") {
      return { kind: "confirmed" as const, session };
    }

    const squads = match?.rawSquadData ?? null;
    if (!squads) return { kind: "upload" as const, session, matchNo };

    const teamRows = await userDb
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.sessionId, sessionId))
      .orderBy(asc(teams.name));

    const teamIds = teamRows.map((team) => team.id);
    const rosterRows =
      teamIds.length > 0
        ? await userDb
            .select({
              teamId: rosters.teamId,
              playerNorm: rosters.playerNorm,
              displayName: rosters.displayName,
            })
            .from(rosters)
            .where(inArray(rosters.teamId, teamIds))
        : [];

    return {
      kind: "review" as const,
      session,
      matchNo,
      squads,
      teamRows,
      rosterRows,
    };
  });

  if (!data) notFound();

  if (data.kind === "confirmed") {
    redirect(`/sessions/${sessionId}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <nav>
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-muted"
        >
          ← {data.session.name}
        </Link>
      </nav>
      <h1 className="font-display text-2xl font-semibold">
        Match {data.matchNo}
      </h1>
      {data.kind === "review" ? (
        <MatchReview
          sessionId={sessionId}
          matchNo={matchNo}
          teamCount={data.session.teamCount}
          squads={data.squads}
          teams={data.teamRows}
          rosters={data.rosterRows}
        />
      ) : (
        <UploadPanel sessionId={sessionId} matchNo={matchNo} />
      )}
    </main>
  );
}

/** Pure render block: all tenant data was fetched under withUserDb above. */
function MatchReview({
  sessionId,
  matchNo,
  teamCount,
  squads,
  teams: teamRows,
  rosters: rosterRows,
}: {
  sessionId: string;
  matchNo: number;
  teamCount: number;
  squads: RawSquad[];
  teams: Array<{ id: string; name: string }>;
  rosters: Array<{ teamId: string; playerNorm: string; displayName: string }>;
}) {
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
