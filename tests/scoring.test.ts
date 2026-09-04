import type { ScoringRules } from "@/lib/db/schema";
import {
  SUPER_RULES,
  computeStandings,
  placementPoints,
  pointsForMatch,
  type ResultRow,
  type TeamRow,
} from "@/lib/scoring";
import { describe, expect, it } from "vitest";

const CUSTOM: ScoringRules = {
  kill_points: 1,
  placement_points: { "1": 15, "2": 12 },
  default_placement_points: 1,
};

const DOUBLE_KILL: ScoringRules = {
  kill_points: 2,
  placement_points: { "3": 5 },
  default_placement_points: 0,
};

const STANDINGS_KILL_MULT: ScoringRules = {
  kill_points: 2,
  placement_points: { "1": 10, "2": 6, "3": 5 },
  default_placement_points: 0,
};

function row(teamId: string, placement: number, kills: number, placementPoints: number): ResultRow {
  return { teamId, placement, kills, placementPoints };
}

function team(id: string, name: string): TeamRow {
  return { id, name, logoUrl: null };
}

describe("placementPoints", () => {
  it("T1: SUPER rules table for placements 1–25", () => {
    const expected: Record<number, number> = {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
    };
    for (let p = 1; p <= 25; p++) {
      expect(placementPoints(p, SUPER_RULES)).toBe(expected[p] ?? 0);
    }
  });

  it("T1: custom rules use their table and default", () => {
    expect(placementPoints(1, CUSTOM)).toBe(15);
    expect(placementPoints(2, CUSTOM)).toBe(12);
    expect(placementPoints(3, CUSTOM)).toBe(1);
    expect(placementPoints(25, CUSTOM)).toBe(1);
  });
});

describe("pointsForMatch", () => {
  it("T2: SUPER rules (1st, 5 kills) → 10 + 5 = 15", () => {
    expect(pointsForMatch(1, 5, SUPER_RULES)).toEqual({
      placementPoints: 10,
      killPoints: 5,
      total: 15,
    });
  });

  it("T2: SUPER rules (16th, 0 kills) → all zero", () => {
    expect(pointsForMatch(16, 0, SUPER_RULES)).toEqual({
      placementPoints: 0,
      killPoints: 0,
      total: 0,
    });
  });

  it("T2: ×2 kill rules multiply kill points", () => {
    expect(pointsForMatch(3, 4, DOUBLE_KILL)).toEqual({
      placementPoints: 5,
      killPoints: 8,
      total: 13,
    });
  });
});

describe("computeStandings", () => {
  // T3 fixture: teams Alpha, Bravo, Charlie across two matches.
  const T3_TEAMS: TeamRow[] = [team("alpha", "Alpha"), team("bravo", "Bravo"), team("charlie", "Charlie")];
  const T3_RESULTS: ResultRow[] = [
    // Match 1: Alpha 1st/10 kills, Bravo 2nd/8, Charlie 3rd/5
    row("alpha", 1, 10, 10),
    row("bravo", 2, 8, 6),
    row("charlie", 3, 5, 5),
    // Match 2: Bravo 1st/9, Charlie 2nd/4, Alpha 3rd/3
    row("bravo", 1, 9, 10),
    row("charlie", 2, 4, 6),
    row("alpha", 3, 3, 5),
  ];

  it("T3: accumulates WWCD, pp, kp, total and sorts by the tie-break chain", () => {
    expect(computeStandings(T3_RESULTS, T3_TEAMS, SUPER_RULES)).toEqual([
      { teamId: "bravo", teamName: "Bravo", logoUrl: null, wwcd: 1, pp: 16, kp: 17, total: 33 },
      { teamId: "alpha", teamName: "Alpha", logoUrl: null, wwcd: 1, pp: 15, kp: 13, total: 28 },
      { teamId: "charlie", teamName: "Charlie", logoUrl: null, wwcd: 0, pp: 11, kp: 9, total: 20 },
    ]);
  });

  it("T3b: kill multiplier applies in standings, order unchanged", () => {
    // Bravo 17×2=34, Alpha 13×2=26, Charlie 9×2=18 — pins the arithmetic, not the ordering.
    expect(computeStandings(T3_RESULTS, T3_TEAMS, STANDINGS_KILL_MULT)).toEqual([
      { teamId: "bravo", teamName: "Bravo", logoUrl: null, wwcd: 1, pp: 16, kp: 34, total: 50 },
      { teamId: "alpha", teamName: "Alpha", logoUrl: null, wwcd: 1, pp: 15, kp: 26, total: 41 },
      { teamId: "charlie", teamName: "Charlie", logoUrl: null, wwcd: 0, pp: 11, kp: 18, total: 29 },
    ]);
  });

  it("T4: zero-result team appears last with all zeros", () => {
    const teams = [...T3_TEAMS, team("zulu", "Zulu")];
    const standings = computeStandings(T3_RESULTS, teams, SUPER_RULES);
    expect(standings.map((s) => s.teamName)).toEqual(["Bravo", "Alpha", "Charlie", "Zulu"]);
    expect(standings[3]).toEqual({
      teamId: "zulu",
      teamName: "Zulu",
      logoUrl: null,
      wwcd: 0,
      pp: 0,
      kp: 0,
      total: 0,
    });
  });

  it("T5: full tie-break chain resolves four teams on equal totals", () => {
    // All four total 15. Golf/Foxtrot tie on every numeric criterion → name ASC (F < G).
    // Delta beats Echo on wwcd (1 vs 0). Foxtrot/Golf beat Delta on kp (5 vs 4).
    const teams = [
      team("foxtrot", "Foxtrot"),
      team("golf", "Golf"),
      team("delta", "Delta"),
      team("echo", "Echo"),
    ];
    const results: ResultRow[] = [
      row("foxtrot", 1, 5, 10),
      row("golf", 1, 5, 10),
      row("delta", 1, 3, 10),
      row("delta", 8, 1, 1),
      row("echo", 2, 9, 6),
    ];
    expect(computeStandings(results, teams, SUPER_RULES).map((s) => s.teamName)).toEqual([
      "Foxtrot",
      "Golf",
      "Delta",
      "Echo",
    ]);
  });

  it("T6: empty results yield all-zero rows ordered by name ASC", () => {
    expect(computeStandings([], [team("bravo", "Bravo"), team("alpha", "Alpha")], SUPER_RULES)).toEqual([
      { teamId: "alpha", teamName: "Alpha", logoUrl: null, wwcd: 0, pp: 0, kp: 0, total: 0 },
      { teamId: "bravo", teamName: "Bravo", logoUrl: null, wwcd: 0, pp: 0, kp: 0, total: 0 },
    ]);
  });

  it("T7: is deterministic across repeated calls", () => {
    const teams = [
      team("foxtrot", "Foxtrot"),
      team("golf", "Golf"),
      team("delta", "Delta"),
      team("echo", "Echo"),
    ];
    const results: ResultRow[] = [
      row("foxtrot", 1, 5, 10),
      row("golf", 1, 5, 10),
      row("delta", 1, 3, 10),
      row("delta", 8, 1, 1),
      row("echo", 2, 9, 6),
    ];
    const first = computeStandings(results, teams, SUPER_RULES);
    const second = computeStandings(results, teams, SUPER_RULES);
    expect(second).toEqual(first);
  });

  it("T8: throws naming the unknown teamId", () => {
    expect(() =>
      computeStandings([row("ghost", 1, 0, 10)], [team("alpha", "Alpha")], SUPER_RULES),
    ).toThrow(/ghost/);
  });
});
