import type { MvpEntry } from "@/lib/db/schema";

/**
 * Pure validation for the Top-5 MVP lock (PRD §F5, C6.1).
 * No DB, no IO — safe to run on both server and client (the editor
 * shows these issues inline before Lock is even enabled).
 */

export type MvpValidationEntry = Pick<MvpEntry, "name" | "teamId" | "kills">;

export type MvpTeamRef = { id: string };

export const MVP_ENTRY_COUNT = 5;
export const MVP_NAME_MAX = 60;
export const MVP_KILLS_MAX = 200;

/**
 * Validate a candidate locked list. Rules:
 * - exactly 5 entries (fewer/more → one clear message, nothing else);
 * - name trimmed to 1–60 chars;
 * - kills an integer 0–200;
 * - teamId must belong to this session's teams;
 * - no duplicate (trimmed name + teamId) pair — the same team with
 *   different names is FINE (multiple fraggers per team is normal).
 */
export function validateMvpEntries(
  entries: ReadonlyArray<MvpValidationEntry>,
  teams: ReadonlyArray<MvpTeamRef>,
): string[] {
  if (entries.length !== MVP_ENTRY_COUNT) {
    return [
      `MVP list must have exactly ${MVP_ENTRY_COUNT} entries (got ${entries.length}).`,
    ];
  }
  const issues: string[] = [];
  const teamIds = new Set(teams.map((team) => team.id));
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const label = `Entry ${index + 1}`;
    const name = entry.name.trim();
    if (name.length < 1 || name.length > MVP_NAME_MAX) {
      issues.push(`${label}: name must be 1–${MVP_NAME_MAX} characters.`);
    }
    if (!Number.isInteger(entry.kills) || entry.kills < 0 || entry.kills > MVP_KILLS_MAX) {
      issues.push(`${label}: kills must be a whole number from 0 to ${MVP_KILLS_MAX}.`);
    }
    if (!teamIds.has(entry.teamId)) {
      issues.push(`${label}: team is not part of this session.`);
    }
    const key = JSON.stringify([entry.teamId, name]);
    if (seen.has(key)) {
      issues.push(`${label}: duplicate entry for "${name}" (same team).`);
    } else {
      seen.add(key);
    }
  });
  return issues;
}
