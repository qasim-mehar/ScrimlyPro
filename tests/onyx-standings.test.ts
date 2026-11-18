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

const CONFIG: TemplateConfig = getTemplate("onyx-green");
const TABLE = CONFIG.standings;
const [LEFT, RIGHT] = TABLE.columns;
// 4096×6144 JPEG payload inside a .png-named file → canvas ×1080/4096.
const S = 1080 / 4096;
const near = (canvasPx: number, artPx: number, tol = 1) => {
  expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(tol);
};

/** Measured white baked-rank ink centers on the art (canvas px), ranks 1–12.
 * These are the "dead-center" anchors the rendered stat/name text must match. */
const RANK_INK_CENTERS = [
  432, 502.5, 572.5, 644, 714.5, 785.5, 856, 926.5, 997.5, 1068.5, 1139.5, 1210.5,
];

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

function render(n: number, matchCount = 6): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "onyx-green",
      title: "SCRIM",
      subtitle: "FINAL RESULTS",
      organizer: null,
      standings: standings(n),
      matchCount,
    }),
  );
}

describe("onyx-green standings config (measured 24-slot Pro League art)", () => {
  it("points standings at the delivered overall.png, which exists on disk", () => {
    expect(CONFIG.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/onyx-green/overall.png",
    });
    expect(() => readFileSync("public/templates/onyx-green/overall.png")).not.toThrow();
  });

  it("ships the 4096×6144 JPEG payload the measurements were taken from", () => {
    const bytes = readFileSync("public/templates/onyx-green/overall.png");
    expect(bytes[0]).toBe(0xff); // JPEG SOI, not PNG magic
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

  it("bakes labels, ranks and the STANDING title; takes only the match number", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(TABLE.ranksBakedIn).toBe(true);
    for (const col of TABLE.columns) {
      expect(col.ranksBakedIn ?? TABLE.ranksBakedIn).toBe(true);
      expect(col.fixedRowPitch ?? TABLE.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn ?? TABLE.rowsPerColumn).toBe(12);
    }
    // The art bakes "STANDING" — the session name must never collide with it.
    expect(CONFIG.variantHideScrimName?.standings).toBe(true);
    expect(CONFIG.variantHideScrimName?.mvp).not.toBe(true);
  });

  it("lays 12 rows on the painted bars: measured pitch 70.7727, height 63, dead-center ink", () => {
    expect(TABLE.rowY0).toBe(400);
    expect(TABLE.rowPitch).toBe(70.7727);
    expect(TABLE.rowHeight).toBe(63);
    expect(TABLE.fixedRowPitch).toBe(true);
    // Row 1 text box is inset 4–6px inside the first painted bar (art rim
    // ~394 / 465 canvas) so its center lands on the baked rank ink at 432.
    near(TABLE.rowY0, 1495, 7);
    near(TABLE.rowY0 + TABLE.rowHeight, 1764, 3);
    // Every rendered row box centers on the baked white rank ink — zero drift.
    RANK_INK_CENTERS.forEach((inkCenter, i) => {
      const renderedCenter = TABLE.rowY0 + i * TABLE.rowPitch + TABLE.rowHeight / 2;
      expect(Math.abs(renderedCenter - inkCenter)).toBeLessThanOrEqual(1);
    });
  });

  it("keeps 12 baked rank slots per column with a fixed 12/12 split", () => {
    expect(TABLE.maxRowsLeft).toBe(12);
    expect(TABLE.rowsPerColumn).toBe(12);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // 25 teams overflow one painted row instead of being dropped.
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("pins all three stat columns (wwcd → kp → total) on both sides, non-overlapping", () => {
    const statBoxW = TABLE.statBoxW ?? 58;
    expect(statBoxW).toBe(48);
    const keys = ["wwcd", "kp", "total"];
    expect(LEFT.statColumns.map((c) => c.key)).toEqual(keys);
    expect(RIGHT.statColumns.map((c) => c.key)).toEqual(keys);
    for (const col of [LEFT, RIGHT]) {
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + statBoxW);
      }
    }
  });

  it("keeps every stat box strictly inside the dark row-bar interior", () => {
    const w = TABLE.statBoxW ?? 58;
    // Left bar interior x102–530; right x595–1027 (neon accent bars at 529–533
    // and 1028–1032 are excluded).
    for (const [col, lo, hi] of [
      [LEFT.statColumns, 102, 530],
      [RIGHT.statColumns, 595, 1027],
    ] as const) {
      for (const box of col) {
        expect(box.x).toBeGreaterThanOrEqual(lo);
        expect(box.x + w).toBeLessThanOrEqual(hi);
      }
    }
    // Measured baked header ink centers (canvas) — boxes must center on them.
    const leftCenters = { wwcd: 316, kp: 394, total: 475 };
    // Measured independently: right WWCD ink center is 799.5 (NOT the spec's
    // ~810 — the right column is not a uniform +494 shift of the left).
    const rightCenters = { wwcd: 800, kp: 890, total: 970 };
    for (const [col, centers] of [
      [LEFT, leftCenters],
      [RIGHT, rightCenters],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of keysOf(leftCenters)) {
        expect(Math.abs(byKey.get(key)! + w / 2 - centers[key])).toBeLessThanOrEqual(1);
      }
    }
  });

  it("starts the team box right of the rank box and ends before WWCD", () => {
    expect(LEFT.teamX).toBeGreaterThanOrEqual(102);
    expect(RIGHT.teamX).toBeGreaterThanOrEqual(595);
    for (const col of [LEFT, RIGHT]) {
      expect(col.teamX).toBeGreaterThanOrEqual(col.rankX + 48);
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(col.statColumns[0].x);
    }
    // First clear pixels right of the measured rank dividers (x107 / x597).
    near(LEFT.teamX, 417, 3);
    near(RIGHT.teamX, 2277, 3);
  });

  it("keeps rows 1–12 inside [395, 1238] with zero overlap at 16/19/24 teams", () => {
    for (let i = 0; i < 12; i++) {
      const top = TABLE.rowY0 + i * TABLE.rowPitch;
      expect(top).toBeGreaterThanOrEqual(395);
      expect(top).toBeLessThanOrEqual(1238);
    }
    expect(TABLE.rowPitch).toBeGreaterThanOrEqual(TABLE.rowHeight);
    for (const count of [16, 19, 24]) {
      const [leftCount, rightCount] = splitRowsAt(count, 12);
      for (const colCount of [leftCount, rightCount]) {
        for (let r = 1; r < colCount; r++) {
          const prevBottom = TABLE.rowY0 + (r - 1) * TABLE.rowPitch + TABLE.rowHeight;
          const nextTop = TABLE.rowY0 + r * TABLE.rowPitch;
          expect(nextTop).toBeGreaterThanOrEqual(prevBottom - 1);
        }
      }
    }
  });

  it("drops the match digits above the baked neon underline, right of MATCH #", () => {
    // Green underline ink spans art x980–1064 at y294; "MATCH #" ink ends x968.
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 984, y: 250, w: 76, align: "center" });
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#42F57E");
    near(sub!.x!, 3735, 2); // art 3735 → canvas 984.6
    expect(sub!.y! + 34).toBeLessThanOrEqual(294); // clears the underline ink
  });

  it("stops the row strips before the neon accent bars (no half-width bar)", () => {
    // Measured bright cores: left x528.5–533.5, right x1028–1032.5. The
    // rank-1 / odd-row strips are drawn OVER the art, so they must stop short.
    expect(LEFT.stripX + LEFT.stripW).toBeLessThanOrEqual(528);
    expect(RIGHT.stripX + RIGHT.stripW).toBeLessThanOrEqual(1028);
  });

  it("uses heavy white Exo 2 broadcast typography with tabular numerals", () => {
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.accent).toBe("#42F57E");
    expect(TABLE.nameFont.startsWith("800 ")).toBe(true);
    expect(TABLE.statFont.startsWith("800 ")).toBe(true);
    expect(TABLE.nameFont).toContain('"Exo 2"');
    expect(TABLE.statFont).toContain('"Exo 2"');
  });
});

