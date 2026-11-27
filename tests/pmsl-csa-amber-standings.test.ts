import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hasArtForVariant,
  hideScrimNameFor,
  parseHexColor,
  relativeLuminance,
  selectableAestheticIds,
  splitRowsAt,
  type Rgb,
  type TemplateConfig,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmsl-csa-amber";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** Measured off the supplied art's IHDR: a TRUE 1696×2528 PNG (no JPEG
 *  payload). Uniform height fit S = 1620/2528, centred cover crop of 3.42px
 *  per side; canvasX = artX·S + LEFT, canvasY = artY·S. */
const ART = { w: 1696, h: 2528 } as const;
const S = 1620 / ART.h;
const LEFT = (1080 - ART.w * S) / 2;
const cx = (artX: number) => artX * S + LEFT;
const cy = (artY: number) => artY * S;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);

/** Baked white rank-ink centres, measured on the art file (row 1 … row 12). */
const RANK_INK_Y = [
  881.5, 976, 1068.5, 1158.5, 1253.5, 1346.5, 1439.5, 1533, 1626, 1719, 1812,
  1904.5,
] as const;
/** Painted stat-label ink centres (art px); WWCD = baked chicken icon. */
const STAT_INK_X_LEFT = [523.5, 609, 697, 783.5] as const;
const STAT_INK_X_RIGHT: readonly number[] = STAT_INK_X_LEFT.map((x) => x + 819);
/** Measured amber "MATCH #" ink bbox (art px): x636–1061, y598–655. */
const SUBTITLE_INK = { x0: 636, x1: 1061, y0: 598, y1: 655 } as const;

function standings(n: number, names?: string[], logoUrl: string | null = null): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: names?.[i] ?? `SQUAD ${i + 1}`,
    logoUrl: i === 0 ? logoUrl : null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
    matches: 12,
  }));
}

function render(n: number, matchCount = 1, names?: string[], logoUrl: string | null = null): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMSL CSA FINALS DAY 2", // must stay hidden — art bakes the title
      subtitle: `AFTER MATCH ${matchCount}`,
      organizer: null,
      standings: standings(n, names, logoUrl),
      matchCount,
    }),
  );
}

/** The subtitle slot is the only div positioned at the measured digits x. */
function subtitleSlot(html: string): { style: string; text: string } | null {
  const m = /<div style="([^"]*left:680px[^"]*)">([^<]*)<\/div>/.exec(html);
  return m ? { style: m[1]!, text: m[2]! } : null;
}

// --- Node-builtin PNG decode (same pipeline as tests/graphics-contrast.test.ts)
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePngToRgb(path: string): { w: number; h: number; px: Buffer } {
  const b = readFileSync(path);
  expect(b.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let pos = 8;
  let w = 0;
  let h = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("latin1", pos + 4, pos + 8);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      expect(data[12]).toBe(0); // non-interlaced
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  expect(bitDepth).toBe(8);
  expect(colorType).toBe(2); // true RGB PNG, never a JPEG-in-.png re-encode
  const ch = 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(w * h * 3);
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++]!;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch]! : 0;
      const up = prev[i]!;
      const c = i >= ch ? prev[i - ch]! : 0;
      const v = raw[p++]!;
      let recon: number;
      switch (filter) {
        case 0:
          recon = v;
          break;
        case 1:
          recon = (v + a) & 255;
          break;
        case 2:
          recon = (v + up) & 255;
          break;
        case 3:
          recon = (v + ((a + up) >> 1)) & 255;
          break;
        case 4:
          recon = (v + paeth(a, up, c)) & 255;
          break;
        default:
          throw new Error(`bad filter byte ${filter} on row ${y}`);
      }
      line[i] = recon;
    }
    for (let x = 0; x < w; x++) {
      px[(y * w + x) * 3] = line[x * ch]!;
      px[(y * w + x) * 3 + 1] = line[x * ch + 1]!;
      px[(y * w + x) * 3 + 2] = line[x * ch + 2]!;
    }
    prev.set(line);
  }
  return { w, h, px };
}

function meanLuminance(
  px: Buffer,
  artW: number,
  rect: { x: number; y: number; w: number; h: number },
): number {
  let sum = 0;
  let n = 0;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const rgb: Rgb = {
        r: px[(y * artW + x) * 3]!,
        g: px[(y * artW + x) * 3 + 1]!,
        b: px[(y * artW + x) * 3 + 2]!,
      };
      sum += relativeLuminance(rgb);
      n += 1;
    }
  }
  return sum / n;
}

