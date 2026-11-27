import { describe, expect, it } from "vitest";
import { SAMPLE_TEAM_NAMES as FIXTURE_SAMPLE_TEAM_NAMES } from "@/lib/fixtures/sampleMatches";
import {
  parseTeamInput,
  validateSessionDraft,
  VALID_TEMPLATE_IDS,
  type SessionDraft,
  type TeamDraft,
} from "@/lib/sessions/input";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";
import { assignDefaultTeamSlots } from "@/lib/sessions/slots";

function validDraft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    name: "Wassup Open Scrims",
    orgId: "aaaaaaaa-0000-4000-8000-000000000001",
    plannedMatches: 4,
    teamCount: 16,
    templateId: VALID_TEMPLATE_IDS[0]!,
    teams: SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: null,
    })),
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
      { field: "templateId", message: "Pick one of the available aesthetics." },
    ]);
  });

  it("flags team-list/count mismatch naming both numbers", () => {
    const issues = validateSessionDraft(
      validDraft({
        teams: SAMPLE_TEAM_NAMES.slice(0, 15).map((name) => ({
          name,
          logoUrl: null,
          slotNumber: null,
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
      slotNumber: null,
    }));
    teams[2] = { name: "x".repeat(61), logoUrl: null, slotNumber: null };
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
      slotNumber: null,
    }));
    teams[0] = { name: "TF Squad", logoUrl: null, slotNumber: null };
    teams[1] = { name: "tf squad", logoUrl: null, slotNumber: null };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("teams");
    expect(issues[0]?.message).toContain("TF Squad");
  });

  it("rejects a non-data-URL logo with its index", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: null,
    }));
    teams[5] = {
      name: teams[5]!.name,
      logoUrl: "https://example.com/logo.png",
      slotNumber: null,
    };
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
      slotNumber: null,
    }));
    teams[1] = {
      name: teams[1]!.name,
      // "data:image/png;base64," is 22 chars → exactly 300,001 total.
      logoUrl: `data:image/png;base64,${"A".repeat(300_001 - 22)}`,
      slotNumber: null,
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
      slotNumber: null,
    }));
    teams[0] = {
      name: teams[0]!.name,
      logoUrl: "data:image/png;base64,iVBOR",
      slotNumber: null,
    };
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });

  it("accepts valid slot numbers (1, 5, 25, 99)", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name, index): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: [1, 5, 25, 99][index] ?? null,
    }));
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });

  it("accepts null slots (backward compatible)", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: null,
    }));
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });

  it("treats a missing slotNumber from older clients as unassigned", () => {
    const teams = SAMPLE_TEAM_NAMES.map(
      (name) => ({ name, logoUrl: null }) as TeamDraft,
    );
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });

  it("rejects non-integer slot numbers with the team index", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: null,
    }));
    teams[3] = { ...teams[3]!, slotNumber: 2.5 };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toContainEqual({
      field: "slotNumber",
      message: "Team 4: slot must be a whole number from 1 to 99.",
      index: 3,
    });
  });

  it("rejects slots outside 1–99 (0 and 100)", () => {
    for (const slotNumber of [0, 100]) {
      const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
        name,
        logoUrl: null,
        slotNumber: null,
      }));
      teams[0] = { ...teams[0]!, slotNumber };
      const issues = validateSessionDraft(validDraft({ teams }));
      expect(issues).toContainEqual({
        field: "slotNumber",
        message: "Team 1: slot must be a whole number from 1 to 99.",
        index: 0,
      });
    }
  });

  it("accepts the wizard's default 5, 6, 7 … slot ladder straight through", () => {
    const assigned = assignDefaultTeamSlots(SAMPLE_TEAM_NAMES);
    expect(assigned.map((row) => row.slotNumber)).toEqual(
      SAMPLE_TEAM_NAMES.map((_, i) => 5 + i),
    );
    const teams: TeamDraft[] = assigned.map((row) => ({
      name: row.name,
      logoUrl: null,
      slotNumber: row.slotNumber,
    }));
    expect(validateSessionDraft(validDraft({ teams }))).toEqual([]);
  });

  it("accepts the full 25-team default ladder (5..29) end to end", () => {
    const names = Array.from({ length: 25 }, (_, i) => `Team ${String(i + 1).padStart(2, "0")}`);
    const assigned = assignDefaultTeamSlots(names);
    expect(assigned[24]?.slotNumber).toBe(29);
    const draft = validDraft({
      teamCount: 25,
      teams: assigned.map((row) => ({
        name: row.name,
        logoUrl: null,
        slotNumber: row.slotNumber,
      })),
    });
    expect(validateSessionDraft(draft)).toEqual([]);
  });

  it("rejects a manual slot change that collides with another team's default", () => {
    const assigned = assignDefaultTeamSlots(SAMPLE_TEAM_NAMES);
    // Team 1 is moved from its default 5 onto Team 2's default 6.
    const teams: TeamDraft[] = assigned.map((row, index) => ({
      name: row.name,
      logoUrl: null,
      slotNumber: index === 0 ? 6 : row.slotNumber,
    }));
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("teams");
    expect(issues[0]?.message).toContain("6");
  });

  it("rejects duplicate slot numbers as ONE teams issue naming each slot", () => {
    const teams = SAMPLE_TEAM_NAMES.map((name): TeamDraft => ({
      name,
      logoUrl: null,
      slotNumber: null,
    }));
    teams[0] = { ...teams[0]!, slotNumber: 5 };
    teams[1] = { ...teams[1]!, slotNumber: 7 };
    teams[2] = { ...teams[2]!, slotNumber: 7 };
    teams[3] = { ...teams[3]!, slotNumber: 5 };
    const issues = validateSessionDraft(validDraft({ teams }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("teams");
    expect(issues[0]?.message).toContain("5");
    expect(issues[0]?.message).toContain("7");
  });
});

describe("sync guards", () => {
  it("VALID_TEMPLATE_IDS is exactly the art-backed aesthetics", () => {
    expect([...VALID_TEMPLATE_IDS]).toEqual([
      "pmpl-light",
      "neon-green",
      "challengers-red",
      "ewc-yellow",
      "onyx-green",
      "pmgc-crimson",
      "pmgc-aqua",
      "pmgc-sapphire",
      "pmwi-violet",
      "grunge-red",
      "esports-clash",
      "rundown-orange",
      "royal-blue",
      "varsity-yellow",
      "court-orange",
      "dusk-amber",
      "cardinal-gold",
      "apex-blaze",
      "urban-slate",
      "varsity-purple",
      "varsity-orange",
      "pmsl-cobalt",
      "ewc-teal",
      "pmgc-league-blue",
      "pmgo-brazil-green",
      "pmgo-teal",
      "pmhi-crimson",
      "pmnc-pakistan-lime",
      "pmpl-sea-purple",
      "pmrc-lime",
      "pmsl-csa-amber",
    ]);
  });

  it("SAMPLE_TEAM_NAMES deep-equals the fixtures' list", () => {
    expect(SAMPLE_TEAM_NAMES).toEqual(FIXTURE_SAMPLE_TEAM_NAMES);
  });
});