function keysOf<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

describe("onyx-green fallback + SSR rendering", () => {
  it("renders no code rank numerals or baked labels (art already prints 1–24)", () => {
    const html = render(24);
    expect(html).not.toContain("left:60px");
    expect(html).not.toContain("left:552px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
  });

  it("splits 24 teams into exactly 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:110px/g) ?? []).length).toBe(12);
    expect((html.match(/left:600px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
    // Team #12 sits on painted row 12; #13 restarts at the right column top.
    expect(html).toContain(`top:${400 + 11 * 70.7727}px`);
  });

  it("fills the left column first for 16 and 19 teams", () => {
    const html16 = render(16);
    expect((html16.match(/left:110px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:600px/g) ?? []).length).toBe(4);
    const html19 = render(19);
    expect((html19.match(/left:110px/g) ?? []).length).toBe(12);
    expect((html19.match(/left:600px/g) ?? []).length).toBe(7);
  });

  it("keeps the 25th team (overflow row below the painted table)", () => {
    const html = render(25);
    expect((html.match(/left:600px/g) ?? []).length).toBe(13);
    expect(html).toContain("SQUAD 25");
  });

  it("hides the standings scrim name but keeps the match number and tabular stats", () => {
    const html = render(24);
    expect(html).not.toContain("SCRIM");
    expect(html).toContain("left:984px");
    expect(html).toContain("color:#42F57E");
    expect(html).toContain(">6<");
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("font:800 26px"); // heavy Exo 2 stat numerals
  });

  it("maps each stat VALUE to its own measured column (not just box presence)", () => {
    // 13 teams → 12 left + 1 right, so both column specs render. Give rank 13
    // distinct values (wwcd 4 / kp 18 / total 71) so a swapped mapping fails.
    const rows = standings(13);
    Object.assign(rows[12], { wwcd: 4, kp: 18, total: 71 });
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "onyx-green",
        title: "SCRIM",
        subtitle: "AFTER MATCH 1",
        organizer: null,
        matchCount: 1,
        standings: rows,
      }),
    );
    const byLeft = new Map<number, string>();
    for (const m of html.matchAll(/left:(\d+)px;top:400px;width:48px;[^>]*?>(\d+)</g)) {
      byLeft.set(Number(m[1]), m[2]); // first team (rank 1) box at rowY0=400
    }
    expect(byLeft.get(292)).toBe("2"); // rank 1 WWCD
    expect(byLeft.get(370)).toBe("30"); // rank 1 TOTALKILL
    expect(byLeft.get(451)).toBe("70"); // rank 1 TOTALPOINT
    expect(byLeft.get(776)).toBe("4"); // rank 13 WWCD
    expect(byLeft.get(866)).toBe("18"); // rank 13 TOTALKILL
    expect(byLeft.get(946)).toBe("71"); // rank 13 TOTALPOINT
  });

  it("renders the MVP variant on the dark matrix-green gradient fallback", () => {
    const mvpBg = CONFIG.backgrounds.mvp;
    expect(mvpBg.type).toBe("gradient");
    if (mvpBg.type === "gradient") {
      expect(mvpBg.css).toContain("#070D09");
      expect(mvpBg.css).toContain("#0F1F15");
      expect(mvpBg.decor).toEqual([]);
    }
    // Announcement is art-backed now (pinned in tests/onyx-announcement.test.ts).
    expect(CONFIG.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/onyx-green/announcement.png",
    });
    const html = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "onyx-green",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: [
          { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
          { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
        ] satisfies MvpDisplayEntry[],
      }),
    );
    expect(html).toContain("SCRIM");
    expect(html).toContain("TOP 5 FRAGGERS");
    expect(html).toContain("ALPHA");
  });

  it("renders the announcement variant on the 24-row single-column art", () => {
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "onyx-green",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: Array.from({ length: 16 }, (_, i) => ({
          id: `t${i}`,
          name: `SQUAD ${i + 1}`,
          logoUrl: null,
        })),
      }),
    );
    // The art bakes PUBG MOBILE + "TEAM PARTICIPATION"; no dynamic header text.
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).toContain(">01<");
    expect(html).toContain("SQUAD 16");
    expect((html.match(/left:214px/g) ?? []).length).toBe(16);
  });
});
