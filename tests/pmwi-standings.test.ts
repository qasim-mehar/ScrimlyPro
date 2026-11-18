import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  getTemplate,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("pmwi-violet");
const TABLE = CONFIG.standings;
const [LEFT, RIGHT] = TABLE.columns;

/** Logical measurement grid is the original 941×1672 art; the file on disk
 *  is now 1882×3344 (exactly 2×). It stays uniformly width-fitted and
 *  centre-cropped with top −130.25 CANVAS px (the fit's top is not in art px),
 *  so canvasY = artY × S − OFF. */
const ART = { w: 941, h: 1672 };
const S = 1080 / ART.w;
const OFF = (ART.h - 1620 / S) / 2; // 130.25
const near = (canvasPx: number, artPx: number, tol = 1) => {
  expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(tol);
};
const cx = (artPx: number) => artPx * S;
const cy = (artPx: number) => artPx * S - OFF;

/** Native scan of the 12 painted dark bars (art px) — rank boxes are baked
 *  into their left edge, so every rendered row box must sit INSIDE them. */
const BAR_TOPS = [457, 523, 589, 656, 724, 792, 859, 927, 995, 1063, 1131, 1199];
const BAR_BOTTOMS = [507, 573, 640, 707, 775, 843, 911, 978, 1046, 1114, 1182, 1251];

/** Measured dark-ink centres of the baked cyan header labels (art px).
 *  PMWI bakes ELIMS → WWCD → TOTAL (unlike ONYX's WWCD → KP → TOTAL). */
const INK = {
  left: { kp: 287.5, wwcd: 353, total: 419 },
  right: { kp: 743.5, wwcd: 801.5, total: 863 },
};
const KEYS = ["kp", "wwcd", "total"] as const;

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

function render(n: number, opts: { subtitle?: string; matchCount?: number } = {}): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "pmwi-violet",
      title: "SCRIM",
      subtitle: opts.subtitle ?? "FINAL RESULTS",
      organizer: null,
      standings: standings(n),
      matchCount: opts.matchCount ?? 6,
    }),
  );
}

describe("pmwi-violet registration + measured art", () => {
  it("pins pmwi-violet in AESTHETICS and AESTHETIC_IDS", () => {
    expect(AESTHETICS["pmwi-violet"]).toBe(CONFIG);
    expect(AESTHETIC_IDS).toContain("pmwi-violet");
    expect(getTemplate("pmwi-violet").id).toBe("pmwi-violet");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
  });

  it("backs standings with the delivered overall.png and leaves MVP/announcement on a gradient", () => {
    expect(CONFIG.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/pmwi-violet/overall.png",
      fit: { width: 1080, height: 1918.979809, left: 0, top: -130.25 },
    });
    const bytes = readFileSync("public/templates/pmwi-violet/overall.png");
    // The delivered file is now a 2× JPEG payload inside a .png name.
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    let size: { w: number; h: number } | null = null;
    for (let pos = 2; pos + 10 <= bytes.length; ) {
      if (bytes[pos] !== 0xff) { pos += 1; continue; }
      const marker = bytes[pos + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        size = { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
        break;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { pos += 2; continue; }
      pos += 2 + bytes.readUInt16BE(pos + 2);
    }
    expect(size).toEqual({ w: 1882, h: 3344 });
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    expect(CONFIG.backgrounds.mvp).toEqual(CONFIG.backgrounds.announcement);
  });

  it("fits the (2× upscaled) art uniformly to a centred 1080-wide cover crop (no distortion)", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image" || !bg.fit) throw new Error("expected a fitted image background");
    const { width, height, left, top } = bg.fit;
    expect(width).toBe(1080);
    expect(Math.abs(height - ART.h * S)).toBeLessThan(0.001); // same ×S as the width
    expect(left).toBe(0);
    expect(top).toBe(-OFF);
    // The fitted box fully covers the canvas (no letterbox strip to fill).
    expect(height + top).toBeGreaterThan(1620);
  });

  it("bakes labels, ranks, ranks 1–24 and the title — takes only the match number", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(TABLE.ranksBakedIn).toBe(true);
    expect(TABLE.uniformStatInk).toBe(true);
    for (const col of TABLE.columns) {
      expect(col.ranksBakedIn ?? TABLE.ranksBakedIn).toBe(true);
      expect(col.fixedRowPitch ?? TABLE.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn ?? TABLE.rowsPerColumn).toBe(12);
    }
    expect(CONFIG.variantHideScrimName?.standings).toBe(true);
    expect(CONFIG.variantHideScrimName?.mvp).not.toBe(true);
    expect(CONFIG.variantHideScrimName?.announcement).not.toBe(true);
  });

  it("uses pure-white 800-weight Exo 2 row typography", () => {
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.wwcdText).toBe("#FFFFFF");
    expect(TABLE.nameFont.startsWith("800 ")).toBe(true);
    expect(TABLE.statFont.startsWith("800 ")).toBe(true);
    expect(TABLE.nameFont).toContain('"Exo 2"');
    expect(TABLE.statFont).toContain('"Exo 2"');
    expect(TABLE.nameFont).toContain("Rajdhani");
    expect(TABLE.statFont).toContain('"Noto Sans Symbols 2"');
  });
});

