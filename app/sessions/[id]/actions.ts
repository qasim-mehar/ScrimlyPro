"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db/client";
import {
  markComplete,
  reopenSession,
  unlockMatch,
  type LifecycleResult,
} from "@/lib/sessions/lifecycle";

/** Thin wrappers: getDb → lib fn → revalidate. Zero logic of their own. */
export async function unlockMatchAction(
  sessionId: string,
  matchId: string,
): Promise<LifecycleResult> {
  const result = await unlockMatch(getDb(), sessionId, matchId);
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function markCompleteAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const result = await markComplete(getDb(), sessionId);
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}

export async function reopenSessionAction(
  sessionId: string,
): Promise<LifecycleResult> {
  const result = await reopenSession(getDb(), sessionId);
  if (result.ok) revalidatePath("/sessions/" + sessionId);
  return result;
}
