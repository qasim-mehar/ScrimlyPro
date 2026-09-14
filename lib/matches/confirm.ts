import { eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  matchResults,
  matches,
  rosters,
  sessions,
  teams,
} from "@/lib/db/schema";
import { learnRosterDelta } from "@/lib/matching";
import { pointsForMatch } from "@/lib/scoring";

import { validateMapping, type SquadRowDraft } from "./mapping";

export type ConfirmMatchInput = {
  sessionId: string;
  matchId: string;
  /** Already fully mapped + valid (re-validated here before any write). */
  rows: SquadRowDraft[];
};

export type ConfirmMatchResult = { ok: true } | { ok: false; message: string };

/**
 * Confirm pipeline (folded C5.4 — Phase B of C5.3): match_results + rosters
 * in ONE transaction, then redirect (caller) to the session page.
 *
 * points computed at confirm-time per ERD §3; standings never re-derive them
 * (computeStandings sums the stored placementPoints/kills).
 */
export function confirmMatch(
  db: Db,
  input: ConfirmMatchInput,
): ConfirmMatchResult {
  const { sessionId, matchId, rows } = input;

  const matchRow = db
    .select({ id: matches.id, sessionId: matches.sessionId, status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .get();
  if (!matchRow || matchRow.sessionId !== sessionId) {
    return { ok: false, message: "Match not found in this session." };
  }
  if (matchRow.status === "confirmed") {
    return { ok: false, message: "Match is already confirmed. Unlock the match first." };
  }

  const sessionRow = db
    .select({ scoringRules: sessions.scoringRules })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!sessionRow) {
    return { ok: false, message: "Session not found." };
  }

  const teamNames = new Map<string, string>();
  for (const team of db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .all()) {
    teamNames.set(team.id, team.name);
  }

  // Validate-before-trust (PRD R1): re-run the form validation; issues → no write.
  const issues = validateMapping(rows, teamNames.size, teamNames);
  if (issues.length > 0) {
    const first = issues[0];
    return {
      ok: false,
      message: `Cannot confirm: ${first ? first.message : "invalid mapping."}`,
    };
  }

  // Narrowed by the UNMAPPED check above — every row has a team now.
  const mapped: Array<Omit<SquadRowDraft, "teamId"> & { teamId: string }> = [];
  for (const row of rows) {
    if (row.teamId === null) {
      return { ok: false, message: "Cannot confirm: a squad has no team." };
    }
    mapped.push({ ...row, teamId: row.teamId });
  }

  const confirmedAt = new Date().toISOString();

  db.transaction((tx) => {
    // Idempotent re-confirm: replace this match's results cleanly.
    tx.delete(matchResults).where(eq(matchResults.matchId, matchId)).run();

    for (const row of mapped) {
      const kills = row.players.reduce((sum, player) => sum + player.kills, 0);
      const { placementPoints } = pointsForMatch(
        row.placement,
        kills,
        sessionRow.scoringRules,
      );
      tx
        .insert(matchResults)
        .values({
          id: crypto.randomUUID(),
          matchId,
          teamId: row.teamId,
          placement: row.placement,
          kills,
          placementPoints,
          players: row.players.map((player) => ({
            name: player.name,
            kills: player.kills,
          })),
        })
        .run();

      // Roster learning: first-seen display names win (insert ignores
      // existing (teamId, playerNorm) pairs).
      for (const entry of learnRosterDelta(row.teamId, row.players)) {
        tx.insert(rosters).values(entry).onConflictDoNothing().run();
      }
    }

    tx
      .update(matches)
      .set({ status: "confirmed", confirmedAt })
      .where(eq(matches.id, matchId))
      .run();
  });

  return { ok: true };
}
