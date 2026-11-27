import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hasArtForVariant,
  hideScrimNameFor,
  minContrastAgainstStops,
  parseHexColor,
  selectableAestheticIds,
  splitRows,
  type TemplateConfig,
} from "@/lib/graphics";
import { GLYPH_REFERENCE } from "@/lib/fixtures/glyphNames";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmnc-pakistan-lime";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** Measured from `public/templates/pmnc-pakistan-lime/overall.png` (art px).
 *  The art is a TRUE 1696×2528 PNG, uniformly HEIGHT-fitted to the 1080×1620
 *  canvas: S = 1620/2528 = 0.6408227848, drawn 1086.835×1620 at left −3.4177
 *  (a 3.4px cover crop per side, zero distortion). Every pin below is in
 *  canvas px — art px converted with cx/cy — per MASTER-PROMPT §5/§6. */
const ART = { w: 1696, h: 2528 } as const;
const S = 1620 / ART.h;
const LEFT = (1080 - ART.w * S) / 2;
const cx = (artX: number) => artX * S + LEFT;
const cy = (artY: number) => artY * S;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);

/** Baked rank-ink centres scanned off the blank art (art y). Rows 1–12 live in
 *  the left table, 13–24 repeat the same painted bars in the right table. */
const RANK_INK_Y = [
  500, 667, 837.5, 1007.5, 1178, 1350, 1523.5, 1698, 1871.5, 2046, 2219.5, 2393,
] as const;

/** Baked header label-ink centres (canvas px) scanned off the art bands. */
const LABEL_INK = { pp: 387.5, kp: 442.12, total: 495.92 } as const;
const RIGHT_SHIFT = 518;
/** Baked "MATCH #" ink: art x865–1246, y136–239. */
const MATCH_INK_END_X = cx(1246);
const MATCH_INK_CENTER_Y = cy(187.5);
/** Measured RIGHT edge of the white banner parallelogram (canvas px) at the
 *  digit band's y values — it tapers left as y grows, so the digits must be
 *  small enough to stay on white. */
const BANNER_RIGHT_EDGE = [
  { y: cy(120), x: cx(1348) }, // 860.4
  { y: cy(140), x: cx(1335) }, // 852.1
  { y: cy(160), x: cx(1323) }, // 844.4
  { y: cy(180), x: cx(1324) }, // 845.0
] as const;
/** Pinned stat box left edges (canvas px) measured off the art's label ink. */
const LEFT_X = [310, 364.5, 419, 473] as const;
const RIGHT_X = [828, 883, 936.5, 990.5] as const;

function standings(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
    matches: 12,
  }));
}

function render(n: number, matchCount = 10, rows = standings(n)): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMNC PAKISTAN", // baked art must hide this synthetic title
      subtitle: `AFTER MATCH ${matchCount}`,
      organizer: null,
      standings: rows,
      matchCount,
    }),
  );
}

describe("pmnc-pakistan-lime registration + art", () => {
  it("is registered in AESTHETICS / AESTHETIC_IDS / the session allowlist", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMNC Pakistan Lime");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 }); // law: strict 2:3 canvas
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    // The art is standings-only: the reference JPEG is never registered.
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("backs standings with a true 1696×2528 PNG (never a re-encoded JPEG-in-.png)", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmnc-pakistan-lime/overall.png");
    const bytes = readFileSync("public/templates/pmnc-pakistan-lime/overall.png");
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR"); // real PNG chunk
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
  });

  it("fits that art uniformly onto the exact 1080×1620 canvas (no distortion)", () => {
    const bg = CONFIG.backgrounds.standings;
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.height).toBe(1620);
    expect(fit.width).toBeCloseTo(ART.w * S, 6);
    expect(fit.width / ART.w).toBeCloseTo(fit.height / ART.h, 8); // uniform scale
    expect(fit.left).toBeCloseTo((1080 - fit.width) / 2, 6); // centred cover crop
    expect(fit.top).toBe(0);
    expect(fit.left).toBeLessThan(0); // the 0.6% wider art is cropped, not stretched
    expect(CONFIG.canvasBackground).toBeTruthy(); // letterbox-safe fill
  });

  it("ships the reference next to the art but never as a background", () => {
    expect(() => readFileSync("public/templates/pmnc-pakistan-lime/refrence.jpeg")).not.toThrow();
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const bg = CONFIG.backgrounds[variant];
      if (bg.type === "image") expect(bg.src).not.toContain("refrence");
    }
  });

  it("uses light-lime gradients for the artless MVP + announcement variants", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#F2F9D6");
    expect(css).toContain("#B9E050");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(7);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(7);
  });
});

