import type { ScoringRules } from "@/lib/db/schema";

// Contract: ERD §3 (standings derivation — never stored, one implementation for
// both the standings table and the graphic) + PRD F4 (tie-break chain).

export type ResultRow = {
  teamId: string;
  placement: number;
  kills: number;
  placementPoints: number;
};

export type TeamRow = { id: string; name: string; logoUrl: string | null };

export type StandingRow = {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  wwcd: number;
  pp: number;
  kp: number;
  total: number;
};

export function computeStandings(
  results: ResultRow[],
  teams: TeamRow[],
  rules: ScoringRules,
): StandingRow[] {
  // All teams get a row — a team with zero results is all zeros (real scrims:
  // someone's match may not be ingested yet).
  const byTeamId = new Map<string, StandingRow>();
  for (const team of teams) {
    byTeamId.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      logoUrl: team.logoUrl,
      wwcd: 0,
      pp: 0,
      kp: 0,
      total: 0,
    });
  }

  for (const result of results) {
    const row = byTeamId.get(result.teamId);
    if (!row) {
      // DB FK invariants make this a bug detector — fail loud.
      throw new Error(`computeStandings: result references unknown teamId "${result.teamId}"`);
    }
    if (result.placement === 1) row.wwcd += 1;
    // pp uses the stored per-result placementPoints — standings never re-derives them.
    row.pp += result.placementPoints;
    // kp applies the kill multiplier so non-×1 rulesets stay correct.
    row.kp += result.kills * rules.kill_points;
  }

  for (const row of byTeamId.values()) {
    row.total = row.pp + row.kp;
  }

  const standings = [...byTeamId.values()];
  // Sort: total DESC → wwcd DESC → kp DESC → pp DESC → name ASC.
  // Name comparison is codepoint-based — locale-aware collation is environment-dependent.
  standings.sort((a, b) => {
    if (a.total !== b.total) return b.total - a.total;
    if (a.wwcd !== b.wwcd) return b.wwcd - a.wwcd;
    if (a.kp !== b.kp) return b.kp - a.kp;
    if (a.pp !== b.pp) return b.pp - a.pp;
    return a.teamName < b.teamName ? -1 : a.teamName > b.teamName ? 1 : 0;
  });
  return standings;
}
