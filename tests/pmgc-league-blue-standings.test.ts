import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  contrastRatio,
  getTemplate,
  hideScrimNameFor,
  minContrastAgainstStops,
  parseHexColor,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmgc-league-blue";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** Art on disk: real PNG, 1024×1536 (exactly 2:3). Uniform full-canvas fit
 *  S = 1080/1024 = 1.0546875, no crop. Every number below was measured from
 *  those pixels (canvas = art × S) per MASTER-PROMPT-graphic-alignment.md. */
const ART = { w: 1024, h: 1536 } as const;
const S = 1080 / ART.w;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S;
const near = (canvasPx: number, artPx: number, tol = 0.75) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);

/** Measured painted geometry (art px): 12 white card interiors per side. */
const CARD_TOPS = [445, 502, 561, 621, 681, 740, 800, 861, 921, 981, 1041, 1101];
const CARD_BOTTOMS = [493, 552, 612, 672, 731, 791, 852, 912, 972, 1032, 1092, 1153];
/** Baked "MATCH #" white ink: art x438–586, y313–347 (canvas centre y348.05). */
const MATCH_INK = { x0: 438, x1: 586, y0: 313, y1: 347 } as const;
/** Measured baked label ink centres (canvas px); first RANK is the placement
 *  square, so the value columns start at ELIMS (kp) → RANK (pp) → MATCHES →
 *  TOTAL. Both sides were measured independently — the shift is not uniform. */
const LABEL_CENTERS = {
  left: { kp: 253.76, pp: 322.25, matches: 403.48, total: 486.25 },
  right: { kp: 770.55, pp: 837.97, matches: 917.77, total: 998.45 },
} as const;
/** Mean luminance sampled inside a painted white card / the blue digit field. */
const CARD_LUM = 0.9866;
const BLUE_LUM = 0.145;

function standings(n: number, names?: readonly string[], logoUrl: string | null = null): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: names?.[i] ?? `SQUAD ${i + 1}`,
    logoUrl,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
    matches: 12,
  }));
}

function render(
  n: number,
  matchCount = 12,
  names?: readonly string[],
  logoUrl: string | null = null,
): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "SHOULD NEVER RENDER",
      subtitle: `AFTER MATCH ${matchCount}`,
      organizer: null,
      standings: standings(n, names, logoUrl),
      matchCount,
    }),
  );
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const f = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratioOver = (bgLum: number, fg: string) =>
  (Math.max(bgLum, relativeLuminance(fg)) + 0.05) /
  (Math.min(bgLum, relativeLuminance(fg)) + 0.05);

describe("pmgc-league-blue registration + assets", () => {
  it("is art-backed and selectable for standings only", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMGC League Blue");
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("ships the real 1024×1536 PNG (not a JPEG payload in a .png name)", () => {
    const bytes = readFileSync(`public/templates/${ID}/overall.png`);
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
    expect(bytes[0]).not.toBe(0xff); // magic-byte sniff: never re-encode JPEG-in-png
  });

  it("fits the 2:3 art exactly onto the 1080×1620 canvas without distortion", () => {
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe(`/templates/${ID}/overall.png`);
    expect(bg.fit).toEqual({ width: 1080, height: 1620, left: 0, top: 0 });
    expect(ART.h * S).toBe(1620); // exact ratio, no crop/letterbox needed
  });

  it("never registers the supplied reference image as a background", () => {
    expect(() => readFileSync(`public/templates/${ID}/refrence.jpeg`)).not.toThrow();
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const bg = CONFIG.backgrounds[variant];
      if (bg.type === "image") expect(bg.src).not.toMatch(/refrence|reference/i);
    }
  });

  it("falls back to a royal-blue gradient for the artless MVP + announcement", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#1565D8");
    // White watermark + pale text stay legible on every gradient stop.
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.watermarkColor), css)).toBeGreaterThanOrEqual(4.5);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the watermark text/position hardcoded; only ink is configurable", () => {
    const source = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(source).toContain("{ x: 730, y: 1570, w: 280, align: \"right\" }");
    expect(source).toContain("color: config.palette.watermarkColor");
    expect(CONFIG.palette.watermarkColor).toBe("#FFFFFF");
    expect(ratioOver(0.145, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("exports exactly 1080×1620 with container-query scaling", () => {
    const exp = readFileSync("components/graphics/export.ts", "utf8");
    expect(exp).toContain("const EXPORT_W = 1080");
    expect(exp).toContain("const EXPORT_H = 1620");
    expect(exp).toContain("pixelRatio: 1");
    const canvas = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(canvas).toContain("scale(calc(100cqw / 1080px))");
  });
});

