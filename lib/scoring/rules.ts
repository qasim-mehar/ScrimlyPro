import type { ScoringRules } from "@/lib/db/schema";

// duplicated from PRD §6 — keep in sync (also duplicated in scripts/seed.mjs)
export const SUPER_RULES: ScoringRules = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6, "3": 5, "4": 4, "5": 3, "6": 2, "7": 1, "8": 1 },
  default_placement_points: 0,
};

export function placementPoints(placement: number, rules: ScoringRules): number {
  return rules.placement_points[String(placement)] ?? rules.default_placement_points;
}

export function pointsForMatch(
  placement: number,
  kills: number,
  rules: ScoringRules,
): { placementPoints: number; killPoints: number; total: number } {
  const placementPts = placementPoints(placement, rules);
  const killPts = kills * rules.kill_points;
  return { placementPoints: placementPts, killPoints: killPts, total: placementPts + killPts };
}
