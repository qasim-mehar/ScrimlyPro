import { describe, expect, it } from "vitest";
import type { StatColumnKey } from "@/lib/graphics";
import {
  resolveStandingsFilename,
  STANDINGS_LABELS,
  standingsSubtitle,
  statColumnValue,
  subtitleMatchNumber,
  withRanks,
} from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";

function row(overrides: Partial<StandingRow>): StandingRow {
  return { teamId: "t", teamName: "TEAM", logoUrl: null, wwcd: 0, pp: 0, kp: 0, total: 0, ...overrides };
}

describe("standingsSubtitle", () => {
  it("mid-session → AFTER MATCH N", () => {
    expect(standingsSubtitle(2, false)).toBe("AFTER MATCH 2");
  });

  it("completed session → FINAL RESULTS", () => {
    expect(standingsSubtitle(6, true)).toBe("FINAL RESULTS");
  });

  it("zero confirmed → AFTER MATCH 0 (documented edge — callers avoid it)", () => {
    expect(standingsSubtitle(0, false)).toBe("AFTER MATCH 0");
  });
});

describe("STANDINGS_LABELS", () => {
  it("has exactly the 7 standings columns", () => {
    expect(Object.keys(STANDINGS_LABELS).sort()).toEqual([
      "kp",
      "matches",
      "pp",
      "rank",
      "team",
      "total",
      "wwcd",
    ]);
  });

  it("stat labels cover exactly the StatColumnKey columns", () => {
    // Compile-time half: this assignment only typechecks if the stat keys are
    // exactly wwcd/matches/pp/kp/total; runtime half pins the label strings.
    const statLabels: Record<StatColumnKey, string> = {
      wwcd: STANDINGS_LABELS.wwcd,
      matches: STANDINGS_LABELS.matches,
      pp: STANDINGS_LABELS.pp,
      kp: STANDINGS_LABELS.kp,
      total: STANDINGS_LABELS.total,
    };
    expect(statLabels).toEqual({
      wwcd: "WWCD",
      matches: "MATCHES",
      pp: "PP",
      kp: "KP",
      total: "TOTAL",
    });
  });
});

describe("statColumnValue", () => {
  const base = row({ wwcd: 2, pp: 41, kp: 17, total: 70 });

  it("maps wwcd/pp/kp/total straight off the row", () => {
    expect(statColumnValue(base, "wwcd")).toBe(2);
    expect(statColumnValue(base, "pp")).toBe(41);
    expect(statColumnValue(base, "kp")).toBe(17);
    expect(statColumnValue(base, "total")).toBe(70);
  });

  it("matches falls back to the session-level confirmed count", () => {
    expect(statColumnValue(base, "matches", 6)).toBe(6);
  });

  it("matches prefers a row-level override, then 0 with no source", () => {
    expect(statColumnValue(row({ matches: 4 }), "matches", 6)).toBe(4);
    expect(statColumnValue(base, "matches")).toBe(0);
  });
});

describe("subtitleMatchNumber", () => {
  it("derives the digits from AFTER MATCH N", () => {
    expect(subtitleMatchNumber("AFTER MATCH 6")).toBe("6");
  });

  it("FINAL RESULTS has no digits → empty slot", () => {
    expect(subtitleMatchNumber("FINAL RESULTS")).toBe("");
  });
});

describe("resolveStandingsFilename (P5 Fix A)", () => {
  it("explicit isFinal wins → final filename, even with a count", () => {
    expect(resolveStandingsFilename("FINAL RESULTS", 6, true)).toBe("scrimlypro-final-standings.png");
    expect(resolveStandingsFilename("AFTER MATCH 6", 6, true)).toBe("scrimlypro-final-standings.png");
  });

  it("explicit matchCount (mid-session) → after-match-N filename", () => {
    expect(resolveStandingsFilename("AFTER MATCH 2", 2, false)).toBe(
      "scrimlypro-standings-after-match-2.png",
    );
  });

  it("matchCount without isFinal still derives after-match-N", () => {
    expect(resolveStandingsFilename("whatever", 4, undefined)).toBe(
      "scrimlypro-standings-after-match-4.png",
    );
  });

  it("no props → legacy subtitle parsing (gradient templates unchanged)", () => {
    expect(resolveStandingsFilename("AFTER MATCH 2")).toBe("scrimlypro-standings-after-match-2.png");
    expect(resolveStandingsFilename("FINAL RESULTS")).toBe("scrimlypro-final-standings.png");
    expect(resolveStandingsFilename("something else")).toBe("scrimlypro-standings.png");
  });
});

describe("withRanks", () => {
  it("empty standings → empty output", () => {
    expect(withRanks([])).toEqual([]);
  });

  it("assigns ranks 1..n by array order without mutating the input", () => {
    const input = [
      row({ teamId: "a", teamName: "ALPHA" }),
      row({ teamId: "b", teamName: "BETA" }),
      row({ teamId: "c", teamName: "GAMMA" }),
    ];
    const output = withRanks(input);

    expect(output).not.toBe(input);
    expect(output.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(output.map((r) => r.teamId)).toEqual(["a", "b", "c"]);

    // Rows unmutated: originals keep their exact 7-field shape, no rank added.
    expect(Object.keys(input[0]).sort()).toEqual(
      ["kp", "logoUrl", "pp", "teamId", "teamName", "total", "wwcd"].sort(),
    );
  });
});