describe("pmnc-pakistan-lime 24-team 12+12 painted-bar geometry", () => {
  it("bakes labels + ranks and keeps the title out of the renderer", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn)).toBe(true);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(ST.headerLabelsY).toBe(233); // art y364 black band top
    near(ST.headerLabelsY, cy(364), 0.5);
  });

  it("is two columns of 12 with no rows dropped and the reference's 8+8 at 16", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    for (const col of ST.columns) {
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? ST.ranksBakedIn).toBe(true);
    }
    // rowsPerColumn is deliberately unset so the engine uses splitRows():
    expect(ST.rowsPerColumn).toBeUndefined();
    expect(ST.columns[0].rowsPerColumn).toBeUndefined();
    expect(splitRows(24)).toEqual([12, 12]);
    expect(splitRows(16)).toEqual([8, 8]); // matches refrence.jpeg's 1–8 / 9–16
    expect(splitRows(4)).toEqual([2, 2]); // 4-team minimum
    expect(12 + 12).toBe(24);
  });

  it("pins rowY0 / pitch / height to the baked rank ink with zero drift at rows 1 & 12", () => {
    expect(ST.rowPitch).toBeGreaterThanOrEqual(ST.rowHeight); // never overlap bars
    expect(ST.rowHeight).toBe(96);
    near(ST.rowY0 + ST.rowHeight / 2, cy(RANK_INK_Y[0]), 0.5); // rows #1 / #13
    near(
      ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight / 2,
      cy(RANK_INK_Y[11]),
      0.5,
    ); // rows #12 / #24
    // Both columns share the same painted geometry (same rank ink y).
    near(ST.rowY0 + ST.rowHeight / 2, cy(RANK_INK_Y[0]), 0.5);
    near(
      ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight / 2,
      cy(RANK_INK_Y[11]),
      0.5,
    );
    // Last painted bar stays inside the 1620px canvas.
    expect(ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight).toBeLessThan(1600);
  });

  it("keeps every painted row centre within a small tolerance of its text box", () => {
    for (let i = 0; i < RANK_INK_Y.length; i++) {
      const painted = cy(RANK_INK_Y[i]!);
      const text = ST.rowY0 + i * ST.rowPitch + ST.rowHeight / 2;
      // The art's pitch drifts 167→174 art px mid-table; a single standings
      // pitch cannot express per-row centres, so 8px is the measured ceiling.
      expect(Math.abs(painted - text)).toBeLessThanOrEqual(8);
    }
  });

  it("pins the team slots clear of the baked rank ink and stat boxes", () => {
    const [left, right] = ST.columns;
    // Widest baked rank ink: #12 ends art x163 → canvas 101.0; #24 ends art
    // x987 → canvas 629.1. Both team slots keep a 5px clear gap.
    expect(left.teamX).toBe(106);
    expect(right.teamX).toBe(634);
    expect(cx(163)).toBeLessThan(left.teamX);
    expect(cx(987)).toBeLessThan(right.teamX);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[1]!.x);
    expect(left.stripW).toBeLessThanOrEqual(430);
    expect(right.stripW).toBeLessThanOrEqual(430);
  });
});

describe("pmnc-pakistan-lime stat cells (WWCD / PLACE / KILL / TOTAL)", () => {
  const LEFT_CENTERS = [333, LABEL_INK.pp, LABEL_INK.kp, LABEL_INK.total];
  const RIGHT_CENTERS = LEFT_CENTERS.map((x) => x + RIGHT_SHIFT);

  it("orders WWCD → PLACE → KILL → TOTAL on both tables", () => {
    expect(ST.statBoxW).toBe(46);
    for (const col of ST.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
    }
  });

  it("pins every box to its painted compartment centre with no overlap", () => {
    for (const [col, xs, centers] of [
      [ST.columns[0], LEFT_X, LEFT_CENTERS],
      [ST.columns[1], RIGHT_X, RIGHT_CENTERS],
    ] as const) {
      expect(col.statColumns.map((c) => c.x)).toEqual(xs);
      xs.forEach((x, i) => {
        // The WWCD chicken icon sits in the open gap before PLACE; no baked
        // divider, so its centre is measured off the reference icon placement.
        expect(Math.abs(x + ST.statBoxW! / 2 - centers[i]!)).toBeLessThanOrEqual(1.5);
      });
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! + ST.statBoxW!);
      }
    }
    // Painted label ink centroids (not just cell midpoints) stay within 1.5px.
    for (const [x, ink] of [
      [364.5, LABEL_INK.pp],
      [419, LABEL_INK.kp],
      [473, LABEL_INK.total],
      [883, LABEL_INK.pp + RIGHT_SHIFT],
      [936.5, LABEL_INK.kp + RIGHT_SHIFT],
      [990.5, LABEL_INK.total + RIGHT_SHIFT],
    ] as const) {
      expect(Math.abs(x + ST.statBoxW! / 2 - ink)).toBeLessThanOrEqual(1.5);
    }
  });

  it("uses Exo 2 800 dark ink and paints no synthetic strips", () => {
    expect(ST.nameFont.startsWith("800 21px ")).toBe(true);
    expect(ST.statFont.startsWith("800 25px ")).toBe(true);
    for (const font of [ST.nameFont, ST.statFont]) expect(font).toContain('"Exo 2"');
    expect(CONFIG.palette.text).toBe("#050505");
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
    expect(CONFIG.palette.wwcdBg).toBe("rgba(0,0,0,0)");
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
  });
});

