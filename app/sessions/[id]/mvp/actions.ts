"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db/client";
import { lockMvpList, unlockMvp, type LockMvpResult } from "@/lib/mvp/lifecycle";
import type { MvpValidationEntry } from "@/lib/mvp/lock";

/**
 * Thin server wrappers (C6.1): getDb → lifecycle → revalidatePath.
 * Zero validation logic of their own — lib/mvp owns it.
 */

export async function lockMvpAction(
  sessionId: string,
  entries: MvpValidationEntry[],
): Promise<LockMvpResult> {
  const result = lockMvpList(getDb(), sessionId, entries);
  if (result.ok) revalidatePath(`/sessions/${sessionId}/mvp`);
  return result;
}

export async function unlockMvpAction(sessionId: string): Promise<{ ok: true }> {
  unlockMvp(getDb(), sessionId);
  revalidatePath(`/sessions/${sessionId}/mvp`);
  return { ok: true };
}
