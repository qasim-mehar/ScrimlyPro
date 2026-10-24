"use server";

import { revalidatePath } from "next/cache";

import { assertSessionOwner } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import {
  markComplete,
  reopenSession,
  unlockMatch,
  type LifecycleResult,
} from "@/lib/sessions/lifecycle";

/**
 * Guarded wrappers: assertSessionOwner (verified user + session ownership,
 * 404 on missing/foreign) → withUserDb (RLS-scoped lib call) → revalidate.
 * Zero logic of their own — lib/sessions/lifecycle owns it.
 */
export async function unlockMatchAction(
  sessionId: string,
  matchId: string,
): Promise<LifecycleResult> {
  const { user } = await assertSessionOwner(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    unlockMatch(userDb, sessionId, matchId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function markCompleteAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const { user } = await assertSessionOwner(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    markComplete(userDb, sessionId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function reopenSessionAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const { user } = await assertSessionOwner(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    reopenSession(userDb, sessionId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}
