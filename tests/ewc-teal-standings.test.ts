import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hideScrimNameFor,
  minContrastAgainstStops,
  parseHexColor,
  type TemplateConfig,
} from "@/lib/graphics";
import { EWC_TEAL_STANDINGS, ewcTealStandings } from "@/lib/fixtures/ewcTeal";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("ewc-teal");
const st = CONFIG.standings;

/** The art is a 1027×1532 PNG uniformly height-fitted to the 1080×1620
 *  canvas: scale S = 1620/1532, centred object-fit: cover crop of 3px/side. */
const ART_W = 1027;
const ART_H = 1532;
const S = 1620 / ART_H;
const LEFT = (1080 - ART_W * S) / 2;
const cx = (artX: number) => artX * S + LEFT;
const cy = (artY: number) => artY * S;
const near = (canvasPx: number, expected: number, tol = 1) =>
  expect(Math.abs(canvasPx - expected)).toBeLessThanOrEqual(tol);
const ratioOver = (bgLum: number, fgHex: string) => {
  const { r, g, b } = parseHexColor(fgHex);
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const fg = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (Math.max(bgLum, fg) + 0.05) / (Math.min(bgLum, fg) + 0.05);
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
  }));
}

function render(n: number, subtitle: string, matchCount: number, rows = standings(n)): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "ewc-teal",
      title: "SCRIM",
      subtitle,
      organizer: null,
      standings: rows,
      matchCount,
    }),
  );
}

describe("ewc-teal registration + art fit", () => {
  it("pins the aesthetic in the registry, id list and session allowlist", () => {
    expect(AESTHETICS["ewc-teal"]).toBeDefined();
    expect(AESTHETIC_IDS).toContain("ewc-teal");
    expect(VALID_TEMPLATE_IDS).toContain("ewc-teal");
    expect(getTemplate("ewc-teal").id).toBe("ewc-teal");
    expect(CONFIG.name).toBe("EWC Teal");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 }); // R9: strict 2:3 canvas
  });

  it("backs standings with the measured 1027×1532 overall.png, distortion-free", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/ewc-teal/overall.png");
    const bytes = readFileSync("public/templates/ewc-teal/overall.png");
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(bytes.readUInt32BE(16)).toBe(ART_W);
    expect(bytes.readUInt32BE(20)).toBe(ART_H);
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.height).toBe(1620);
    expect(fit.width / ART_W).toBeCloseTo(fit.height / ART_H, 8); // uniform scale
    expect(fit.left).toBeCloseTo((1080 - fit.width) / 2, 6); // centred cover crop
    expect(fit.top).toBe(0);
  });

  it("ships the visual reference at the documented path", () => {
    expect(() => readFileSync("public/templates/ewc-teal/refrence-image/overall-ref.png")).not.toThrow();
  });

  it("uses deep-teal gradient fallbacks for artless MVP + announcement", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#062E20");
    expect(css).toContain("#0B4228");
    expect(minContrastAgainstStops(parseHexColor("#FFFFFF"), css)).toBeGreaterThanOrEqual(7);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ewc-teal single-column 24-row geometry", () => {
  it("configures one full-width ladder with baked ranks, labels and fixed pitch", () => {
    expect(st.singleColumn).toBe(true);
    expect(st.fixedRowPitch).toBe(true);
    expect(st.ranksBakedIn).toBe(true);
    expect(st.rowsPerColumn).toBe(24);
    expect(st.maxRowsLeft).toBe(24);
    expect(CONFIG.labelsBakedIn).toBe(true);
    for (const col of st.columns) {
      expect(col.fixedRowPitch ?? st.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? st.ranksBakedIn).toBe(true);
      expect(col.rowsPerColumn ?? st.rowsPerColumn).toBe(24);
    }
  });

  it("pins rowY0 / pitch / height to the 24 painted bars with zero drift", () => {
    // Baked bar tops: 263, 312, 360, … 1379 (art px); least-squares fit
    // 262.5 + i·48.48 → canvas 279 + i·51.27, bottom of bar 24 = 1504.
    near(st.rowY0, cy(263), 1.5);
    expect(st.rowY0).toBeCloseTo(279, 6);
    expect(st.rowPitch).toBeCloseTo(51.27, 6);
    expect(st.rowPitch).toBeCloseTo(48.48 * S, 0.6);
    expect(st.rowHeight).toBeCloseTo(46.5, 6);
    near(st.rowY0 + 23 * st.rowPitch, cy(1379), 1.5);
    for (let i = 0; i < 24; i++) {
      const top = st.rowY0 + i * st.rowPitch;
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + st.rowHeight).toBeLessThanOrEqual(1620);
    }
  });

  it("places the team slot inside the navy bar, clear of the WWCD box", () => {
    near(st.columns[0].teamX, cx(145), 1);
    expect(st.columns[0].teamX).toBe(150);
    expect(st.columns[0].teamX + st.columns[0].teamW).toBeLessThan(
      st.columns[0].statColumns[0]!.x,
    );
    // The long reference name fits the slot before CSS ellipsis kicks in.
    expect(st.columns[0].teamW).toBeGreaterThanOrEqual(300);
  });
});

