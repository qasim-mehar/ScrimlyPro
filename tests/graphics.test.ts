import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import {
  AESTHETICS,
  announcementRowLayout,
  columnPitch,
  effectivePitch,
  getTemplate,
  slotToStyle,
  splitRows,
  splitRowsAt,
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

describe("announcementRowLayout", () => {
  const spec: AnnouncementSpec = {
    rowsTop: 430,
    rowsBottom: 1470,
    slotX: 120,
    slotW: 48,
    logoX: 187,
    teamX: 250,
    teamW: 700,
    logoSize: 30,
    rowHeight: 40,
    slotFont: '700 30px "Exo 2", "Rajdhani", sans-serif',
    nameFont: '700 30px "Exo 2", "Rajdhani", sans-serif',
  };

  it("16 teams → even 65px pitch from rowsTop, filling the list area", () => {
    const rows = announcementRowLayout(16, spec);
    expect(rows).toHaveLength(16);
    expect(rows[0]).toEqual({ y: 430, pitch: 65 });
    expect(rows[15]).toEqual({ y: 430 + 15 * 65, pitch: 65 });
  });

  it("25 teams → 41.6px pitch, still ≥ rowHeight", () => {
    const rows = announcementRowLayout(25, spec);
    expect(rows).toHaveLength(25);
    expect(rows[0].pitch).toBeCloseTo((1470 - 430) / 25, 10);
    for (const row of rows) expect(row.pitch).toBeGreaterThanOrEqual(spec.rowHeight);
  });

  it("1 and 4 teams stretch to the full list area", () => {
    expect(announcementRowLayout(1, spec)).toEqual([{ y: 430, pitch: 1040 }]);
    expect(announcementRowLayout(4, spec)[3]).toEqual({ y: 430 + 3 * 260, pitch: 260 });
  });

  it("n ≤ 0 → empty layout", () => {
    expect(announcementRowLayout(0, spec)).toEqual([]);
    expect(announcementRowLayout(-3, spec)).toEqual([]);
  });

  it("keeps last-row content inside rowsBottom for every count 4–25", () => {
    for (let n = 4; n <= 25; n++) {
      const rows = announcementRowLayout(n, spec);
      const last = rows[rows.length - 1];
      const contentY = last.y + (last.pitch - spec.rowHeight) / 2;
      expect(contentY + spec.rowHeight).toBeLessThanOrEqual(spec.rowsBottom);
    }
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
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
    "esports-clash",
    "varsity-purple",
    "cardinal-gold",
  ];

  // Parallel-safe: another lane may register onyx-green/ewc-yellow while this
  // runs — assert known ids are present, never an exact registry length.
  it("exposes every registered aesthetic id", () => {
    const keys = Object.keys(AESTHETICS);
    for (const id of IDS) expect(keys).toContain(id);
    expect(keys.length).toBeGreaterThanOrEqual(IDS.length);
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

    it("builds every font string on the Exo 2 stack (Rajdhani fallback)", () => {
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
        config.announcement.slotFont,
        config.announcement.nameFont,
      ];
      for (const font of fonts) {
        expect(font).toContain('"Exo 2"'); // P7 primary face
        expect(font).toContain("Rajdhani"); // fallback until Exo 2 loads
        // "fallback position only": Rajdhani never leads a font shorthand
        expect(font.indexOf('"Exo 2"')).toBeLessThan(font.indexOf("Rajdhani"));
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

  it("ships art within ratio tolerance and at canvas resolution (IHDR header)", () => {
    // Amended P5 gate (user-accepted 2132×3200): |w/h − 2/3| ≤ 0.01, width ≥ 1080.
    const bytes = readFileSync("public/templates/pmpl-light/overall.png");
    const w = bytes.readUInt32BE(16);
    const h = bytes.readUInt32BE(20);
    expect(Math.abs(w / h - 2 / 3)).toBeLessThanOrEqual(0.01);
    expect(w).toBeGreaterThanOrEqual(1080);
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

  it("falls mvp back to the light gradient (never a broken render)", () => {
    const bg = config.backgrounds.mvp;
    expect(bg.type).toBe("gradient");
    if (bg.type !== "gradient") return;
    expect(bg.css).toMatch(/linear-gradient/);
  });

  it("points announcement at the real art file, which exists on disk", () => {
    expect(config.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/pmpl-light/announcement.png",
    });
    expect(() => readFileSync("public/templates/pmpl-light/announcement.png")).not.toThrow();
  });

  it("sits the announcement list between the baked divider and bottom border", () => {
    // Panel art: divider y840 → canvas 425.5; bottom border y3058 → 1549.1.
    const ann = config.announcement;
    expect(ann.rowsTop).toBeGreaterThanOrEqual(426);
    expect(ann.rowsTop).toBeLessThanOrEqual(450);
    expect(ann.rowsBottom).toBeGreaterThanOrEqual(1530);
    expect(ann.rowsBottom).toBeLessThanOrEqual(1549);
    // 25 teams must still fit: pitch ≥ rowHeight.
    expect((ann.rowsBottom - ann.rowsTop) / 25).toBeGreaterThanOrEqual(ann.rowHeight);
  });

  it("centers slot numbers on the baked SLOT NO label and names on TEAM", () => {
    const ann = config.announcement;
    // "SLOT NO" ink x 203–387 → canvas center 149.4; "TEAM" starts art 499 → 252.8.
    expect(Math.abs(ann.slotX + ann.slotW / 2 - 149.4)).toBeLessThanOrEqual(1);
    expect(Math.abs(ann.teamX - 252.8)).toBeLessThanOrEqual(1);
    // Logo plate (40) fits between the slot box end and the name start.
    expect(ann.slotX + ann.slotW).toBeLessThanOrEqual(ann.logoX);
    expect(ann.logoX + ann.logoSize + 10).toBeLessThanOrEqual(ann.teamX);
  });

  it("bakes the announcement subtitle away and overrides the title into the top strip", () => {
    expect(config.announcement.subtitleBakedIn).toBe(true);
    const override = config.variantHeaders?.announcement;
    expect(override?.title).toEqual({ x: 140, y: 36, w: 800, align: "center" });
    // Strip art x276–1856 y60–160 → canvas x139.8–940.2 y30.4–81.
    expect(override?.title?.x).toBeGreaterThanOrEqual(140);
    expect(override!.title!.x! + override!.title!.w!).toBeLessThanOrEqual(941);
    expect(override?.title?.y).toBeGreaterThanOrEqual(31);
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

describe("neon-green config (P6 art calibration)", () => {
  const config: TemplateConfig = getTemplate("neon-green");
  // 4096×6144 art → canvas: ×1080/4096 = 0.263671875.
  const S = 1080 / 4096;
  const near = (canvasPx: number, artPx: number) => {
    expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(1);
  };

  it("points standings at the real art file, which exists on disk", () => {
    expect(config.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/neon-green/overall.png",
    });
    expect(() => readFileSync("public/templates/neon-green/overall.png")).not.toThrow();
  });

  it("is a single full-width table with baked labels and match number", () => {
    expect(config.standings.singleColumn).toBe(true);
    expect(config.labelsBakedIn).toBe(true);
    expect(config.subtitleMode).toBe("matchNumber");
    expect(config.standings.rowPitch).toBe(42);
    expect(config.standings.rowHeight).toBe(40);
  });

  it("centers every value box on its baked art label (P6 pixel measurement)", () => {
    // Baked label ink (art px): RANK 758, PP 2361.5, KP 2724.5, chicken 3070,
    // TOTAL 3430.5. Box widths: rank 48, stats 58 — centers compared.
    const col = config.standings.columns[0];
    near(col.rankX + 24, 758);
    const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
    near(byKey.get("pp")! + 29, 2361.5);
    near(byKey.get("kp")! + 29, 2724.5);
    near(byKey.get("wwcd")! + 29, 3070);
    near(byKey.get("total")! + 29, 3430.5);
    // Names left-align with the baked "TEAM" label start (art 1256).
    near(col.teamX, 1256);
    expect(col.teamX + col.teamW).toBeLessThanOrEqual(byKey.get("pp")! - 4);
  });

  it("fills the measured table panel (art y1584–5568, strip x440–3656)", () => {
    const st = config.standings;
    near(st.rowY0, 1584);
    expect(st.rowY0).toBeGreaterThanOrEqual(413); // below the baked divider (art 1566)
    const col = st.columns[0];
    near(col.stripX, 440);
    near(col.stripW, 3656 - 440);
    near(col.rowsBottom!, 5568);
    // 25 rows still fit on the auto-fit pitch.
    expect((col.rowsBottom! - st.rowY0) / 25).toBeGreaterThanOrEqual(st.rowHeight);
  });

  it("lands the match number right of the baked #, inside the chip", () => {
    // Chip art x1594–2502 y994–1186 → canvas x420.3–659.7 y262.1–312.7;
    // "#" ink ends at art 2290 → canvas 603.8.
    const sub = config.header.subtitle;
    expect(sub.x).toBeGreaterThanOrEqual(604);
    expect(sub.x).toBeLessThanOrEqual(615);
    expect(sub.x! + 50).toBeLessThanOrEqual(660);
    expect(sub.y).toBeGreaterThanOrEqual(262);
    expect(sub.y).toBeLessThanOrEqual(270);
  });

  it("uses the neon palette values", () => {
    expect(config.palette.accent).toBe("#00e66a");
    expect(config.palette.text).toBe("#f0f4f0");
    expect(config.palette.textMuted).toBe("#7a8a7a");
    expect(config.palette.watermarkColor).toBe("rgba(255,255,255,0.7)");
    expect(config.palette.medalText).toBe("#0a0f0a");
  });
});

describe("challengers-red config (P6 art calibration)", () => {
  const config: TemplateConfig = getTemplate("challengers-red");
  const S = 1080 / 4096;
  // Measured slot card tops/bottoms (art px). Pitch varies 620–634 in the art
  // (AI drift) → one config pitch must stay within 3 canvas px of each slot.
  const TOPS = [1968, 2588, 3216, 3850, 4480];
  const BOTTOMS = [2500, 3128, 3760, 4390, 5028];
  const near = (canvasPx: number, artPx: number, tol = 1) => {
    expect(Math.abs(canvasPx - artPx * S)).toBeLessThanOrEqual(tol);
  };

  it("points mvp at the real art file, which exists on disk", () => {
    expect(config.backgrounds.mvp).toEqual({
      type: "image",
      src: "/templates/challengers-red/mvp.png",
    });
    expect(() => readFileSync("public/templates/challengers-red/mvp.png")).not.toThrow();
  });

  it("bakes the TOP 5 FRAGGERS subtitle away", () => {
    expect(config.mvp.subtitleBakedIn).toBe(true);
  });

  it("seats all five slot cards on the measured tops/bottoms", () => {
    const mvp = config.mvp;
    expect(mvp.rowHeight).toBe(140);
    TOPS.forEach((top, i) => {
      near(mvp.rowY0 + i * mvp.rowPitch, top, 3);
      // Text boxes never spill past the painted card bottom.
      expect(mvp.rowY0 + i * mvp.rowPitch + mvp.rowHeight).toBeLessThanOrEqual(BOTTOMS[i] * S + 1.5);
    });
  });

  it("centers the kills box on the baked KILLS ink (art x3464–3702, center 3583)", () => {
    const mvp = config.mvp;
    near(mvp.killsX + mvp.killsW / 2, 3583, 1);
    // Card is art x364–3708 → canvas 96–978; the digit glyphs stay on the
    // dark interior (the box itself may overhang the painted edge by design).
    expect(mvp.rankX).toBeGreaterThanOrEqual(96);
    expect(mvp.killsX + mvp.killsW / 2 + 30).toBeLessThanOrEqual(978);
    expect(mvp.playerX + mvp.playerW).toBeLessThanOrEqual(mvp.teamX);
    expect(mvp.teamX + mvp.teamW).toBeLessThanOrEqual(mvp.killsX);
  });

  it("sits the scrim name in the clear top band (art x531–3565 y18–288)", () => {
    const title = config.header.title;
    expect(title.y).toBeGreaterThanOrEqual(5);
    expect(title.y).toBeLessThanOrEqual(30);
    near(title.x!, 531);
    near(title.x! + title.w!, 3565);
  });

  it("uses the challengers palette values", () => {
    expect(config.palette.accent).toBe("#ff4655");
    expect(config.palette.text).toBe("#ffffff");
    expect(config.palette.watermarkColor).toBe("rgba(255,255,255,0.7)");
    expect(config.palette.medalText).toBe("#0f1015");
  });
});

describe("challengers-red standings config (measured 24-slot art)", () => {
  const config: TemplateConfig = getTemplate("challengers-red");
  const table = config.standings;
  const [left, right] = table.columns;

  it("points standings at the real art file, which exists on disk", () => {
    expect(config.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/challengers-red/overall.png",
    });
    expect(() => readFileSync("public/templates/challengers-red/overall.png")).not.toThrow();
    expect(config.backgrounds.mvp).toEqual({
      type: "image",
      src: "/templates/challengers-red/mvp.png",
    });
  });

  it("bakes labels, ranks, and subtitleMode matchNumber", () => {
    expect(config.labelsBakedIn).toBe(true);
    expect(config.subtitleMode).toBe("matchNumber");
    expect(table.ranksBakedIn).toBe(true);
    for (const col of table.columns) {
      expect(col.ranksBakedIn).toBe(true);
      expect(col.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn).toBe(12);
    }
    expect(config.variantHideScrimName?.standings).toBe(true);
    expect(config.variantHideScrimName?.mvp).not.toBe(true);
  });

  it("orders 4 statColumns in exact order: wwcd → pp → kp → total", () => {
    const keys = ["wwcd", "pp", "kp", "total"];
    expect(left.statColumns.map((c) => c.key)).toEqual(keys);
    expect(right.statColumns.map((c) => c.key)).toEqual(keys);
  });

  it("keeps stat column X ranges non-overlapping within the left dark row bar (x <= 493)", () => {
    const statBoxW = table.statBoxW ?? 38;
    expect(statBoxW).toBe(38);
    const sorted = [...left.statColumns].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + statBoxW);
    }
    expect(sorted[0].x).toBeGreaterThanOrEqual(left.stripX);
    expect(sorted[sorted.length - 1].x + statBoxW).toBeLessThanOrEqual(left.stripX + left.stripW);
    expect(sorted[sorted.length - 1].x).toBeLessThanOrEqual(493);
  });

  it("enforces a 12-rows-per-column split: #1–#12 left, #13–#24 right", () => {
    expect(table.maxRowsLeft).toBe(12);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("has zero row overlap across 16, 19, and 24 teams (pitch >= rowHeight)", () => {
    expect(table.rowPitch).toBeGreaterThanOrEqual(table.rowHeight);
    for (const count of [16, 19, 24]) {
      const [leftCount, rightCount] = splitRowsAt(count, 12);
      for (const colCount of [leftCount, rightCount]) {
        for (let r = 1; r < colCount; r++) {
          const prevRowBottom = table.rowY0 + (r - 1) * table.rowPitch + table.rowHeight;
          const nextRowTop = table.rowY0 + r * table.rowPitch;
          expect(nextRowTop).toBeGreaterThanOrEqual(prevRowBottom - 1);
        }
      }
    }
  });

  it("uses pure white text and bold broadcast typography", () => {
    expect(config.palette.text).toBe("#ffffff");
    expect(config.palette.textMuted).toBe("#b9c6d2");
    expect(config.palette.accent).toBe("#ff4655");
    expect(table.nameFont.startsWith("800 ")).toBe(true);
    expect(table.statFont.startsWith("800 ")).toBe(true);
  });
});

describe("ewc-yellow config (measured 24-slot art)", () => {
  const config: TemplateConfig = getTemplate("ewc-yellow");
  const table = config.standings;
  const [left, right] = table.columns;

  it("points standings at the real art file, which exists on disk", () => {
    expect(config.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/ewc-yellow/overall.png",
    });
    expect(() => readFileSync("public/templates/ewc-yellow/overall.png")).not.toThrow();
  });

  it("bakes labels, ranks, and subtitleMode matchNumber", () => {
    expect(config.labelsBakedIn).toBe(true);
    expect(config.subtitleMode).toBe("matchNumber");
    for (const col of table.columns) {
      expect(col.ranksBakedIn).toBe(true);
      expect(col.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn).toBe(12);
    }
  });

  it("orders 5 statColumns in exact order: wwcd → matches → pp → kp → total", () => {
    const keys = ["wwcd", "matches", "pp", "kp", "total"];
    expect(left.statColumns.map((c) => c.key)).toEqual(keys);
    expect(right.statColumns.map((c) => c.key)).toEqual(keys);
  });

  it("keeps stat column X ranges non-overlapping within the left column width", () => {
    const statBoxW = table.statBoxW ?? 46;
    expect(statBoxW).toBe(46);
    const sorted = [...left.statColumns].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + statBoxW);
    }
    expect(sorted[0].x).toBeGreaterThanOrEqual(left.stripX);
    expect(sorted[sorted.length - 1].x + statBoxW).toBeLessThanOrEqual(left.stripX + left.stripW);
  });

  it("enforces a 12-rows-per-column split: #1–#12 left, #13–#24 right", () => {
    expect(table.maxRowsLeft).toBe(12);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(19, 12)).toEqual([12, 7]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("has zero row overlap across 16, 19, and 24 teams (pitch >= rowHeight)", () => {
    expect(table.rowPitch).toBeGreaterThanOrEqual(table.rowHeight);
    for (const count of [16, 19, 24]) {
      const [leftCount, rightCount] = splitRowsAt(count, 12);
      for (const colCount of [leftCount, rightCount]) {
        for (let r = 1; r < colCount; r++) {
          const prevRowBottom = table.rowY0 + (r - 1) * table.rowPitch + table.rowHeight;
          const nextRowTop = table.rowY0 + r * table.rowPitch;
          expect(nextRowTop).toBeGreaterThanOrEqual(prevRowBottom - 12);
        }
      }
    }
  });

  it("uses the measured espresso palette and bold broadcast typography", () => {
    expect(config.palette.text).toBe("#2B0F00");
    expect(config.palette.textMuted).toBe("#4A1C00");
    expect(config.palette.accent).toBe("#5C2400");
    expect(config.palette.wwcdText).toBe("#6E2B00");
    expect(table.nameFont.startsWith("800 ")).toBe(true);
    expect(table.statFont.startsWith("800 ")).toBe(true);
  });
});

describe("image art quality gates (P5 Fix B, P6 sniff extension)", () => {
  // objectFit cover absorbs ≤1% ratio deviation as a centered crop of ~1–2px at canvas scale — imperceptible
  // and below calibration tolerance; AI upscalers output near-2:3 dimension ladders (e.g. 2132×3200) that must pass. Grossly wrong ratios (9:16,
  // 4:5) still fail.
  const RATIO_TOLERANCE = 0.01;
  const MIN_WIDTH = 1080;

  /** Dimensions from magic bytes — the P6 arts deliver JPEG payloads inside
   * .png-named files (neon-green, challengers-red), so the P5 IHDR read-off
   * is not enough: PNG → IHDR, JPEG → first SOF marker. Malformed input
   * throws a descriptive error rather than a RangeError. */
  function imageSize(bytes: Buffer): { w: number; h: number } {
    if (bytes.length < 4) throw new Error("unrecognized image payload (truncated)");
    if (bytes.readUInt32BE(0) === 0x89504e47) {
      if (bytes.length < 24) throw new Error("truncated PNG (no complete IHDR)");
      return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let pos = 2;
      while (pos + 10 <= bytes.length) {
        if (bytes[pos] !== 0xff) {
          pos += 1;
          continue;
        }
        const marker = bytes[pos + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
        }
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
          pos += 2;
          continue;
        }
        pos += 2 + bytes.readUInt16BE(pos + 2);
      }
      throw new Error("JPEG without an SOF marker");
    }
    throw new Error("unrecognized image payload");
  }

  type ArtCase = { id: string; variant: string; file: string; fitted: boolean };
  const CASES: ArtCase[] = [];
  for (const [id, config] of Object.entries(AESTHETICS)) {
    for (const [variant, bg] of Object.entries(config.backgrounds)) {
      if (bg.type === "image") {
        CASES.push({ id, variant, file: `public${bg.src}`, fitted: bg.fit !== undefined });
      }
    }
  }

  it("covers every delivered art variant (parallel-safe: at least the known ones)", () => {
    expect(CASES).toEqual(
      expect.arrayContaining([
        { id: "pmpl-light", variant: "standings", file: "public/templates/pmpl-light/overall.png", fitted: false },
        { id: "pmpl-light", variant: "announcement", file: "public/templates/pmpl-light/announcement.png", fitted: false },
        { id: "neon-green", variant: "standings", file: "public/templates/neon-green/overall.png", fitted: false },
        { id: "challengers-red", variant: "standings", file: "public/templates/challengers-red/overall.png", fitted: false },
        { id: "challengers-red", variant: "mvp", file: "public/templates/challengers-red/mvp.png", fitted: false },
        { id: "ewc-yellow", variant: "standings", file: "public/templates/ewc-yellow/overall.png", fitted: false },
        { id: "onyx-green", variant: "standings", file: "public/templates/onyx-green/overall.png", fitted: false },
        { id: "pmgc-crimson", variant: "standings", file: "public/templates/pmgc-crimson/overall.png", fitted: false },
        // pmwi-violet's true PNG is 941×1672 (taller than 2:3) → uniformly
        // fitted by width (×1080/941, top -130.25) like the other fitted arts.
        { id: "pmwi-violet", variant: "standings", file: "public/templates/pmwi-violet/overall.png", fitted: true },
        { id: "grunge-red", variant: "mvp", file: "public/templates/grunge-red/mvp.png", fitted: true },
        { id: "esports-clash", variant: "mvp", file: "public/templates/esports-clash/mvp.png", fitted: true },
      ]),
    );
    expect(CASES.length).toBeGreaterThanOrEqual(10);
  });

  it("sniffs both PNG and JPEG payloads (all three new arts are JPEG-in-.png)", () => {
    const neon = readFileSync("public/templates/neon-green/overall.png");
    const chalMvp = readFileSync("public/templates/challengers-red/mvp.png");
    const chalStandings = readFileSync("public/templates/challengers-red/overall.png");
    expect(neon[0]).toBe(0xff); // JPEG SOI, not PNG magic
    expect(chalMvp[0]).toBe(0xff);
    expect(chalStandings[0]).toBe(0xff);
    expect(imageSize(neon)).toEqual({ w: 4096, h: 6144 });
    expect(imageSize(chalMvp)).toEqual({ w: 4096, h: 6144 });
    expect(imageSize(chalStandings)).toEqual({ w: 4096, h: 6144 });
    const pmpl = readFileSync("public/templates/pmpl-light/announcement.png");
    expect(pmpl.readUInt32BE(0)).toBe(0x89504e47);
    expect(imageSize(pmpl)).toEqual({ w: 2132, h: 3200 });
  });

  it.each(CASES)("$id/$variant art ($file): ratio within tolerance AND width ≥ 1080", ({ file, fitted }) => {
    // A missing or unreadable art file fails the build, never the
    // organizer's export. Fitted art (grunge-red's 0.8-ratio portrait) is
    // uniformly pre-scaled via Background.fit → no ratio requirement.
    const { w, h } = imageSize(readFileSync(file));
    if (!fitted) {
      // Full-cover art must itself be ≥1080 wide and 2:3.
      expect(Math.abs(w / h - 2 / 3)).toBeLessThanOrEqual(RATIO_TOLERANCE);
      expect(w).toBeGreaterThanOrEqual(MIN_WIDTH);
    }
    // Uniformly fitted art (pmwi-violet / pmgc-aqua) is pre-scaled to width
    // 1080 via Background.fit — its native RGB pixels may be narrower.
  });
});

describe("palette plate + medal coverage (P5 Fix D)", () => {
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
    "esports-clash",
    "varsity-purple",
  ];

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
    expect(getTemplate("neon-green").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.07)",
      plateRing: "rgba(0,230,106,0.45)",
      medalGold: "#f0c44c",
      medalSilver: "#c9d1dd",
      medalBronze: "#d19a5b",
      medalText: "#0a0f0a",
    });
    expect(getTemplate("challengers-red").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.07)",
      plateRing: "rgba(255,70,85,0.45)",
      medalGold: "#f0c44c",
      medalSilver: "#c9d1dd",
      medalBronze: "#d19a5b",
      medalText: "#0f1015",
    });
    expect(getTemplate("ewc-yellow").palette).toMatchObject({
      plateBg: "#FFF6E2",
      plateRing: "rgba(58,20,0,0.30)",
      medalGold: "#B57E0D",
      medalSilver: "#7D8698",
      medalBronze: "#9C6327",
      medalText: "#FFFFFF",
    });
    expect(getTemplate("onyx-green").palette).toMatchObject({
      plateBg: "rgba(66,245,126,0.12)",
      plateRing: "rgba(66,245,126,0.5)",
      medalGold: "#F0C44C",
      medalSilver: "#C9D1DD",
      medalBronze: "#D19A5B",
      medalText: "#0A100B",
    });
    expect(getTemplate("pmgc-crimson").palette).toMatchObject({
      plateBg: "rgba(255,255,255,0.10)",
      plateRing: "rgba(245,184,46,0.55)",
      medalGold: "#F5B82E",
      medalSilver: "#D8C7CB",
      medalBronze: "#B4763F",
      medalText: "#140A00",
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

describe("P7 — font swap + template flags", () => {
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
    "esports-clash",
  ];

  it("uniformMvpRows is true for every theme (uniform MVP everywhere)", () => {
    for (const id of IDS) {
      expect(getTemplate(id).uniformMvpRows).toBe(true);
    }
  });

  it("hideScrimName is set for neon-green only", () => {
    for (const id of IDS) {
      expect(getTemplate(id).hideScrimName === true).toBe(id === "neon-green");
    }
  });

  it("watermarkYOffset is set for pmpl-light only (16 = measured max clean drop)", () => {
    for (const id of IDS) {
      const offset = getTemplate(id).watermarkYOffset;
      if (id === "pmpl-light") {
        expect(offset).toBe(16);
      } else {
        expect(offset).toBeUndefined();
      }
    }
  });

  it("data-bearing fonts carry weight ≥ 700 (700 body, 800 art-table bump)", () => {
    for (const id of IDS) {
      const c = getTemplate(id);
      for (const font of [
        c.standings.nameFont,
        c.standings.statFont,
        c.mvp.playerFont,
        c.mvp.statFont,
        c.announcement.slotFont,
        c.announcement.nameFont,
      ]) {
        // grunge-red's mvp.statFont is a 400-weight marker/brush accent
        // (spec 400–700), never a data-bearing face. Its names stay 800.
        if (id === "grunge-red" && font === c.mvp.statFont) continue;
        const weight = Number(font.split(" ")[0]);
        expect(weight).toBeGreaterThanOrEqual(700);
        expect(weight).toBeLessThanOrEqual(800);
      }
    }
  });

  it("no font string uses Rajdhani as the primary face", () => {
    for (const id of IDS) {
      const c = getTemplate(id);
      for (const font of [
        c.header.titleFont,
        c.header.subtitleFont,
        c.header.organizerFont,
        c.standings.nameFont,
        c.standings.statFont,
        c.standings.labelFont,
        c.mvp.rankFont,
        c.mvp.playerFont,
        c.mvp.statFont,
        c.announcement.slotFont,
        c.announcement.nameFont,
      ]) {
        // grunge-red's kills brush is a self-hosted marker face; its
        // data-bearing names still lead with Exo 2 via FONTS_FULL.
        if (id === "grunge-red" && font === c.mvp.statFont) continue;
        expect(font).not.toMatch(/px\s+"Rajdhani"/);
        expect(font).toContain('"Exo 2"');
      }
    }
  });
});

describe("P7 — font wiring (source-level)", () => {
  it("layout imports Exo 2 weights 500-800 and keeps Rajdhani as fallback", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    for (const w of [500, 600, 700, 800]) {
      expect(layout).toContain(`@fontsource/exo-2/${w}.css`);
    }
    for (const w of [500, 600, 700]) {
      expect(layout).toContain(`@fontsource/rajdhani/${w}.css`);
    }
  });

  it("globals.css --font-display leads with Exo 2", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('--font-display: "Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif;');
  });

  it("GraphicCanvas watermark uses the Exo 2 stack", () => {
    const src = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(src).toContain('const FONT_STACK = \'"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif\';');
    expect(src).toContain("WATERMARK_FONT = `600 26px ${FONT_STACK}`");
  });
});

describe("AnnouncementGraphic slot numbers (SSR)", () => {
  function render(
    teams: Array<{
      id: string;
      name: string;
      logoUrl: string | null;
      slotNumber: number | null;
    }>,
  ): string {
    return renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "dark-gold",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams,
      }),
    );
  }

  it("renders the assigned slot number instead of the sequential index", () => {
    const html = render([
      { id: "t1", name: "Alpha", logoUrl: null, slotNumber: 7 },
      { id: "t2", name: "Bravo", logoUrl: null, slotNumber: 25 },
    ]);
    expect(html).toContain(">07<");
    expect(html).toContain(">25<");
    // The first row must not fall back to 01 when a slot is assigned.
    expect(html).not.toContain(">01<");
  });

  it("falls back to 01, 02, 03… when slotNumber is null", () => {
    const html = render([
      { id: "t1", name: "Alpha", logoUrl: null, slotNumber: null },
      { id: "t2", name: "Bravo", logoUrl: null, slotNumber: null },
      { id: "t3", name: "Charlie", logoUrl: null, slotNumber: null },
    ]);
    expect(html).toContain(">01<");
    expect(html).toContain(">02<");
    expect(html).toContain(">03<");
  });

  it("never repeats an assigned slot when a NULL team falls back", () => {
    const html = render([
      { id: "t1", name: "Alpha", logoUrl: null, slotNumber: 2 },
      { id: "t2", name: "Bravo", logoUrl: null, slotNumber: null },
      { id: "t3", name: "Charlie", logoUrl: null, slotNumber: null },
    ]);
    // Alpha keeps 02; the two NULLs skip it and take 03, 04.
    expect(html).toContain(">02<");
    expect(html).toContain(">03<");
    expect(html).toContain(">04<");
    expect(html.match(/>02</g)).toHaveLength(1);
  });
});
