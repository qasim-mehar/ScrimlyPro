"use server";

import { revalidatePath } from "next/cache";

import { withUserDb } from "@/lib/db/user";
import { requireSessionAccess } from "@/lib/orgs/roles";
import {
  markComplete,
  reopenSession,
  unlockMatch,
  type LifecycleResult,
} from "@/lib/sessions/lifecycle";

/**
 * Guarded wrappers: requireSessionAccess (verified user + org membership,
 * 404 on missing/foreign — existence never revealed) → withUserDb
 * (RLS-scoped lib call) → revalidate. Zero logic of their own —
 * lib/sessions/lifecycle owns it.
 */
export async function unlockMatchAction(
  sessionId: string,
  matchId: string,
): Promise<LifecycleResult> {
  const { user } = await requireSessionAccess(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    unlockMatch(userDb, sessionId, matchId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function markCompleteAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const { user } = await requireSessionAccess(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    markComplete(userDb, sessionId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function reopenSessionAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const { user } = await requireSessionAccess(sessionId);
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    reopenSession(userDb, sessionId),
  );
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}
