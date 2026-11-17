import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { getTemplate, splitRowsAt, type TemplateConfig } from "@/lib/graphics";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("challengers-red");
// The art is a 4096×6144 JPEG payload inside a .png-named file — every
// coordinate below was measured on those pixels and multiplied by
// 1080/4096 = 0.263671875 by hand when the config was written.
const S = 1080 / 4096;
const near = (canvasPx: number, artPx: number, tol = 1) => {
  expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(tol);
};

function standings(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function render(n: number): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "challengers-red",
      title: "SCRIM",
      subtitle: "FINAL RESULTS",
      organizer: null,
      standings: standings(n),
      matchCount: 6,
    }),
  );
}

describe("challengers-red standings config (measured 24-slot art)", () => {
  const standings = CONFIG.standings;
  const [left, right] = standings.columns;

  it("points standings at the replaced overall.png, which exists on disk", () => {
    expect(CONFIG.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/challengers-red/overall.png",
    });
    expect(() => readFileSync("public/templates/challengers-red/overall.png")).not.toThrow();
    // Still the mvp.png file for the MVP variant (never mvp.jpeg).
    expect(CONFIG.backgrounds.mvp).toEqual({
      type: "image",
      src: "/templates/challengers-red/mvp.png",
    });
  });

  it("ships the 4096×6144 JPEG payload the measurements were taken from", () => {
    const bytes = readFileSync("public/templates/challengers-red/overall.png");
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    let pos = 2;
    let size: { w: number; h: number } | null = null;
    while (pos + 10 <= bytes.length) {
      if (bytes[pos] !== 0xff) {
        pos += 1;
        continue;
      }
      const marker = bytes[pos + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        size = { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
        break;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        pos += 2;
        continue;
      }
      pos += 2 + bytes.readUInt16BE(pos + 2);
    }
    expect(size).toEqual({ w: 4096, h: 6144 });
  });

  it("bakes labels, ranks and the title away; takes only the match number", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(standings.ranksBakedIn).toBe(true);
    for (const col of standings.columns) expect(col.ranksBakedIn ?? standings.ranksBakedIn).toBe(true);
    // The art prints "OVERALL RANKINGS"; the session name would double it.
    expect(CONFIG.variantHideScrimName?.standings).toBe(true);
    // MVP keeps the scrim name (its art leaves the top band clear).
    expect(CONFIG.variantHideScrimName?.mvp).not.toBe(true);
  });

  it("lays every row on the painted bars: y389, pitch 67.3636, height 62", () => {
    expect(standings.rowY0).toBe(389);
    expect(standings.rowPitch).toBe(67.3636);
    expect(standings.rowHeight).toBe(62);
    expect(standings.fixedRowPitch).toBe(true);
    for (const col of standings.columns) {
      // Auto-fit is overridden: rows must stay dead-center on the art bars.
      expect(col.fixedRowPitch ?? standings.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn ?? standings.rowsPerColumn).toBe(12);
    }
    // Painted row 12 bottom (canvas) matches the measured art bottom 4521.
    near(standings.rowY0 + 11 * standings.rowPitch + standings.rowHeight, 4521, 1);
  });

  it("keeps 12 baked rank slots per column with a fixed 12/12 split", () => {
    expect(standings.maxRowsLeft).toBe(12);
    expect(standings.rowsPerColumn).toBe(12);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // 25 teams overflow one painted row instead of being dropped.
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("orders the four stats wwcd → pp → kp → total and keeps 38px boxes clear", () => {
    expect(standings.statBoxW).toBe(38);
    for (const col of [left, right]) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + 38);
      }
    }
  });

  it("centers every stat box on the measured art ink (left/right columns)", () => {
    const leftCenters = { wwcd: 373.5, pp: 413.5, kp: 454, total: 493 };
    const rightCenters = { wwcd: 831, pp: 871.5, kp: 912, total: 951.5 };
    for (const [col, centers] of [
      [left, leftCenters],
      [right, rightCenters],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of ["wwcd", "pp", "kp", "total"] as const) {
        expect(Math.abs(byKey.get(key)! + 19 - centers[key])).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("keeps team names inside the dark bar and clear of the first stat box", () => {
    // Left bar art x550–1991 → 145.0–525.0; right x2253–3725 → 594.0–982.4.
    near(left.stripX, 550);
    near(left.stripX + left.stripW, 1991);
    near(right.stripX, 2253);
    near(right.stripX + right.stripW, 3725);
    for (const col of [left, right]) {
      expect(col.teamX).toBeGreaterThan(col.stripX);
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(col.statColumns[0].x - 6);
    }
  });

  it("drops the match number into the open cyan slot right of the baked #", () => {
    // "MATCH #" ink ends art x3657 → 964.3; chip ends art x3839 → 1012.3.
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 966, y: 230, w: 46, align: "center" });
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#061014");
  });

  it("uses pure white bold row text and a muted MVP ink on the measured bands", () => {
    expect(CONFIG.palette.text).toBe("#ffffff");
    expect(CONFIG.palette.textMuted).toBe("#b9c6d2");
    expect(standings.nameFont.startsWith("800 ")).toBe(true);
    expect(standings.statFont.startsWith("800 ")).toBe(true);
  });
});

describe("challengers-red standings render (SSR)", () => {
  it("renders no code rank numerals (1–24 are baked into the art)", () => {
    const html = render(24);
    // Rank boxes would sit at the spec's rankX values.
    expect(html).not.toContain("left:96px");
    expect(html).not.toContain("left:528px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
  });

  it("splits 24 teams into exactly 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:150px/g) ?? []).length).toBe(12);
    expect((html.match(/left:600px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
  });

  it("fills the left column first for 16 and 19 teams (baked rank alignment)", () => {
    const html16 = render(16);
    expect((html16.match(/left:150px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:600px/g) ?? []).length).toBe(4);
    expect(html16).toContain("SQUAD 16");

    const html19 = render(19);
    expect((html19.match(/left:150px/g) ?? []).length).toBe(12);
    expect((html19.match(/left:600px/g) ?? []).length).toBe(7);
    expect(html19).toContain("SQUAD 19");
  });

  it("keeps the 25th team instead of dropping it (overflow row below the art)", () => {
    const html = render(25);
    expect((html.match(/left:600px/g) ?? []).length).toBe(13);
    expect(html).toContain("SQUAD 25");
    // Overflow row sits at rowY0 + 12*pitch (past the painted row 12 bottom).
    const overflowTop = 389 + 12 * 67.3636;
    expect(overflowTop).toBeGreaterThan(1192);
    expect(html).toContain(`top:${overflowTop}px`);
  });

  it("hides the standings scrim name but keeps the MVP one", () => {
    expect(render(24)).not.toContain("SCRIM");
  });

  it("renders the match number in the cyan chip and tabular stats", () => {
    const html = render(24);
    expect(html).toContain("left:966px");
    expect(html).toContain("color:#061014");
    expect(html).toContain(">6<");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });
});
