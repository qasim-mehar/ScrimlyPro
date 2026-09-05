import {
  AESTHETICS,
  announcementGrid,
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
  const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom"];

  it("exposes exactly the three aesthetic ids", () => {
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
        const boxes: Rect[] = Object.values(col.statsX).map((x) => ({ x, y: 0, w: STAT_BOX_W, h: 0 }));
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
      for (const value of [p.accent, p.text, p.textMuted, p.rowAlt, p.wwcdBg, p.wwcdText]) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
      expect(p.rowAltOpacity).toBeGreaterThan(0);
      expect(p.rowAltOpacity).toBeLessThanOrEqual(1);
    });

    it("uses a linear-gradient background with decor", () => {
      expect(config.background.type).toBe("gradient");
      if (config.background.type !== "gradient") return;
      expect(config.background.css).toMatch(/linear-gradient/);
      expect(config.background.decor.length).toBeGreaterThanOrEqual(2);
    });

    it("keeps decor bounding boxes out of both row strip rects", () => {
      expect(config.background.type).toBe("gradient");
      if (config.background.type !== "gradient") return;
      for (const shape of config.background.decor) {
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
