"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { matches } from "@/lib/db/schema";
import { confirmMatch, type ConfirmMatchResult } from "@/lib/matches/confirm";
import type { SquadRowDraft } from "@/lib/matches/mapping";

/** Thin wrappers: getDb → lib fn → revalidate. Zero logic of their own. */
export async function confirmMatchAction(
  sessionId: string,
  matchNo: number,
  rows: SquadRowDraft[],
): Promise<ConfirmMatchResult> {
  const db = getDb();
  const matchRow =
    (
      await db
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)),
        )
        .limit(1)
    )[0] ?? null;
  if (!matchRow) {
    return { ok: false, message: "Match not found in this session." };
  }
  const result = await confirmMatch(db, { sessionId, matchId: matchRow.id, rows });
  if (result.ok) revalidatePath(`/sessions/${sessionId}`);
  return result;
}

/** Discard a bad OCR draft — the page returns to the upload state (R8). */
export async function reparseAction(
  sessionId: string,
  matchNo: number,
): Promise<ConfirmMatchResult> {
  const db = getDb();
  const matchRow =
    (
      await db
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)),
        )
        .limit(1)
    )[0] ?? null;
  if (!matchRow) {
    return { ok: false, message: "Match not found in this session." };
  }
  await db
    .update(matches)
    .set({ rawSquadData: null })
    .where(eq(matches.id, matchRow.id));
  revalidatePath(`/sessions/${sessionId}/matches/${matchNo}`);
  return { ok: true };
}
