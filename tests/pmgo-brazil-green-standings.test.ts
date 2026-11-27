import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  getTemplate,
  hasArtForVariant,
  hideScrimNameFor,
  parseHexColor,
  relativeLuminance,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
  type Rgb,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmgo-brazil-green";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** The supplied art is a TRUE 1024×1536 PNG (exact 2:3). Every canvas
 *  coordinate below is measured from those pixels at scale 1080/1024. */
const ART = { w: 1024, h: 1536 } as const;
const S = 1080 / ART.w;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S;
const near = (canvasPx: number, expected: number, tol = 1) =>
  expect(Math.abs(canvasPx - expected)).toBeLessThanOrEqual(tol);

/** Measured painted row-bar bounds (art px), left AND right columns share them. */
const ROW_TOPS = [413, 477, 541, 606, 670, 734, 799, 863, 927, 991, 1056, 1120] as const;
const ROW_BOTTOMS = [466, 530, 595, 659, 723, 788, 852, 916, 980, 1045, 1109, 1173] as const;

/** Measured badge fill / baked "#" ink (art px). */
const BADGE = {
  x0: cx(376),
  x1: cx(648),
  y0: cy(252),
  y1: cy(322),
  centerY: cy(287),
  hashInkEnd: cx(607),
} as const;

function standings(n: number, names?: string[]): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: names?.[i] ?? `SQUAD ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
    matches: 12,
  }));
}

function render(
  n: number,
  opts: { matchCount?: number; subtitle?: string; names?: string[]; logoUrl?: string } = {},
): string {
  const rows = standings(n, opts.names);
  if (opts.logoUrl && rows[0]) rows[0].logoUrl = opts.logoUrl;
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "OVERALL RANKINGS",
      subtitle: opts.subtitle ?? "AFTER MATCH 1",
      organizer: null,
      standings: rows,
      matchCount: opts.matchCount ?? 1,
    }),
  );
}

// --- Live PNG decode (node builtins only), matching graphics-contrast.test.ts.
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(path: string): { w: number; h: number; px: Buffer } {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error(`${path}: not a PNG`);
  }
  let pos = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("latin1", pos + 4, pos + 8);
    if (type === "IHDR") {
      w = b.readUInt32BE(pos + 8);
      h = b.readUInt32BE(pos + 12);
      if (b[pos + 16] !== 8 || b[pos + 17] !== 2) throw new Error("expected 8-bit RGB PNG");
      if (b[pos + 20] !== 0) throw new Error("interlaced PNG unsupported");
    } else if (type === "IDAT") {
      idat.push(Buffer.from(b.subarray(pos + 8, pos + 8 + len)));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 3;
  const px = Buffer.alloc(w * h * 3);
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? line[i - 3] : 0;
      const bb = prev[i];
      const c = i >= 3 ? prev[i - 3] : 0;
      const v = raw[p++];
      let recon: number;
      switch (filter) {
        case 0:
          recon = v;
          break;
        case 1:
          recon = (v + a) & 255;
          break;
        case 2:
          recon = (v + bb) & 255;
          break;
        case 3:
          recon = (v + ((a + bb) >> 1)) & 255;
          break;
        case 4:
          recon = (v + paeth(a, bb, c)) & 255;
          break;
        default:
          throw new Error(`bad PNG filter ${filter}`);
      }
      line[i] = recon;
    }
    line.copy(px, y * stride);
    prev.set(line);
  }
  return { w, h, px };
}

function meanLuminance(px: Buffer, artW: number, rect: { x: number; y: number; w: number; h: number }): number {
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

function over(bgLum: number, fg: string): number {
  const fgLum = relativeLuminance(parseHexColor(fg));
  return (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
}

describe("pmgo-brazil-green registration + real art", () => {
  it("is registered, art-backed for standings only, and selectable", () => {
    expect(AESTHETICS[ID]).toBe(CONFIG);
    expect(AESTHETIC_IDS).toContain(ID);
    expect(CONFIG.name).toBe("PMGO Brazil Green");
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("points standings at the supplied true-PNG art (magic bytes sniffed, no re-encode)", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmgo-brazil-green/overall.png");
    const bytes = readFileSync("public/templates/pmgo-brazil-green/overall.png");
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
  });

  it("never registers the supplied reference image as a background", () => {
    expect(() => readFileSync("public/templates/pmgo-brazil-green/refrence.jpeg")).not.toThrow();
    for (const bg of Object.values(CONFIG.backgrounds)) {
      if (bg.type === "image") expect(bg.src).not.toMatch(/refrence|reference/i);
    }
  });

  it("fits the non-1080 art uniformly and keeps the exact 1080×1620 canvas", () => {
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    const bg = CONFIG.backgrounds.standings;
    if (bg.type !== "image" || !bg.fit) throw new Error("uniform fit required");
    expect(bg.fit).toEqual({ width: 1080, height: 1620, left: 0, top: 0 });
    expect(bg.fit.width / ART.w).toBeCloseTo(bg.fit.height / ART.h, 8); // no distortion
    expect(CONFIG.canvasBackground).toBe("#000000");
  });
});

describe("pmgo-brazil-green 2×12 painted-bar geometry (canvas px)", () => {
  it("fixes 12 rows per column and splits 24 → [12,12] with zero dropped rows", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(CONFIG.labelsBakedIn).toBe(true);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? ST.ranksBakedIn).toBe(true);
    }
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]); // overflow renders below the table, never dropped
  });

  it("keeps rowHeight ≤ rowPitch and seats rows #1/#12/#13/#24 on the painted centres", () => {
    expect(ST.rowHeight).toBeLessThanOrEqual(ST.rowPitch);
    expect(ST.rowY0).toBeCloseTo(cy((ROW_TOPS[0]! + ROW_BOTTOMS[0]!) / 2) - ST.rowHeight / 2, 2);
    expect(ST.rowPitch).toBeCloseTo(
      ((cy((ROW_TOPS[11]! + ROW_BOTTOMS[11]!) / 2) - cy((ROW_TOPS[0]! + ROW_BOTTOMS[0]!) / 2)) / 11),
      3,
    );
    for (const [rank, rowIdx] of [
      [1, 0],
      [12, 11],
      [13, 0],
      [24, 11],
    ] as const) {
      const top = ST.rowY0 + rowIdx * ST.rowPitch;
      const textCenter = top + ST.rowHeight / 2;
      const paintedTop = cy(ROW_TOPS[rowIdx]!);
      const paintedBottom = cy(ROW_BOTTOMS[rowIdx]!);
      near(textCenter, (paintedTop + paintedBottom) / 2, 1);
      expect(top).toBeGreaterThanOrEqual(paintedTop - 1);
      expect(top + ST.rowHeight).toBeLessThanOrEqual(paintedBottom + 1);
      void rank; // rank is the human-readable pin (left col = 1–12, right = 13–24)
    }
  });

  it("pins both rank squares / team cells to the measured X bounds", () => {
    const [left, right] = ST.columns;
    near(left.rankX, cx(35), 1);
    near(right.rankX, cx(518), 1);
    near(left.teamX, cx(82) + 2, 1);
    near(right.teamX, cx(566) + 1, 1);
    expect(left.teamX + left.teamW).toBeLessThan(cx(256)); // WWCD cell starts art 256
    expect(right.teamX + right.teamW).toBeLessThan(cx(739));
    expect(left.teamX + left.teamW - right.teamX).toBeCloseTo(-332, 0);
    expect(ST.logoPlate!).toBeLessThanOrEqual(ST.rowHeight);
  });
});

describe("pmgo-brazil-green baked stat cells", () => {
  const LEFT_CENTERS = [303.22, 371.78, 439.8, 503.61]; // art 287/351/415/477.5 × S
  const RIGHT_CENTERS = [812.64, 880.66, 949.75, 1013.03]; // art 770/834/898/961 × S
  const EXPECTED_X = [
    [279.2, 347.8, 415.8, 479.6],
    [788.6, 856.7, 925.75, 989],
  ] as const;

  it("orders WWCD → PLACE PTS. → ELIMS → TOTAL on both tables (no MATCHES column)", () => {
    const expected = ["wwcd", "pp", "kp", "total"];
    for (const col of ST.columns) expect(col.statColumns.map((c) => c.key)).toEqual(expected);
    expect(ST.statBoxW).toBe(48);
  });

  it("centres every value box on its measured header-ink divider", () => {
    for (const [col, xs, centers] of [
      [ST.columns[0], EXPECTED_X[0], LEFT_CENTERS],
      [ST.columns[1], EXPECTED_X[1], RIGHT_CENTERS],
    ] as const) {
      expect(col.statColumns.map((c) => c.x)).toEqual([...xs]);
      xs.forEach((x, i) => {
        near(x + ST.statBoxW! / 2, centers[i]!, 1);
        if (i > 0) expect(x).toBeGreaterThanOrEqual(xs[i - 1]! + ST.statBoxW!);
      });
    }
  });

  it("uses Exo 2 800 near-black data ink with no synthetic stripes", () => {
    expect(ST.nameFont.startsWith("800 22px ")).toBe(true);
    expect(ST.statFont.startsWith("800 24px ")).toBe(true);
    expect(ST.nameFont).toContain('"Exo 2"');
    expect(ST.statFont).toContain('"Exo 2"');
    expect(CONFIG.palette.text).toBe("#0B0F1A");
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
    expect(ST.headerLabelsY).toBe(366);
  });
});

describe("pmgo-brazil-green MATCH {n} badge digits", () => {
  it("paints digits only, in uppercase Exo 2 900 black ink, inside the measured badge", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(CONFIG.subtitleBakedIn?.standings).toBe(true);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    const header = CONFIG.header;
    expect(header.subtitleFont.startsWith("900 36px ")).toBe(true);
    expect(header.subtitleFont).toContain('"Exo 2"');
    expect(header.subtitleColor).toBe("#000000");
    expect(header.subtitleTextTransform).toBe("uppercase");
    const slot = header.subtitle;
    expect(slot.align).toBe("center");
    expect(slot.x).toBeGreaterThanOrEqual(BADGE.hashInkEnd); // right of the baked "#"
    expect(slot.x + slot.w!).toBeLessThanOrEqual(BADGE.x1); // inside the badge's right edge
    expect(slot.y).toBeGreaterThanOrEqual(BADGE.y0);
    expect(slot.y + 36).toBeLessThanOrEqual(BADGE.y1); // no vertical clipping
    near(slot.y + 36 / 2, BADGE.centerY, 1); // line-box dead-centre on the badge
    near(slot.x + slot.w! / 2, (BADGE.hashInkEnd + BADGE.x1) / 2, 2);
  });

  // Advances parsed from exo-2-latin-900-normal.woff (unitsPerEm 1000):
  // '1' = 466/1000 em → 16.78px, '0' = 658/1000 em → 23.69px at 36px.
  it.each([
    { count: 1, advance: 16.8 },
    { count: 10, advance: 40.5 },
  ])("keeps MATCH $count clear of both badge edges", ({ count, advance }) => {
    const html = render(24, { matchCount: count, subtitle: `AFTER MATCH ${count}` });
    expect(html).toContain(`>${count}<`);
    expect(html).not.toContain(">MATCH "); // the words stay baked in the art
    expect(html).not.toContain(">OVERALL RANKINGS<"); // title stays baked
    expect(html).toContain("left:640.2px");
    expect(html).toContain("top:284.7px");
    expect(html).toContain("width:43px");
    expect(html).toContain("text-align:center");
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("color:#000000");
    expect(advance).toBeLessThanOrEqual(CONFIG.header.subtitle.w!);
    const slot = CONFIG.header.subtitle;
    const inkLeft = slot.x + (slot.w! - advance) / 2;
    expect(inkLeft).toBeGreaterThanOrEqual(BADGE.hashInkEnd);
    expect(inkLeft + advance).toBeLessThanOrEqual(BADGE.x1);
  });
});

describe("pmgo-brazil-green SSR at 4 / 16 / 24 teams", () => {
  it.each([
    { n: 4, left: 4, right: 0 },
    { n: 16, left: 12, right: 4 },
    { n: 24, left: 12, right: 12 },
  ])("renders $n teams as $left left + $right right with no drops", ({ n, left, right }) => {
    const html = render(n);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const leftCells = html.match(/font:800 22px[^"]*left:88px/g) ?? [];
    const rightCells = html.match(/font:800 22px[^"]*left:598px/g) ?? [];
    expect(leftCells).toHaveLength(left);
    expect(rightCells).toHaveLength(right);
    for (const x of [279.2, 347.8, 415.8, 479.6]) expect(html).toContain(`left:${x}px`);
    for (const x of [788.6, 856.7, 925.75, 989]) {
      expect(html.includes(`left:${x}px`)).toBe(right > 0);
    }
    // A 16-team session leaves the art's remaining eight right-column bars
    // blank: no right-column row box is painted below its 4th slot.
    const rightTops = [...html.matchAll(/left:598px;top:([\d.]+)px/g)].map((m) => Number(m[1]));
    if (right === 0) expect(rightTops).toHaveLength(0);
    else expect(Math.max(...rightTops)).toBeCloseTo(ST.rowY0 + (right - 1) * ST.rowPitch, 3);
  });

  it("truncates long Arabic / CJK names inside the TEAM cell", () => {
    const names = ["أحمد حسیب المقاتل الشجاع", "卍lhp ك CYPHER 乡 NOVA", ...standings(22).map((r) => r.teamName)];
    const html = render(24, { names });
    expect(html).toContain("أحمد حسیب المقاتل الشجاع");
    expect(html).toContain("卍lhp ك CYPHER 乡 NOVA");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("overflow:hidden");
    expect(html).toContain("width:178px");
    // Name cells (not the row strips) carry overflow + ellipsis + left:88/598.
    expect((html.match(/text-overflow:ellipsis;left:(?:88|598)px;width:178px/g) ?? []).length).toBe(24);
  });

  it("bounds the optional logo plate inside its painted row", () => {
    const html = render(4, { logoUrl: "data:image/png;base64,iVBORw0KGgo=" });
    const plateTop = ST.rowY0 + (ST.rowHeight - ST.logoPlate!) / 2;
    expect(html).toContain(`top:${plateTop}px`);
    expect(html).toContain("width:34px");
    expect(html).toContain("height:34px");
    expect(html).toContain("width:24px"); // logo ink = plate − 10px inset
    expect(html).toContain("height:24px");
    expect(html).toContain("left:88px");
    expect(html).toContain("left:126px"); // name shifts by logoNameGap 38
    expect(plateTop).toBeGreaterThanOrEqual(ST.rowY0);
    expect(plateTop + ST.logoPlate!).toBeLessThanOrEqual(ST.rowY0 + ST.rowHeight);
  });
});

describe("pmgo-brazil-green measured contrast", () => {
  const { w: artW, px } = decodePng("public/templates/pmgo-brazil-green/overall.png");

  it("reads #0B0F1A ≥ 7:1 on the white row and the lime rank-1 badge", () => {
    const zone = (x: number, y: number, width: number, height: number) =>
      meanLuminance(px, artW, { x, y, w: width, h: height });
    const whiteBar = zone(100, 420, 140, 14); // art px, inside blank row-1 bar
    const limeRankOne = zone(38, 422, 38, 30); // art px, yellow #1 square fill
    expect(whiteBar).toBeGreaterThan(0.8);
    expect(over(whiteBar, CONFIG.palette.text)).toBeGreaterThanOrEqual(7);
    expect(over(limeRankOne, CONFIG.palette.text)).toBeGreaterThanOrEqual(7);
  });

  it("reads black MATCH digits ≥ 7:1 on the measured badge fill", () => {
    const badgeFill = meanLuminance(px, artW, { x: 613, y: 262, w: 32, h: 55 });
    expect(badgeFill).toBeGreaterThan(0.5);
    expect(over(badgeFill, "#000000")).toBeGreaterThanOrEqual(7);
  });

  it("keeps the lime watermark legible on the art's dark footer", () => {
    const footer = meanLuminance(px, artW, { x: 760, y: 1445, w: 240, h: 30 });
    expect(footer).toBeLessThan(0.2);
    expect(over(footer, CONFIG.palette.watermarkColor)).toBeGreaterThanOrEqual(4.5);
    expect(CONFIG.palette.watermarkColor).toBe("#D6F836");
  });

  it("keeps the light fallback ink ≥ 4.5:1 on every gradient stop", () => {
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#D6F836");
    for (const ink of [CONFIG.palette.text, CONFIG.palette.textMuted]) {
      for (const stop of (css.match(/#[0-9a-fA-F]{6}/g) ?? [])) {
        expect(over(relativeLuminance(parseHexColor(stop)), ink)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
