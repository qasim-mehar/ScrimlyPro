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
  relativeLuminance,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmwc-blue";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;
const LEFT_STAT_X = [335.8, 401.1, 470.6] as const;
const RIGHT_STAT_X = [852.4, 917.6, 981.6] as const;

/** Measurements off the supplied art, in canvas px. The art is a TRUE
 *  1027×1531 PNG: uniform width fit S = 1080/1027 with a centred 4.9951px
 *  top/bottom letterbox (filled by canvasBackground). No crop, no distortion.
 *  canvasX = artX × S; canvasY = artY × S + TOP. */
const ART = { w: 1027, h: 1531 } as const;
const S = 1080 / ART.w;
const TOP = (1620 - ART.h * S) / 2;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S + TOP;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);
const over = (bgLum: number, fgHex: string) => {
  const fgLum = relativeLuminance(parseHexColor(fgHex));
  return (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
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
    matches: 6,
  }));
}

function render(
  n: number,
  subtitle = "AFTER MATCH 6",
  matchCount = 6,
  rows = standings(n),
): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMWC 2022",
      subtitle,
      organizer: null,
      standings: rows,
      matchCount,
    }),
  );
}

describe("pmwc-blue registration + user-supplied art", () => {
  it("is art-backed and selectable for standings only", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMWC Blue");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("ships the true-PNG blank board — magic bytes + exact 1027×1531 IHDR", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmwc-blue/overall.png");
    const bytes = readFileSync("public/templates/pmwc-blue/overall.png");
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
    // Uniform fit + canvasBackground for the letterbox; never a distortion.
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.left).toBe(0);
    expect(fit.width / ART.w).toBeCloseTo(fit.height / ART.h, 10);
    expect(fit.height).toBeCloseTo(ART.h * S, 6);
    expect(fit.top).toBeCloseTo(TOP, 6);
    expect(fit.top).toBeGreaterThan(0);
    expect(CONFIG.canvasBackground).toBe("#1B1458");
  });

  it("keeps the JPEG reference as evidence only — never a registered background", () => {
    const ref = readFileSync("public/templates/pmwc-blue/refrence.jpeg");
    expect(ref.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // JPEG, not re-encoded
    for (const bg of Object.values(CONFIG.backgrounds)) {
      if (bg.type !== "image") continue;
      expect(bg.src).not.toMatch(/refrence|reference/i);
    }
  });

  it("falls back to a pale gradient with dark ink for the artless variants", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#E6FBFF");
    expect(css).toContain("#ADC3EC");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(7);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
    // Fallback headers use DARK ink on that pale gradient (the pale #E6FBFF
    // standings digit ink would be invisible there), with non-overlapping boxes.
    expect(CONFIG.header.subtitleColor).toBe("#0F172A");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.header.subtitleColor!), css)).toBeGreaterThanOrEqual(7);
    const titleSize = Number(/(\d+(?:\.\d+)?)px/.exec(CONFIG.header.titleFont)?.[1]);
    expect(CONFIG.header.title.y! + titleSize).toBeLessThan(CONFIG.header.subtitle.y!);
    expect(CONFIG.header.titleFont.startsWith("800 ")).toBe(true);
    expect(CONFIG.header.subtitleFont.startsWith("800 ")).toBe(true);
  });
});

