import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { getTemplate, splitRowsAt, type TemplateConfig } from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("pmgc-crimson");
// The art is a 4096×6144 JPEG payload inside a .png-named file — every
// coordinate below was measured on those pixels and multiplied by
// 1080/4096 = 0.263671875 when the config was written.
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
      aestheticId: "pmgc-crimson",
      title: "SCRIM",
      subtitle: "FINAL RESULTS",
      organizer: null,
      standings: standings(n),
      matchCount: 6,
    }),
  );
}

describe("pmgc-crimson standings config (measured 24-slot art)", () => {
  const st = CONFIG.standings;
  const [left, right] = st.columns;

  it("points standings at overall.png, which exists on disk", () => {
    expect(CONFIG.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/pmgc-crimson/overall.png",
    });
    expect(() => readFileSync("public/templates/pmgc-crimson/overall.png")).not.toThrow();
    // MVP + announcement have no art: clean gradient fallbacks, never broken paths.
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
  });

  it("ships the 4096×6144 JPEG payload the measurements were taken from", () => {
    const bytes = readFileSync("public/templates/pmgc-crimson/overall.png");
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
    expect(st.ranksBakedIn).toBe(true);
    for (const col of st.columns) expect(col.ranksBakedIn ?? st.ranksBakedIn).toBe(true);
    // The art prints "OVERALL RANKINGS"; the session name would double it.
    expect(CONFIG.variantHideScrimName?.standings).toBe(true);
    // Fallback variants keep the session name (no art to collide with).
    expect(CONFIG.variantHideScrimName?.mvp).not.toBe(true);
    expect(CONFIG.variantHideScrimName?.announcement).not.toBe(true);
  });

  it("lays every row on the painted bars: y434, pitch 75.31, height 55", () => {
    expect(st.rowY0).toBe(434);
    expect(st.rowPitch).toBe(75.31);
    expect(st.rowHeight).toBe(55);
    expect(st.fixedRowPitch).toBe(true);
    for (const col of st.columns) {
      // Auto-fit is overridden: rows must stay dead-center on the art bars.
      expect(col.fixedRowPitch ?? st.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn ?? st.rowsPerColumn).toBe(12);
    }
    // Native-scan of the art: row 1 top 434, row 12 bottom 1318.4.
    near(st.rowY0, 1645);
    near(st.rowY0 + 11 * st.rowPitch + st.rowHeight, 4996, 1.5);
  });

  it("keeps rows 1–12 inside [420,1322] with zero overlap at 16/19/24 teams", () => {
    expect(st.maxRowsLeft).toBe(12);
    expect(st.rowsPerColumn).toBe(12);
    for (const n of [16, 19, 24]) {
      const [leftCount, rightCount] = splitRowsAt(n, 12);
      for (const count of [leftCount, rightCount]) {
        for (let r = 0; r < count; r++) {
          const top = st.rowY0 + r * st.rowPitch;
          expect(top).toBeGreaterThanOrEqual(420);
          expect(top + st.rowHeight).toBeLessThanOrEqual(1322);
        }
        for (let r = 1; r < count; r++) {
          const prevBottom = st.rowY0 + (r - 1) * st.rowPitch + st.rowHeight;
          expect(st.rowY0 + r * st.rowPitch).toBeGreaterThanOrEqual(prevBottom - 1);
        }
      }
    }
  });

  it("splits 24 teams into 12 left + 12 right (25 overflows, never dropped)", () => {
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("orders the four stats wwcd → pp → kp → total with non-overlapping boxes", () => {
    expect(st.statBoxW).toBe(52);
    for (const col of [left, right]) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + 52);
      }
    }
  });

  it("centers every stat box on the measured silver-header ink (both columns)", () => {
    const leftCenters = { wwcd: 321, pp: 378.5, kp: 434.5, total: 498.5 };
    const rightCenters = { wwcd: 795, pp: 853, kp: 909, total: 973 };
    for (const [col, centers] of [
      [left, leftCenters],
      [right, rightCenters],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of ["wwcd", "pp", "kp", "total"] as const) {
        expect(Math.abs(byKey.get(key)! + 26 - centers[key])).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps all four boxes inside the black bar interior and clear of its right cap", () => {
    // Left black bar to ~524 then the gold cap (525–531); right black to ~1011
    // then the crimson cap. Our boxes end at 524.5 / 999 — clear of both caps.
    for (const [col, lo, hi] of [
      [left, 130, 525],
      [right, 607, 1002],
    ] as const) {
      const boxes = col.statColumns.map((c) => ({ x: c.x, w: 52 }));
      expect(Math.min(...boxes.map((b) => b.x))).toBeGreaterThanOrEqual(lo);
      expect(Math.max(...boxes.map((b) => b.x + b.w))).toBeLessThanOrEqual(hi);
    }
  });

  it("starts the team slot right of the baked 60px rank badge, before WWCD", () => {
    for (const col of [left, right]) {
      expect(col.teamX).toBeGreaterThanOrEqual(col.rankX + 60);
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(col.statColumns[0].x - 2);
      // Canvas badge x70–130 / x548–607 = art x≈265–493 / x≈2079–2301.
      near(col.rankX, col === left ? 267 : 2076);
      near(col.teamX, col === left ? 523 : 2332); // art x523 / x2332
    }
  });

  it("drops the match number into the open gold slot right of the baked #", () => {
    // "#" ink ends art x3798 → 1001.8; gold badge ends art x4000 → 1054.7.
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 1012, y: 254, w: 44, align: "center" });
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#140A00");
    expect(sub!.x!).toBeGreaterThan(1005);
    expect(sub!.x! + sub!.w!).toBeLessThanOrEqual(1056);
  });

  it("uses pure white 800-weight Exo 2 row typography", () => {
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.wwcdText).toBe("#FFFFFF");
    expect(st.nameFont.startsWith("800 20px ")).toBe(true);
    expect(st.statFont.startsWith("800 25px ")).toBe(true);
    expect(st.nameFont).toContain('"Exo 2"');
    expect(st.statFont).toContain('"Exo 2"');
  });
});

