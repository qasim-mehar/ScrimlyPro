"use server";

import { revalidatePath } from "next/cache";

import { assertSessionOwner } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { lockMvpList, unlockMvp, type LockMvpResult } from "@/lib/mvp/lifecycle";
import type { MvpValidationEntry } from "@/lib/mvp/lock";

/**
 * Guarded server wrappers (C6.1 + WP6): assertSessionOwner (verified user +
 * session ownership, 404 on missing/foreign) → withUserDb (RLS-scoped) →
 * revalidatePath. Zero validation logic of their own — lib/mvp owns it.
 */

export async function lockMvpAction(
  sessionId: string,
  entries: MvpValidationEntry[],
): Promise<LockMvpResult> {
  const { user } = await assertSessionOwner(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    lockMvpList(userDb, sessionId, entries),
  );
  if (result.ok) revalidatePath(`/sessions/${sessionId}/mvp`);
  return result;
}

export async function unlockMvpAction(sessionId: string): Promise<{ ok: true }> {
  const { user } = await assertSessionOwner(sessionId);
  await withUserDb({ sub: user.id }, (userDb) => unlockMvp(userDb, sessionId));
  revalidatePath(`/sessions/${sessionId}/mvp`);
  return { ok: true };
}