describe("pmsl-csa-amber registration + assets", () => {
  it("is art-backed and selectable for standings only", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(CONFIG.id).toBe(ID);
    expect(CONFIG.name).toBe("PMSL CSA Amber");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
  });

  it("ships the true-PNG art at the documented path, uniformly fitted", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmsl-csa-amber/standings.png");
    const bytes = readFileSync("public/templates/pmsl-csa-amber/standings.png");
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.height).toBe(1620);
    expect(fit.width).toBeCloseTo(ART.w * S, 6);
    expect(fit.left).toBeCloseTo(LEFT, 6);
    expect(fit.top).toBe(0);
    expect(fit.width / ART.w).toBeCloseTo(fit.height / ART.h, 8); // no distortion
    // 3.42px cover crop per side; no top/bottom letterbox to expose the canvas fill.
    expect(fit.left).toBeLessThan(0);
    expect(fit.left + fit.width).toBeCloseTo(1080 - fit.left, 6);
    expect(CONFIG.canvasBackground).toBe("#000000");
  });

  it("keeps the calibration reference (a JPEG) unregistered as a background", () => {
    const ref = readFileSync("public/templates/pmsl-csa-amber/reference.jpeg");
    expect(ref[0]).toBe(0xff);
    expect(ref[1]).toBe(0xd8);
    expect(ref[2]).toBe(0xff);
    expect(JSON.stringify(CONFIG.backgrounds)).not.toContain("reference");
  });

  it("bakes the title, labels and ranks — only stats and match digits are rendered", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(CONFIG.subtitleBakedIn?.standings).toBe(true);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).toBe(false);
    expect(CONFIG.variantHeaders?.standings?.title?.x).toBe(-9999);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn === true)).toBe(true);
    expect(ST.headerLabelsY).toBe(497);
    const html = render(24);
    expect(html).not.toContain("PMSL CSA FINALS DAY 2"); // title is baked in art
    expect(html).not.toContain(">MATCHES<"); // no MATCH NO. column, labels baked
    expect(html).not.toContain(">WWCD<");
  });

  it("uses Exo 2 800 white team/stat ink and hardcoded watermark geometry", () => {
    expect(ST.nameFont).toBe(`800 24px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif`);
    expect(ST.statFont).toBe(`800 26px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif`);
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.watermarkColor).toBe("#FFFFFF");
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
    const canvas = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(canvas).toContain("x: 730, y: 1570");
    expect(canvas).toContain("color: config.palette.watermarkColor");
    expect(canvas).not.toContain("pmsl-csa-amber");
  });

  it("exports exactly 1080×1620 through the hardened exporter", () => {
    const exp = readFileSync("components/graphics/export.ts", "utf8");
    expect(exp).toContain("const EXPORT_W = 1080");
    expect(exp).toContain("const EXPORT_H = 1620");
    expect(exp).toContain("width: EXPORT_W");
    expect(exp).toContain("height: EXPORT_H");
    expect(exp).toContain("await document.fonts.ready");
    expect(exp).toContain("toPng(stage, options); // warm-up, discarded");
  });
});

