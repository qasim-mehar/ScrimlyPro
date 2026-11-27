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
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmwc-orange";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** Supplied art is a TRUE 1027×1531 PNG. Uniform width-fit to the exact
 *  1080×1620 canvas (S = 1080/1027, centred 5px letterbox, no distortion). */
const ART = { w: 1027, h: 1531 } as const;
const S = 1080 / ART.w;
const TOP = (1620 - ART.h * S) / 2;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S + TOP;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);

/** Measured light-plate bands (art y bounds) from the 1027px art. */
const PLATES: ReadonlyArray<readonly [number, number]> = [
  [316, 394], [407, 485], [499, 577], [590, 667],
  [680, 759], [772, 849], [862, 941], [954, 1031],
  [1045, 1123], [1136, 1214], [1226, 1304], [1317, 1395],
];
const paintedCenter = (row: number) => cy((PLATES[row]![0] + PLATES[row]![1]) / 2);

/** 44px value boxes centred on the measured ink above. */
const LEFT_X = [314, 371, 422, 474];
const RIGHT_X = [832, 888, 939, 993];

/** Measured baked label ink centres (canvas px) through the uniform fit. */
const STAT_CENTERS = {
  left: [336.0, 392.9, 444.5, 496.1],
  right: [854.1, 910.3, 961.7, 1014.6],
} as const;

/** 24-team board in the ewc-teal / pmsl-cobalt fixture shape (already-derived
 *  DISPLAY values; production rows always come from confirmed match_results). */
const TEAMS_24: ReadonlyArray<readonly [string, number, number, number]> = [
  ["A7", 5, 71, 2], ["RC", 2, 40, 1], ["TIAN", 0, 27, 0], ["DRX", 1, 48, 2],
  ["BOOM", 2, 38, 0], ["TLN", 1, 33, 0], ["VPE", 1, 45, 0], ["TL", 1, 35, 0],
  ["DX", 1, 38, 0], ["TJB", 1, 41, 0], ["ULA", 1, 35, 0], ["4MV", 0, 27, 0],
  ["TWIS", 1, 28, 0], ["IWNRX", 0, 20, 0], ["ALL", 1, 32, 0], ["POWR", 0, 18, 0],
  ["NOVA LEGENDS", 0, 17, 0], ["SHADOW SYNDICATE", 0, 15, 0], ["ZERO DEGREE", 0, 13, 0],
  ["RAWALPINDI", 0, 11, 0], ["TRB GAMING", 0, 9, 0], ["4NM ESPORTS", 0, 7, 0],
  ["STRAIGHT FORWARD", 0, 5, 0], ["DX RAIDERS", 0, 3, 0],
];

function standings(count: number): StandingRow[] {
  return TEAMS_24.slice(0, Math.max(0, Math.min(count, 24))).map(
    ([teamName, wwcd, kp, pp], i) => ({
      teamId: `t${i + 1}`,
      teamName,
      logoUrl: null,
      wwcd,
      pp,
      kp,
      total: pp + kp,
      matches: 6,
    }),
  );
}

function render(
  count: number,
  matchCount = 6,
  rows: StandingRow[] = standings(count),
): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMWC 2024",
      subtitle: "AFTER MATCH 6",
      organizer: null,
      standings: rows,
      matchCount,
    }),
  );
}

describe("pmwc-orange registration + assets", () => {
  it("is registered in every registry and art-backed picker only", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMWC Orange");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("ships the cleaned standings art as a true PNG at 1027×1531", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmwc-orange/standings.png");
    const bytes = readFileSync("public/templates/pmwc-orange/standings.png");
    // Magic-byte sniff — never re-encode or fake art.
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
  });

  it("uniformly fits the non-2:3 art and fills the letterbox with black", () => {
    const bg = CONFIG.backgrounds.standings;
    if (bg.type !== "image") throw new Error("standings background must be art");
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.left).toBe(0);
    expect(fit.height).toBeCloseTo(ART.h * S, 6);
    expect(fit.top).toBeCloseTo((1620 - fit.height) / 2, 6);
    expect(fit.width / ART.w).toBeCloseTo(fit.height / ART.h, 8); // no stretch
    expect(CONFIG.canvasBackground).toBe("#000000");
  });

  it("keeps the calibration reference on disk but never registers it as art", () => {
    const ref = readFileSync("public/templates/pmwc-orange/reference.png");
    // The supplied reference is JPEG bytes behind the brief's .png name — it
    // is eyeball-only and is never decoded/registered as a graphic background.
    expect(ref.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    for (const bg of Object.values(CONFIG.backgrounds)) {
      if (bg.type === "image") expect(bg.src).not.toContain("reference");
    }
  });

  it("uses a light warm gradient fallback so black fallback ink clears 7:1", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    for (const stop of ["#FFF4E2", "#FBD6A0", "#F2A05A"]) {
      expect(css).toContain(stop);
      expect(contrastRatio(parseHexColor("#000000"), parseHexColor(stop))).toBeGreaterThanOrEqual(7);
    }
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(7);
  });
});