describe("ewc-teal five stat columns (WWCD | MATCHES | PP | KP | TOTAL)", () => {
  it("pins the exact stat order and 88px non-overlapping boxes", () => {
    expect(st.statBoxW).toBe(88);
    for (const col of st.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "matches", "pp", "kp", "total"]);
      for (let i = 1; i < col.statColumns.length; i++) {
        expect(col.statColumns[i]!.x).toBeGreaterThanOrEqual(col.statColumns[i - 1]!.x + st.statBoxW!);
      }
    }
  });

  it("centres each value box on the baked header label ink", () => {
    const centers = [499, 609, 721, 814, 921].map((x) => x + st.statBoxW! / 2);
    expect(centers).toEqual([543, 653, 765, 858, 965]);
    // Measured ink centres on the art: WWCD 517, MATCHES 620, PLACEMENT 726,
    // ELIM. 815, TOTAL 916 (converted through the uniform height fit).
    const measured = [517, 620, 726, 815, 916].map(cx);
    centers.forEach((center, i) => near(center, measured[i]!, 1.5));
  });

  it("keeps font weights, glyph-safe stack and crisp white row ink", () => {
    expect(st.nameFont.startsWith("700 24px ")).toBe(true);
    expect(st.statFont.startsWith("800 28px ")).toBe(true);
    for (const font of [st.nameFont, st.statFont]) {
      expect(font).toContain('"Rajdhani"');
      expect(font).toContain('"Exo 2"');
    }
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.wwcdText).toBe("#FFFFFF");
    expect(st.uniformRowInk).toBe(true);
    expect(st.uniformStatInk).toBe(true);
    expect(CONFIG.palette.rowAltOpacity).toBe(0); // art paints the bars
  });
});

describe("ewc-teal baked MATCH# digit slot", () => {
  it("bakes labels, ranks and title into the art", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(hideScrimNameFor(CONFIG, "announcement")).not.toBe(true);
    expect(CONFIG.variantHeaders?.standings?.organizer).toEqual({ x: -9999, y: -9999, w: 0 });
    near(st.headerLabelsY, cy(238), 1); // baked label band starts art y238
  });

  it("pins the digits just right of the baked # ink inside the yellow field", () => {
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 954, y: 118, w: 118, align: "left" });
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toContain("900 100px");
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toContain('"Rajdhani"');
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#062E20");
    expect(CONFIG.variantHeaders?.standings?.subtitleTextTransform).toBe("uppercase");
    // Baked "MATCH#" ink ends art x897 → canvas 945.5; "OVERALL RANKING"
    // ends art y98 → canvas 103.6. Slot starts 8.5px to the right / 14px below.
    expect(sub!.x!).toBeGreaterThan(cx(897));
    expect(sub!.y!).toBeGreaterThan(cy(98));
    expect(sub!.x! + sub!.w!).toBeLessThanOrEqual(1080);
    // Prompt's approximate slot window (x 880–980, y 105–150).
    expect(sub!.x!).toBeGreaterThanOrEqual(880);
    expect(sub!.x!).toBeLessThanOrEqual(980);
    expect(sub!.y!).toBeGreaterThanOrEqual(105);
    expect(sub!.y!).toBeLessThanOrEqual(150);
  });

  it("clears WCAG AA on the measured surfaces", () => {
    const NAVY_BAR = 0.0085; // measured mean interior #09203A
    const BRIGHT_TILE = 0.2412; // measured bright stat tile #188E88
    const YELLOW = { r: 253, g: 220, b: 76 }; // measured MATCH# field #FDDC4C
    const yellowLum = (() => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(YELLOW.r) + 0.7152 * f(YELLOW.g) + 0.0722 * f(YELLOW.b);
    })();
    expect(contrastRatio(parseHexColor("#FFFFFF"), parseHexColor("#0D1B2A"))).toBeGreaterThan(4.5);
    expect(contrastRatio(parseHexColor("#FFFFFF"), parseHexColor("#1D7874"))).toBeGreaterThan(4.5);
    expect(ratioOver(NAVY_BAR, CONFIG.palette.text)).toBeGreaterThan(4.5);
    // 28px/800 stat numerals are WCAG "large text": the bright broadcast tile
    // is 3.6:1 (above the 3:1 floor); the spec's darker broadcast teal #1D7874
    // clears the 4.5:1 normal-text gate asserted above.
    expect(ratioOver(BRIGHT_TILE, CONFIG.palette.text)).toBeGreaterThan(3);
    expect(ratioOver(yellowLum, "#062E20")).toBeGreaterThan(4.5);
  });
});