describe("pmwc-blue 12+12 painted-bar geometry", () => {
  it("splits 24 → [12,12] and drops no team at 4 / 16 / 25", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
    }
    for (const [n, expected] of [
      [24, [12, 12]],
      [16, [12, 4]],
      [4, [4, 0]],
      [25, [12, 13]],
    ] as const) {
      const [left, right] = splitRowsAt(n, 12);
      expect([left, right]).toEqual([...expected]);
      expect(left + right).toBe(n); // zero dropped
    }
    // The art bakes RANK #1–#12 left / #13–#24 right, so 16 teams must fill
    // 12 left + 4 right: an 8+8 fill would put rank 9 on the painted #13 tab.
    // The remaining right-column bars stay blank (never painted over).
  });

  it("centres rows #1/#12/#13/#24 on the painted bar midlines", () => {
    expect(ST.rowY0).toBe(482.2);
    expect(ST.rowPitch).toBe(68.45);
    expect(ST.rowHeight).toBe(57);
    expect(ST.rowHeight).toBeLessThanOrEqual(ST.rowPitch);
    near(ST.rowY0, cy(453), 1); // row-1 painted bar top (art 453)

    const textCenter = (row: number) => ST.rowY0 + row * ST.rowPitch + ST.rowHeight / 2;
    const [left, right] = ST.columns;
    expect(left.ranksBakedIn).toBe(true);
    expect(right.ranksBakedIn).toBe(true);
    // Baked bar centres: left art 481 (row 1) … 1197.5 (row 12); right art
    // 480.5 (row 13) … 1196.5 (row 24).
    for (const [row, painted] of [
      [0, cy(481)],
      [11, cy(1197.5)],
    ] as const) {
      expect(Math.abs(textCenter(row) - painted)).toBeLessThanOrEqual(1.5);
    }
    for (const [row, painted] of [
      [0, cy(480.5)],
      [11, cy(1196.5)],
    ] as const) {
      expect(Math.abs(textCenter(row) - painted)).toBeLessThanOrEqual(1.5);
    }
    // The last row still fits inside the painted table.
    expect(textCenter(11) + ST.rowHeight / 2).toBeLessThanOrEqual(cy(1225) + 2);
    near(ST.headerLabelsY, cy(410), 1); // baked label band top (art 410)
  });

  it("pins team slots / rank tabs / strips to the measured X bounds", () => {
    const [left, right] = ST.columns;
    near(left.rankX, cx(37), 1); // baked #1 tab art x37–89
    near(right.rankX, cx(525), 1); // baked #13 tab art x525–582
    near(left.teamX, cx(95), 1);
    near(right.teamX, cx(583), 1);
    expect(left.teamW).toBe(230);
    expect(right.teamW).toBe(235);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[0]!.x);
    near(left.stripX + left.stripW, cx(504), 1); // painted bar right edge
    near(right.stripX + right.stripW, cx(989), 1);
    expect(ST.logoPlate!).toBeLessThan(ST.rowHeight); // logo bounded in row
    expect(ST.logoNameGap!).toBeLessThan(left.teamW);
  });

  it("suppresses code labels/ranks and paints Exo 2 800 names + stats", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn)).toBe(true);
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
    expect(ST.nameFont.startsWith("800 24px ")).toBe(true);
    expect(ST.statFont.startsWith("800 26px ")).toBe(true);
    for (const font of [ST.nameFont, ST.statFont]) {
      expect(font).toContain('"Exo 2"');
      expect(font).toContain('"Rajdhani"');
    }
    expect(CONFIG.palette.text).toBe("#0F172A");
  });
});

describe("pmwc-blue three baked stat cells", () => {
  const LEFT_X = [335.8, 401.1, 470.6];
  const RIGHT_X = [852.4, 917.6, 981.6];
  const LEFT_INK = [cx(344.04), cx(406.14), cx(472.19)];
  const RIGHT_INK = [cx(835.26), cx(897.25), cx(958.19)];

  it("renders only PLACE PTS / ELIMS / TOTAL — no WWCD or MATCHES", () => {
    for (const col of ST.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["pp", "kp", "total"]);
    }
    expect(ST.statBoxW).toBe(52);
    // The engine's other stat keys never appear in this template's markup.
    expect(render(24)).not.toContain(">WWCD<");
    expect(render(24)).not.toContain(">MATCHES<");
  });

  it("centres each value box on the baked label ink without overlap", () => {
    for (const [col, xs, ink] of [
      [ST.columns[0], LEFT_X, LEFT_INK],
      [ST.columns[1], RIGHT_X, RIGHT_INK],
    ] as const) {
      expect(col.statColumns.map((c) => c.x)).toEqual([...xs]);
      xs.forEach((x, i) => {
        expect(x + ST.statBoxW! / 2).toBeCloseTo(ink[i]!, 1);
      });
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! + ST.statBoxW!);
      }
    }
  });
});