describe("pmgc-league-blue 12+12 painted-card geometry", () => {
  it("splits 24 teams [12,12] with fixed pitch and zero dropped rows", () => {
    expect(ST.columns).toHaveLength(2);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? ST.ranksBakedIn).toBe(true);
    }
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(12 + 12).toBe(24);
    expect(CARD_TOPS).toHaveLength(24 - 12);
  });

  it("pins the least-squares rowY0 / pitch / box height to ALL 12 card centres", () => {
    const centres = CARD_TOPS.map((top, i) => cy((top + CARD_BOTTOMS[i]!) / 2));
    const n = centres.length;
    const xb = (n - 1) / 2;
    const yb = centres.reduce((a, b) => a + b, 0) / n;
    const slope = centres.reduce((acc, y, i) => acc + (i - xb) * (y - yb), 0) /
      centres.reduce((acc, _y, i) => acc + (i - xb) ** 2, 0);
    const intercept = yb - slope * xb;
    expect(ST.rowPitch).toBeCloseTo(slope, 1);
    expect(ST.rowY0 + ST.rowHeight / 2).toBeCloseTo(intercept, 1);
    expect(ST.rowHeight).toBeLessThanOrEqual(ST.rowPitch);
    expect(ST.rowHeight).toBeCloseTo(cy(49), 2);
    expect(ST.rowY0).toBe(466.8);
    expect(ST.rowPitch).toBe(63.19);
    expect(ST.rowHeight).toBe(51.68);
  });

  it("seats rows 1 / 12 / 13 / 24 exactly on their painted card centres", () => {
    const paintedCentre = (i: number) => cy((CARD_TOPS[i]! + CARD_BOTTOMS[i]!) / 2);
    // rank → [rowIdx within its column, painted bar index]
    for (const [rank, row, bar] of [
      [1, 0, 0],   // left rank 1
      [12, 11, 11], // left rank 12
      [13, 0, 0],  // right rank 13 (same baked y as rank 1)
      [24, 11, 11], // right rank 24
    ] as const) {
      const top = ST.rowY0 + row * ST.rowPitch;
      expect(rank).toBeGreaterThan(0);
      expect(Math.abs(top + ST.rowHeight / 2 - paintedCentre(bar))).toBeLessThanOrEqual(2.1);
      expect(top).toBeGreaterThanOrEqual(cy(CARD_TOPS[bar]!) - 3);
      expect(top + ST.rowHeight).toBeLessThanOrEqual(cy(CARD_BOTTOMS[bar]!) + 2);
    }
    // Every bar (not just the endpoints) stays within 2px of its painted
    // centre — the least-squares fit absorbs the art's non-uniform pitch.
    for (let bar = 0; bar < 12; bar++) {
      const top = ST.rowY0 + bar * ST.rowPitch;
      expect(Math.abs(top + ST.rowHeight / 2 - paintedCentre(bar))).toBeLessThanOrEqual(2.1);
      expect(top).toBeGreaterThanOrEqual(cy(CARD_TOPS[bar]!) - 3);
      expect(top + ST.rowHeight).toBeLessThanOrEqual(cy(CARD_BOTTOMS[bar]!) + 2);
      if (bar > 0) {
        expect(top).toBeGreaterThan(ST.rowY0 + (bar - 1) * ST.rowPitch + ST.rowHeight - 1);
      }
    }
  });

  it("renders 24 names on 12 baked slots per column, no drops", () => {
    const html = render(24);
    expect(html).toContain("SQUAD 24");
    expect((html.match(/font:800 19px[^"]*left:112px/g) ?? []).length).toBe(12);
    expect((html.match(/font:800 19px[^"]*left:620px/g) ?? []).length).toBe(12);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("renders 16 teams as 12 left + 4 right, leaving the rest baked-blank", () => {
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    const html = render(16);
    expect(html).toContain("SQUAD 16");
    expect(html).not.toContain("SQUAD 17");
    expect((html.match(/font:800 19px[^"]*left:112px/g) ?? []).length).toBe(12);
    expect((html.match(/font:800 19px[^"]*left:620px/g) ?? []).length).toBe(4);
    // The 8 baked slots below the right column's 4th card stay empty.
    for (let r = 4; r < 12; r++) {
      const top = ST.rowY0 + r * ST.rowPitch;
      expect(top).toBeGreaterThan(cy(CARD_BOTTOMS[3]!));
    }
  });

  it("renders the 4-team minimum entirely in the left column", () => {
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    const html = render(4);
    expect(html).toContain("SQUAD 4");
    expect((html.match(/font:800 19px[^"]*left:112px/g) ?? []).length).toBe(4);
    expect(html).not.toContain("left:620px");
  });

  it("pins rank squares, team cells and strips inside each painted card", () => {
    const [left, right] = ST.columns;
    near(left.rankX, cx(42));
    near(right.rankX, cx(522));
    expect(left.rankX).toBe(44);
    expect(right.rankX).toBe(550);
    near(left.teamX, cx(106));
    near(right.teamX, cx(587), 1.2);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[0]!.x);
    expect(left.stripX + left.stripW).toBeCloseTo(cx(500), 0);
    expect(right.stripX + right.stripW).toBeCloseTo(cx(981), 0);
  });
});

describe("pmgc-league-blue stat grid + baked typography", () => {
  const KEYS = ["kp", "pp", "matches", "total"] as const;

  it("orders ELIMS → RANK(pp) → MATCHES → TOTAL on both tables", () => {
    for (const col of ST.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual([...KEYS]);
    }
    expect(ST.statBoxW).toBe(48);
    // No baked label cell overlaps its neighbour (69px is the tightest gap).
    for (const col of ST.columns) {
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.x).toBeGreaterThanOrEqual(sorted[i - 1]!.x + ST.statBoxW!);
      }
    }
  });

  it("centres every stat value box on its measured baked label ink", () => {
    for (const [col, centres] of [
      [ST.columns[0], LABEL_CENTERS.left],
      [ST.columns[1], LABEL_CENTERS.right],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of KEYS) {
        expect(byKey.get(key)! + ST.statBoxW! / 2).toBeCloseTo(centres[key], 1);
      }
      for (const { x } of col.statColumns) {
        expect(x).toBeGreaterThanOrEqual(col.teamX + col.teamW);
        expect(x + ST.statBoxW!).toBeLessThanOrEqual(col.stripX + col.stripW + 2);
      }
    }
  });

  it("renders 800-weight Exo 2 navy names/stats centered in the value boxes", () => {
    const html = render(24);
    expect(ST.nameFont.startsWith("800 19px ")).toBe(true);
    expect(ST.statFont.startsWith("800 24px ")).toBe(true);
    for (const font of [ST.nameFont, ST.statFont]) {
      expect(font).toContain('"Exo 2"');
      expect(font).toContain("Rajdhani");
      expect(font.indexOf('"Exo 2"')).toBeLessThan(font.indexOf("Rajdhani"));
    }
    expect(CONFIG.palette.text).toBe("#0A1128");
    expect(html).toContain("color:#0A1128");
    expect(html).toContain("text-align:center");
    // line-height must be serialised AFTER the font shorthand (reset trap).
    expect(html).toMatch(/font:800 24px[^"]*line-height:51.68px/);
    for (const x of [229.76, 298.25, 379.48, 462.25, 746.55, 813.97, 893.77, 974.45]) {
      expect(html).toContain(`left:${x}px`);
    }
  });

  it("suppresses baked labels/ranks and re-renders neither title nor words", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn && c.fixedRowPitch)).toBe(true);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    const html = render(24);
    expect(html).not.toContain("SHOULD NEVER RENDER");
    expect(html).not.toContain("OVERALL RANKINGS");
    expect(html).not.toContain(">MATCH<");
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
  });

  it("keeps dark navy ink ≥7:1 on the measured near-white cards", () => {
    expect(ratioOver(CARD_LUM, CONFIG.palette.text)).toBeGreaterThanOrEqual(7);
    expect(ratioOver(CARD_LUM, "#0A1128")).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(parseHexColor("#0A1128"), parseHexColor("#FFFFFF"))).toBeGreaterThanOrEqual(7);
  });
});

describe("pmgc-league-blue MATCH {n} digits", () => {
  const header = CONFIG.variantHeaders?.standings ?? {};
  const slot = header.subtitle;
  if (!slot) throw new Error("standings subtitle slot must exist");

  it("paints only digits, seated on the baked MATCH # ink centre", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(slot).toEqual({ x: 628, y: 326, w: 52, align: "center" });
    expect((slot.y ?? 0) + 44 / 2).toBeCloseTo(cy((MATCH_INK.y0 + MATCH_INK.y1) / 2), 1);
    // 10px gap after the baked '#' ink; digits stay in the clear blue field
    // above the header band (they never collide with the painted label row).
    expect(slot.x!).toBeGreaterThan(cx(MATCH_INK.x1) + 9);
    expect(slot.x! + slot.w!).toBeLessThan(720);
    expect((slot.y ?? 0) + 44).toBeLessThan(ST.headerLabelsY);
    expect(header.subtitleFont).toContain("800 44px");
    expect(header.subtitleFont).toContain('"Exo 2"');
    expect(header.subtitleColor).toBe("#FFFFFF");
    expect(header.subtitleTextTransform).toBe("uppercase");
  });

  it.each([1, 10])("renders MATCH %i in the same centred slot with no drift", (n) => {
    const html = render(24, n);
    expect(html).toContain(`>${n}<`);
    expect(html).toContain("left:628px");
    expect(html).toContain("width:52px");
    expect(html).toContain("text-align:center");
    expect(html).toContain("color:#FFFFFF");
    expect(html).not.toContain(`>MATCH ${n}<`);
    expect(html).toMatch(/font:800 44px[^"]*line-height:1/);
  });

  it("keeps white digits ≥4.5:1 on the measured royal-blue field", () => {
    expect(ratioOver(BLUE_LUM, CONFIG.variantHeaders?.standings?.subtitleColor ?? "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmgc-league-blue glyph torture + logo bounds", () => {
  it("ellipsizes long Arabic / CJK names inside the measured TEAM cell", () => {
    const names = ["الفريق العربي الطويل جدا", "超长中文队伍名称示例队伍", ...Array.from({ length: 22 }, (_, i) => `SQUAD ${i + 3}`)];
    const html = render(24, 12, names);
    expect(html).toContain("الفريق العربي الطويل جدا");
    expect(html).toContain("超长中文队伍名称示例队伍");
    const cells = html.match(/left:(112|620)px[^>]*>الفريق|left:(112|620)px[^>]*>超长/g) ?? [];
    expect(cells.length).toBe(2);
    expect((html.match(/text-overflow:ellipsis/g) ?? []).length).toBe(24);
    expect(html).toContain(`width:${ST.columns[0]!.teamW}px`);
    expect(html).not.toContain("NaN");
  });

  it("bounds a logo plate inside the row and leaves reference-length names room", () => {
    const html = render(4, 1, ["4RVL ALL", "GD BIDS", "THE LAST RIDERZ", "SQUAD 4"], "data:image/png;base64,AAAA");
    expect(html).toContain("4RVL ALL"); // the art's reference rows fit beside a logo
    expect(html).toContain("GD BIDS");
    const plate = ST.logoPlate!;
    expect(plate).toBeLessThanOrEqual(ST.rowHeight);
    // 19px Exo 2 800 fits ~84px: reference-length names no longer ellipsize
    // prematurely in the 116px cell once the 32px logo gutter is reserved.
    expect(parseInt(ST.nameFont.match(/ (\d+)px /)?.[1] ?? "0", 10)).toBeLessThanOrEqual(20);
    expect(ST.columns[0]!.teamW - ST.logoNameGap!).toBeGreaterThanOrEqual(84);
    expect(ST.logoNameGap!).toBeGreaterThan(plate);
    expect(html).toContain(`width:${plate}px`);
    expect(html).toContain(`width:${ST.columns[0]!.teamW - ST.logoNameGap!}px`);
    expect(html).toContain(`left:${ST.columns[0]!.teamX + ST.logoNameGap!}px`);
    const plateTop = ST.rowY0 + (ST.rowHeight - plate) / 2;
    expect(plateTop).toBeGreaterThanOrEqual(ST.rowY0);
    expect(plateTop + plate).toBeLessThanOrEqual(ST.rowY0 + ST.rowHeight);
  });
});