describe("pmgc-crimson standings render (SSR)", () => {
  it("renders no code rank numerals or labels (1–24 and headers are baked)", () => {
    const html = render(24);
    expect(html).not.toContain("left:70px");
    expect(html).not.toContain("left:547px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain(">TOTAL<");
  });

  it("splits 24 teams into exactly 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:138px/g) ?? []).length).toBe(12);
    expect((html.match(/left:615px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
  });

  it("fills the left column first for 16 and 19 teams", () => {
    const html16 = render(16);
    expect((html16.match(/left:138px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:615px/g) ?? []).length).toBe(4);
    expect(html16).toContain("SQUAD 16");

    const html19 = render(19);
    expect((html19.match(/left:138px/g) ?? []).length).toBe(12);
    expect((html19.match(/left:615px/g) ?? []).length).toBe(7);
    expect(html19).toContain("SQUAD 19");
  });

  it("keeps the 25th team instead of dropping it (overflow below row 12)", () => {
    const html = render(25);
    expect((html.match(/left:615px/g) ?? []).length).toBe(13);
    expect(html).toContain("SQUAD 25");
    const overflowTop = 434 + 12 * 75.31;
    expect(overflowTop).toBeGreaterThan(1318);
    expect(html).toContain(`top:${overflowTop}px`);
  });

  it("hides the standings scrim name", () => {
    expect(render(24)).not.toContain("SCRIM");
  });

  it("renders the match number in the gold chip with tabular stats", () => {
    const html = render(24);
    expect(html).toContain("left:1012px");
    expect(html).toContain("color:#140A00");
    expect(html).toContain(">6<");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });

  it("keeps all four rank-1 stat numerals white (uniformStatInk)", () => {
    expect(CONFIG.standings.uniformStatInk).toBe(true);
    const html = render(24);
    // Rank 1's baked gold badge is the emphasis — no code-drawn accent TOTAL.
    expect(html).not.toContain("color:#F5B82E");
    expect((html.match(/color:#FFFFFF/g) ?? []).length).toBeGreaterThanOrEqual(96);
  });

  it("renders MVP and announcement fallbacks cleanly (no art, no missing geometry)", () => {
    const mvp: MvpDisplayEntry[] = [
      { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
      { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
      { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
      { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
      { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
    ];
    const mvpHtml = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "pmgc-crimson",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvp,
      }),
    );
    expect(mvpHtml).toContain("SCRIM");
    expect(mvpHtml).toContain("TOP 5 FRAGGERS");
    expect(mvpHtml).toContain("ALPHA");
    expect(mvpHtml).not.toContain("NaN");

    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmgc-crimson",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: standings(16).map((r) => ({ id: r.teamId, name: r.teamName, logoUrl: r.logoUrl })),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain("PARTICIPATING TEAMS");
    expect(annHtml).toContain(">01<");
    expect(annHtml).toContain("SQUAD 16");
    expect(annHtml).not.toContain("NaN");
  });
});
