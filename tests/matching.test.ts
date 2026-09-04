// C2.2 fixtures. The normalizeName cases are the cross-chunk contract with
// C2.3 (shared byte-identical lib/matching/normalize.ts) — change with care.
import { describe, expect, it } from "vitest";
import { normalizeName } from "@/lib/matching/normalize";
import {
  learnRosterDelta,
  rebuildRosters,
  suggestMappings,
  type RosterEntry,
  type SquadLike,
  type TeamInfo,
} from "@/lib/matching";

function squad(placement: number, squadTag: string, names: string[]): SquadLike {
  return { placement, squadTag, players: names.map((name) => ({ name })) };
}

function team(id: string, name: string): TeamInfo {
  return { id, name };
}

function roster(teamId: string, norms: string[]): RosterEntry[] {
  return norms.map((playerNorm) => ({ teamId, playerNorm, displayName: playerNorm }));
}

describe("normalizeName", () => {
  it("N1: Bawa·Qadra → bawa qadra", () => {
    expect(normalizeName("Bawa·Qadra")).toBe("bawa qadra");
  });

  it("N2: Bawa Qadra → bawa qadra (punctuation drift merges with N1)", () => {
    expect(normalizeName("Bawa Qadra")).toBe("bawa qadra");
  });

  it("N3: 4NM | BROKEN → 4nm broken (separator run becomes one space)", () => {
    expect(normalizeName("4NM | BROKEN")).toBe("4nm broken");
  });

  it("N4: TF×MAₛOOR → tf masoor (× dropped, subscript ₛ decomposes to s)", () => {
    expect(normalizeName("TF×MAₛOOR")).toBe("tf masoor");
  });

  it("N5: TFxMA_SODOR → tfxma sodor (stays distinct from N4 — heavy drift)", () => {
    expect(normalizeName("TFxMA_SODOR")).toBe("tfxma sodor");
  });

  it("N6: AKM≌Dasim → akm dasim", () => {
    expect(normalizeName("AKM≌Dasim")).toBe("akm dasim");
  });

  it("N7: علی → علی (non-Latin preserved, NOT emptied)", () => {
    expect(normalizeName("علی")).toBe("علی");
  });

  it("N8: emoji-only name → empty string (unmatchable)", () => {
    expect(normalizeName("😎🔥")).toBe("");
  });
});

