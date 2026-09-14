import { and, asc, eq, inArray } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  matchResults,
  matches,
  sessions,
  teams,
  type ScoringRules,
} from "@/lib/db/schema";
import type { ResultRow, TeamRow } from "@/lib/scoring";

export type SessionPageSession = {
  id: string;
  name: string;
  plannedMatches: number;
  teamCount: number;
  templateId: string;
  scoringRules: ScoringRules;
  status: "active" | "completed";
  createdAt: string;
};

export type SessionPageMatch = {
  id: string;
  matchNo: number;
  status: "draft" | "confirmed";
  winnerTeamName: string | null;
};

export type SessionPageData = {
  session: SessionPageSession;
  teams: TeamRow[];
  matches: SessionPageMatch[];
  confirmedCount: number;
  results: ResultRow[];
};

/**
 * Read helper for GET /sessions/[id] (C4.2). Confirmed-only results feed
 * computeStandings; matches carry the placement-1 winner name (null for
 * drafts). raw_squad_data is never selected — it must not leak to the client.
 */
export function getSessionPageData(
  db: Db,
  sessionId: string,
): SessionPageData | null {
  const sessionRow = db
    .select({
      id: sessions.id,
      name: sessions.name,
      plannedMatches: sessions.plannedMatches,
      teamCount: sessions.teamCount,
      templateId: sessions.templateId,
      scoringRules: sessions.scoringRules,
      status: sessions.status,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!sessionRow) return null;

  const teamRows: TeamRow[] = db
    .select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .orderBy(asc(teams.name))
    .all();

  const teamNameById = new Map<string, string>();
  for (const team of teamRows) teamNameById.set(team.id, team.name);

  // Deliberately no rawSquadData projection — drafts stay opaque here.
  const matchRows = db
    .select({
      id: matches.id,
      matchNo: matches.matchNo,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.sessionId, sessionId))
    .orderBy(asc(matches.matchNo))
    .all();

  const confirmedIds = matchRows
    .filter((m) => m.status === "confirmed")
    .map((m) => m.id);

  const resultRows: ResultRow[] =
    confirmedIds.length > 0
      ? db
          .select({
            teamId: matchResults.teamId,
            placement: matchResults.placement,
            kills: matchResults.kills,
            placementPoints: matchResults.placementPoints,
          })
          .from(matchResults)
          .where(inArray(matchResults.matchId, confirmedIds))
          .all()
      : [];

  const winnerByMatchId = new Map<string, string | null>();
  if (confirmedIds.length > 0) {
    const winners = db
      .select({ matchId: matchResults.matchId, teamId: matchResults.teamId })
      .from(matchResults)
      .where(
        and(
          inArray(matchResults.matchId, confirmedIds),
          eq(matchResults.placement, 1),
        ),
      )
      .all();
    for (const w of winners) {
      winnerByMatchId.set(w.matchId, teamNameById.get(w.teamId) ?? null);
    }
  }

  const matchList: SessionPageMatch[] = matchRows.map((m) => ({
    id: m.id,
    matchNo: m.matchNo,
    status: m.status,
    winnerTeamName:
      m.status === "confirmed" ? (winnerByMatchId.get(m.id) ?? null) : null,
  }));

  return {
    session: sessionRow,
    teams: teamRows,
    matches: matchList,
    confirmedCount: confirmedIds.length,
    results: resultRows,
  };
}

/**
 * Sequential by design — the Add button is the only creation-path trigger,
 * so gaps are impossible and the next number is count + 1 while under plan.
 */
export function nextMatchNumber(
  matchCount: number,
  planned: number,
): number | null {
  return matchCount < planned ? matchCount + 1 : null;
}
