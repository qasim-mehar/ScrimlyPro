"use server";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { ensurePersonalOrg } from "@/lib/orgs/orgs";
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
 * SERVER-VERIFIED user id and its org_id is resolved server-side
 * (membership-verified selection / the user's Personal org) — request input
 * can never set the owner or a foreign org. No validation logic of its own
 * (shared functions from lib/sessions), no redirect — the client navigates.
 */
export async function createSessionAction(
  draft: SessionDraft,
): Promise<CreateSessionResult> {
  const user = await requireUser();

  const issues = validateSessionDraft(draft);
  if (issues.length > 0) return { ok: false, issues };

  try {
    const sessionId = await withUserDb({ sub: user.id }, async (userDb) => {
      // Org context is REQUIRED (M2): resolved inside the same tx — the
      // wizard's membership-verified selection replaces this in m2(4).
      const orgId = await ensurePersonalOrg(userDb, user.id);
      return createSessionWithTeams(userDb, draft, user.id, orgId);
    });
    return { ok: true, sessionId };
  } catch (error) {
    console.error("createSessionAction failed:", error);
    return {
      ok: false,
      message: "Something went wrong creating the scrim. Please try again.",
    };
  }
}
