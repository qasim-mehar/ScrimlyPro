import { readFileSync } from "node:fs";
import {
  AESTHETICS,
  announcementGrid,
  columnPitch,
  effectivePitch,
  getTemplate,
  slotToStyle,
  splitRows,
  type AestheticId,
  type AnnouncementSpec,
  type Slot,
  type TemplateConfig,
} from "@/lib/graphics";
import { describe, expect, it } from "vitest";

describe("splitRows", () => {
  it.each([
    { n: 16, left: 8, right: 8 },
    { n: 20, left: 10, right: 10 },
    { n: 25, left: 13, right: 12 },
    { n: 4, left: 2, right: 2 },
    { n: 5, left: 3, right: 2 },
    { n: 1, left: 1, right: 0 },
    { n: 13, left: 7, right: 6 },
    { n: 0, left: 0, right: 0 },
  ])("splits $n teams → [$left, $right]", ({ n, left, right }) => {
    expect(splitRows(n)).toEqual([left, right]);
  });
});

describe("announcementGrid", () => {
  const spec: AnnouncementSpec = {
    y0: 410,
    cellW: 180,
    cellH: 150,
    logoSize: 64,
    nameFont: '600 26px "Rajdhani", sans-serif',
  };

  it.each([
    { n: 25, cols: 5, rows: 5, x0: 90 },
    { n: 16, cols: 4, rows: 4, x0: 180 },
    { n: 6, cols: 4, rows: 2, x0: 180 },
    { n: 22, cols: 5, rows: 5, x0: 90 },
  ])("lays out $n teams in ${cols}×$rows at x0 $x0", ({ n, cols, rows, x0 }) => {
    expect(announcementGrid(n, spec)).toEqual({
      cols,
      rows,
      x0,
      y0: spec.y0,
      cellW: spec.cellW,
      cellH: spec.cellH,
    });
  });
});

describe("slotToStyle", () => {
  it("maps x/y/w/align to an absolute-position style", () => {
    const slot: Slot = { x: 10, y: 20, w: 100, align: "center" };
    expect(slotToStyle(slot)).toEqual({
      position: "absolute",
      left: 10,
      top: 20,
      width: 100,
      textAlign: "center",
    });
  });

  it("omits width when slot.w is absent", () => {
    const style = slotToStyle({ x: 5, y: 6 });
    expect(style).toEqual({ position: "absolute", left: 5, top: 6 });
    expect("width" in style).toBe(false);
  });
});

describe("AESTHETICS registry", () => {
  const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom", "pmpl-light"];

  it("exposes exactly the four aesthetic ids", () => {
    expect(Object.keys(AESTHETICS).sort()).toEqual([...IDS].sort());
  });

  it("looks configs up by id", () => {
    for (const id of IDS) {
      expect(getTemplate(id).id).toBe(id);
    }
  });
});

type Rect = { x: number; y: number; w: number; h: number };

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Row background strip rects the table zone must keep calm (no decor inside).
const STRIP_RECTS: Rect[] = [
  { x: 58, y: 415, w: 462, h: 1030 },
  { x: 598, y: 415, w: 462, h: 1030 },
];
// Per-column x bounds: [column A], [column B].
const COLUMN_BOUNDS: Array<[number, number]> = [
  [58, 520],
  [598, 1060],
];
const RANK_BOX_W = 48;
const STAT_BOX_W = 58;

