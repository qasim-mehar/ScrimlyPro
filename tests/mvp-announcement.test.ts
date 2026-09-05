import { describe, expect, it } from "vitest";

import type { MvpEntry } from "@/lib/db/schema";
import { getTemplate, type AestheticId } from "@/lib/graphics";
import { announcementCells, PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import type { TeamRow } from "@/lib/scoring";

const SPEC = { y0: 410, cellW: 180, cellH: 150, logoSize: 64, nameFont: "600 26px Rajdhani, sans-serif" };

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

describe("announcementCells", () => {
  it("lays 16 teams out 4×4 starting at x0=180, y0=410", () => {
    const cells = announcementCells(16, SPEC);
    expect(cells).toHaveLength(16);
    expect(cells[0]).toEqual({ x: 180, y: 410, w: 180, h: 150 });
    expect(cells[4]).toMatchObject({ x: 180, y: 560 });
    expect(cells[15]).toMatchObject({ x: 720, y: 860 });
  });

  it("lays 25 teams out 5×5 starting at x0=90", () => {
    const cells = announcementCells(25, SPEC);
    expect(cells).toHaveLength(25);
    expect(cells[0]).toMatchObject({ x: 90, y: 410 });
    expect(cells[24]).toMatchObject({ x: 810, y: 1010 });
  });

  it("clamps cols to 4 for 6 teams (2 rows)", () => {
    const cells = announcementCells(6, SPEC);
    expect(cells).toHaveLength(6);
    expect(cells[5]).toMatchObject({ x: 360, y: 560 });
  });

  it("produces a single cell for 1 team", () => {
    const cells = announcementCells(1, SPEC);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ x: 180, y: 410 });
  });

  it("keeps every cell within the 1080×1620 canvas bounds", () => {
    for (const n of [1, 4, 6, 16, 20, 25]) {
      for (const cell of announcementCells(n, SPEC)) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x + cell.w).toBeLessThanOrEqual(1080);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y + cell.h).toBeLessThanOrEqual(1620);
      }
    }
  });
});

describe.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
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
