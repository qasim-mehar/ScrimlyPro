import { describe, expect, it } from "vitest";
import type { StatColumnKey } from "@/lib/graphics";
import { STANDINGS_LABELS, standingsSubtitle, withRanks } from "@/lib/graphics/standings";
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
  it("has exactly the 6 standings columns", () => {
    expect(Object.keys(STANDINGS_LABELS).sort()).toEqual(["kp", "pp", "rank", "team", "total", "wwcd"]);
  });

  it("stat labels cover exactly the StatColumnKey columns", () => {
    // Compile-time half: this assignment only typechecks if the stat keys are
    // exactly wwcd/pp/kp/total; runtime half pins the label strings.
    const statLabels: Record<StatColumnKey, string> = {
      wwcd: STANDINGS_LABELS.wwcd,
      pp: STANDINGS_LABELS.pp,
      kp: STANDINGS_LABELS.kp,
      total: STANDINGS_LABELS.total,
    };
    expect(statLabels).toEqual({ wwcd: "WWCD", pp: "PP", kp: "KP", total: "TOTAL" });
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
