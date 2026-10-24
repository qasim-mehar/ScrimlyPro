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
export async function unlockMatch(
  db: Db,
  sessionId: string,
  matchId: string,
): Promise<LifecycleResult> {
  const matchRow =
    (
      await db
        .select({
          id: matches.id,
          sessionId: matches.sessionId,
          status: matches.status,
        })
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1)
    )[0] ?? null;

  if (!matchRow || matchRow.sessionId !== sessionId) {
    return { ok: false, message: "Match not found in this session." };
  }
  if (matchRow.status !== "confirmed") {
    return { ok: false, message: "Only a confirmed match can be unlocked." };
  }

  await db.transaction(async (tx) => {
    // 1. Delete this match's results first (iron rule order).
    await tx.delete(matchResults).where(eq(matchResults.matchId, matchId));

    // 2. Return the match to draft.
    await tx
      .update(matches)
      .set({ status: "draft", confirmedAt: null })
      .where(eq(matches.id, matchId));

    // 3. Rebuild rosters from REMAINING confirmed matches, matchNo ASC
    // (first-seen display names win via rebuildRosters).
    const teamRows = await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.sessionId, sessionId));
    const teamIds = teamRows.map((t) => t.id);

    const remaining = await tx
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
      .orderBy(asc(matches.matchNo));

    if (teamIds.length > 0) {
      await tx.delete(rosters).where(inArray(rosters.teamId, teamIds));
    }

    const rebuilt = rebuildRosters(
      remaining.map((r) => ({
        teamId: r.teamId,
        matchNo: r.matchNo,
        players: r.players,
      })),
    );
    if (rebuilt.length > 0) {
      await tx.insert(rosters).values(rebuilt);
    }
  });

  return { ok: true };
}

/** active → completed. Idempotent: completing a completed session is ok. */
export async function markComplete(
  db: Db,
  sessionId: string,
): Promise<LifecycleResult> {
  const sessionRow =
    (
      await db
        .select({ id: sessions.id, status: sessions.status })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
    )[0] ?? null;
  if (!sessionRow) return { ok: false, message: "Session not found." };
  if (sessionRow.status === "completed") return { ok: true };

  await db
    .update(sessions)
    .set({ status: "completed" })
    .where(eq(sessions.id, sessionId));
  return { ok: true };
}

/** completed → active. Idempotent: reopening an active session is ok. */
export async function reopenSession(
  db: Db,
  sessionId: string,
): Promise<LifecycleResult> {
  const sessionRow =
    (
      await db
        .select({ id: sessions.id, status: sessions.status })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
    )[0] ?? null;
  if (!sessionRow) return { ok: false, message: "Session not found." };
  if (sessionRow.status === "active") return { ok: true };

  await db
    .update(sessions)
    .set({ status: "active" })
    .where(eq(sessions.id, sessionId));
  return { ok: true };
}
