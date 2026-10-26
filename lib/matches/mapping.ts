/**
 * Review-form state validation (PRD §F3 — confirm gating).
 * Pure: no DB, no env. The form calls this live to enable/disable Confirm;
 * confirmMatch re-runs it server-side before writing anything (PRD R1).
 */

import type { RawSquad } from "@/lib/db/schema";

export type SquadRowDraft = {
  placement: number;
  squadTag: string;
  /** Dropdown selection — null until the organizer picks a team. */
  teamId: string | null;
  players: Array<{ name: string; kills: number }>;
};

export type MappingIssueCode =
  | "UNMAPPED"
  | "MISSING_ROWS"
  | "DUPLICATE_TEAM"
  | "BAD_PLACEMENTS"
  | "BAD_SQUAD_SIZE";

export type MappingIssue = { code: MappingIssueCode; message: string };

/** Sanitized squad: the exact shape the review form + suggestMappings take. */
export type CleanSquad = {
  placement: number;
  squadTag: string;
  confidence: "high" | "low";
  players: Array<{ name: string; kills: number; confidence?: "high" | "low" }>;
};

/**
 * Boundary between untrusted OCR JSON and the form: sort placement ASC and
 * coerce the fields Gemini may omit (live reads drop squadTag/confidence,
 * which otherwise crash tag affinity with normalize(undefined)).
 */
export function sanitizeSquads(squads: RawSquad[]): CleanSquad[] {
  return [...squads]
    .sort((a, b) => a.placement - b.placement)
    .map((squad) => ({
      placement: squad.placement,
      squadTag: typeof squad.squadTag === "string" ? squad.squadTag : "",
      confidence: squad.confidence === "low" ? "low" : "high",
      players: squad.players.map((player) => ({
        name: player.name,
        kills: player.kills,
        ...(player.confidence === "low"
          ? { confidence: "low" as const }
          : {}),
      })),
    }));
}

/**
 * Issues: unmapped squads (with placements), duplicate teamIds (with the
 * team name + both placements), placement gaps/duplicates after manual
 * edits, squad >4 or <1 players after manual edits, and a mapping that
 * does not cover the full lobby (C7.1 confirm gating — 15 mapped rows on a
 * 16-team session leaves one team with no result row; the MISSING_SQUADS
 * add-row flow is the way back to a complete lobby).
 *
 * teamNames is optional (spec signature is rows + teamCount); duplicate
 * messages fall back to the raw teamId when a name is unavailable.
 */
export function validateMapping(
  rows: SquadRowDraft[],
  teamCount: number,
  teamNames?: ReadonlyMap<string, string>,
): MappingIssue[] {
  const issues: MappingIssue[] = [];

  for (const row of rows) {
    if (row.teamId === null) {
      issues.push({
        code: "UNMAPPED",
        message: `Placement ${row.placement}: no team selected.`,
      });
    }
  }

  // Full-lobby gate (C7.1 Pass 3): fewer rows than teams can never confirm —
  // more rows with all-distinct teams is impossible (only teamCount teams).
  if (rows.length !== teamCount) {
    issues.push({
      code: "MISSING_ROWS",
      message: `Match covers ${rows.length} of ${teamCount} teams — add the missing squads (add-row) before confirming.`,
    });
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
