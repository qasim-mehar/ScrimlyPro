import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  contrastRatio,
  getTemplate,
  hideScrimNameFor,
  minContrastAgainstStops,
  parseHexColor,
  splitRowsAt,
  subtitleBakedInFor,
  type TemplateConfig,
} from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("pmgc-aqua");
const st = CONFIG.standings;

/** The art on disk is now a 3872×6500 JPEG-in-.png — exactly 4× the 968×1625
 *  file these logical art coordinates were measured against. It is uniformly
 *  fitted by width (S = 1080/968) and centred (top −96.508), i.e. the exact
 *  object-fit:cover crop of art y0–86.5 / y1538.5–1625. Every canvas number
 *  below was measured on those pixels and converted with these two helpers. */
const S = 1080 / 968;
const TOP = (1620 - 1625 * S) / 2; // -96.50826446281
const cx = (artX: number) => artX * S;
const cy = (artY: number) => artY * S + TOP;
const near = (canvasPx: number, artPx: number, tol = 1) =>
  expect(Math.abs(canvasPx - artPx)).toBeLessThanOrEqual(tol);
const ratioOver = (bgLum: number, fgHex: string) => {
  const fgLum = (() => {
    const { r, g, b } = parseHexColor(fgHex);
    const f = (v: number) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  })();
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
  }));
}

function render(n: number, subtitle: string, matchCount: number): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "pmgc-aqua",
      title: "SCRIM",
      subtitle,
      organizer: null,
      standings: standings(n),
      matchCount,
    }),
  );
}

describe("pmgc-aqua registration + art fit", () => {
  it("is registered in AESTHETICS, AESTHETIC_IDS and the session allowlist", () => {
    expect(AESTHETICS["pmgc-aqua"]).toBeDefined();
    expect(AESTHETIC_IDS).toContain("pmgc-aqua");
    expect(getTemplate("pmgc-aqua").id).toBe("pmgc-aqua");
    expect(VALID_TEMPLATE_IDS).toContain("pmgc-aqua");
  });

  it("backs standings with the measured (4× upscaled) overall.png", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmgc-aqua/overall.png");
    expect(() => readFileSync("public/templates/pmgc-aqua/overall.png")).not.toThrow();
    const bytes = readFileSync("public/templates/pmgc-aqua/overall.png");
    // The upscaled file on disk is a JPEG payload inside a .png name (SOI + SOF).
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    let size: { w: number; h: number } | null = null;
    for (let pos = 2; pos + 10 <= bytes.length; ) {
      if (bytes[pos] !== 0xff) { pos += 1; continue; }
      const marker = bytes[pos + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        size = { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
        break;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { pos += 2; continue; }
      pos += 2 + bytes.readUInt16BE(pos + 2);
    }
    expect(size).toEqual({ w: 3872, h: 6500 });
    // The art is not exact 2:3 — a distorted stretch would break every
    // measured coordinate below, so its cover fit must be uniform.
    expect(968 / 1625).toBeLessThan(2 / 3);
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.width / 968).toBeCloseTo(fit.height / 1625, 8); // uniform scale
    expect(fit.top).toBeCloseTo((1620 - fit.height) / 2, 6); // centred crop
  });

  it("uses aqua/ice gradient fallbacks for the artless MVP + announcement variants", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#EAFBF7");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(7);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmgc-aqua 12/12 painted-bar row geometry", () => {
  it("pins rowY0 366.5, pitch 70.7 and height 68 to the art bars", () => {
    near(st.rowY0, cy(415)); // art row-1 bright-divider top 415
    expect(st.rowY0).toBeCloseTo(cy(415), 1);
    expect(st.rowPitch).toBe(70.7);
    // Baked row tops 415 … 1112 (art pitch 697/11 = 63.3636).
    near(st.rowY0 + 11 * st.rowPitch, cy(1112), 1.5);
    expect(st.rowHeight).toBe(68);
    expect(st.fixedRowPitch).toBe(true);
    expect(st.rowsPerColumn).toBe(12);
    expect(st.maxRowsLeft).toBe(12);
    expect(st.ranksBakedIn).toBe(true);
    for (const col of st.columns) {
      expect(col.fixedRowPitch ?? st.fixedRowPitch).toBe(true);
      expect(col.rowsPerColumn ?? st.rowsPerColumn).toBe(12);
      expect(col.ranksBakedIn ?? st.ranksBakedIn).toBe(true);
    }
  });

  it("keeps every row inside its painted bar at 16/20/24 teams with no overflow", () => {
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(20, 12)).toEqual([12, 8]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]); // 25th overflows, never dropped
    const artTop = (r: number) => cy(415 + r * (697 / 11));
    for (const n of [16, 20, 24]) {
      const [leftCount, rightCount] = splitRowsAt(n, 12);
      for (const count of [leftCount, rightCount]) {
        for (let r = 0; r < count; r++) {
          const top = st.rowY0 + r * st.rowPitch;
          near(top, artTop(r), 1.5);
          expect(top).toBeGreaterThanOrEqual(cy(415) - 1);
          expect(top + st.rowHeight).toBeLessThanOrEqual(cy(1176) + 1); // art row-12 bottom
        }
        for (let r = 1; r < count; r++) {
          const prevBottom = st.rowY0 + (r - 1) * st.rowPitch + st.rowHeight;
          expect(st.rowY0 + r * st.rowPitch).toBeGreaterThanOrEqual(prevBottom - 1);
        }
      }
    }
  });
});

