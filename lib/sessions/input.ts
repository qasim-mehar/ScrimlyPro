export const VALID_TEMPLATE_IDS = [
  "dark-gold",
  "purple-butterfly",
  "pink-blossom",
  "pmpl-light",
  "neon-green",
  "challengers-red",
  "ewc-yellow",
  "onyx-green",
  "pmgc-crimson",
  "pmgc-aqua",
  "pmwi-violet",
  "grunge-red",
  "esports-clash",
  "rundown-orange",
  "royal-blue",
  "varsity-yellow",
] as const;

export type TeamDraft = {
  name: string;
  logoUrl: string | null;
  slotNumber: number | null;
};

export type SessionDraft = {
  name: string;
  plannedMatches: number;
  teamCount: number;
  templateId: string; // validated against VALID_TEMPLATE_IDS
  teams: TeamDraft[];
  // M2: org context is REQUIRED (never optional — M1 lesson). The wizard
  // sends the selected org; the server verifies membership before use.
  orgId: string;
};

export type ValidationIssue =
  | { field: "name"; message: string }
  | { field: "plannedMatches"; message: string }
  | { field: "teamCount"; message: string }
  | { field: "templateId"; message: string }
  | { field: "teams"; message: string }
  | { field: "orgId"; message: string }
  | { field: "teamName"; message: string; index: number }
  | { field: "logoUrl"; message: string; index: number }
  | { field: "slotNumber"; message: string; index: number };

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

  // Cast to string[] so this check stays correct as new aesthetics are
  // registered in parallel (AestheticId and the tuple may diverge mid-flight).
  if (!(VALID_TEMPLATE_IDS as readonly string[]).includes(draft.templateId)) {
    issues.push({ field: "templateId", message: "Pick one of the seven aesthetics." });
  }

  // Org context: format-checked here; MEMBERSHIP is verified inside the
  // request transaction (fetchOrgRole) — client input never grants tenancy.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.orgId ?? "")) {
    issues.push({ field: "orgId", message: "Pick an organization for this scrim." });
  }

  if (draft.teams.length !== draft.teamCount) {
    issues.push({
      field: "teams",
      message: `Team list has ${draft.teams.length} teams but team count is ${draft.teamCount} — make them match.`,
    });
  }

  // Slots are optional (null for legacy/unassigned teams) but an assigned
  // slot must be a whole number 1–99 and unique within this session.
  const seenSlots = new Set<number>();
  const duplicateSlots = new Set<number>();
  draft.teams.forEach((team, index) => {
    const { slotNumber } = team;
    // `undefined` is treated like null: older clients/cached drafts may omit
    // the field entirely (backward compatibility during rollout).
    if (slotNumber === null || slotNumber === undefined) return;
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 99) {
      issues.push({
        field: "slotNumber",
        message: `Team ${index + 1}: slot must be a whole number from 1 to 99.`,
        index,
      });
      return;
    }
    if (seenSlots.has(slotNumber)) {
      duplicateSlots.add(slotNumber);
    } else {
      seenSlots.add(slotNumber);
    }
  });
  if (duplicateSlots.size > 0) {
    issues.push({
      field: "teams",
      message: `Duplicate slot numbers: ${[...duplicateSlots]
        .sort((a, b) => a - b)
        .join(", ")}.`,
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