describe.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
  "aesthetic %s config integrity",
  (id) => {
    const config: TemplateConfig = getTemplate(id);

    it("uses the exact 1080×1620 canvas", () => {
      expect(config.canvas).toEqual({ w: 1080, h: 1620 });
    });

    it("keeps stat boxes inside their column bounds with no overlaps", () => {
      config.standings.columns.forEach((col, i) => {
        const [lo, hi] = COLUMN_BOUNDS[i];
        const boxes: Rect[] = col.statColumns.map(({ x }) => ({ x, y: 0, w: STAT_BOX_W, h: 0 }));
        for (const box of boxes) {
          expect(box.x).toBeGreaterThanOrEqual(lo);
          expect(box.x + box.w).toBeLessThanOrEqual(hi);
        }
        const sorted = [...boxes].sort((a, b) => a.x - b.x);
        for (let k = 1; k < sorted.length; k++) {
          expect(sorted[k].x).toBeGreaterThanOrEqual(sorted[k - 1].x + STAT_BOX_W);
        }
      });
    });

    it("keeps rank, team and strip boxes inside their column bounds", () => {
      config.standings.columns.forEach((col, i) => {
        const [lo, hi] = COLUMN_BOUNDS[i];
        expect(col.rankX).toBeGreaterThanOrEqual(lo);
        expect(col.rankX + RANK_BOX_W).toBeLessThanOrEqual(hi);
        expect(col.teamX).toBeGreaterThanOrEqual(lo);
        expect(col.teamX + col.teamW).toBeLessThanOrEqual(hi);
        expect(col.stripX).toBeGreaterThanOrEqual(lo);
        expect(col.stripX + col.stripW).toBeLessThanOrEqual(hi);
      });
    });

    it("fits maxRowsLeft rows above the footer band with a label-row gap", () => {
      const st = config.standings;
      expect(st.rowY0 + (st.maxRowsLeft - 1) * st.rowPitch + st.rowHeight).toBeLessThanOrEqual(1500);
      expect(st.headerLabelsY + 30).toBeLessThanOrEqual(st.rowY0);
    });

    it("builds every font string on the Rajdhani stack", () => {
      const fonts = [
        config.header.titleFont,
        config.header.subtitleFont,
        config.header.organizerFont,
        config.standings.nameFont,
        config.standings.statFont,
        config.standings.labelFont,
        config.mvp.rankFont,
        config.mvp.playerFont,
        config.mvp.statFont,
        config.announcement.nameFont,
      ];
      for (const font of fonts) {
        expect(font).toContain("Rajdhani");
      }
    });

    it("defines a complete palette", () => {
      const p = config.palette;
      for (const value of [p.accent, p.text, p.textMuted, p.rowAlt, p.wwcdBg, p.wwcdText, p.watermarkColor]) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
      expect(p.rowAltOpacity).toBeGreaterThan(0);
      expect(p.rowAltOpacity).toBeLessThanOrEqual(1);
    });

    it("uses a linear-gradient background with decor", () => {
      expect(config.backgrounds.standings.type).toBe("gradient");
      if (config.backgrounds.standings.type !== "gradient") return;
      expect(config.backgrounds.standings.css).toMatch(/linear-gradient/);
      expect(config.backgrounds.standings.decor.length).toBeGreaterThanOrEqual(2);
    });

    it("renders stat columns in the legacy wwcd→pp→kp→total order", () => {
      for (const col of config.standings.columns) {
        expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
      }
    });

    it("keeps decor bounding boxes out of both row strip rects", () => {
      expect(config.backgrounds.standings.type).toBe("gradient");
      if (config.backgrounds.standings.type !== "gradient") return;
      for (const shape of config.backgrounds.standings.decor) {
        const bbox: Rect = {
          x: shape.x,
          y: shape.y,
          w: shape.w,
          h: shape.kind === "circle" ? shape.w : (shape.h ?? shape.w),
        };
        for (const strip of STRIP_RECTS) {
          expect(intersects(bbox, strip)).toBe(false);
        }
      }
    });
  },
);

