import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { getTemplate, splitRowsAt, type TemplateConfig } from "@/lib/graphics";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("ewc-yellow");
// 4096×6144 JPEG payload inside a .png-named file → ×1080/4096.
const S = 1080 / 4096;
const near = (canvasPx: number, artPx: number, tol = 1) => {
  expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(tol);
};

function standings(n: number, matches?: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
    ...(matches !== undefined ? { matches } : {}),
  }));
}

function render(n: number, opts: { matchCount?: number; matches?: number; subtitle?: string } = {}): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "ewc-yellow",
      title: "SCRIM",
      subtitle: opts.subtitle ?? "FINAL RESULTS",
      organizer: null,
      standings: standings(n, opts.matches),
      matchCount: opts.matchCount,
    }),
  );
}

describe("ewc-yellow standings config (measured 24-slot art)", () => {
  const table = CONFIG.standings;
  const [left, right] = table.columns;

  it("points standings at the real art file, which exists on disk", () => {
    expect(CONFIG.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/ewc-yellow/overall.png",
    });
    expect(() => readFileSync("public/templates/ewc-yellow/overall.png")).not.toThrow();
  });

  it("ships the 4096×6144 JPEG payload the measurements were taken from", () => {
    const bytes = readFileSync("public/templates/ewc-yellow/overall.png");
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

  it("bakes labels, ranks and the title artwork; takes only the match number", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    for (const col of table.columns) {
      expect(col.ranksBakedIn).toBe(true);
      expect(col.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn).toBe(12);
    }
  });

  it("lays 12 painted bars per side: y393, pitch 79, height 66", () => {
    expect(table.rowY0).toBe(393);
    expect(table.rowPitch).toBe(79);
    expect(table.rowHeight).toBe(66);
    near(table.rowY0, 1490);
    near(table.rowPitch, 300);
    near(table.rowHeight, 252);
    // Row 12 bottom stays above the flame art (last bar bottom 1329.2).
    expect(table.rowY0 + 11 * table.rowPitch + table.rowHeight).toBeLessThanOrEqual(1330);
    expect(table.headerLabelsY).toBeLessThanOrEqual(table.rowY0);
  });

  it("keeps 12 baked rank slots per column with a fixed 12/12 split", () => {
    expect(table.maxRowsLeft).toBe(12);
    for (const col of table.columns) expect(col.rowsPerColumn).toBe(12);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // 25 teams overflow one painted row instead of being dropped.
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("orders the five stats wwcd → matches → pp → kp → total", () => {
    const keys = ["wwcd", "matches", "pp", "kp", "total"];
    expect(left.statColumns.map((c) => c.key)).toEqual(keys);
    expect(right.statColumns.map((c) => c.key)).toEqual(keys);
    expect(table.statBoxW).toBe(46);
    for (const col of [left, right]) {
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + 46);
      }
    }
  });

  it("centers each value box on the measured baked ink (within the 46px slot)", () => {
    // Measured white label ink centers (art px) in the 1342–1423 band.
    const leftCenters = { wwcd: 1155.5, matches: 1363.0, pp: 1546.0, kp: 1692.0, total: 1870.0 };
    const rightCenters = { wwcd: 2924.0, matches: 3130.5, pp: 3313.0, kp: 3459.5, total: 3638.0 };
    for (const [col, centers] of [
      [left, leftCenters],
      [right, rightCenters],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of ["wwcd", "matches", "pp", "kp", "total"] as const) {
        // PP/ELIMS ink centers are only 38.5 canvas px apart — narrower than a
        // 46px value box — so the two middle boxes cannot both be dead-center.
        expect(Math.abs(byKey.get(key)! + 23 - centers[key] * S)).toBeLessThanOrEqual(5);
      }
    }
  });

  it("keeps team names inside the painted bar and clear of the first stat box", () => {
    // Left bar art x537–1982 → 141.6–522.6; right x2306–3760 → 608.0–991.4.
    near(left.stripX, 537);
    near(left.stripX + left.stripW, 1982);
    near(right.stripX, 2306);
    near(right.stripX + right.stripW, 3760);
    for (const col of [left, right]) {
      expect(col.teamX).toBeGreaterThan(col.stripX);
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(col.statColumns[0].x - 4);
    }
    expect(table.logoPlate).toBe(34);
    expect(table.logoNameGap).toBe(38);
  });

  it("puts the scrim name in the clear band above the baked OVERALL RANKINGS block", () => {
    // Baked title ink y199.6–268.2; the override title sits at y130 (28px).
    const title = CONFIG.variantHeaders?.standings?.title;
    expect(title).toEqual({ x: 140, y: 130, w: 800, align: "center" });
    expect(title!.y! + 34).toBeLessThanOrEqual(199);
    // The baked title is generic, so the session name still renders above it.
    expect(CONFIG.variantHideScrimName?.standings).not.toBe(true);
  });

  it("drops the match number inside the slanted Match # ribbon", () => {
    // Re-measured: baked "Match #" ink ends canvas x1016; digits start x1028.
    const header = CONFIG.variantHeaders?.standings;
    expect(header?.subtitle).toEqual({ x: 1028, y: 228, w: 50, align: "left" });
    near(header!.subtitle!.x!, 3898);
    expect(header?.subtitleColor).toBe("#2B0F00");
  });

  it("uses the measured espresso palette and bold broadcast type", () => {
    expect(CONFIG.palette.text).toBe("#2B0F00");
    expect(CONFIG.palette.textMuted).toBe("#4A1C00");
    expect(CONFIG.palette.accent).toBe("#5C2400");
    expect(CONFIG.palette.wwcdText).toBe("#6E2B00");
    expect(CONFIG.palette.watermarkColor).toBe("rgba(255,255,255,0.9)");
    expect(table.nameFont.startsWith("800 ")).toBe(true);
    expect(table.statFont.startsWith("800 ")).toBe(true);
    expect(CONFIG.variantHeaders?.standings?.titleFont?.startsWith("700 ")).toBe(true);
  });

  it("falls MVP + announcement back to the warm light gradient", () => {
    for (const bg of [CONFIG.backgrounds.mvp, CONFIG.backgrounds.announcement]) {
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toMatch(/linear-gradient/);
      expect(bg.decor).toEqual([]);
    }
    expect(CONFIG.backgrounds.mvp).toEqual(CONFIG.backgrounds.announcement);
  });
});

