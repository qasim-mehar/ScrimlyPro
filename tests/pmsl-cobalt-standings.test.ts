import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  fitPillFontSize,
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

const ID = "pmsl-cobalt";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** The art is a true 1686×2528 PNG. Uniform width-fit S = 1080/1686, centred
 *  with a 0.32px letterbox (no crop, no distortion). */
const ART = { w: 1686, h: 2528 } as const;
const S = 1080 / ART.w;
const TOP = (1620 - ART.h * S) / 2;
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S + TOP;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);

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

function render(n: number, subtitle = "GROUP STAGE", matchCount = 12): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMSL LEAGUE W2D3",
      subtitle,
      organizer: null,
      standings: standings(n),
      matchCount,
    }),
  );
}

describe("pmsl-cobalt registration + assets", () => {
  it("is registered in AESTHETICS / AESTHETIC_IDS / the session allowlist", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMSL Cobalt");
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(selectableAestheticIds("standings")).toContain(ID);
    // Art is standings-only: the other variants stay gradient fallbacks.
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("backs standings with the readable true-PNG overall art, uniformly fitted", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmsl-cobalt/overall.png");
    const bytes = readFileSync("public/templates/pmsl-cobalt/overall.png");
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual(ART);
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.left).toBe(0);
    expect(fit.width / ART.w).toBeCloseTo(fit.height / ART.h, 8); // uniform
    expect(fit.top).toBeCloseTo((1620 - fit.height) / 2, 6); // centred letterbox
    expect(fit.height).toBeCloseTo(ART.h * S, 6);
  });

  it("ships the calibration reference at the documented path", () => {
    expect(() =>
      readFileSync("public/templates/pmsl-cobalt/refrence-image/overall-ref.png"),
    ).not.toThrow();
  });

  it("uses deep cobalt/navy gradient fallbacks for MVP + announcement", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#0D1230");
    expect(css).toContain("#1A2460");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(7);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
  });

  it("does not hide the scrim name — it lives in the blue pill", () => {
    expect(CONFIG.variantHideScrimName ?? {}).toEqual({});
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(false);
    expect(hideScrimNameFor(CONFIG, "mvp")).toBe(false);
    expect(hideScrimNameFor(CONFIG, "announcement")).toBe(false);
  });
});

describe("pmsl-cobalt 2×12 painted-bar geometry", () => {
  it("is exactly two columns of 12 pinned row slots (24 total)", () => {
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
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(20, 12)).toEqual([12, 8]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]); // overflow, never dropped
    expect(12 * 2).toBe(24);
  });

  it("pins rowY0 447 / pitch 59.82 / box height 51 to the baked badge centres", () => {
    near(ST.rowY0, cx(698)); // art rank-square top of row 1
    expect(ST.rowY0).toBe(447);
    expect(ST.rowPitch).toBe(59.82);
    expect(ST.rowHeight).toBe(51);
    // Baked rank-square centres: 472 … 1130.5 (row 12); zero cumulative drift.
    expect(ST.rowY0 + ST.rowHeight / 2).toBeCloseTo(472.5, 6);
    expect(ST.rowY0 + 11 * ST.rowPitch + ST.rowHeight / 2).toBeCloseTo(1130.52, 2);
    expect(ST.rowY0 + 12 * ST.rowPitch + ST.rowHeight).toBeLessThan(1220);
  });

  it("pins both rank squares / team slots to the measured X bounds", () => {
    const [left, right] = ST.columns;
    expect(left.rankX).toBe(53); // art x53–100 badge, no code numeral
    expect(right.rankX).toBe(547); // art x547–594 badge
    expect(left.teamX).toBe(106);
    expect(right.teamX).toBe(600);
    expect(left.teamW).toBe(170);
    expect(right.teamW).toBe(170);
    expect(left.teamX + left.teamW).toBeLessThan(left.statColumns[0]!.x);
    expect(right.teamX + right.teamW).toBeLessThan(right.statColumns[0]!.x);
    expect(left.stripX).toBe(106);
    expect(left.stripW).toBe(429);
    expect(right.stripX).toBe(600);
    expect(right.stripW).toBe(430);
  });
});

describe("pmsl-cobalt five baked stat cells", () => {
  const LEFT_X = [286, 336.5, 388, 447.5, 498.5];
  const RIGHT_X = [778.5, 829.5, 880.5, 939.5, 992];

  it("orders PLACE PTS → ELIMS → TOTAL PTS → MATCHES → WWCD on both tables", () => {
    const expected = ["pp", "kp", "total", "matches", "wwcd"];
    for (const col of ST.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(expected);
    }
    expect(ST.statBoxW).toBe(36);
  });

  it("pins each stat box to its painted cell centre with no overlap", () => {
    for (const [col, xs] of [
      [ST.columns[0], LEFT_X],
      [ST.columns[1], RIGHT_X],
    ] as const) {
      expect(col.statColumns.map((c) => c.x)).toEqual(xs);
      for (let i = 1; i < col.statColumns.length; i++) {
        expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! + ST.statBoxW!);
      }
    }
    // Box centres sit on the painted cell midpoints; glyph ink centroids of
    // the baked labels drift ≤4px from those midpoints (letter shapes, not
    // layout), so both measurements are pinned.
    const leftCell = [304, 354.5, 406, 465.5, 516.5];
    const rightCell = [796.5, 847.5, 898.5, 957.5, 1010];
    const leftInk = [304.5, 355.1, 408.1, 468.1, 519.8];
    const rightInk = [799, 847.7, 899.2, 960.8, 1012.3];
    for (const [xs, cell, ink] of [
      [LEFT_X, leftCell, leftInk],
      [RIGHT_X, rightCell, rightInk],
    ] as const) {
      xs.forEach((x, i) => {
        expect(x + ST.statBoxW! / 2).toBeCloseTo(cell[i]!, 1);
        expect(Math.abs(x + ST.statBoxW! / 2 - ink[i]!)).toBeLessThanOrEqual(4);
      });
    }
  });

  it("suppresses code labels / ranks and keeps white 700 names + 800 stats", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(ST.ranksBakedIn).toBe(true);
    expect(ST.columns.every((c) => c.ranksBakedIn)).toBe(true);
    expect(ST.headerLabelsY).toBe(393);
    expect(ST.nameFont.startsWith("700 21px ")).toBe(true);
    expect(ST.statFont.startsWith("800 24px ")).toBe(true);
    expect(ST.nameFont).toContain('"Exo 2"');
    expect(ST.statFont).toContain('"Rajdhani"');
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
    expect(CONFIG.palette.text).toBe("#FFFFFF");
  });
});