describe("pmpl-light config", () => {
  const config: TemplateConfig = getTemplate("pmpl-light");

  it("uses the exact 1080×1620 canvas", () => {
    expect(config.canvas).toEqual({ w: 1080, h: 1620 });
  });

  it("points standings at the real art file, which exists on disk", () => {
    expect(config.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/pmpl-light/overall.png",
    });
    // Public-dir file backing the src above — a missing file fails the build,
    // not the organizer's export.
    expect(() => readFileSync("public/templates/pmpl-light/overall.png")).not.toThrow();
  });

  it("ships art with an exact 2:3 ratio (IHDR header)", () => {
    const bytes = readFileSync("public/templates/pmpl-light/overall.png");
    const w = bytes.readUInt32BE(16);
    const h = bytes.readUInt32BE(20);
    expect(w * 3).toBe(h * 2);
  });

  it("orders stat columns kp → pp → wwcd → total, each exactly once", () => {
    for (const col of config.standings.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["kp", "pp", "wwcd", "total"]);
    }
  });

  it("bakes labels in and takes only the match number for the subtitle", () => {
    expect(config.labelsBakedIn).toBe(true);
    expect(config.subtitleMode).toBe("matchNumber");
  });

  it("uses the light palette values", () => {
    expect(config.palette.text).toBe("#1c2333");
    expect(config.palette.textMuted).toBe("#5b6678");
    expect(config.palette.accent).toBe("#0e7ac4");
    expect(config.palette.wwcdBg).toBe("rgba(230,160,20,0.16)");
    expect(config.palette.wwcdText).toBe("#8a5a00");
  });

  it("renders a dark watermark ink for the light theme", () => {
    expect(config.palette.watermarkColor).toBe("rgba(20,28,44,0.55)");
    expect(config.palette.watermarkColor).not.toContain("255,255,255");
  });

  it("falls mvp/announcement back to the light gradient (never a broken render)", () => {
    for (const bg of [config.backgrounds.mvp, config.backgrounds.announcement]) {
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toMatch(/linear-gradient/);
    }
  });

  it("centers every value box on its baked art label (P4b pixel measurement)", () => {
    // Art label ink centers, art px (1024×1536), segmented in P4b:
    // left [rank, team, kp, pp, wwcd, total], right ditto.
    const S = 1080 / 1024;
    const artCenters: Array<[number, number, number, number, number, number]> = [
      [79, 183, 296.5, 359.5, 416, 473.5],
      [550, 650.5, 770.5, 832, 887, 945.5],
    ];
    config.standings.columns.forEach((col, i) => {
      const [rankC, , kpC, ppC, wwcdC, totalC] = artCenters[i].map((v) => v * S);
      // Whole-px boxes over fractional art centers: within 1 canvas px.
      expect(Math.abs(col.rankX + 24 - rankC)).toBeLessThanOrEqual(1);
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const [key, want] of [
        ["kp", kpC],
        ["pp", ppC],
        ["wwcd", wwcdC],
        ["total", totalC],
      ] as const) {
        expect(Math.abs(byKey.get(key)! + 29 - want)).toBeLessThanOrEqual(1);
      }
    });
  });

  it("keeps team/logo boxes clear of the first stat column", () => {
    for (const col of config.standings.columns) {
      const kpX = col.statColumns.find((c) => c.key === "kp")!.x;
      expect(col.teamX).toBeGreaterThan(col.rankX + 48);
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(kpX - 4);
    }
  });

  it("fills the measured table rect (rowsTop 371 / rowsBottom 1469)", () => {
    const st = config.standings;
    expect(st.rowY0).toBe(371);
    for (const col of config.standings.columns) {
      expect(col.rowsBottom).toBe(1469);
    }
    // Strips stay inside their table half (L 42 / divider 540 / R 1038).
    const [left, right] = st.columns;
    expect(left.stripX).toBeGreaterThanOrEqual(42);
    expect(left.stripX + left.stripW).toBeLessThanOrEqual(538);
    expect(right.stripX).toBeGreaterThanOrEqual(542);
    expect(right.stripX + right.stripW).toBeLessThanOrEqual(1038);
  });

  it("lands the match number inside the ribbon, after the baked #", () => {
    // Ribbon art x 383–679 y 49–95 → canvas x 404–716 y 52–100; "#" ink ends
    // at art x583 → canvas 615. Slot must start just right of it and fit a
    // two-digit number before the ribbon's right slant edge.
    const sub = config.header.subtitle;
    expect(sub.x).toBeGreaterThanOrEqual(616);
    expect(sub.x).toBeLessThanOrEqual(630);
    expect(sub.y).toBeGreaterThanOrEqual(50);
    expect(sub.y).toBeLessThanOrEqual(60);
  });

  it("sits the scrim name in the clear top strip", () => {
    // Strip verified clear (art rows 0–44, canvas 0–46) across x 295–785.
    const title = config.header.title;
    expect(title.y).toBeGreaterThanOrEqual(0);
    expect(title.y + 36).toBeLessThanOrEqual(46);
    expect(title.x).toBeGreaterThanOrEqual(290);
    expect(title.x! + title.w!).toBeLessThanOrEqual(790);
  });
});

