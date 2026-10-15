import { describe, expect, it } from "vitest";

import type { MvpEntry } from "@/lib/db/schema";
import { getTemplate, type AestheticId } from "@/lib/graphics";
import { announcementRows, PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import type { TeamRow } from "@/lib/scoring";

const TEAMS: Array<Pick<TeamRow, "id" | "name">> = [
  { id: "t1", name: "Alpha" },
  { id: "t2", name: "Bravo" },
];

function entry(rank: number, name: string, teamId: string, kills: number): MvpEntry {
  return { rank, name, teamId, kills };
}

describe("toMvpDisplay", () => {
  it("joins team names and preserves the locked-list input order", () => {
    // Deliberately OUT of rank order: the locked list is the sole authority
    // (ERD §5 rule 2) — toMvpDisplay must never re-sort or slice it.
    const entries = [entry(3, "Cee", "t2", 4), entry(1, "Aaa", "t1", 9), entry(2, "Bee", "t1", 7)];
    expect(toMvpDisplay(entries, TEAMS)).toEqual([
      { rank: 3, name: "Cee", teamName: "Bravo", kills: 4 },
      { rank: 1, name: "Aaa", teamName: "Alpha", kills: 9 },
      { rank: 2, name: "Bee", teamName: "Alpha", kills: 7 },
    ]);
  });

  it("throws naming the unknown teamId", () => {
    expect(() => toMvpDisplay([entry(1, "Ghost", "nope", 9)], TEAMS)).toThrow(/nope/);
  });

  it("returns [] for empty entries", () => {
    expect(toMvpDisplay([], TEAMS)).toEqual([]);
  });
});

describe("constants", () => {
  it("pins MVP_SUBTITLE", () => {
    expect(MVP_SUBTITLE).toBe("TOP 5 FRAGGERS");
  });

  it("pins PARTICIPATING_TEAMS", () => {
    expect(PARTICIPATING_TEAMS).toBe("PARTICIPATING TEAMS");
  });
});

describe("announcementRows", () => {
  it("wraps the auto-fit list for the template spec", () => {
    const spec = getTemplate("pmpl-light").announcement;
    const rows = announcementRows(16, spec);
    expect(rows).toHaveLength(16);
    expect(rows[0].y).toBe(spec.rowsTop);
    expect(rows[0].pitch).toBeCloseTo((spec.rowsBottom - spec.rowsTop) / 16, 10);
    expect(rows[15].y).toBeCloseTo(spec.rowsBottom - rows[15].pitch, 10);
  });

  it("empty teams → empty list", () => {
    expect(announcementRows(0, getTemplate("dark-gold").announcement)).toEqual([]);
  });
});

describe.each(["dark-gold", "purple-butterfly", "pink-blossom", "neon-green", "challengers-red"] as AestheticId[])(
  "MVP geometry integrity (%s)",
  (id) => {
    const mvp = getTemplate(id).mvp;

    it("fits 5 rows above the footer band", () => {
      expect(mvp.rowY0 + 4 * mvp.rowPitch + mvp.rowHeight).toBeLessThanOrEqual(1500);
    });

    it("keeps the kills box inside the right margin", () => {
      expect(mvp.killsX + mvp.killsW).toBeLessThanOrEqual(1060);
    });

    it("ends the player box before the team box starts", () => {
      expect(mvp.playerX + mvp.playerW).toBeLessThanOrEqual(mvp.teamX);
    });

    it("builds every MVP font on the Rajdhani stack", () => {
      for (const font of [mvp.rankFont, mvp.playerFont, mvp.statFont]) {
        expect(font).toContain("Rajdhani");
      }
    });
  },
);