describe("pmwc-blue baked MATCH # digit slot", () => {
  const sub = CONFIG.variantHeaders?.standings?.subtitle;
  const SUP_SIZE = 66;

  it("bakes the title and the words MATCH # — never double-prints them", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(hideScrimNameFor(CONFIG, "announcement")).not.toBe(true);
    expect(CONFIG.variantHeaders?.standings?.organizer).toEqual({ x: -9999, y: -9999, w: 0 });
    expect(CONFIG.variantHeaders?.standings?.title).toEqual({ x: -9999, y: -9999, w: 0 });
    near(ST.headerLabelsY, cy(410), 1);
    // Baked headline ink: art x70–686 y245–333; baked MATCH # ink: art x722–903
    // y274–333. The blank digit slot starts after art x903 (canvas 949.6).
    expect(sub).toEqual({ x: 958, y: 298, w: 100, align: "left" });
    expect(sub!.x!).toBeGreaterThan(cx(903));
    expect(sub!.x!).toBeGreaterThan(cx(686)); // right of the baked title
    expect(sub!.x! + sub!.w!).toBeLessThanOrEqual(1080);
  });

  it("uses Exo 2 800 uppercase ink at 55% of the title size, baseline-aligned", () => {
    const standingsHeader = CONFIG.variantHeaders?.standings;
    expect(standingsHeader?.titleFont?.startsWith("800 120px ")).toBe(true);
    expect(CONFIG.header.titleTextTransform).toBe("uppercase");
    expect(standingsHeader?.subtitleFont?.startsWith(`800 ${SUP_SIZE}px `)).toBe(true);
    expect(standingsHeader?.subtitleFont).toContain(`800 ${SUP_SIZE}px`);
    expect(standingsHeader?.subtitleFont).toContain('"Exo 2"');
    expect(standingsHeader?.subtitleColor).toBe("#E6FBFF");
    expect(standingsHeader?.subtitleTextTransform).toBe("uppercase");
    expect(SUP_SIZE / 120).toBeCloseTo(0.55, 10);
    // Exo 2 800 at 66px / line-height 1 puts the baseline ≈0.88em below the
    // box top (browser ink bottom ~356); the baked MATCH # baseline is art
    // y333 → canvas 355.2 — within a pixel.
    expect(Math.abs(sub!.y! + SUP_SIZE * 0.88 - cy(333))).toBeLessThanOrEqual(1);
  });

  it("renders MATCH 1 and MATCH 6 at an identical slot, size and baseline", () => {
    const one = render(24, "AFTER MATCH 1", 1);
    const six = render(24, "AFTER MATCH 6", 6);
    const slot = "left:958px;top:298px;width:100px;text-align:left";
    for (const html of [one, six]) {
      expect(html).toContain(slot);
      expect(html).toContain("font:800 66px");
      expect(html).toContain("color:#E6FBFF");
      expect(html).toContain("text-transform:uppercase");
      expect(html).not.toContain("MATCH #"); // baked by the art
      expect(html).not.toContain("MATCH 1"); // the renderer paints digits only
      expect(html).not.toContain("PMWC 2022"); // baked headline
    }
    expect(one).toContain(">1<");
    expect(six).toContain(">6<");
    expect(one).not.toContain(">6<");
    expect(six).not.toContain(">1<"); // no stale digits from a previous match
    // Both calls produce the same header markup except for the digit itself.
    expect(one.replace(">1<", ">N<")).toBe(six.replace(">6<", ">N<"));
  });

  it("keeps the digits in the final state too", () => {
    const html = render(24, "FINAL RESULTS", 6);
    expect(html).toContain(">6<");
    expect(html).not.toContain("FINAL RESULTS");
  });
});

