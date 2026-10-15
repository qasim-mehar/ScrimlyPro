import { describe, expect, it } from "vitest";
import { SAMPLE_TEAM_NAMES as FIXTURE_SAMPLE_TEAM_NAMES } from "@/lib/fixtures/sampleMatches";
import { AESTHETICS } from "@/lib/graphics";
import {
  parseTeamInput,
  validateSessionDraft,
  VALID_TEMPLATE_IDS,
  type SessionDraft,
  type TeamDraft,
} from "@/lib/sessions/input";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";

function validDraft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    name: "Wassup Open Scrims",
    plannedMatches: 4,
    teamCount: 16,
    templateId: "dark-gold",
    teams: SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({ name, logoUrl: null })),
    ...overrides,
  };
}

describe("parseTeamInput", () => {
  it("splits on newlines and commas, trims, drops empties, preserves order", () => {
    expect(parseTeamInput("A\nB, C\n\n  D  ")).toEqual(["A", "B", "C", "D"]);
  });

  it("handles mixed comma+newline input", () => {
    expect(parseTeamInput("X, Y\nZ,, W")).toEqual(["X", "Y", "Z", "W"]);
  });

  it("empty string → empty array", () => {
    expect(parseTeamInput("")).toEqual([]);
    expect(parseTeamInput("  \n , \n")).toEqual([]);
  });

  it("preserves duplicates (validation flags them)", () => {
    expect(parseTeamInput("TF Squad\nTF Squad")).toEqual(["TF Squad", "TF Squad"]);
  });
});

describe("validateSessionDraft", () => {
  it("accepts a valid 16-team draft", () => {
    expect(validateSessionDraft(validDraft())).toEqual([]);
  });

  it("rejects empty and 81-char names", () => {
    expect(validateSessionDraft(validDraft({ name: "  " }))).toEqual([
      { field: "name", message: "Name must be 1–80 characters." },
    ]);
    const long = validateSessionDraft(validDraft({ name: "x".repeat(81) }));
    expect(long).toHaveLength(1);
    expect(long[0]?.field).toBe("name");
  });

  it("rejects plannedMatches 0, 7, and 2.5", () => {
    for (const plannedMatches of [0, 7, 2.5]) {
      const issues = validateSessionDraft(validDraft({ plannedMatches }));
      expect(issues.some((i) => i.field === "plannedMatches")).toBe(true);
    }
  });

  it("rejects teamCount 3 and 26", () => {
    for (const teamCount of [3, 26]) {
      const issues = validateSessionDraft(validDraft({ teamCount }));
      expect(issues.some((i) => i.field === "teamCount")).toBe(true);
    }
  });

  it("rejects a bogus templateId", () => {
    const issues = validateSessionDraft(validDraft({ templateId: "bogus" }));
    expect(issues).toEqual([
      { field: "templateId", message: "Pick one of the six aesthetics." },
    ]);
  });

  it("flags team-list/count mismatch naming both numbers", () => {
    const issues = validateSessionDraft(
      validDraft({
        teams: SAMPLE_TEAM_NAMES.slice(0, 15).map((name) => ({
          name,
          logoUrl: null,
        })),
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("teams");
    expect(issues[0]?.message).toContain("15");
    expect(issues[0]?.message).toContain("16");
  });

  it("flags a 61-char team name with its index", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
    }));
    teams[2] = { name: "x".repeat(61), logoUrl: null };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toContainEqual({
      field: "teamName",
      message: "Team 3: name must be 1–60 characters.",
      index: 2,
    });
  });

  it("flags case-insensitive duplicates as one teams issue listing the name", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
    }));
    teams[0] = { name: "TF Squad", logoUrl: null };
    teams[1] = { name: "tf squad", logoUrl: null };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("teams");
    expect(issues[0]?.message).toContain("TF Squad");
  });

  it("rejects a non-data-URL logo with its index", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
    }));
    teams[5] = { name: teams[5]!.name, logoUrl: "https://example.com/logo.png" };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toContainEqual({
      field: "logoUrl",
      message: "Team 6: logo must be an image data URL up to 300 KB of text.",
      index: 5,
    });
  });

  it("rejects an oversized (300,001-char) logo with its index", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
    }));
    teams[1] = {
      name: teams[1]!.name,
      // "data:image/png;base64," is 22 chars → exactly 300,001 total.
      logoUrl: `data:image/png;base64,${"A".repeat(300_001 - 22)}`,
    };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("logoUrl");
    expect(issues[0]).toMatchObject({ index: 1 });
  });

  it("accepts a valid data-URL logo", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
    }));
    teams[0] = { name: teams[0]!.name, logoUrl: "data:image/png;base64,iVBOR" };
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });
});

describe("sync guards", () => {
  it("VALID_TEMPLATE_IDS deep-equals Object.keys(AESTHETICS)", () => {
    expect([...VALID_TEMPLATE_IDS]).toEqual(Object.keys(AESTHETICS));
  });

  it("SAMPLE_TEAM_NAMES deep-equals the fixtures' list", () => {
    expect(SAMPLE_TEAM_NAMES).toEqual(FIXTURE_SAMPLE_TEAM_NAMES);
  });
});