describe("ewc-yellow standings render (SSR)", () => {
  it("renders no code rank numerals (1–24 are baked into the art)", () => {
    const html = render(24);
    expect(html).not.toContain("left:96px;top:393px;width:48px");
    expect(html).not.toContain("left:562px;top:393px;width:48px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
  });

  it("splits 24 teams into 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:146px/g) ?? []).length).toBe(12);
    expect((html.match(/left:612px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 12");
    expect(html).toContain("SQUAD 13");
    expect(html).toContain("SQUAD 24");
    // Team #12 sits on painted row 12; #13 restarts at the right column top.
    expect(html).toContain(`top:${393 + 11 * 79}px`);
    expect(html).toContain("top:393px");
  });

  it("fills the left column first for 16 and 19 teams", () => {
    const html16 = render(16);
    expect((html16.match(/left:146px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:612px/g) ?? []).length).toBe(4);
    expect(html16).toContain("SQUAD 16");

    const html19 = render(19);
    expect((html19.match(/left:146px/g) ?? []).length).toBe(12);
    expect((html19.match(/left:612px/g) ?? []).length).toBe(7);
    expect(html19).toContain("SQUAD 19");
  });

  it("keeps the 25th team instead of dropping it (overflow row below the art)", () => {
    const html = render(25);
    expect((html.match(/left:612px/g) ?? []).length).toBe(13);
    expect(html).toContain("SQUAD 25");
    expect(html).toContain(`top:${393 + 12 * 79}px`);
  });

  it("renders the five stat values, including the matches column", () => {
    // Row-level matches overrides the session-level count; 41 never appears in
    // the pp/kp/total vectors for 24 teams, so the count is unambiguous. The
    // only >5< is the match-number subtitle — no MATCHES cell reads 5.
    const html = render(24, { matches: 41, matchCount: 5 });
    expect((html.match(/>41</g) ?? []).length).toBe(24);
    expect((html.match(/>5</g) ?? []).length).toBe(1);
    // Five stat boxes per row at the measured left-column slots.
    for (const x of [282, 334, 380, 426, 472]) {
      expect(html).toContain(`left:${x}px`);
    }
  });

  it("falls back to the session match count when rows omit matches", () => {
    const html = render(24, { matchCount: 6, subtitle: "AFTER MATCH 6" });
    // 24 MATCHES cells + the match-number subtitle slot.
    expect((html.match(/>6</g) ?? []).length).toBe(25);
  });

  it("shows only the match digits in the ribbon and keeps the scrim name", () => {
    const html = render(24, { matchCount: 6 });
    expect(html).toContain("SCRIM");
    expect(html).toContain("left:140px");
    expect(html).toContain("top:130px");
    expect(html).toContain("left:1028px");
    expect(html).toContain("color:#2B0F00");
    expect(html).toContain(">6<");
    expect(html).not.toContain("FINAL RESULTS");
  });

  it("uses tabular numerals for every stat cell", () => {
    const html = render(16);
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("letter-spacing:-0.02em");
  });
});
