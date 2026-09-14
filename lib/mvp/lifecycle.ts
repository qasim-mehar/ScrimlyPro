import { eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { mvpLists, teams, type MvpEntry } from "@/lib/db/schema";
import { validateMvpEntries, type MvpValidationEntry } from "@/lib/mvp/lock";

/**
 * MVP lock lifecycle (C6.1). The db handle is injected so tests run
 * against an in-memory database; every mutation is transactional.
 *
 * Design decision (recorded in README): unlock preserves the locked
 * entries — it only flips `locked` back to false (clearing lockedAt)
 * so the editor re-opens pre-filled with the organizer's manual work.
 */

export type LockMvpResult =
  | { ok: true; entries: MvpEntry[] }
  | { ok: false; issues: string[] };

/**
 * Validate then upsert the session's mvp_lists row. Invalid input
 * returns { ok: false, issues } and writes NOTHING. Re-lock replaces
 * the previous locked list (rank = position, 1..5).
 */
export function lockMvpList(
  db: Db,
  sessionId: string,
  entries: ReadonlyArray<MvpValidationEntry>,
): LockMvpResult {
  return db.transaction((tx) => {
    const teamRows = tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.sessionId, sessionId))
      .all();
    const issues = validateMvpEntries(entries, teamRows);
    if (issues.length > 0) return { ok: false, issues } satisfies LockMvpResult;
    const normalized: MvpEntry[] = entries.map((entry, index) => ({
      rank: index + 1,
      name: entry.name.trim(),
      teamId: entry.teamId,
      kills: entry.kills,
    }));
    const lockedAt = new Date().toISOString();
    tx.insert(mvpLists)
      .values({ sessionId, entries: normalized, locked: true, lockedAt })
      .onConflictDoUpdate({
        target: mvpLists.sessionId,
        set: { entries: normalized, locked: true, lockedAt },
      })
      .run();
    return { ok: true, entries: normalized } satisfies LockMvpResult;
  });
}

/** Re-open the editor: entries are retained, only the lock flips off. */
export function unlockMvp(db: Db, sessionId: string): void {
  db.update(mvpLists)
    .set({ locked: false, lockedAt: null })
    .where(eq(mvpLists.sessionId, sessionId))
    .run();
}