describe("pmgc-aqua four-stat cells (ELIMS | PLACE | WWCD | TOTAL)", () => {
  const LEFT_DIV = [262.5, 313, 364, 415].map(cx); // TEAM|ELIMS|PLACE|WWCD|TOTAL dividers
  const LEFT_END = cx(473.5);
  const RIGHT_DIV = [708.5, 759.5, 810.5, 861.5].map(cx);
  const RIGHT_END = cx(919);
  const measured = {
    left: { kp: 287.75, pp: 338.5, wwcd: 389.5, total: 444.25 },
    right: { kp: 734, pp: 785, wwcd: 836, total: 890.25 },
  };

  it("orders kp → pp → wwcd → total with 56px non-overlapping boxes", () => {
    expect(st.statBoxW).toBe(56);
    for (const col of st.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["kp", "pp", "wwcd", "total"]);
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + st.statBoxW!);
      }
    }
  });

  it("centres each box on the painted cell ink of both tables", () => {
    for (const [col, centers] of [
      [st.columns[0], measured.left],
      [st.columns[1], measured.right],
    ] as const) {
      const byKey = new Map(col.statColumns.map((c) => [c.key, c.x]));
      for (const key of ["kp", "pp", "wwcd", "total"] as const) {
        near(byKey.get(key)! + st.statBoxW! / 2, cx(centers[key]), 0.6);
      }
    }
  });

  it("keeps every box strictly between its painted divider lines", () => {
    for (const [col, dividers, end] of [
      [st.columns[0], LEFT_DIV, LEFT_END],
      [st.columns[1], RIGHT_DIV, RIGHT_END],
    ] as const) {
      const boxes = [...col.statColumns].sort((a, b) => a.x - b.x);
      boxes.forEach((box, i) => {
        expect(box.x).toBeGreaterThanOrEqual(dividers[i] - 1);
        expect(box.x + st.statBoxW!).toBeLessThanOrEqual((i < 3 ? dividers[i + 1] : end) + 1);
      });
      // Team name/logo never reaches the first stat compartment.
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(boxes[0].x - 2);
    }
  });

  it("starts the team compartment cleanly inside the bar, right of the baked rank square", () => {
    const [left, right] = st.columns;
    near(left.rankX, cx(47), 1); // cyan rank square art x47–104
    near(left.teamX, cx(105), 1); // first ice pixel to its right
    near(right.rankX, cx(490), 1);
    near(right.teamX, cx(548), 1);
    expect(left.teamX).toBeGreaterThanOrEqual(left.rankX + 50);
    expect(right.teamX).toBeGreaterThanOrEqual(right.rankX + 50);
  });
});

describe("pmgc-aqua baked header + MATCH # digit slot", () => {
  it("bakes the labels, subtitle label and title into the art", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleBakedIn?.standings).toBe(true);
    expect(subtitleBakedInFor(CONFIG, "standings")).toBe(true);
    expect(subtitleBakedInFor(CONFIG, "mvp")).toBe(false);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(hideScrimNameFor(CONFIG, "announcement")).not.toBe(true);
    near(st.headerLabelsY, cy(370), 1); // baked dark header band art y370–409
  });

  it("drops the match digits in the open dark box right of # and above the underline", () => {
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 920, y: 184, w: 96, align: "center" });
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#00F5E1");
    // Badge dark fill: art x649–925, y245–330 → canvas x724–1032, y177–272.
    expect(sub!.x!).toBeGreaterThan(cx(649));
    expect(sub!.x! + sub!.w!).toBeLessThan(cx(925));
    expect(sub!.y!).toBeGreaterThan(cy(245));
    // Baked "#" ink ends art x814 → canvas 908; cyan underline art y308 → 247.
    expect(sub!.x!).toBeGreaterThanOrEqual(cx(814));
    expect(sub!.y! + 40).toBeLessThan(cy(308));
  });
});