describe("pmwc-blue measured contrast", () => {
  // Mean per-pixel WCAG relative luminance over art rects (same algorithm as
  // graphics-contrast.test.ts): cyan row, white rows, purple title band and
  // the dark footer under the fixed watermark slot.
  const CYAN_BAR = 0.763993; // art(120,462,180,43)
  const WHITE_LEFT = 0.935578; // art(120,1180,180,40)
  const WHITE_RIGHT = 0.902963; // art(620,462,280,43)
  const PURPLE_TITLE = 0.02096; // art(930,250,80,80)
  const PURPLE_FOOTER = 0.026871; // canvas(760,1570,280,26)

  it("puts #0F172A on cyan AND white rows at ≥7:1", () => {
    const p = CONFIG.palette;
    expect(p.text).toBe("#0F172A");
    for (const surface of [CYAN_BAR, WHITE_LEFT, WHITE_RIGHT]) {
      expect(over(surface, p.text)).toBeGreaterThanOrEqual(7);
      expect(over(surface, p.textMuted)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("puts #E6FBFF title/digits on dark purple at ≥4.5:1", () => {
    const ink = CONFIG.variantHeaders?.standings?.subtitleColor ?? "#E6FBFF";
    expect(ink).toBe("#E6FBFF");
    expect(over(PURPLE_TITLE, ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHexColor("#E6FBFF"), parseHexColor("#1B1458"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the hardcoded #E0F7FF watermark legible on the purple footer", () => {
    expect(CONFIG.palette.watermarkColor).toBe("#E0F7FF");
    expect(over(PURPLE_FOOTER, CONFIG.palette.watermarkColor)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmwc-blue SSR at 4 / 16 / 24 teams and glyph torture", () => {
  it.each([4, 16, 24])("renders %i teams with no NaN / dropped row", (n) => {
    const html = render(n);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const left = Math.min(n, 12);
    expect((html.match(/font:800 24px[^"]*left:100px/g) ?? []).length).toBe(left);
    expect((html.match(/font:800 24px[^"]*left:613px/g) ?? []).length).toBe(n - left);
    for (const x of LEFT_STAT_X) expect(html).toContain(`left:${x}px`);
    if (n > 12) {
      for (const x of RIGHT_STAT_X) expect(html).toContain(`left:${x}px`);
    } else {
      for (const x of RIGHT_STAT_X) expect(html).not.toContain(`left:${x}px`);
    }
  });

  it("truncates long Arabic / CJK names inside the TEAM cell", () => {
    const torture = standings(24).map((row, i) =>
      i === 0
        ? { ...row, teamName: "فريق السلام 😀 長いチーム名 ≌ TRB HANNAH" }
        : row,
    );
    const html = render(24, "AFTER MATCH 6", 6, torture);
    expect(html).toContain("فريق السلام 😀 長いチーム名 ≌ TRB HANNAH");
    expect(html).toContain("white-space:nowrap");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("left:100px;width:230px");
    // line-height is set AFTER the font shorthand, so glyphs stay centred.
    const fontIdx = html.indexOf("font:800 24px");
    const lhIdx = html.indexOf("line-height:57px", fontIdx);
    expect(fontIdx).toBeGreaterThanOrEqual(0);
    expect(lhIdx).toBeGreaterThan(fontIdx);
    expect(lhIdx - fontIdx).toBeLessThan(400);
  });

  it("bounds a 34px logo plate inside the 57px text box", () => {
    const withLogo = standings(24).map((row, i) =>
      i === 12 ? { ...row, logoUrl: "data:image/png;base64,AAAA" } : row,
    );
    const html = render(24, "AFTER MATCH 6", 6, withLogo);
    const logoTop = ST.rowY0 + (ST.rowHeight - ST.logoPlate!) / 2;
    expect(html).toContain(`top:${logoTop}px;width:34px;height:34px`);
    expect(html).toContain(`left:613px;top:${logoTop}px;width:34px;height:34px`); // row #13
    // Name shifts +42 inside teamW and still ellipsizes with a logo.
    expect(html).toContain("left:655px;width:193px");
  });
});

describe("pmwc-blue GraphicCanvas", () => {
  it("scales the 1080×1620 stage via container queries with the uniform fit", () => {
    const html = renderToStaticMarkup(
      h(GraphicCanvas, { config: CONFIG, variant: "standings" }),
    );
    expect(html).toContain("aspect-ratio:1080 / 1620");
    expect(html).toContain("container-type:inline-size");
    expect(html).toContain("scale(calc(100cqw / 1080px))");
    expect(html).toContain("width:1080px;height:1620px");
    expect(html).toContain("left:0;top:4.995131450827671px;width:1080px;height:1610.0097370983447px");
    expect(html).toContain("background:#1B1458");
  });

  it("keeps the watermark text, slot and brand law hardcoded", () => {
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant }));
      expect(html).toContain("scrimlypro.com");
      expect(html).toContain("left:730px;top:1570px;width:280px;text-align:right");
      expect(html).toContain("color:#E0F7FF");
    }
  });
});
