"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireSessionAccess } from "@/lib/orgs/roles";
import { withUserDb } from "@/lib/db/user";
import { matches, sessions } from "@/lib/db/schema";
import { orgMemberPredicate } from "@/lib/orgs/orgs";
import { confirmMatch, type ConfirmMatchResult } from "@/lib/matches/confirm";
import type { SquadRowDraft } from "@/lib/matches/mapping";

/**
 * Guarded wrappers (WP6/M2): requireSessionAccess (verified user + org
 * membership, 404 on missing/foreign) → withUserDb (RLS-scoped queries,
 * explicit org-membership predicate as the belt) → revalidate. Zero
 * validation logic of their own — lib/matches owns it.
 */
export async function confirmMatchAction(
  sessionId: string,
  matchNo: number,
  rows: SquadRowDraft[],
): Promise<ConfirmMatchResult> {
  const { user } = await requireSessionAccess(sessionId);
  const result = await withUserDb({ sub: user.id }, async (userDb) => {
    const matchRow =
      (
        await userDb
          .select({ id: matches.id })
          .from(matches)
          .innerJoin(sessions, eq(sessions.id, matches.sessionId))
          .where(
            and(
              eq(matches.sessionId, sessionId),
              eq(matches.matchNo, matchNo),
              orgMemberPredicate(user.id),
            ),
          )
          .limit(1)
      )[0] ?? null;
    if (!matchRow) {
      return { ok: false, message: "Match not found in this session." } as const;
    }
    return confirmMatch(userDb, { sessionId, matchId: matchRow.id, rows });
  });
  if (result.ok) revalidatePath(`/sessions/${sessionId}`);
  return result;
}

/** Discard a bad OCR draft — the page returns to the upload state (R8). */
export async function reparseAction(
  sessionId: string,
  matchNo: number,
): Promise<ConfirmMatchResult> {
  const { user } = await requireSessionAccess(sessionId);
  const result = await withUserDb({ sub: user.id }, async (userDb) => {
    const matchRow =
      (
        await userDb
          .select({ id: matches.id })
          .from(matches)
          .innerJoin(sessions, eq(sessions.id, matches.sessionId))
          .where(
            and(
              eq(matches.sessionId, sessionId),
              eq(matches.matchNo, matchNo),
              orgMemberPredicate(user.id),
            ),
          )
          .limit(1)
      )[0] ?? null;
    if (!matchRow) {
      return { ok: false, message: "Match not found in this session." } as const;
    }
    await userDb
      .update(matches)
      .set({ rawSquadData: null })
      .where(eq(matches.id, matchRow.id));
    return { ok: true } as const;
  });
  if (result.ok) revalidatePath(`/sessions/${sessionId}/matches/${matchNo}`);
  return result;
}
