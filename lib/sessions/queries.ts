import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  matchResults,
  matches,
  mvpLists,
  sessions,
  teams,
  type MvpEntry,
  type ScoringRules,
} from "@/lib/db/schema";
import { orgMemberPredicate } from "@/lib/orgs/orgs";
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
  // Locked Top-5 list (C6.1). entries is null when no mvp_lists row exists;
  // locked implies 5 entries by C6.1 validation, but callers guard on length.
  mvp: { locked: boolean; entries: MvpEntry[] | null };
};

/**
 * Read helper for GET /sessions/[id] (C4.2). Confirmed-only results feed
 * computeStandings; matches carry the placement-1 winner name (null for
 * drafts). raw_squad_data is never selected — it must not leak to the client.
 *
 * `userId` (REQUIRED — the server-verified caller, getAuthedUser; never
 * request input) adds an explicit ORG-MEMBERSHIP predicate on the root
 * session select (M2: tenancy is the org; any member may read) — belt AND
 * suspenders with the RLS backstop. Making the predicate mandatory removes
 * the "caller forgot the userId" bug class — deliberate API break of the
 * earlier optional-param shape. Callers without a verified user (tests,
 * admin tooling) are not served by this helper.
 */
export async function getSessionPageData(
  db: Db,
  sessionId: string,
  // REQUIRED: the verified owner id (getAuthedUser). Making the tenant
  // predicate mandatory removes the "caller forgot the userId" bug class —
  // this is a deliberate API break of the earlier optional-param shape.
  userId: string,
): Promise<SessionPageData | null> {
  const sessionRow =
    (
      await db
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
        .where(and(eq(sessions.id, sessionId), orgMemberPredicate(userId)))
        .limit(1)
    )[0] ?? null;
  if (!sessionRow) return null;

  const teamRows: TeamRow[] = await db
    .select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .orderBy(asc(teams.name));

  const teamNameById = new Map<string, string>();
  for (const team of teamRows) teamNameById.set(team.id, team.name);

  // Deliberately no rawSquadData projection — drafts stay opaque here.
  const matchRows = await db
    .select({
      id: matches.id,
      matchNo: matches.matchNo,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.sessionId, sessionId))
    .orderBy(asc(matches.matchNo));

  const confirmedIds = matchRows
    .filter((m) => m.status === "confirmed")
    .map((m) => m.id);

  const resultRows: ResultRow[] =
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

  const winnerByMatchId = new Map<string, string | null>();
  if (confirmedIds.length > 0) {
    const winners = await db
      .select({ matchId: matchResults.matchId, teamId: matchResults.teamId })
      .from(matchResults)
      .where(
        and(
          inArray(matchResults.matchId, confirmedIds),
          eq(matchResults.placement, 1),
        ),
      );
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

  const mvpRow =
    (
      await db
        .select({ locked: mvpLists.locked, entries: mvpLists.entries })
        .from(mvpLists)
        .where(eq(mvpLists.sessionId, sessionId))
        .limit(1)
    )[0] ?? null;

  return {
    session: sessionRow,
    teams: teamRows,
    matches: matchList,
    confirmedCount: confirmedIds.length,
    results: resultRows,
    mvp: mvpRow
      ? { locked: mvpRow.locked, entries: mvpRow.entries }
      : { locked: false, entries: null },
  };
}

export type SessionNudge =
  | { kind: "none" }
  | { kind: "finalize" } // all planned confirmed, still active, MVP unlocked
  | { kind: "mvp-pending" }; // completed, MVP not locked

/**
 * Small pure state machine (C6.2) for the session page banners — trivially
 * testable truth table, no DB. "none" renders nothing.
 */
export function sessionNudge(
  status: string,
  confirmedCount: number,
  plannedMatches: number,
  mvpLocked: boolean,
): SessionNudge {
  if (status === "completed") {
    return mvpLocked ? { kind: "none" } : { kind: "mvp-pending" };
  }
  if (mvpLocked) return { kind: "none" };
  if (plannedMatches > 0 && confirmedCount >= plannedMatches) {
    return { kind: "finalize" };
  }
  return { kind: "none" };
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

export type RecentSession = {
  id: string;
  name: string;
  status: "active" | "completed";
  plannedMatches: number;
  confirmedCount: number;
  createdAt: string;
};

/**
 * Landing-page list (C7.1 Pass 4): the newest sessions with confirmed-match
 * progress. Query-only — raw squad data, rosters, results never selected.
 *
 * `userId` (REQUIRED — the server-verified caller, getAuthedUser; never
 * request input) adds an explicit ORG-MEMBERSHIP predicate on the root
 * session select (M2: tenancy is the org; any member may read) — belt AND
 * suspenders with the RLS backstop. Making the predicate mandatory removes
 * the "caller forgot the userId" bug class — deliberate API break of the
 * earlier optional-param shape. Run the call inside withUserDb.
 */
export async function listRecentSessions(
  db: Db,
  userId: string,
  limit = 8,
): Promise<RecentSession[]> {
  const sessionRows = await db
    .select({
      id: sessions.id,
      name: sessions.name,
      status: sessions.status,
      plannedMatches: sessions.plannedMatches,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(orgMemberPredicate(userId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);

  if (sessionRows.length === 0) return [];
  const ids = sessionRows.map((s) => s.id);

  const confirmedRows = await db
    .select({ sessionId: matches.sessionId })
    .from(matches)
    .where(and(eq(matches.status, "confirmed"), inArray(matches.sessionId, ids)));
  const confirmedBySession = new Map<string, number>();
  for (const row of confirmedRows) {
    confirmedBySession.set(
      row.sessionId,
      (confirmedBySession.get(row.sessionId) ?? 0) + 1,
    );
  }

  return sessionRows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    plannedMatches: s.plannedMatches,
    confirmedCount: confirmedBySession.get(s.id) ?? 0,
    createdAt: s.createdAt,
  }));
}