describe("palette plate + medal coverage (P5 Fix D)", () => {
  const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom", "pmpl-light"];

  it.each(IDS)("%s defines non-empty plate/medal strings", (id) => {
    const p = getTemplate(id).palette;
    for (const value of [
      p.plateBg,
      p.plateRing,
      p.medalGold,
      p.medalSilver,
      p.medalBronze,
      p.medalText,
    ]) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("pins the exact plate/medal values per aesthetic", () => {
    expect(getTemplate("dark-gold").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.07)",
      plateRing: "rgba(245,197,66,0.45)",
      medalGold: "#f5c542",
      medalSilver: "#c9d1dd",
      medalBronze: "#d19a5b",
      medalText: "#11141b",
    });
    expect(getTemplate("purple-butterfly").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.07)",
      plateRing: "rgba(192,132,252,0.45)",
      medalGold: "#f0c44c",
      medalSilver: "#c9d1dd",
      medalBronze: "#d19a5b",
      medalText: "#1c1533",
    });
    expect(getTemplate("pink-blossom").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.08)",
      plateRing: "rgba(255,158,199,0.45)",
      medalGold: "#f0c44c",
      medalSilver: "#ccd2de",
      medalBronze: "#d29a5c",
      medalText: "#2c1521",
    });
    expect(getTemplate("pmpl-light").palette).toMatchObject({
      plateBg: "#ffffff",
      plateRing: "rgba(28,35,51,0.18)",
      medalGold: "#b57e0d",
      medalSilver: "#7d8698",
      medalBronze: "#9c6327",
      medalText: "#ffffff",
    });
  });
});

describe("columnPitch / effectivePitch (row auto-fit)", () => {
  it("19 teams, rowsTop 415 / rowsBottom 1445 → 1030/10 left, 1030/9 right", () => {
    expect(columnPitch(415, 1445, 10)).toBeCloseTo(103, 10);
    expect(columnPitch(415, 1445, 9)).toBeCloseTo(1030 / 9, 10);
  });

  it("25 teams → 13/12, 16 teams → 8/8", () => {
    expect(columnPitch(415, 1445, 13)).toBeCloseTo(1030 / 13, 10);
    expect(columnPitch(415, 1445, 12)).toBeCloseTo(1030 / 12, 10);
    expect(columnPitch(415, 1445, 8)).toBeCloseTo(1030 / 8, 10);
  });

  it("places the last row inside bounds at 16, 19 and 25 teams", () => {
    const rowY0 = 415;
    const rowsBottom = 1445;
    const rowHeight = 60;
    for (const [left, right] of [
      [8, 8],
      [10, 9],
      [13, 12],
    ] as Array<[number, number]>) {
      for (const count of [left, right]) {
        const pitch = columnPitch(rowY0, rowsBottom, count);
        expect(rowY0 + (count - 1) * pitch + rowHeight).toBeLessThanOrEqual(rowsBottom);
      }
    }
  });

  it("falls back to the fixed pitch without rowsBottom", () => {
    expect(effectivePitch(415, 80, undefined, 10)).toBe(80);
    expect(effectivePitch(415, 80, 1445, 10)).toBeCloseTo(103, 10);
  });
});