describe("pmwi-violet measured 12/12 bar geometry", () => {
  it("lays all 12 rows strictly inside the painted bars (rowY0 396, pitch 77.42, height 54)", () => {
    expect(TABLE.rowY0).toBe(396);
    expect(TABLE.rowPitch).toBe(77.42);
    expect(TABLE.rowHeight).toBe(54);
    expect(TABLE.fixedRowPitch).toBe(true);
    expect(Math.abs(TABLE.rowY0 - cy(BAR_TOPS[0]))).toBeLessThanOrEqual(2); // raster edge
    expect(Math.abs(TABLE.rowY0 + 11 * TABLE.rowPitch - cy(BAR_TOPS[11]))).toBeLessThanOrEqual(2);
    BAR_TOPS.forEach((top, i) => {
      const rowTop = TABLE.rowY0 + i * TABLE.rowPitch;
      expect(rowTop).toBeGreaterThanOrEqual(cy(top) - 0.2);
      expect(rowTop + TABLE.rowHeight).toBeLessThanOrEqual(cy(BAR_BOTTOMS[i]) + 1.5); // raster rounding
    });
  });

  it("splits 16/20/24 teams 12-per-column with zero overlap or rowsBottom overflow", () => {
    expect(TABLE.maxRowsLeft).toBe(12);
    expect(TABLE.rowsPerColumn).toBe(12);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]); // dev/calibrate's 19-team dataset
    expect(splitRowsAt(20, 12)).toEqual([12, 8]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]); // overflow kept, never dropped
    expect(TABLE.rowPitch).toBeGreaterThanOrEqual(TABLE.rowHeight);
    for (const n of [16, 20, 24]) {
      const [leftCount, rightCount] = splitRowsAt(n, 12);
      for (const [col, count] of [
        [LEFT, leftCount],
        [RIGHT, rightCount],
      ] as const) {
        for (let r = 0; r < count; r++) {
          const top = TABLE.rowY0 + r * TABLE.rowPitch;
          expect(top + TABLE.rowHeight).toBeLessThanOrEqual(col.rowsBottom!);
          if (r > 0) {
            expect(top).toBeGreaterThanOrEqual(TABLE.rowY0 + (r - 1) * TABLE.rowPitch + TABLE.rowHeight - 1);
          }
        }
      }
    }
  });

  it("centres the three stat boxes on the measured ELIMS/WWCD/TOTAL ink of both tables", () => {
    const w = TABLE.statBoxW ?? 58;
    expect(w).toBe(56);
    expect(LEFT.statColumns.map((c) => c.key)).toEqual([...KEYS]);
    expect(RIGHT.statColumns.map((c) => c.key)).toEqual([...KEYS]);
    for (const [col, centers] of [
      [LEFT, INK.left],
      [RIGHT, INK.right],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of KEYS) {
        near(byKey.get(key)! + w / 2, centers[key], 1);
      }
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + w);
      }
    }
    // The right table's shift is NOT a uniform +466 of the left — pin it.
    expect(cx(INK.right.kp) - cx(INK.left.kp)).toBeGreaterThan(520);
    expect(cx(INK.right.total) - cx(INK.left.total)).toBeLessThan(515);
  });

  it("never clips a 3-digit ELIMS/TOTAL value and starts teams right of the baked rank box", () => {
    const w = TABLE.statBoxW ?? 58;
    // Exo 2 digits are ≈0.6em at weight 800: 3×26×0.65 = 50.7 < 56.
    expect(w).toBeGreaterThanOrEqual(3 * 26 * 0.65);
    for (const [col, rankRight] of [
      [LEFT, cx(99)],
      [RIGHT, cx(540)],
    ] as const) {
      expect(col.teamX).toBeGreaterThan(rankRight); // logo/name clear of white #N box
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(col.statColumns[0].x);
    }
    // Stat boxes stay inside the painted cyan-bounded bar interiors.
    for (const col of TABLE.columns) {
      expect(col.statColumns[0].x).toBeGreaterThanOrEqual(col.stripX);
      expect(col.statColumns[2].x + w).toBeLessThanOrEqual(col.stripX + col.stripW);
    }
  });

  it("places the match digits and organizer clear of the baked OVERALL RANKINGS / MATCH # art", () => {
    const header = CONFIG.variantHeaders?.standings;
    const sub = header?.subtitle;
    const organizer = header?.organizer;
    expect(sub).toEqual({ x: 534, y: 252, w: 64, align: "left" });
    // "MATCH #" white ink ends at art x456 → canvas 523.4; digits start after it.
    expect(sub!.x!).toBeGreaterThan(cx(456));
    expect(sub!.x!).toBeLessThan(cx(456) + 14);
    // Digit box sits inside the baked "MATCH #" ink band (art y339–367).
    expect(sub!.y!).toBeGreaterThanOrEqual(cy(339) - 10);
    expect(sub!.y! + 38).toBeLessThanOrEqual(cy(367) + 6);
    // Baked title ink ends at canvas y214; the digits start well below it.
    expect(sub!.y!).toBeGreaterThan(cy(317));
    // Organizer (if ever supplied) is parked between MATCH # and the cyan header.
    expect(organizer!.y!).toBeGreaterThanOrEqual(cy(339) - 10);
    expect(organizer!.y! + 18).toBeLessThanOrEqual(cy(410));
    // Fallback variants keep the normal title (no art to collide with).
    expect(getTemplate("pmwi-violet").hideScrimName).not.toBe(true);
  });
});