describe("pmsl-csa-amber 2×12 painted-bar geometry", () => {
  it("pins 24 → [12,12], 16 → [12,4], 4 → [4,0] with no dropped rows", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
    }
    // Baked ranks #1..#12 (left) and #13..#24 (right) force a left-first fill.
    // A 16-team session therefore paints ranks 1–16, leaving baked rows 17–24
    // blank — NOT an 8+8 split (which would desync every right-column rank).
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // A 25th team renders below the baked table on bright sand (accepted edge,
    // identical to the other baked-rank arts): never dropped, but out of the
    // 24 painted bars this art was measured for.
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });

  it("seats the text-box centre on the painted bar centre at rows 1/12/13/24", () => {
    near(ST.rowY0, cy(841)); // bar 1 painted top
    near(ST.rowPitch, cy(93) - cy(0), 0.1); // 93 art px
    near(ST.rowHeight, cy(82) - cy(0), 0.1); // 82 art px interior
    expect(ST.rowY0).toBe(538.93);
    expect(ST.rowPitch).toBe(59.6);
    expect(ST.rowHeight).toBe(52.5);
    expect(ST.rowHeight).toBeLessThanOrEqual(ST.rowPitch);
    for (const [label, rowIndex, rankIndex] of [
      ["row 1 (left)", 0, 0],
      ["row 12 (left)", 11, 11],
      ["row 13 (right)", 0, 0],
      ["row 24 (right)", 11, 11],
    ] as const) {
      const textCenter = ST.rowY0 + rowIndex * ST.rowPitch + ST.rowHeight / 2;
      const paintedCenter = cy(RANK_INK_Y[rankIndex]!);
      expect(Math.abs(textCenter - paintedCenter), label).toBeLessThanOrEqual(1);
    }
    // Last painted bar bottom (art 1945) still clears the row-12 text box.
    expect(ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight).toBeLessThan(cy(1946));
  });

  it("pins rank/team cells inside their painted halves", () => {
    const [left, right] = ST.columns;
    near(left.rankX, cx(60));
    near(right.rankX, cx(891));
    near(left.teamX, cx(167));
    near(right.teamX, cx(999));
    expect(left.teamX).toBe(104);
    expect(right.teamX).toBe(637);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[0]!.x);
    expect(ST.logoPlate).toBeLessThan(ST.rowHeight);
  });

  it("centres every stat value in its baked label column on both tables", () => {
    expect(ST.statBoxW).toBe(44);
    const expectedKeys = ["wwcd", "pp", "kp", "total"]; // no MATCHES column
    for (const [col, inkXs] of [
      [ST.columns[0], STAT_INK_X_LEFT],
      [ST.columns[1], STAT_INK_X_RIGHT],
    ] as const) {
      expect(col.statColumns.map((c) => c.key)).toEqual(expectedKeys);
      for (let i = 1; i < col.statColumns.length; i++) {
        expect(col.statColumns[i]!.x).toBeGreaterThanOrEqual(col.statColumns[i - 1]!.x + ST.statBoxW!);
      }
      col.statColumns.forEach((stat, i) => {
        const boxCenter = stat.x + ST.statBoxW! / 2;
        expect(Math.abs(boxCenter - cx(inkXs[i]!))).toBeLessThanOrEqual(1);
      });
    }
    expect(ST.columns[0]!.statColumns.map((c) => c.x)).toEqual([310, 365, 421, 477]);
    expect(ST.columns[1]!.statColumns.map((c) => c.x)).toEqual([835, 890, 946, 1001]);
  });
});

describe("pmsl-csa-amber dynamic MATCH {n} subtitle", () => {
  it("centres MATCH 1 and MATCH 10 in the same measured amber slot", () => {
    expect(CONFIG.variantHeaders?.standings?.subtitle).toEqual({
      x: 680,
      y: 377.5,
      w: 72,
      align: "center",
    });
    const slot = CONFIG.variantHeaders?.standings;
    expect(slot?.subtitleFont).toBe(`900 48px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif`);
    expect(slot?.subtitleColor).toBe("#C26700");
    // Measured amber ink bbox → vertical midline; a 48px line box centred
    // there starts at y377.5, so digits land exactly on cy(626.5).
    expect(slot!.subtitle!.y! + 48 / 2).toBeCloseTo(cy((SUBTITLE_INK.y0 + SUBTITLE_INK.y1) / 2), 1);
    // Digits sit in the clear sky to the right of the baked "#" ink.
    expect(slot!.subtitle!.x!).toBeGreaterThan(cx(SUBTITLE_INK.x1));
    expect(slot!.subtitle!.x! + slot!.subtitle!.w! / 2 - 25).toBeGreaterThan(cx(SUBTITLE_INK.x1));

    for (const n of [1, 10]) {
      const html = render(24, n);
      const painted = subtitleSlot(html);
      expect(painted).not.toBeNull();
      expect(painted!.text).toBe(String(n));
      expect(painted!.style).toContain("left:680px");
      expect(painted!.style).toContain("top:377.5px");
      expect(painted!.style).toContain("width:72px");
      expect(painted!.style).toContain("text-align:center");
      expect(painted!.style).toContain("color:#C26700");
      expect(painted!.style).toMatch(/font:900 48px[^"]*line-height:1/);
      expect(html).not.toContain("NaN");
    }
    const one = subtitleSlot(render(24, 1))!;
    const ten = subtitleSlot(render(24, 10))!;
    expect(one.style).toBe(ten.style); // zero horizontal / vertical drift
  });

  it("falls back to digit parsing when no explicit matchCount is threaded", () => {
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: ID,
        title: "x",
        subtitle: "AFTER MATCH 6",
        standings: standings(4),
      }),
    );
    expect(subtitleSlot(html)?.text).toBe("6");
  });
});

