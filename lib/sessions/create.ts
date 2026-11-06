import type { Db } from "@/lib/db/client";
import { sessions, teams, type ScoringRules } from "@/lib/db/schema";
import { SUPER_RULES } from "@/lib/scoring";
import { validateSessionDraft, type SessionDraft } from "./input";

/**
 * Insert session + teams in ONE transaction. Re-validates and THROWS
 * (fail-loud) if issues exist — the action layer validates first, this
 * is defense in depth. Returns the new session id.
 *
 * `userId` MUST be the server-verified user id (supabase.auth.getUser) —
 * never a client-supplied value. `orgId` is REQUIRED (M2): every session
 * lives in an org and the RLS policies key on org membership; the caller
 * resolves it server-side (membership-verified selection or the user's
 * Personal org) — it is never an optional/null column.
 */
export async function createSessionWithTeams(
  db: Db,
  draft: SessionDraft,
  userId: string,
  orgId: string,
): Promise<string> {
  const issues = validateSessionDraft(draft);
  if (issues.length > 0) {
    throw new Error(
      `invalid session draft: ${issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  const sessionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  // Deep copy — never share the module-level SUPER_RULES object across rows.
  const scoringRules = JSON.parse(JSON.stringify(SUPER_RULES)) as ScoringRules;

  // postgres.js driver: the transaction callback is async.
  await db.transaction(async (tx) => {
    await tx.insert(sessions).values({
      id: sessionId,
      userId,
      orgId,
      name: draft.name.trim(),
      plannedMatches: draft.plannedMatches,
      teamCount: draft.teamCount,
      templateId: draft.templateId,
      scoringRules,
      status: "active",
      createdAt,
    });

    await tx.insert(teams).values(
      draft.teams.map((team) => ({
        id: crypto.randomUUID(),
        sessionId,
        name: team.name.trim(),
        logoUrl: team.logoUrl,
        slotNumber: team.slotNumber,
      })),
    );
  });

  return sessionId;
}
