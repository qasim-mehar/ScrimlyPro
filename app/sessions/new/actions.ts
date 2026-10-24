"use server";

import { getDb } from "@/lib/db/client";
import { createSessionWithTeams } from "@/lib/sessions/create";
import {
  validateSessionDraft,
  type SessionDraft,
  type ValidationIssue,
} from "@/lib/sessions/input";

export type CreateSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; issues: ValidationIssue[] }
  | { ok: false; message: string }; // unexpected/internal

/**
 * Thin wrapper: validate → insert → return. No validation logic of its own
 * (shared functions from lib/sessions), no redirect — the client navigates.
 */
export async function createSessionAction(
  draft: SessionDraft,
): Promise<CreateSessionResult> {
  const issues = validateSessionDraft(draft);
  if (issues.length > 0) return { ok: false, issues };

  try {
    const sessionId = await createSessionWithTeams(getDb(), draft);
    return { ok: true, sessionId };
  } catch (error) {
    console.error("createSessionAction failed:", error);
    return {
      ok: false,
      message: "Something went wrong creating the scrim. Please try again.",
    };
  }
}
