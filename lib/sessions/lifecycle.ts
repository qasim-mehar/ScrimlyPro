import { and, asc, eq, inArray } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  matchResults,
  matches,
  rosters,
  sessions,
  teams,
} from "@/lib/db/schema";
import { rebuildRosters } from "@/lib/matching";

export type LifecycleResult = { ok: true } | { ok: false; message: string };

/**
 * Unlock a confirmed match (reassigned from C5.4 — session-page
 * functionality). ERD §5 iron rule 3, order matters, one transaction:
 * delete its match_results → match status draft + confirmedAt null →
 * rebuild rosters from the REMAINING confirmed matches only.
 */
export function unlockMatch(
  db: Db,
  sessionId: string,
  matchId: string,
): LifecycleResult {
  const matchRow = db
    .select({
      id: matches.id,
      sessionId: matches.sessionId,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .get();

  if (!matchRow || matchRow.sessionId !== sessionId) {
    return { ok: false, message: "Match not found in this session." };
  }
  if (matchRow.status !== "confirmed") {
    return { ok: false, message: "Only a confirmed match can be unlocked." };
  }

  db.transaction((tx) => {
    // 1. Delete this match's results first (iron rule order).
    tx.delete(matchResults).where(eq(matchResults.matchId, matchId)).run();

    // 2. Return the match to draft.
    tx
      .update(matches)
      .set({ status: "draft", confirmedAt: null })
      .where(eq(matches.id, matchId))
      .run();

    // 3. Rebuild rosters from REMAINING confirmed matches, matchNo ASC
    // (first-seen display names win via rebuildRosters).
    const teamIds = tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.sessionId, sessionId))
      .all()
      .map((t) => t.id);

    const remaining = tx
      .select({
        teamId: matchResults.teamId,
        matchNo: matches.matchNo,
        players: matchResults.players,
      })
      .from(matchResults)
      .innerJoin(matches, eq(matches.id, matchResults.matchId))
      .where(
        and(
          eq(matches.sessionId, sessionId),
          eq(matches.status, "confirmed"),
        ),
      )
      .orderBy(asc(matches.matchNo))
      .all();

    if (teamIds.length > 0) {
      tx.delete(rosters).where(inArray(rosters.teamId, teamIds)).run();
    }

    const rebuilt = rebuildRosters(
      remaining.map((r) => ({
        teamId: r.teamId,
        matchNo: r.matchNo,
        players: r.players,
      })),
    );
    if (rebuilt.length > 0) {
      tx.insert(rosters).values(rebuilt).run();
    }
  });

  return { ok: true };
}

/** active → completed. Idempotent: completing a completed session is ok. */
export function markComplete(db: Db, sessionId: string): LifecycleResult {
  const sessionRow = db
    .select({ id: sessions.id, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!sessionRow) return { ok: false, message: "Session not found." };
  if (sessionRow.status === "completed") return { ok: true };

  db
    .update(sessions)
    .set({ status: "completed" })
    .where(eq(sessions.id, sessionId))
    .run();
  return { ok: true };
}

/** completed → active. Idempotent: reopening an active session is ok. */
export function reopenSession(db: Db, sessionId: string): LifecycleResult {
  const sessionRow = db
    .select({ id: sessions.id, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!sessionRow) return { ok: false, message: "Session not found." };
  if (sessionRow.status === "active") return { ok: true };

  db
    .update(sessions)
    .set({ status: "active" })
    .where(eq(sessions.id, sessionId))
    .run();
  return { ok: true };
}
