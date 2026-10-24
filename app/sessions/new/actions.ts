"use server";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { fetchOrgRole } from "@/lib/orgs/orgs";
import {
  assertSessionQuota,
  QuotaExceededError,
} from "@/lib/orgs/quotas";
import { createSessionWithTeams } from "@/lib/sessions/create";
import {
  validateSessionDraft,
  type SessionDraft,
  type ValidationIssue,
} from "@/lib/sessions/input";

export type CreateSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; issues: ValidationIssue[] }
  | { ok: false; message: string }; // unexpected/internal/quota

export const QUOTA_UPGRADE_COPY =
  "You've reached this organization's scrim limit. Contact support to raise limits.";

/**
 * Guarded thin wrapper (WP6): requireUser (redirect /login) → validate →
 * insert under withUserDb (RLS-scoped). The new session's user_id is the
 * SERVER-VERIFIED user id; its org comes from the wizard's selection but is
 * TRUSTED ONLY after a membership check inside the same transaction
 * (fetchOrgRole) — request input can never set the owner or a foreign org.
 * The session-quota COUNT runs inside that same tx (cheap, no external
 * calls anywhere near it).
 */
export async function createSessionAction(
  draft: SessionDraft,
): Promise<CreateSessionResult> {
  const user = await requireUser();

  const issues = validateSessionDraft(draft);
  if (issues.length > 0) return { ok: false, issues };

  try {
    const sessionId = await withUserDb({ sub: user.id }, async (userDb) => {
      // Belt: membership is verified explicitly; RLS (suspenders) would
      // reject the session insert anyway for a foreign org.
      const role = await fetchOrgRole(userDb, draft.orgId, user.id);
      if (!role) {
        throw new ForeignOrgError();
      }
      await assertSessionQuota(userDb, draft.orgId);
      return createSessionWithTeams(userDb, draft, user.id, draft.orgId);
    });
    return { ok: true, sessionId };
  } catch (error) {
    if (error instanceof ForeignOrgError) {
      // Foreign and missing orgs are indistinguishable: same generic copy,
      // zero existence leakage.
      return {
        ok: false,
        issues: [
          { field: "orgId", message: "Pick one of your organizations." },
        ],
      };
    }
    if (error instanceof QuotaExceededError && error.quota === "max_sessions") {
      return { ok: false, message: QUOTA_UPGRADE_COPY };
    }
    console.error("createSessionAction failed:", error);
    return {
      ok: false,
      message: "Something went wrong creating the scrim. Please try again.",
    };
  }
}

class ForeignOrgError extends Error {
  constructor() {
    super("org membership not found");
  }
}