describe("pmsl-cobalt dual baked header pills", () => {
  const pills = ST.headerPills!;

  it("pins the blue session-name pill and the yellow stage pill", () => {
    expect(pills.left.box).toEqual({ x: 54, y: 304, w: 515, align: "center" });
    expect(pills.left.height).toBe(60);
    expect(pills.left.text).toBe("title");
    expect(pills.left.color).toBe("#FFFFFF");
    expect(pills.left.font).toContain("900 30px");
    expect(pills.right.box).toEqual({ x: 571, y: 305, w: 457, align: "center" });
    expect(pills.right.height).toBe(59);
    expect(pills.right.text).toBe("subtitle");
    expect(pills.right.color).toBe("#1E2B7B");
    expect(pills.right.font).toContain("900 30px");
    // Measured fill bounds: blue x54–568 y304–363; yellow x571–1027 y305–363.
    expect(pills.left.box.x! + pills.left.box.w!).toBe(569); // fill ends 568
    expect(pills.right.box.x! + pills.right.box.w!).toBe(1028); // fill ends 1027
  });

  it("renders both strings centred with line-height AFTER the font shorthand", () => {
    const html = render(24);
    expect(html).toContain(">PMSL LEAGUE W2D3<");
    expect(html).toContain(">GROUP STAGE<");
    expect(html).toContain("left:54px");
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("left:571px");
    expect(html).toContain("color:#1E2B7B");
    // The pill div serialises font then line-height in that order — React keeps
    // object key order, so `normal` from the shorthand cannot win.
    expect(html).toMatch(/font:900 30px[^"]*line-height:60px/);
    expect(html).toMatch(/font:900 30px[^"]*line-height:59px/);
  });

  it("scales long names/stages down without clipping (no overflow style)", () => {
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: ID,
        title: "PMSL SEA SPRING LEAGUE WEEK 2 DAY 3",
        subtitle: "GROUP STAGE — SUPER MATCH 12",
        organizer: null,
        standings: standings(24),
        matchCount: 12,
      }),
    );
    expect(html).toContain(">PMSL SEA SPRING LEAGUE WEEK 2 DAY 3<");
    expect(html).toContain(">GROUP STAGE — SUPER MATCH 12<");
    expect(html).toContain("width:515px"); // full pill width is retained
    expect(html).toContain("width:457px");
    expect(html).toContain("white-space:nowrap"); // never wraps
    const sizes = [...html.matchAll(/font-size:([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...sizes)).toBeLessThan(30); // long strings shrink
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14); // with a hard floor
    expect(html).not.toContain("NaN");
  });

  it("fits text with pure arithmetic — short strings keep 30px, long ones shrink", () => {
    const font = `900 30px "Exo 2", "Rajdhani", sans-serif`;
    expect(fitPillFontSize("PMSL LEAGUE W2D3", font, 515)).toBe(30);
    expect(fitPillFontSize("GROUP STAGE", font, 457)).toBe(30);
    expect(fitPillFontSize("PMSL SEA SPRING LEAGUE WEEK 2 DAY 3", font, 515)).toBeLessThan(30);
    expect(fitPillFontSize("GROUP STAGE — SUPER MATCH 12", font, 457)).toBeLessThan(30);
    expect(fitPillFontSize("X".repeat(200), font, 515)).toBe(14);
  });
});

describe("pmsl-cobalt standings SSR at 16 / 20 / 24 teams", () => {
  it.each([16, 20, 24])("renders %i teams on 12 fixed-pitch slots", (n) => {
    const html = render(n);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const left = Math.min(n, 12);
    // Team-name cells carry the 700 face; row strips share those x values.
    expect((html.match(/font:700 21px[^"]*left:106px/g) ?? []).length).toBe(left);
    expect((html.match(/font:700 21px[^"]*left:600px/g) ?? []).length).toBe(n - left);
    for (const x of [286, 336.5, 388, 447.5, 498.5, 778.5, 829.5, 880.5, 939.5, 992]) {
      expect(html).toContain(`left:${x}px`);
    }
  });

  it("keeps every row's text box inside its painted bar", () => {
    for (const n of [16, 20, 24]) {
      for (const count of [Math.min(n, 12), n - Math.min(n, 12)]) {
        for (let r = 0; r < count; r++) {
          const top = ST.rowY0 + r * ST.rowPitch;
          expect(top).toBeGreaterThanOrEqual(cy(698) - 1);
          expect(top + ST.rowHeight).toBeLessThanOrEqual(cy(1805) + 2); // row-12 badge bottom
          if (r > 0) {
            expect(top).toBeGreaterThanOrEqual(ST.rowY0 + (r - 1) * ST.rowPitch + ST.rowHeight - 1);
          }
        }
      }
    }
  });
});