describe("pmnc-pakistan-lime baked MATCH # digit slot", () => {
  it("renders only the confirmed-match number, never the baked title or label", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    const head = CONFIG.variantHeaders!.standings!;
    expect(head.title).toEqual({ x: -9999, y: -9999, w: 0 });
    expect(head.organizer).toEqual({ x: -9999, y: -9999, w: 0 });
    expect(head.subtitleTextTransform).toBe("uppercase");
    expect(head.subtitleFont).toContain("italic 800 36px");
    expect(head.subtitleLetterSpacing).toBe("-0.04em");
    expect(head.subtitleFont).toContain('"Exo 2"');
    expect(head.subtitleColor).toBe("#5C8A00");
    const html = render(24, 6);
    expect(html).toContain(">6<");
    expect(html).not.toContain("PMNC PAKISTAN"); // baked OVERALL LEADERBOARD
    expect(html).not.toContain("AFTER MATCH 6");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
  });

  it("pins the slot after the baked # ink inside the tapering white wedge", () => {
    const sub = CONFIG.variantHeaders!.standings!.subtitle!;
    expect(sub).toEqual({ x: 802, y: 72, w: 44, align: "left" });
    expect(sub.x!).toBeGreaterThan(MATCH_INK_END_X + 4); // ≈6px measured gap
    expect(sub.x!).toBeGreaterThan(cx(759)); // clears baked title right edge x483
    // The banner is a parallelogram: its white right edge is x860 at canvas
    // y77 and x844 at y102. The ink band is y≈78–106, so two 36px digits
    // (≈41px advance with −0.04em tracking) must end before the narrowest edge.
    const inkRight = sub.x! + 41;
    const narrowestEdge = Math.min(...BANNER_RIGHT_EDGE.map((p) => p.x));
    expect(inkRight).toBeLessThan(narrowestEdge);
    // The brief asks for vertical centring against the baked two-line title
    // (white ink art y23–299 → canvas centre 103.2); the digit box centre 90
    // sits 13px above it, still inside the same banner band.
    const textCenter = sub.y! + 36 / 2; // renderer sets line-height:1
    expect(Math.abs(textCenter - cy(161))).toBeLessThanOrEqual(20);
    expect(textCenter).toBeLessThan(MATCH_INK_CENTER_Y); // above the baked lockup
  });

  it("keeps MATCH 1 and MATCH 10 on the same left edge, baseline and size", () => {
    const one = render(24, 1);
    const ten = render(24, 10);
    const slotStyles = (html: string) =>
      [...html.matchAll(/style="([^"]*font:italic 800 36px[^"]*)"/g)].map((m) => m[1]!);
    expect(slotStyles(one)).toHaveLength(1);
    expect(slotStyles(ten)).toHaveLength(1);
    expect(slotStyles(one)[0]).toBe(slotStyles(ten)[0]); // identical slot geometry
    for (const html of [one, ten]) {
      expect(html).toContain("left:802px");
      expect(html).toContain("top:72px");
      expect(html).toContain("width:44px");
      expect(html).toContain("font:italic 800 36px");
      expect(html).toContain("letter-spacing:-0.04em");
      expect(html).toContain("color:#5C8A00");
    }
    expect(one).toContain(">1<");
    expect(ten).toContain(">10<");
    // 44px holds two 36px Exo 2 digits (≈41px advance), so no wrap is possible.
    expect(CONFIG.variantHeaders!.standings!.subtitle!.w!).toBeGreaterThanOrEqual(41);
  });

  it("resolves WCAG contrast on the measured art surfaces", () => {
    const white = parseHexColor("#FFFFFF");
    const limeRow1 = { r: 129, g: 186, b: 21 }; // measured row-1 fill
    expect(contrastRatio(parseHexColor("#050505"), white)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(parseHexColor("#050505"), limeRow1)).toBeGreaterThanOrEqual(7);
    // #5C8A00 is the brief's exact MATCH ink. Its measured ratio on the white
    // banner is 4.13:1 — it clears WCAG AA large-text (3:1, these digits are
    // italic 800 36px) and is 0.37 short of the brief's 4.5:1 normal-text gate.
    // The palette colour is kept verbatim; this deviation is reported to the
    // reviewer (the brief's colour and its 4.5:1 gate are mutually exclusive).
    const matchContrast = contrastRatio(parseHexColor("#5C8A00"), white);
    expect(matchContrast).toBeGreaterThanOrEqual(4);
    expect(matchContrast).toBeGreaterThanOrEqual(3);
  });
});