describe("pmsl-csa-amber SSR at 4 / 16 / 24 teams + glyph torture", () => {
  it.each([4, 16, 24])("renders %i teams on the fixed 12+12 slots", (n) => {
    const html = render(n);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const left = Math.min(n, 12);
    expect((html.match(/font:800 24px[^"]*left:104px/g) ?? []).length).toBe(left);
    expect((html.match(/font:800 24px[^"]*left:637px/g) ?? []).length).toBe(n - left);
    const statXs = n > 12 ? [310, 365, 421, 477, 835, 890, 946, 1001] : [310, 365, 421, 477];
    for (const x of statXs) {
      expect(html).toContain(`left:${x}px`);
    }
  });

  it("truncates long Arabic / CJK names inside the TEAM cell", () => {
    const names = [
      "أحمد حسیب ن IMG RESERVE CS LONG", // Arabic + Latin overflow
      "卍lhp 『NＣＴ』 ハナン SUPER LONG TEAM NAME", // CJK / katakana / fullwidth
      ...Array.from({ length: 22 }, (_, i) => `SQUAD ${i + 3}`),
    ];
    const html = render(24, 1, names);
    expect(html).toContain(names[0]!);
    expect(html).toContain(names[1]!);
    expect(html).toMatch(/font:800 24px[^"]*left:104px[^"]*width:204px/);
    expect(html).toMatch(/font:800 24px[^"]*left:637px[^"]*width:194px/);
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("overflow:hidden");
    expect(html).toContain("white-space:nowrap");
  });

  it("bounds the logo plate inside the painted row and shifts the name", () => {
    const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=";
    const html = render(4, 1, undefined, logo);
    const plate = ST.logoPlate ?? 44;
    expect(plate).toBe(32);
    expect(ST.logoNameGap).toBe(36);
    expect(html).toContain("left:104px"); // plate + row strip
    expect(html).toContain("width:32px");
    expect(html).toContain("height:32px");
    expect(html).toMatch(/left:140px[^"]*width:168px/); // 104 + 36, 204 − 36
    const plateTop = ST.rowY0 + (ST.rowHeight - plate) / 2;
    expect(plateTop).toBeGreaterThan(ST.rowY0);
    expect(plateTop + plate).toBeLessThan(ST.rowY0 + ST.rowHeight);
    expect(html).toContain(`top:${plateTop}px`);
  });
});

describe("pmsl-csa-amber measured contrast from the live art", () => {
  const { px } = decodePngToRgb("public/templates/pmsl-csa-amber/standings.png");
  const ratioOver = (bgLum: number, fgHex: string) =>
    (Math.max(bgLum, relativeLuminance(parseHexColor(fgHex))) + 0.05) /
    (Math.min(bgLum, relativeLuminance(parseHexColor(fgHex))) + 0.05);

  it("white team/stat ink clears 7:1 on every painted bronze row", () => {
    const textLum = relativeLuminance(parseHexColor(CONFIG.palette.text));
    for (let i = 0; i < 12; i++) {
      const y = 841 + i * 93;
      // Text zones only: team ink x155–495, stat ink x573–820; both clear of
      // the baked white rank numerals and the gold separator lines.
      const team = meanLuminance(px, ART.w, { x: 155, y, w: 340, h: 82 });
      const stats = meanLuminance(px, ART.w, { x: 573, y, w: 247, h: 82 });
      for (const [label, zone] of [["team", team], ["stats", stats]] as const) {
        expect((textLum + 0.05) / (zone + 0.05), `row ${i + 1} ${label}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("pins #C26700 against the measured sky slot (brand ink, ~2.3:1)", () => {
    // Measured over art x1070..1150, y598..655 — the clear sky immediately
    // right of the baked "#". The brief asks ≥4.5:1, but the supplied art's
    // bright sky makes that impossible for the mandated #C26700; pinning the
    // real ratio keeps the deviation visible instead of faking a pass.
    const sky = meanLuminance(px, ART.w, { x: 1070, y: 598, w: 80, h: 57 });
    expect(ratioOver(sky, "#C26700")).toBeGreaterThanOrEqual(2.3);
    expect(ratioOver(sky, "#C26700")).toBeLessThan(4.5);
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#C26700");
  });

  it("keeps the white watermark at ≥7:1 on the baked black footer", () => {
    const footer = meanLuminance(px, ART.w, { x: 1144, y: 2442, w: 442, h: 39 });
    expect(ratioOver(footer, CONFIG.palette.watermarkColor)).toBeGreaterThanOrEqual(7);
  });

  it("keeps white ink ≥4.5:1 on every artless gradient fallback stop", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      const bg = CONFIG.backgrounds[variant];
      if (bg.type !== "gradient") throw new Error(`${variant} must be a gradient`);
      for (const hex of bg.css.match(/#[0-9a-fA-F]{6}/g) ?? []) {
        expect(contrastRatio(parseHexColor(CONFIG.palette.text), parseHexColor(hex))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });
});