describe("pmwc-orange 2×12 painted-plate geometry", () => {
  it("splits 24/16/4/25 teams with zero dropped rows", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
    }
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // The delivered art bakes ranks #1–#12 left / #13–#24 right, so a 16-team
    // subset fills 12 left + 4 right (the reference poster's 8+8 is a different
    // art). No row is ever dropped; 25 overflows to [12,13].
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
    expect(splitRowsAt(24, 12).reduce((a, b) => a + b, 0)).toBe(24);
  });

  it("pins rowY0 337.3 / pitch 95.7 / height 82 to the baked plate centres", () => {
    expect(ST.rowY0).toBe(337.3);
    expect(ST.rowPitch).toBe(95.7);
    expect(ST.rowHeight).toBe(82);
    expect(ST.rowHeight).toBeLessThanOrEqual(ST.rowPitch);
    near(ST.rowY0, cy(316), 0.5); // painted row-1 top
    near(ST.rowY0 + ST.rowHeight / 2, paintedCenter(0), 0.1);
    near(ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight / 2, paintedCenter(11), 1.1);
    expect(ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight).toBeLessThanOrEqual(cy(1395) + 1);
    // The art's own plate pitch wobbles ±2px; the single 95.7px fit is the
    // closest uniform approximation (the box centres stay on the plates).
    for (let i = 0; i < 12; i++) {
      expect(Math.abs(cy(PLATES[i]![0]) - (337.303 + i * 95.7))).toBeLessThanOrEqual(2);
    }
  });

  it("seats rows #1 / #12 / #13 / #24 dead-centre in their painted plates", () => {
    // Left column uses plate 0 / 11; right column reuses the same two plates.
    for (const i of [0, 11]) {
      const top = ST.rowY0 + i * ST.rowPitch;
      expect(Math.abs(top + ST.rowHeight / 2 - paintedCenter(i))).toBeLessThanOrEqual(1.1);
      expect(top).toBeGreaterThanOrEqual(cy(PLATES[i]![0]) - 0.5);
      expect(top + ST.rowHeight).toBeLessThanOrEqual(cy(PLATES[i]![1]) + 1);
    }
  });

  it("bounds rank badges, team cells and painted strips inside each plate", () => {
    const [left, right] = ST.columns;
    near(cx(99), 104.1, 0.1); // baked left rank badge right edge
    near(cx(591), 621.5, 0.1); // baked right rank badge right edge
    expect(left.rankX).toBe(23);
    expect(right.rankX).toBe(540);
    expect(left.teamX).toBe(116);
    expect(right.teamX).toBe(634);
    expect(left.teamW).toBe(195);
    expect(right.teamW).toBe(195);
    expect(left.rankX + 48).toBeLessThan(left.teamX);
    expect(right.rankX + 48).toBeLessThan(right.teamX);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[0]!.x);
    near(cx(499), 524.8, 0.1);
    near(cx(991), 1042.1, 0.1);
    expect(left.stripX + left.stripW).toBeLessThanOrEqual(525);
    expect(right.stripX + right.stripW).toBeLessThanOrEqual(1043);
  });

  it("fits ordinary broadcast team names without premature ellipsis", () => {
    // Measured Exo 2 800 advance for "STRAIGHT FORWARD" is ~219px at 22px;
    // at 19px (with the renderer's -0.01em tracking) it is ~189px < 195px.
    const px = Number(/(\d+)px/.exec(ST.nameFont)?.[1]);
    expect(px).toBe(19);
    expect((219 * px) / 22).toBeLessThan(195);
  });

  it("suppresses synthetic labels/ranks and keeps Exo 2 800 black ink", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn)).toBe(true);
    near(ST.headerLabelsY, cy(265), 0.5);
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
    expect(CONFIG.palette.text).toBe("#000000");
    expect(CONFIG.palette.wwcdText).toBe("#000000");
    expect(ST.nameFont.startsWith("800 19px ")).toBe(true);
    expect(ST.nameUppercase).toBe(true);
    expect(ST.statFont.startsWith("800 26px ")).toBe(true);
    for (const font of [ST.nameFont, ST.statFont]) {
      expect(font).toContain('"Exo 2"');
      expect(font).toContain('"Rajdhani"');
    }
  });
});

