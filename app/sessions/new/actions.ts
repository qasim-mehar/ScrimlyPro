"use server";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
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
 * Guarded thin wrapper (WP6): requireUser (redirect /login) → validate →
 * insert under withUserDb (RLS-scoped). The new session's user_id is the
 * SERVER-VERIFIED user id — request input can never set the owner.
 * No validation logic of its own (shared functions from lib/sessions),
 * no redirect — the client navigates.
 */
export async function createSessionAction(
  draft: SessionDraft,
): Promise<CreateSessionResult> {
  const user = await requireUser();

  const issues = validateSessionDraft(draft);
  if (issues.length > 0) return { ok: false, issues };

  try {
    const sessionId = await withUserDb({ sub: user.id }, (userDb) =>
      createSessionWithTeams(userDb, draft, user.id),
    );
    return { ok: true, sessionId };
  } catch (error) {
    console.error("createSessionAction failed:", error);
    return {
      ok: false,
      message: "Something went wrong creating the scrim. Please try again.",
    };
  }
}
