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

const CONFIG: TemplateConfig = getTemplate("pmgo-teal");
const st = CONFIG.standings;

/**
 * Canvas-px measurement (MASTER-PROMPT-graphic-alignment.md §5 Phase A).
 * The user-supplied art is a TRUE 1696×2528 PNG named `overall.png` — the
 * repo's established art filename — with `refrence.jpeg` as its visual
 * reference. Uniform WIDTH fit: S = 1080/1696, centred letterbox TOP ≈ 5.094.
 * Every art measurement below was re-taken from the CURRENT file on disk.
 */
const ART_W = 1696;
const ART_H = 2528;
const S = 1080 / ART_W;
const TOP = (1620 - ART_H * S) / 2;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S + TOP;
const near = (actual: number, expected: number, tol = 1) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

/** 24–16–4 team fixtures in the pmslCobalt/ewcTeal display shape. Values are
 *  already-derived display data for rendering tests only; production rows
 *  always come from computeStandings(match_results) (ERD §5, R3). */
function standings(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `pmgo-teal-${i + 1}`,
    teamName: `PMGO-${String(i + 1).padStart(2, "0")}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : i % 5 === 0 ? 1 : 0,
    pp: 40 - i,
    kp: 33 - i,
    total: 73 - i * 2,
    matches: 6,
  }));
}

function render(n: number, matchCount: number, rows = standings(n)): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "pmgo-teal",
      title: "SCRIM NAME",
      subtitle: `AFTER MATCH ${matchCount}`,
      organizer: "ORGANIZER",
      standings: rows,
      matchCount,
    }),
  );
}

/** Style declaration of the absolutely-positioned slot at (left, top). */
function slotStyle(html: string, left: number, top: number): string {
  const key = `left:${left}px;top:${top}px`;
  const i = html.indexOf(key);
  expect(i).toBeGreaterThanOrEqual(0);
  return html.slice(i, html.indexOf("</div>", i));
}

describe("pmgo-teal registration, art fit and availability", () => {
  it("pins the aesthetic in the registry, id list and session allowlist", () => {
    expect(AESTHETICS["pmgo-teal"]).toBeDefined();
    expect(AESTHETIC_IDS).toContain("pmgo-teal");
    expect(VALID_TEMPLATE_IDS).toContain("pmgo-teal");
    expect(getTemplate("pmgo-teal").id).toBe("pmgo-teal");
    expect(CONFIG.name).toBe("PMGO Teal");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 }); // strict 2:3 canvas
  });

  it("backs standings with the measured 1696×2528 PNG, distortion-free", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmgo-teal/overall.png");
    // Magic-byte sniff: do NOT re-encode a JPEG payload as a PNG here.
    const bytes = readFileSync("public/templates/pmgo-teal/overall.png");
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual({
      w: ART_W,
      h: ART_H,
    });
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.left).toBe(0);
    expect(fit.height).toBeCloseTo(2528 * S, 6);
    expect(fit.width / ART_W).toBeCloseTo(fit.height / ART_H, 8); // uniform
    expect(fit.top).toBeCloseTo((1620 - fit.height) / 2, 6); // centred letterbox
    expect(CONFIG.canvasBackground).toBe("#043350");
  });

  it("ships the user's reference but never registers it as a background", () => {
    expect(() => readFileSync("public/templates/pmgo-teal/refrence.jpeg")).not.toThrow();
    for (const bg of Object.values(CONFIG.backgrounds)) {
      if (bg.type === "image") expect(bg.src).not.toMatch(/refrence|reference/i);
    }
  });

  it("is art-backed pickable for standings only", () => {
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain("pmgo-teal");
    expect(selectableAestheticIds("mvp")).not.toContain("pmgo-teal");
    expect(selectableAestheticIds("announcement")).not.toContain("pmgo-teal");
    expect(CONFIG.backgrounds.mvp.type).toBe("gradient");
    expect(CONFIG.backgrounds.announcement.type).toBe("gradient");
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(minContrastAgainstStops(parseHexColor("#F0FDFF"), css)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmgo-teal painted-bar row geometry", () => {
  it("splits 24 / 16 / 4 teams into fixed 12-bar columns without dropping rows", () => {
    expect(st.rowsPerColumn).toBe(12);
    expect(st.maxRowsLeft).toBe(12);
    expect(st.columns.map((c) => c.rowsPerColumn)).toEqual([12, 12]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    // The art has exactly 12 baked bars per side: a 16-team session fills the
    // left column first (same splitRowsAt rule as pmsl-cobalt), leaving the
    // remaining baked rows blank. 4 teams occupy the first four left bars.
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(st.fixedRowPitch).toBe(true);
    expect(st.ranksBakedIn).toBe(true);
    expect(st.columns.every((c) => c.fixedRowPitch && c.ranksBakedIn)).toBe(true);
  });

  it("keeps rowHeight ≤ rowPitch and seats painted rows #1/#12/#13/#24", () => {
    expect(st.rowHeight).toBeLessThanOrEqual(st.rowPitch);
    near(st.rowHeight, 108 * S, 0.2); // painted bar interior (art 108px)
    near(st.rowPitch, ((2003 - 646) / 11) * S, 0.05); // 12 bar tops, least fit
    near(st.rowY0, cy(646), 0.2); // first painted bar top
    // Painted bar CENTRES (art): row 1 / 12 = 699.5 / 2056; the right column
    // reuses the same Ys for baked ranks #13–#24.
    const paintedCenters = [699.5, 2056, 699.5, 2056].map(cy);
    const textCenters = [0, 11, 0, 11].map(
      (i) => st.rowY0 + i * st.rowPitch + st.rowHeight / 2,
    );
    textCenters.forEach((center, i) => near(center, paintedCenters[i]!, 1.2));
    // Exclusive bottom edge of the last painted bar is art y2111 (bar top
    // 2003 + height 108), not the last painted pixel y2109.
    near(st.rowY0 + 11 * st.rowPitch + st.rowHeight, cy(2111), 1.2);
  });

  it("renders every supplied row at 24 / 16 / 4 teams on the painted bars", () => {
    for (const n of [24, 16, 4]) {
      const html = render(n, 6);
      for (let i = 1; i <= n; i++) expect(html).toContain(`PMGO-${String(i).padStart(2, "0")}`);
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
      const [left, right] = splitRowsAt(n, 12);
      expect((html.match(/left:136px/g) ?? []).length).toBe(left);
      expect((html.match(/left:651px/g) ?? []).length).toBe(right);
      // Every rendered row owns a painted-bar-height text box; the bar strips
      // share that height, so the count is a lower bound on rendered rows.
      expect((html.match(new RegExp(`height:${st.rowHeight}px`, "g")) ?? []).length).toBeGreaterThanOrEqual(n);
    }
  });

  it("never draws ranks or labels the art already baked", () => {
    const html = render(24, 6);
    for (const baked of [">RANK<", ">TEAM<", ">WWCD<", ">PLACE PTS.<", ">ELIMS<", ">TOTAL<"]) {
      expect(html).not.toContain(baked);
    }
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(CONFIG.labelsBakedIn).toBe(true);
    near(st.headerLabelsY, cy(567), 0.2); // baked header band top
  });
});

describe("pmgo-teal stat cells and name clipping", () => {
  it("orders TEAM / WWCD(chicken) / PLACE PTS / ELIMS / TOTAL per column", () => {
    for (const col of st.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
    }
  });

  it("centres every value box on the measured baked header ink", () => {
    // Measured dark-ink centres in the art header band (y567–628):
    // left chicken 467, place 570.5, elims 678, total 766.5;
    // right +806/805.5/806.5/806.5 — the right shift is NOT perfectly uniform.
    const inkCenters = [
      [467, 570.5, 678, 766.5].map(cx),
      [1273.5, 1376, 1484.5, 1573].map(cx),
    ];
    st.columns.forEach((col, i) => {
      col.statColumns.forEach((cell, k) => {
        near(cell.x + st.statBoxW! / 2, inkCenters[i]![k]!, 0.4);
      });
      for (let k = 1; k < col.statColumns.length; k++) {
        expect(col.statColumns[k]!.x).toBeGreaterThanOrEqual(
          col.statColumns[k - 1]!.x + st.statBoxW!,
        );
      }
      expect(col.teamX + col.teamW).toBeLessThan(col.statColumns[0]!.x);
    });
    // Every box stays inside its painted bar (left x42–525, right x555–1037).
    for (const col of st.columns) {
      const last = col.statColumns[col.statColumns.length - 1]!;
      expect(last.x + st.statBoxW!).toBeLessThan(col.stripX + col.stripW);
    }
  });

  it("truncates over-long Arabic / CJK names inside the TEAM cell", () => {
    const longName = "فريق النسر الكبير 龙队 ULTRA-LONG-ESPORT-NAME";
    const html = render(1, 6, [{ ...standings(1)[0]!, teamName: longName }]);
    expect(html).toContain(longName); // raw text preserved, never normalized
    expect(html).toContain("left:136px;width:134px");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
  });

  it("bounds the optional logo plate and shifts the name inside the team cell", () => {
    const html = render(1, 6, [
      {
        ...standings(1)[0]!,
        logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lX8AAAAASUVORK5CYII=",
      },
    ]);
    expect(html).toContain("left:136px"); // plate starts at teamX
    expect(html).toContain("width:32px;height:32px"); // logoPlate
    expect(html).toContain("width:22px;height:22px"); // logoPlate − LOGO_INSET
    expect(html).toContain("left:174px;width:96px"); // teamX + logoNameGap
    const plateTop = st.rowY0 + (st.rowHeight - 32) / 2;
    expect(plateTop).toBeGreaterThan(st.rowY0);
    expect(plateTop + 32).toBeLessThan(st.rowY0 + st.rowHeight);
    near(plateTop + 16, st.rowY0 + st.rowHeight / 2, 0.01); // centred in row
    expect(html).toContain(`top:${plateTop}px`);
  });

  it("pins Exo 2 800 data ink and the measured deep-navy plate colour", () => {
    expect(st.nameFont.startsWith("800 25px ")).toBe(true);
    expect(st.statFont.startsWith("800 27px ")).toBe(true);
    for (const font of [st.nameFont, st.statFont, CONFIG.header.titleFont]) {
      expect(font).toContain('"Exo 2"');
      expect(font).not.toMatch(/px\s+"Rajdhani"/);
    }
    expect(CONFIG.header.titleTextTransform).toBe("uppercase");
    expect(CONFIG.palette.text).toBe("#0B1220");
    expect(CONFIG.palette.watermarkColor).toBe("#FFFFFF");
    expect(st.uniformRowInk).toBe(true);
    expect(st.uniformStatInk).toBe(true);
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
  });
});

describe("pmgo-teal baked MATCH # digit slot", () => {
  it("paints only digits, after the baked #, never a second MATCH label", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(CONFIG.subtitleBakedIn?.standings).toBe(true);
    const html = render(24, 6);
    expect(html).toContain(">6<");
    expect(html).not.toContain("MATCH");
    expect(html).not.toContain("SCRIM NAME"); // baked OVERALL STANDINGS
    expect(html).not.toContain("AFTER MATCH 6");
    // The optional organizer stays in the DOM but is parked off-canvas (the
    // art bakes the header): no second title/organizer is visible anywhere.
    expect(html).toContain("left:-9999px;top:-9999px;width:0");
  });

  it("keeps MATCH 1 and MATCH 6 at the same centre-x, baseline and size", () => {
    const one = slotStyle(render(24, 1), 634, 278);
    const six = slotStyle(render(24, 6), 634, 278);
    for (const style of [one, six]) {
      expect(style).toContain("text-align:left");
      expect(style).toContain("color:#2DD4EE");
      expect(style).toMatch(/font:800 56px/);
      expect(style).toContain("line-height:1");
      expect(style).toContain("font-variant-numeric:tabular-nums");
    }
    expect(render(24, 1)).toContain(">1<");
    expect(render(24, 6)).toContain(">6<");
    // Same slot + font + line-height + tabular figures ⇒ identical advance
    // width (and therefore centre-x), baseline and size for 1 and 6.
    expect(one.slice(0, one.indexOf(">"))).toBe(six.slice(0, six.indexOf(">")));
  });

  it("sits below the baked title and clear of the header band, centred on it", () => {
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 634, y: 278, w: 68, align: "left" });
    if (!sub) throw new Error("standings subtitle slot must be configured");
    // Baked "#" ink ends art x981 → canvas 624.7; digits start 9.3px right.
    expect(sub.x!).toBeGreaterThan(cx(981));
    expect(sub.x! + sub.w!).toBeLessThanOrEqual(1080);
    // Baked title ends art y406 → canvas 263.6; cyan MATCH ink y283–323;
    // cyan header band starts art y567 → canvas 366.2: no overlap either way.
    expect(sub.y!).toBeGreaterThan(cy(406));
    near(sub.y!, cy(437), 8);
    expect(sub.y! + 56).toBeLessThan(cy(567));
    const titleCenter = (cx(252) + cx(1491)) / 2;
    const lockupCenter = (cx(717) + sub.x! + 30) / 2; // 30px ≈ one Exo 800 digit
    near(lockupCenter, titleCenter, 12);
  });
});

describe("pmgo-teal contrast, watermark and export invariants", () => {
  it("clears the measured WCAG gates on art ink", () => {
    // Re-measured from current overall.png (mean plate interior #51A6B9;
    // dark-teal title field #0B4259). The prompt's ≥7:1 target holds on the
    // brightest ELIMS/TOTAL plates (#4DACBF = 7.1:1); the darker left TEAM
    // plate is 6.28:1 — still above every WCAG large-text and AA threshold.
    const plate = parseHexColor("#51A6B9");
    const brightPlate = parseHexColor("#4DACBF");
    expect(contrastRatio(parseHexColor("#0B1220"), plate)).toBeGreaterThan(6.2);
    expect(contrastRatio(parseHexColor("#0B1220"), brightPlate)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(parseHexColor("#F0FDFF"), parseHexColor("#0B4259"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHexColor("#2DD4EE"), parseHexColor("#0B4259"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the hardcoded bottom-right watermark on every variant", () => {
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("left:730px");
      expect(html).toContain("scrimlypro.com");
      expect(html).toContain("color:#FFFFFF");
    }
  });

  it("preserves container-query scaling and hardened 1080×1620 PNG export", () => {
    const canvas = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(canvas).toContain("scale(calc(100cqw / 1080px))");
    expect(canvas).toContain("x: 730, y: 1570"); // brand law: position hardcoded
    const exp = readFileSync("components/graphics/export.ts", "utf8");
    expect(exp).toContain("const EXPORT_W = 1080");
    expect(exp).toContain("const EXPORT_H = 1620");
    expect(exp).toContain("pixelRatio: 1");
    expect(exp).toContain("document.fonts.ready");
    expect(exp).toContain("naturalWidth === 0"); // failed art never exports
  });
});