describe("pmwc-orange baked WWCD / PLACE PTS / ELIMS / TOTAL cells", () => {
  it("orders the four baked stat columns on both tables", () => {
    for (const col of ST.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
      expect(col.statColumns.some((c) => c.key === "matches")).toBe(false);
    }
    expect(ST.statBoxW).toBe(44);
    expect(ST.columns[0]!.statColumns.map((c) => c.x)).toEqual(LEFT_X);
    expect(ST.columns[1]!.statColumns.map((c) => c.x)).toEqual(RIGHT_X);
  });

  it("centres every value box on the measured label ink with zero overlap", () => {
    for (const [xs, centers] of [
      [LEFT_X, STAT_CENTERS.left],
      [RIGHT_X, STAT_CENTERS.right],
    ] as const) {
      xs.forEach((x, i) => {
        expect(Math.abs(x + ST.statBoxW! / 2 - centers[i]!)).toBeLessThanOrEqual(1);
      });
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! + ST.statBoxW!);
      }
      expect(xs[xs.length - 1]! + ST.statBoxW!).toBeLessThanOrEqual(1080);
    }
  });

  it("keeps black numerals above 7:1 on both measured plate tones", () => {
    // Row interiors sample #E3E3E1 (grey plate) and #D1D1D1 (white plate).
    for (const plate of ["#E3E3E1", "#D1D1D1"]) {
      expect(contrastRatio(parseHexColor("#000000"), parseHexColor(plate))).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("pmwc-orange baked MATCH # digit slot", () => {
  const override = CONFIG.variantHeaders?.standings;
  if (!override?.subtitle) throw new Error("standings digit slot must be configured");
  const sub = override.subtitle;

  it("renders only the digits after the baked 'MATCH #' ink", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true); // title baked
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(sub).toEqual({ x: 574, y: 162, w: 70, align: "left" });
    // Baked '#' ink ends art x538 → canvas 565.76; digits start 8.24px right,
    // on the same baseline (baked ink y171.1–209.0).
    expect(sub.x).toBeGreaterThan(cx(538));
    expect(sub.x - cx(538)).toBeLessThanOrEqual(12);
    expect(sub.x + sub.w!).toBeLessThanOrEqual(1080);
    expect(CONFIG.variantHeaders?.standings?.subtitleFont?.startsWith("800 52px ")).toBe(true);
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toContain('"Exo 2"');
  });

  it("pins MATCH 1 and MATCH 6 to the identical baseline and size", () => {
    const one = render(24, 1);
    const six = render(24, 6);
    expect(one).toContain("left:574px;top:162px");
    expect(six).toContain("left:574px;top:162px");
    expect(one).toContain(">1<");
    expect(six).toContain(">6<");
    expect(one).not.toContain(">6<");
    for (const html of [one, six]) {
      expect(html).not.toContain("PMWC 2024"); // baked title
      expect(html).not.toContain("AFTER MATCH"); // no double-print of MATCH
      expect(html).not.toContain(">#<"); // the '#' is baked, never re-drawn
    }
    const final = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: ID,
        title: "PMWC 2024",
        subtitle: "FINAL RESULTS",
        organizer: null,
        standings: standings(24),
        matchCount: 6,
      }),
    );
    expect(final).toContain(">6<");
    expect(final).not.toContain("FINAL RESULTS");
  });

  it("clears AA for large black digits on the measured pink digit zone", () => {
    // Sampled art zone behind the digits: mean #917F8C (lum 0.291 linear).
    const zone = parseHexColor("#917F8C");
    expect(contrastRatio(parseHexColor("#000000"), zone)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmwc-orange SSR at 4 / 16 / 24 teams", () => {
  it.each([4, 16, 24])("renders %i teams without NaN or dropped rows", (n) => {
    const html = render(n);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const [left, right] = splitRowsAt(n, 12);
    let renderedNames = 0;
    for (const [name] of TEAMS_24.slice(0, n)) {
      renderedNames += html.split(`>${name}<`).length - 1;
    }
    expect(renderedNames).toBe(n);
    expect((html.match(/left:116px;width:195px/g) ?? []).length).toBe(left);
    expect((html.match(/left:634px;width:195px/g) ?? []).length).toBe(right);
    for (const x of LEFT_X) expect(html).toContain(`left:${x}px`);
    // An empty right column paints no divs at all (no row, no stat box).
    for (const x of RIGHT_X) expect(html.includes(`left:${x}px`)).toBe(right > 0);
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
  });

  it("never drops a 25th team, even though it lands below the baked table", () => {
    const rows = [
      ...standings(24),
      {
        teamId: "t25",
        teamName: "OVERFLOW 25",
        logoUrl: null,
        wwcd: 0,
        pp: 0,
        kp: 1,
        total: 1,
        matches: 6,
      },
    ];
    const html = render(25, 6, rows);
    expect(html).toContain(">OVERFLOW 25<");
    expect((html.match(/left:116px;width:195px/g) ?? []).length).toBe(12);
    // 13th right-column row sits on the footer art — no baked plate/badge —
    // but the row is still rendered (the engine never silently drops data).
    expect((html.match(/left:634px;width:195px/g) ?? []).length).toBe(13);
  });

  it("fills 12 baked left slots + 4 right slots for the 16-team subset", () => {
    const html = render(16);
    expect((html.match(/left:116px;width:195px/g) ?? []).length).toBe(12);
    expect((html.match(/left:634px;width:195px/g) ?? []).length).toBe(4);
    expect(html).toContain(">IWNRX<"); // rank 14 (right row 2)
    expect(html).not.toContain(">NOVA LEGENDS<"); // rank 17 — unused baked slot
  });

  it("truncates Arabic / CJK / fullwidth names inside the TEAM cell", () => {
    const torture = "أحمد حسیب ハナン 卍 ＮＣＴ 乡 SUPRΔ";
    const html = render(1, 6, [
      { ...standings(1)[0]!, teamId: "glyph", teamName: torture, logoUrl: null },
    ]);
    expect(html).toContain(torture);
    expect(html).toContain("left:116px;width:195px");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
    // Cell right edge 311 stays 3px clear of the first stat box at 314.
    expect(116 + 195).toBeLessThan(ST.columns[0]!.statColumns[0]!.x);
    expect(html).toContain("text-transform:uppercase");
    const fontIdx = html.indexOf("font:800 19px");
    const lhIdx = html.indexOf("line-height:82px", fontIdx);
    expect(fontIdx).toBeGreaterThanOrEqual(0);
    expect(lhIdx).toBeGreaterThan(fontIdx); // line-height AFTER font shorthand
    expect(lhIdx - fontIdx).toBeLessThan(400);
  });

  it("bounds an optional logo plate and shifts the name inside the same cell", () => {
    const html = render(1, 6, [
      {
        ...standings(1)[0]!,
        logoUrl: "data:image/png;base64,iVBORw0KGgo=",
      },
    ]);
    expect(html).toContain("left:116px;top:361.3px;width:34px;height:34px"); // plate
    expect(html).toContain("left:154px;width:157px"); // name after +38 gap
    expect(ST.logoPlate!).toBeLessThan(ST.rowHeight);
    expect(116 + ST.logoPlate!).toBeLessThan(ST.columns[0]!.statColumns[0]!.x);
    expect(154 + 157).toBeLessThan(ST.columns[0]!.statColumns[0]!.x);
  });
});

describe("pmwc-orange canvas, watermark and export contract", () => {
  it("hardcodes the brand watermark at x730 y1570 with configurable black ink", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant: "standings" }));
    expect(html).toContain("left:730px");
    expect(html).toContain("top:1570px");
    expect(html).toContain("width:280px");
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("color:#000000");
    // Measured orange footer zone (#FEAE5E) — black clears the 7:1 bar.
    expect(contrastRatio(parseHexColor("#000000"), parseHexColor("#FEAE5E"))).toBeGreaterThanOrEqual(7);
  });

  it("uses the exact 1080×1620 stage and a hardened 1080×1620 export", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant: "standings" }));
    expect(html).toContain("width:1080px;height:1620px");
    expect(html).toContain("aspect-ratio:1080 / 1620");
    const src = readFileSync("components/graphics/export.ts", "utf8");
    expect(src).toContain("const EXPORT_W = 1080");
    expect(src).toContain("const EXPORT_H = 1620");
    expect(src).toContain("width: EXPORT_W");
    expect(src).toContain("height: EXPORT_H");
    expect(src).toContain("pixelRatio: 1");
  });
});
