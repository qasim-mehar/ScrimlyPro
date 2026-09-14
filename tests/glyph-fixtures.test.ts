import { describe, expect, it } from "vitest";

import {
  GLYPH_MVP_PLAYERS,
  GLYPH_REFERENCE,
  GLYPH_TEAM_NAMES,
} from "@/lib/fixtures/glyphNames";

const ALL_STRINGS = [
  ...GLYPH_TEAM_NAMES,
  ...GLYPH_MVP_PLAYERS.map((player) => player.name),
  ...GLYPH_REFERENCE,
];

describe("glyph torture fixtures", () => {
  it("every dataset is non-empty", () => {
    expect(GLYPH_TEAM_NAMES.length).toBeGreaterThan(0);
    expect(GLYPH_MVP_PLAYERS.length).toBeGreaterThan(0);
    expect(GLYPH_REFERENCE.length).toBeGreaterThan(0);
  });

  it("has exactly 16 team names", () => {
    expect(GLYPH_TEAM_NAMES).toHaveLength(16);
  });

  it("MVP entries are complete and reference valid teams", () => {
    expect(GLYPH_MVP_PLAYERS.length).toBeGreaterThanOrEqual(5);
    for (const player of GLYPH_MVP_PLAYERS) {
      expect(player.name.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(player.teamIdx)).toBe(true);
      expect(player.teamIdx).toBeGreaterThanOrEqual(0);
      expect(player.teamIdx).toBeLessThan(GLYPH_TEAM_NAMES.length);
      expect(Number.isInteger(player.kills)).toBe(true);
      expect(player.kills).toBeGreaterThanOrEqual(0);
    }
  });

  it("reference list is deduplicated", () => {
    expect(new Set(GLYPH_REFERENCE).size).toBe(GLYPH_REFERENCE.length);
  });

  it("covers Arabic, katakana and fullwidth code points", () => {
    expect(ALL_STRINGS.some((s) => /[\u0600-\u06FF]/.test(s))).toBe(true);
    expect(ALL_STRINGS.some((s) => /[\u3040-\u30FF]/.test(s))).toBe(true);
    expect(ALL_STRINGS.some((s) => /[\uFF01-\uFF5E]/.test(s))).toBe(true);
  });
});