describe("ewc-teal standings SSR at 16 / 20 / 24 teams", () => {
  it.each([16, 20, 24])("renders %i teams in one column without NaN or overflow", (n) => {
    const html = render(n, "AFTER MATCH 6", 6);
    expect(html).toContain(`SQUAD ${n}`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/left:150px/g) ?? []).length).toBe(n);
    // No synthetic ranks or labels (all baked), no second table.
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain("left:80px");
    for (const x of [499, 609, 721, 814, 921]) expect(html).toContain(`left:${x}px`);
  });

  it("paints only the confirmed match number in mid-session and final states", () => {
    const mid = render(24, "AFTER MATCH 3", 3);
    expect(mid).toContain("left:954px");
    expect(mid).toContain("color:#062E20");
    expect(mid).toContain("text-transform:uppercase");
    expect(mid).toContain(">3<");
    expect(mid).not.toContain("SCRIM"); // baked OVERALL RANKING
    expect(mid).not.toContain("AFTER MATCH 3");

    const final = render(24, "FINAL RESULTS", 6);
    expect(final).toContain(">6<");
    expect(final).not.toContain("FINAL RESULTS");
    expect(final).not.toContain("SCRIM");
  });

  it("truncates long names before the WWCD box and keeps line-height after font", () => {
    const html = render(1, "AFTER MATCH 6", 6, [
      { ...ewcTealStandings(1)[0]!, teamName: "REGNUM CARYA ESPORTS" },
    ]);
    expect(html).toContain("REGNUM CARYA ESPORTS");
    expect(html).toContain("width:340px");
    expect(html).toContain("text-overflow:ellipsis");
    // An overlong name still clips at x490 (9px before the WWCD box).
    const overlong = render(1, "AFTER MATCH 6", 6, [
      {
        ...ewcTealStandings(1)[0]!,
        teamName: "REGNUM CARYA ESPORTS ULTRA LONG BANNER NAME",
      },
    ]);
    expect(overlong).toContain("text-overflow:ellipsis");
    expect(overlong).toContain("white-space:nowrap");
    expect(overlong).toContain("left:150px;width:340px");
    // P7 line-height fix: the shorthand must come BEFORE line-height so the
    // glyphs are optically centred on every painted bar. (React escapes the
    // font-family quotes as &quot;, whose semicolons break a naive CSS regex.)
    for (const font of ["font:700 24px", "font:800 28px"]) {
      const fontIdx = html.indexOf(font);
      expect(fontIdx).toBeGreaterThanOrEqual(0);
      const lhIdx = html.indexOf("line-height:46.5px", fontIdx);
      expect(lhIdx).toBeGreaterThan(fontIdx);
      expect(lhIdx - fontIdx).toBeLessThan(300); // same style declaration
    }
  });

  it("renders the reference 24-team fixture in R7 order", () => {
    expect(EWC_TEAL_STANDINGS).toHaveLength(24);
    const html = render(24, "AFTER MATCH 6", 6, [...EWC_TEAL_STANDINGS]);
    expect(html).toContain("4THRIVES ESPORTS");
    expect(html).toContain("REGNUM CARYA ESPORTS");
    expect(html).toContain("DX RAIDERS");
    expect(html).not.toContain("NaN");
  });

  it("keeps the hardcoded watermark at y1570 on all three variants", () => {
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("scrimlypro.com");
    }
  });

  it("renders the gradient MVP + announcement fallbacks cleanly", () => {
    const mvpHtml = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "ewc-teal",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: [
          { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
          { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
          { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
          { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
          { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
        ],
      }),
    );
    expect(mvpHtml).toContain("SCRIM");
    expect(mvpHtml).toContain("TOP 5 FRAGGERS");
    expect(mvpHtml).toContain("ALPHA");
    expect(mvpHtml).not.toContain("NaN");
  });
});
