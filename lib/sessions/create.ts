import type { Db } from "@/lib/db/client";
import { sessions, teams, type ScoringRules } from "@/lib/db/schema";
import { SUPER_RULES } from "@/lib/scoring";
import { validateSessionDraft, type SessionDraft } from "./input";

/**
 * Insert session + teams in ONE transaction. Re-validates and THROWS
 * (fail-loud) if issues exist — the action layer validates first, this
 * is defense in depth. Returns the new session id.
 */
export function createSessionWithTeams(db: Db, draft: SessionDraft): string {
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

  // better-sqlite3 driver: the transaction callback is synchronous.
  db.transaction((tx) => {
    tx.insert(sessions)
      .values({
        id: sessionId,
        name: draft.name.trim(),
        plannedMatches: draft.plannedMatches,
        teamCount: draft.teamCount,
        templateId: draft.templateId,
        scoringRules,
        status: "active",
        createdAt,
      })
      .run();

    tx.insert(teams)
      .values(
        draft.teams.map((team) => ({
          id: crypto.randomUUID(),
          sessionId,
          name: team.name.trim(),
          logoUrl: team.logoUrl,
        })),
      )
      .run();
  });

  return sessionId;
}
