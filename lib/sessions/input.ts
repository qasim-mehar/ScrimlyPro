import type { AestheticId } from "@/lib/graphics/types";

export const VALID_TEMPLATE_IDS = [
  "dark-gold",
  "purple-butterfly",
  "pink-blossom",
  "pmpl-light",
  "neon-green",
  "challengers-red",
] as const;

export type TeamDraft = { name: string; logoUrl: string | null };

export type SessionDraft = {
  name: string;
  plannedMatches: number;
  teamCount: number;
  templateId: string; // validated against VALID_TEMPLATE_IDS
  teams: TeamDraft[];
};

export type ValidationIssue =
  | { field: "name"; message: string }
  | { field: "plannedMatches"; message: string }
  | { field: "teamCount"; message: string }
  | { field: "templateId"; message: string }
  | { field: "teams"; message: string }
  | { field: "teamName"; message: string; index: number }
  | { field: "logoUrl"; message: string; index: number };

/**
 * Split raw textarea input on newlines AND commas, trim, drop empties.
 * Order preserved. Duplicates are NOT dropped here — validate flags them.
 */
export function parseTeamInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const LOGO_MAX_CHARS = 300_000;

/**
 * Field-scoped validation, shared by the client wizard (live) and the
 * server action (authoritative). Empty array = valid.
 */
export function validateSessionDraft(draft: SessionDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const name = draft.name.trim();
  if (name.length < 1 || name.length > 80) {
    issues.push({ field: "name", message: "Name must be 1–80 characters." });
  }

  if (
    !Number.isInteger(draft.plannedMatches) ||
    draft.plannedMatches < 1 ||
    draft.plannedMatches > 6
  ) {
    issues.push({
      field: "plannedMatches",
      message: "Planned matches must be a whole number from 1 to 6.",
    });
  }

  if (
    !Number.isInteger(draft.teamCount) ||
    draft.teamCount < 4 ||
    draft.teamCount > 25
  ) {
    issues.push({
      field: "teamCount",
      message: "Team count must be a whole number from 4 to 25.",
    });
  }

  if (!VALID_TEMPLATE_IDS.includes(draft.templateId as AestheticId)) {
    issues.push({ field: "templateId", message: "Pick one of the six aesthetics." });
  }

  if (draft.teams.length !== draft.teamCount) {
    issues.push({
      field: "teams",
      message: `Team list has ${draft.teams.length} teams but team count is ${draft.teamCount} — make them match.`,
    });
  }

  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  draft.teams.forEach((team, index) => {
    const teamName = team.name.trim();
    if (teamName.length < 1 || teamName.length > 60) {
      issues.push({
        field: "teamName",
        message: `Team ${index + 1}: name must be 1–60 characters.`,
        index,
      });
      return;
    }
    // DB unique index is exact-case; validation is stricter (case-insensitive)
    // on purpose — two teams differing only by case is an organizer error.
    const key = teamName.toLowerCase();
    const existing = seen.get(key);
    if (existing !== undefined) {
      duplicates.add(existing);
      duplicates.add(teamName);
    } else {
      seen.set(key, teamName);
    }
  });
  if (duplicates.size > 0) {
    issues.push({
      field: "teams",
      message: `Duplicate team names: ${[...duplicates].join(", ")}.`,
    });
  }

  draft.teams.forEach((team, index) => {
    const { logoUrl } = team;
    if (logoUrl === null) return;
    if (!logoUrl.startsWith("data:image/") || logoUrl.length > LOGO_MAX_CHARS) {
      issues.push({
        field: "logoUrl",
        message: `Team ${index + 1}: logo must be an image data URL up to 300 KB of text.`,
        index,
      });
    }
  });

  return issues;
}
