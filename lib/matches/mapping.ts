/**
 * Review-form state validation (PRD §F3 — confirm gating).
 * Pure: no DB, no env. The form calls this live to enable/disable Confirm;
 * confirmMatch re-runs it server-side before writing anything (PRD R1).
 */

export type SquadRowDraft = {
  placement: number;
  squadTag: string;
  /** Dropdown selection — null until the organizer picks a team. */
  teamId: string | null;
  players: Array<{ name: string; kills: number }>;
};

export type MappingIssueCode =
  | "UNMAPPED"
  | "DUPLICATE_TEAM"
  | "BAD_PLACEMENTS"
  | "BAD_SQUAD_SIZE";

export type MappingIssue = { code: MappingIssueCode; message: string };

/**
 * Issues: unmapped squads (with placements), duplicate teamIds (with the
 * team name + both placements), placement gaps/duplicates after manual
 * edits, squad >4 or <1 players after manual edits.
 *
 * teamNames is optional (spec signature is rows + teamCount); duplicate
 * messages fall back to the raw teamId when a name is unavailable.
 */
export function validateMapping(
  rows: SquadRowDraft[],
  teamCount: number,
  teamNames?: ReadonlyMap<string, string>,
): MappingIssue[] {
  // teamCount is signature (spec) but not a check: fewer rows than teams is
  // the MISSING_SQUADS legacy path (banner + add-row in the form), and more
  // rows than teams always surface as DUPLICATE_TEAM below.
  void teamCount;
  const issues: MappingIssue[] = [];

  for (const row of rows) {
    if (row.teamId === null) {
      issues.push({
        code: "UNMAPPED",
        message: `Placement ${row.placement}: no team selected.`,
      });
    }
  }

  const placementsByTeam = new Map<string, number[]>();
  for (const row of rows) {
    if (row.teamId === null) continue;
    const list = placementsByTeam.get(row.teamId);
    if (list) list.push(row.placement);
    else placementsByTeam.set(row.teamId, [row.placement]);
  }
  for (const [teamId, placements] of placementsByTeam) {
    if (placements.length > 1) {
      const name = teamNames?.get(teamId) ?? teamId;
      const sorted = [...placements].sort((a, b) => a - b);
      issues.push({
        code: "DUPLICATE_TEAM",
        message: `Team "${name}" is mapped to placements ${sorted.join(" and ")} — each team exactly once.`,
      });
    }
  }

  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.placement)) {
      issues.push({
        code: "BAD_PLACEMENTS",
        message: `Duplicate placement ${row.placement}.`,
      });
    }
    seen.add(row.placement);
  }
  if (issues.every((issue) => issue.code !== "BAD_PLACEMENTS")) {
    for (let placement = 1; placement <= rows.length; placement++) {
      if (!seen.has(placement)) {
        issues.push({
          code: "BAD_PLACEMENTS",
          message: `Placements must be 1..${rows.length} with no gaps (missing ${placement}).`,
        });
        break;
      }
    }
  }

  for (const row of rows) {
    if (row.players.length < 1 || row.players.length > 4) {
      issues.push({
        code: "BAD_SQUAD_SIZE",
        message: `Placement ${row.placement}: ${row.players.length} players (expected 1–4).`,
      });
    }
  }

  return issues;
}