describe("pmgc-aqua measured contrast (WCAG)", () => {
  // Zone means measured on the art pixels with the per-pixel WCAG relative
  // luminance algorithm (same as tests/graphics-contrast.test.ts).
  const ROW_BAR = 0.82158; // ice-grey bar interior, art(120,430,130,40)
  const MATCH_SLOT = 0.00814; // open dark slot, art(820,255,95,45)
  const FOOTER = { r: 25.7, g: 34.7, b: 38.5 }; // rocky footer at the watermark

  it("dark charcoal ink clears the light bars ≥ 14:1 at weight 800", () => {
    expect(CONFIG.palette.text).toBe("#0D1B1E");
    expect(CONFIG.palette.wwcdText).toBe("#0D1B1E");
    expect(st.uniformStatInk).toBe(true); // no accent TOTAL over the baked row
    expect(ratioOver(ROW_BAR, CONFIG.palette.text)).toBeGreaterThanOrEqual(14);
    expect(st.nameFont.startsWith("800 21px ")).toBe(true);
    expect(st.statFont.startsWith("800 26px ")).toBe(true);
    expect(st.nameFont).toContain('"Exo 2"');
    expect(st.statFont).toContain('"Exo 2"');
  });

  it("electric-cyan match digits clear the near-black badge ≥ 4.5:1", () => {
    const ink = CONFIG.variantHeaders?.standings?.subtitleColor ?? "#00F5E1";
    expect(ratioOver(MATCH_SLOT, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it("the hardcoded 88%-white watermark clears the dark rocky footer ≥ 4.5:1", () => {
    const a = 0.88;
    const ink = {
      r: 255 * a + FOOTER.r * (1 - a),
      g: 255 * a + FOOTER.g * (1 - a),
      b: 255 * a + FOOTER.b * (1 - a),
    };
    expect(contrastRatio(ink, FOOTER)).toBeGreaterThanOrEqual(4.5);
    expect(CONFIG.palette.watermarkColor).toBe("rgba(255,255,255,0.88)");
  });

  it("medal digit ink clears every metal ≥ 3:1", () => {
    const p = CONFIG.palette;
    for (const metal of [p.medalGold, p.medalSilver, p.medalBronze]) {
      expect(contrastRatio(parseHexColor(p.medalText), parseHexColor(metal))).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pmgc-aqua standings SSR (measured layout)", () => {
  it("renders no code rank numerals or label row (all baked into the art)", () => {
    const html = render(24, "FINAL RESULTS", 6);
    expect(html).not.toContain("left:52px");
    expect(html).not.toContain("left:547px");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">ELIMS<");
    expect(html).not.toContain(">TOTAL<");
  });

  it("splits 24 teams into 12 left + 12 right painted rows", () => {
    const html = render(24, "FINAL RESULTS", 6);
    expect((html.match(/left:117px/g) ?? []).length).toBe(12);
    expect((html.match(/left:612px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
  });

  it("fills the left column first for 16 teams and keeps the 25th overflow", () => {
    const html16 = render(16, "AFTER MATCH 3", 3);
    expect((html16.match(/left:117px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:612px/g) ?? []).length).toBe(4);
    expect(html16).toContain("SQUAD 16");

    const html25 = render(25, "AFTER MATCH 3", 3);
    expect((html25.match(/left:612px/g) ?? []).length).toBe(13);
    expect(html25).toContain("SQUAD 25");
    const overflowTop = st.rowY0 + 12 * st.rowPitch;
    // The 25th row starts below row 12's text box (outside the painted table).
    expect(overflowTop).toBeGreaterThan(st.rowY0 + 11 * st.rowPitch + st.rowHeight);
    expect(html25).toContain(`top:${overflowTop}px`);
  });

  it("renders mid-session and final states into the baked MATCH # slot", () => {
    const mid = render(24, "AFTER MATCH 3", 3);
    expect(mid).toContain("left:920px");
    expect(mid).toContain("color:#00F5E1");
    expect(mid).toContain(">3<");
    expect(mid).toContain("font-variant-numeric:tabular-nums");

    const final = render(24, "FINAL RESULTS", 6);
    expect(final).toContain("left:920px");
    expect(final).toContain(">6<");
  });

  it("hides the standings scrim name (baked OVERALL RANKINGS)", () => {
    expect(render(24, "FINAL RESULTS", 6)).not.toContain("SCRIM");
  });

  it("renders all four stat values per row with dark ink", () => {
    const html = render(24, "FINAL RESULTS", 6);
    for (const x of [293, 350, 407, 468, 791, 848, 905, 965]) {
      expect(html).toContain(`left:${x}px`);
    }
    expect((html.match(/color:#0D1B1E/g) ?? []).length).toBeGreaterThanOrEqual(96);
    expect(html).not.toContain("NaN");
  });

  it("renders the artless MVP + announcement fallbacks cleanly", () => {
    const mvp: MvpDisplayEntry[] = [
      { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
      { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
      { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
      { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
      { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
    ];
    const mvpHtml = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "pmgc-aqua",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvp,
      }),
    );
    expect(mvpHtml).toContain("SCRIM");
    expect(mvpHtml).toContain("ALPHA");
    expect(mvpHtml).not.toContain("NaN");

    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmgc-aqua",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: standings(16).map((r) => ({ id: r.teamId, name: r.teamName, logoUrl: r.logoUrl })),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain("SQUAD 16");
    expect(annHtml).not.toContain("NaN");
  });
});