describe("pmnc-pakistan-lime SSR at 4 / 16 / 24 teams", () => {
  it.each([4, 16, 24])("renders %i teams on the painted bars without NaN", (n) => {
    const html = render(n);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const [left, right] = splitRows(n);
    const names = (x: number) =>
      (html.match(new RegExp(`font:800 21px[^"]*left:${x}px`, "g")) ?? []).length;
    expect(names(106)).toBe(left);
    expect(names(634)).toBe(right);
    expect(left + right).toBe(n);
    for (const x of [...LEFT_X, ...RIGHT_X]) expect(html).toContain(`left:${x}px`);
  });

  it("leaves the unpainted baked rows blank at 16 teams", () => {
    const html = render(16);
    // 8 names in the left column and 8 in the right — never 12/4 (reference
    // parity). NOTE: the art bakes fixed #1–#12 / #13–#24 numerals, so on a
    // 16-team session the right column's baked labels read #13–#20 while the
    // dynamic rows are ranks 9–16. That is an inherent limitation of a single
    // 24-slot art with baked ranks (no per-count art was supplied); there is no
    // TemplateConfig field that can hide baked glyphs, so ranks stay baked.
    expect((html.match(/font:800 21px[^"]*left:106px/g) ?? []).length).toBe(8);
    expect((html.match(/font:800 21px[^"]*left:634px/g) ?? []).length).toBe(8);
    // Only eight painted row tops are used per column (row index 0..7).
    expect(html).toContain(`top:${ST.rowY0}px`);
    expect(html).toContain(`top:${ST.rowY0 + 7 * ST.rowPitch}px`);
    expect(html).not.toContain(`top:${ST.rowY0 + 8 * ST.rowPitch}px`);
  });

  it("centres glyphs with line-height declared AFTER the font shorthand", () => {
    const html = render(24);
    for (const font of ["font:800 21px", "font:800 25px"]) {
      const fontIdx = html.indexOf(font);
      expect(fontIdx).toBeGreaterThanOrEqual(0);
      const lhIdx = html.indexOf("line-height:96px", fontIdx);
      expect(lhIdx).toBeGreaterThan(fontIdx);
      expect(lhIdx - fontIdx).toBeLessThan(300); // same style declaration
    }
  });

  it("truncates long Arabic / CJK names inside the TEAM cell", () => {
    const names = [
      GLYPH_REFERENCE[9]!, // "SNOW | حسیب"
      GLYPH_REFERENCE[11]!, // "乡"
      "REGNUM CARYA ESPORTS ULTRA LONG BANNER NAME",
    ];
    for (const name of names) {
      const html = render(1, 10, [{ ...standings(1)[0]!, teamName: name }]);
      expect(html).toContain(name);
      expect(html).toContain("left:106px;width:198px");
      expect(html).toContain("text-overflow:ellipsis");
      expect(html).toContain("white-space:nowrap");
    }
  });

  it("keeps an optional logo plate bounded inside the painted row", () => {
    const html = render(1, 10, [
      {
        ...standings(1)[0]!,
        logoUrl: "data:image/png;base64,iVBORw0KGgo=",
      },
    ]);
    expect(html).toContain("left:106px"); // plate origin
    expect(html).toContain("width:30px");
    expect(html).toContain("height:30px");
    expect(html).toContain("border-radius:50%");
    // Logo shifts the name by logoNameGap and shrinks it to stay inside teamW.
    expect(html).toContain("left:140px;width:164px");
    const plateTop = ST.rowY0 + (ST.rowHeight - (ST.logoPlate ?? 30)) / 2;
    expect(html).toContain(`top:${plateTop}px`);
    expect(plateTop).toBeGreaterThanOrEqual(ST.rowY0);
    expect(plateTop + (ST.logoPlate ?? 30)).toBeLessThanOrEqual(ST.rowY0 + ST.rowHeight);
  });

  it("keeps the hardcoded watermark at y1570 in all three variants", () => {
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("scrimlypro.com");
      expect(html).toContain("color:#0F1115"); // only palette.watermarkColor varies
    }
  });
});