describe("pmwi-violet standings SSR (AFTER MATCH 3 / FINAL RESULTS)", () => {
  it("renders no code rank numerals or duplicate baked labels", () => {
    const html = render(24);
    expect(html).not.toContain("left:53px");
    expect(html).not.toContain("left:558px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">ELIMS<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain(">TOTAL<");
    expect(html).not.toContain(">3<"); // subtitle is digits-only, not "AFTER MATCH 3"
  });

  it("splits 24 teams into exactly 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:122px/g) ?? []).length).toBe(12);
    expect((html.match(/left:628px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
    expect(html).toContain(`top:${TABLE.rowY0 + 11 * TABLE.rowPitch}px`);
  });

  it("fills the left column first for 16 and 20 teams and keeps the 25th", () => {
    const html16 = render(16);
    expect((html16.match(/left:122px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:628px/g) ?? []).length).toBe(4);
    const html20 = render(20);
    expect((html20.match(/left:122px/g) ?? []).length).toBe(12);
    expect((html20.match(/left:628px/g) ?? []).length).toBe(8);
    const html25 = render(25);
    expect((html25.match(/left:628px/g) ?? []).length).toBe(13);
    expect(html25).toContain("SQUAD 25");
  });

  it("hides the standings scrim name and drops the match number into the open slot", () => {
    const mid = render(24, { subtitle: "AFTER MATCH 3", matchCount: 3 });
    expect(mid).not.toContain("SCRIM");
    expect(mid).toContain("left:534px");
    expect(mid).toContain("color:#FFFFFF");
    expect(mid).toContain(">3<");
    const final = render(24, { subtitle: "FINAL RESULTS", matchCount: 6 });
    expect(final).toContain(">6<"); // finals still render the confirmed count
    expect(final).not.toContain("FINAL RESULTS"); // only digits in the art slot
    expect(final).toContain("font-variant-numeric:tabular-nums");
    expect(final).toContain("font:800 26px");
  });

  it("maps each stat VALUE to its own measured ELIMS/WWCD/TOTAL column", () => {
    const rows = standings(13);
    Object.assign(rows[12], { wwcd: 4, kp: 18, total: 186 });
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "pmwi-violet",
        title: "SCRIM",
        subtitle: "AFTER MATCH 1",
        organizer: null,
        matchCount: 1,
        standings: rows,
      }),
    );
    const firstRowVals = new Map<number, string>();
    for (const m of html.matchAll(new RegExp(`left:(\\d+)px;top:${TABLE.rowY0}px;width:56px;[^>]*?>(\\d+)<`, "g"))) {
      firstRowVals.set(Number(m[1]), m[2]);
    }
    expect(firstRowVals.get(302)).toBe("30"); // rank 1 ELIMS/kp
    expect(firstRowVals.get(377)).toBe("2"); // rank 1 WWCD
    expect(firstRowVals.get(453)).toBe("70"); // rank 1 TOTAL
    expect(firstRowVals.get(825)).toBe("18"); // rank 13 ELIMS/kp
    expect(firstRowVals.get(892)).toBe("4"); // rank 13 WWCD
    expect(firstRowVals.get(962)).toBe("186"); // rank 13 TOTAL (3 digits)
  });

  it("renders MVP and announcement on the gradient fallback", () => {
    const mvp: MvpDisplayEntry[] = [
      { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
      { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
    ];
    const mvpHtml = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "pmwi-violet",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvp,
      }),
    );
    expect(mvpHtml).toContain("SCRIM");
    expect(mvpHtml).toContain("ALPHA");
    expect(mvpHtml).not.toContain("NaN");
    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmwi-violet",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: standings(16).map((r) => ({ id: r.teamId, name: r.teamName, logoUrl: r.logoUrl })),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain(">01<");
    expect(annHtml).toContain("SQUAD 16");
    expect(annHtml).not.toContain("NaN");
  });
});