describe("suggestMappings", () => {
  it("S1: full overlap → strong, correct team, score ≥ 1.0", () => {
    const teams = [team("a", "Team A"), team("b", "Team B")];
    const rosters = roster("a", ["alpha", "bravo", "charlie", "delta"]);
    const squads = [squad(1, "", ["Alpha", "BRAVO", "charlie", "Delta"])];

    const [first] = suggestMappings(squads, teams, rosters);
    expect(first.teamId).toBe("a");
    expect(first.tier).toBe("strong");
    expect(first.score).toBeGreaterThanOrEqual(1.0);
  });

  it("S2: 2-of-4 substitute → weak, correct team", () => {
    // roster learned from match 1 (4 names); match-2 squad has two subs
    const rosters = learnRosterDelta("sf", [
      { name: "SHADOW" },
      { name: "JAZZ" },
      { name: "BULL" },
      { name: "KALEEM" },
    ]);
    const teams = [team("sf", "Straight Forward")];
    const squads = [squad(1, "", ["SHADOW", "JAZZ", "FAHEEM", "SUBGUY"])];

    const [first] = suggestMappings(squads, teams, rosters);
    expect(first.teamId).toBe("sf");
    expect(first.tier).toBe("weak");
    expect(first.score).toBe(0.5);
  });

  it("S3: zero overlap, tag-less → none", () => {
    const teams = [team("a", "Team A")];
    const rosters = roster("a", ["alpha", "bravo"]);
    const squads = [squad(1, "", ["xray", "yossarian"])];

    expect(suggestMappings(squads, teams, rosters)).toEqual([
      { teamId: null, score: 0, tier: "none" },
    ]);
  });

  it("S4: tag-only match → weak, score 0.3", () => {
    const teams = [team("rox", "ROX Gaming")];
    const rosters = roster("rox", ["falcon", "titan"]);
    const squads = [squad(1, "ROX", ["nobody", "unknown", "stranger"])];

    const [first] = suggestMappings(squads, teams, rosters);
    expect(first.teamId).toBe("rox");
    expect(first.tier).toBe("weak");
    expect(first.score).toBe(0.3);
  });

  it("S5: two teams sharing one tag — no cross-assignment", () => {
    const teams = [team("tf1", "TF Squad"), team("tf2", "TF Academy")];
    const rosters = [
      ...roster("tf1", ["tf vortx", "tf blaze", "tf nova", "tf phantom"]),
      ...roster("tf2", ["ac jay", "ac kai", "ac lee", "ac max"]),
    ];
    const squads = [
      squad(1, "TF", ["TF VORTX", "TF BLAZE", "TF NOVA", "TF PHANTOM"]),
      squad(2, "TF", ["AC JAY", "AC KAI", "AC LEE", "AC MAX"]),
    ];

    const result = suggestMappings(squads, teams, rosters);
    expect(result[0]).toMatchObject({ teamId: "tf1", tier: "strong" });
    expect(result[1]).toMatchObject({ teamId: "tf2", tier: "strong" });

    // variant: one true team absent from `teams` — its squad falls to none,
    // never to the wrong TF team (greedy one-to-one claims tf1 first)
    const variant = suggestMappings(squads, [team("tf1", "TF Squad")], rosters);
    expect(variant[0]).toMatchObject({ teamId: "tf1", tier: "strong" });
    expect(variant[1]).toEqual({ teamId: null, score: 0, tier: "none" });
  });

  it("S6: greedy bijection — 4 squads / 4 teams, shuffled overlaps", () => {
    const teams = [
      team("t3", "Gamma Unit"),
      team("t1", "Alpha Unit"),
      team("t4", "Delta Unit"),
      team("t2", "Beta Unit"),
    ];
    const rosters = [
      ...roster("t1", ["a1", "a2", "a3", "a4"]),
      ...roster("t2", ["b1", "b2", "b3", "b4"]),
      ...roster("t3", ["c1", "c2", "c3", "c4"]),
      ...roster("t4", ["d1", "d2", "d3", "d4"]),
    ];
    // placements shuffled relative to team order; each squad overlaps only
    // its true team
    const squads = [
      squad(3, "", ["D1", "D2", "D3", "D4"]),
      squad(1, "", ["A1", "A2", "A3", "A4"]),
      squad(4, "", ["B1", "B2", "B3", "B4"]),
      squad(2, "", ["C1", "C2", "C3", "C4"]),
    ];

    const result = suggestMappings(squads, teams, rosters);
    expect(result.map((s) => s.teamId)).toEqual(["t4", "t1", "t2", "t3"]);
    expect(result.every((s) => s.tier === "strong")).toBe(true);
    expect(new Set(result.map((s) => s.teamId)).size).toBe(4);
  });

  it("S7: deterministic — same input twice yields deep-equal output", () => {
    const teams = [team("tf1", "TF Squad"), team("tf2", "TF Academy")];
    const rosters = [
      ...roster("tf1", ["tf vortx", "tf blaze"]),
      ...roster("tf2", ["ac jay", "ac kai"]),
    ];
    const squads = [
      squad(2, "TF", ["TF BLAZE", "TF VORTX"]),
      squad(1, "TF", ["AC KAI", "AC JAY"]),
    ];

    expect(suggestMappings(squads, teams, rosters)).toEqual(
      suggestMappings(squads, teams, rosters),
    );
  });
});

describe("learnRosterDelta", () => {
  it("L1: normal entries produced, emoji-only skipped, dedup within call", () => {
    expect(
      learnRosterDelta("t1", [
        { name: "Bawa·Qadra" },
        { name: "Bawa Qadra" },
        { name: "😎" },
        { name: "TF VORTX" },
      ]),
    ).toEqual([
      { teamId: "t1", playerNorm: "bawa qadra", displayName: "Bawa·Qadra" },
      { teamId: "t1", playerNorm: "tf vortx", displayName: "TF VORTX" },
    ]);
  });
});

describe("rebuildRosters", () => {
  it("R1: dedup across matches, earliest matchNo wins, sorted, emoji skipped", () => {
    const confirmed = [
      { teamId: "t2", matchNo: 2, players: [{ name: "ZED" }, { name: "😎" }] },
      {
        teamId: "t1",
        matchNo: 1,
        players: [{ name: "Bawa·Qadra" }, { name: "CARA" }],
      },
      {
        teamId: "t1",
        matchNo: 3,
        players: [{ name: "Bawa Qadra" }, { name: "DAN" }],
      },
      // same norm on a different team must NOT dedup against t1
      { teamId: "t2", matchNo: 4, players: [{ name: "Cara" }] },
    ];

    expect(rebuildRosters(confirmed)).toEqual([
      { teamId: "t1", playerNorm: "bawa qadra", displayName: "Bawa·Qadra" },
      { teamId: "t1", playerNorm: "cara", displayName: "CARA" },
      { teamId: "t1", playerNorm: "dan", displayName: "DAN" },
      { teamId: "t2", playerNorm: "cara", displayName: "Cara" },
      { teamId: "t2", playerNorm: "zed", displayName: "ZED" },
    ]);
  });
});
