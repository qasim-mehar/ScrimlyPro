import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  getTemplate,
  hasArtForVariant,
  headerFor,
  minContrastAgainstStops,
  parseHexColor,
  relativeLuminance,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { BRUSH_FONTS } from "@/lib/graphics/fonts";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import { GLYPH_TEAM_NAMES } from "@/lib/fixtures/glyphNames";
import type { StandingRow } from "@/lib/scoring";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";

const ID = "pmrc-lime";
const CONFIG: TemplateConfig = getTemplate(ID);
const st = CONFIG.standings;

// The art is a TRUE 1024×1536 PNG (exact 2:3). Every measurement below is
// converted with the uniform full-cover scale S = 1080/1024.
const S = 1080 / 1024;
const cx = (artPx: number) => artPx * S;

/** Measured white rank-plate boundaries (art px, both columns). */
const PLATE_TOPS = [504, 563, 623, 683, 744, 806, 867, 929, 991, 1052, 1114, 1174];
const PLATE_BOTTOMS = [553, 613, 673, 734, 796, 857, 920, 981, 1042, 1104, 1165, 1225];
/** Dark label ink centroids in the baked orange→lime header bar (canvas px). */
const INK = {
  left: { kp: 310.42, pp: 383.4, total: 481.17 },
  right: { kp: 782.3, pp: 855.14, total: 952.81 },
};

function ratioOver(bgLum: number, fgHex: string): number {
  const fgLum = relativeLuminance(parseHexColor(fgHex));
  return (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
}

function standings(n: number, names?: string[], withLogo = false): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: names?.[i] ?? `SQUAD ${i + 1}`,
    logoUrl: withLogo && i === 0 ? "data:image/png;base64,iVBORw0KGgo=" : null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function render(
  n: number,
  subtitle = "AFTER MATCH 3",
  matchCount = 3,
  opts: { names?: string[]; withLogo?: boolean } = {},
): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "SCRIM",
      subtitle,
      organizer: null,
      standings: standings(n, opts.names, opts.withLogo ?? false),
      matchCount,
    }),
  );
}

describe("pmrc-lime registration + availability", () => {
  it("is registered in every source of truth", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(VALID_TEMPLATE_IDS).toContain(ID);
  });

  it("backs standings only — never MVP or announcement", () => {
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(hasArtForVariant(CONFIG, "mvp")).toBe(false);
    expect(hasArtForVariant(CONFIG, "announcement")).toBe(false);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(selectableAestheticIds("mvp")).not.toContain(ID);
    expect(selectableAestheticIds("announcement")).not.toContain(ID);
  });

  it("ships the blank art as a true 1024×1536 PNG at the exact 2:3 ratio", () => {
    const bytes = readFileSync(`public/templates/pmrc-lime/overall.png`);
    expect(bytes.readUInt32BE(0)).toBe(0x89504e47); // PNG magic, not JPEG-in-.png
    expect(bytes.readUInt32BE(16)).toBe(1024);
    expect(bytes.readUInt32BE(20)).toBe(1536);
    expect(1024 / 1536).toBe(2 / 3);
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings must be art-backed");
    expect(bg.src).toBe("/templates/pmrc-lime/overall.png");
    // Uniform ×1080/1024 upscale to the exact canvas: no crop, no distortion.
    expect(bg.fit).toEqual({ width: 1080, height: 1620, left: 0, top: 0 });
  });

  it("keeps near-black gradient fallbacks for the two artless variants", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#0B0D12");
  });
});

describe("pmrc-lime painted-bar geometry", () => {
  it("uses the exact 1080×1620 canvas and a fixed 12-row pitch", () => {
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    expect(st.rowHeight).toBeLessThanOrEqual(st.rowPitch);
    expect(st.rowPitch).toBe(64.5461);
    expect(st.rowHeight).toBe(53);
    expect(st.fixedRowPitch).toBe(true);
    expect(st.rowsPerColumn).toBe(12);
    expect(st.maxRowsLeft).toBe(12);
    expect(st.ranksBakedIn).toBe(true);
    for (const col of st.columns) {
      expect(col.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn).toBe(true);
    }
  });

  it("seats every text box dead-centre on its painted plate (≤ 2.5px drift)", () => {
    for (let i = 0; i < PLATE_TOPS.length; i++) {
      const paintedCentre = cx((PLATE_TOPS[i] + PLATE_BOTTOMS[i]) / 2);
      const textCentre = st.rowY0 + i * st.rowPitch + st.rowHeight / 2;
      expect(Math.abs(textCentre - paintedCentre)).toBeLessThanOrEqual(2.5);
      if (i > 0) {
        const prevBottom = st.rowY0 + (i - 1) * st.rowPitch + st.rowHeight;
        expect(st.rowY0 + i * st.rowPitch).toBeGreaterThanOrEqual(prevBottom);
      }
    }
  });

  it("keeps row 1 below the baked header and row 12 inside the plate table", () => {
    expect(st.rowY0).toBeGreaterThan(cx(493)); // header bar bottom (art y493)
    const lastBottom = st.rowY0 + 11 * st.rowPitch + st.rowHeight;
    expect(lastBottom).toBeLessThanOrEqual(cx(1225) + 1); // row-12 plate bottom
    expect(lastBottom).toBeLessThan(cx(1299)); // painted bar bottom
  });

  it("splits 24 → 12/12, 16 → 12/4, 25 → 12/13 without dropping a team", () => {
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
  });
});

describe("pmrc-lime stat cells + team/logo compartments", () => {
  it("orders ELIMS(kp) → PLACEMENT(pp) → TOTAL PTS with 50px boxes", () => {
    expect(st.statBoxW).toBe(50);
    for (const col of st.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["kp", "pp", "total"]);
      const sorted = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + st.statBoxW!);
      }
    }
  });

  it("centres each value box on its baked label ink (both tables)", () => {
    for (const [col, centres] of [
      [st.columns[0], INK.left],
      [st.columns[1], INK.right],
    ] as const) {
      for (const key of ["kp", "pp", "total"] as const) {
        const x = col.statColumns.find((c) => c.key === key)!.x;
        expect(Math.abs(x + st.statBoxW! / 2 - centres[key])).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps names and logo plates clear of the baked rules and stat columns", () => {
    const [left, right] = st.columns;
    expect(left.teamX + left.teamW).toBeLessThanOrEqual(left.statColumns[0].x - 5);
    expect(right.teamX + right.teamW).toBeLessThanOrEqual(right.statColumns[0].x - 5);
    // Logo plate sits in the narrow flag/logo compartment before rule 1.
    expect(left.teamX + st.logoPlate!).toBeLessThanOrEqual(cx(172));
    expect(right.teamX + st.logoPlate!).toBeLessThanOrEqual(cx(621));
    // With a logo the name shifts past that rule but still clears the values.
    expect(left.teamX + st.logoNameGap! + (left.teamW - st.logoNameGap!)).toBeLessThanOrEqual(left.statColumns[0].x - 5);
  });

  it("truncates over-long names with CSS ellipsis instead of overflowing", () => {
    const html = render(4, "AFTER MATCH 3", 3, {
      names: ["SUPER CALIFORNIA DREAM TEAM NAME THAT NEVER ENDS"],
    });
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
    expect(html).toContain("SUPER CALIFORNIA DREAM TEAM NAME THAT NEVER ENDS");
  });
});

describe("pmrc-lime dynamic MATCH N brush slot", () => {
  it("declares a dynamic brush prefix instead of a baked subtitle label", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(CONFIG.subtitleBakedIn).toEqual({ standings: false });
    expect(CONFIG.subtitlePrefix).toBe("MATCH ");
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toBe(`400 48px ${BRUSH_FONTS}`);
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#AFEE23");
  });

  it("centres the slot on the measured baked MATCH # ink between the rules", () => {
    const slot = CONFIG.variantHeaders?.standings?.subtitle;
    expect(slot).toBeDefined();
    if (!slot) throw new Error("standings subtitle slot is required");
    // Measured lime ink bbox art x387–599 / y336–392 → canvas centre (520, 384).
    expect(slot.x + (slot.w ?? 0) / 2).toBeCloseTo(cx((387 + 599) / 2), 0);
    expect(slot.y).toBeGreaterThanOrEqual(cx(336));
    expect(slot.y).toBeLessThanOrEqual(cx(392));
    expect(slot.align).toBe("center");
    // The slot stays between the two baked lime rules (canvas 314–377 / 694–764).
    expect(slot.x).toBeGreaterThan(cx(357));
    expect(slot.x + (slot.w ?? 0)).toBeLessThan(cx(658));
  });

  it("reuses headerFor() so mid-session and final results use the same slot", () => {
    expect(headerFor(CONFIG, "standings").subtitle).toEqual(CONFIG.variantHeaders?.standings?.subtitle);
    const mid = render(24, "AFTER MATCH 3", 3);
    const final = render(24, "FINAL RESULTS", 6);
    for (const html of [mid, final]) {
      expect(html).toContain("left:390px");
      expect(html).toContain("top:357px");
      expect(html).toContain("color:#AFEE23");
      expect(html).toContain("var(--font-brush)");
      // The engine emits no baked words and no doubled "MATCH #3".
      expect(html).not.toContain("MATCH #");
      expect(html).not.toContain("MATCH #3");
    }
    // Forward-compatible with the additive `subtitlePrefix` renderer change in
    // the shared tree: it emits ">MATCH 3<" / ">MATCH 6<", this base emits the
    // bare digits. Both satisfy the same measured slot geometry.
    expect(mid).toMatch(/>(?:MATCH )?3</);
    expect(final).toMatch(/>(?:MATCH )?6</);
  });
});

describe("pmrc-lime standings SSR mapping", () => {
  it("splits 24 teams into 12 left + 12 right painted rows", () => {
    const html = render(24);
    expect((html.match(/left:135px/g) ?? []).length).toBe(12);
    expect((html.match(/left:610px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
    for (const x of [285, 358, 456, 757, 830, 928]) expect(html).toContain(`left:${x}px`);
    expect(html).not.toContain(">RANK<"); // baked labels + ranks
    expect(html).not.toContain("SCRIM"); // baked "OVERALL RANKINGS"
  });

  it("fills the left column first at 16 and keeps the 25th overflow", () => {
    const html16 = render(16);
    expect((html16.match(/left:135px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:610px/g) ?? []).length).toBe(4);
    expect(html16).toContain("SQUAD 16");

    const html25 = render(25);
    expect((html25.match(/left:610px/g) ?? []).length).toBe(13);
    expect(html25).toContain("SQUAD 25");
    const tops = [...html25.matchAll(/top:([0-9.]+)px/g)].map((m) => Number(m[1]));
    const overflowTop = st.rowY0 + 12 * st.rowPitch;
    expect(tops.some((top) => Math.abs(top - overflowTop) < 0.01)).toBe(true);
    expect(overflowTop).toBeGreaterThan(cx(1225)); // below the last painted plate
  });

  it("renders the 4-team minimum with no NaN or dropped rows", () => {
    const html = render(4);
    expect((html.match(/left:135px/g) ?? []).length).toBe(4);
    expect(html).not.toContain("left:610px");
    expect(html).not.toContain("NaN");
  });

  it("renders logo plates at teamX and shifts only the name when present", () => {
    const plain = render(4);
    const withLogo = render(4, "AFTER MATCH 3", 3, { withLogo: true });
    expect(plain).not.toContain("data:image/png;base64");
    expect(withLogo).toContain("data:image/png;base64");
    expect(withLogo).toContain("border-radius:50%");
    expect(withLogo).toContain("left:187px"); // teamX 135 + logoNameGap 52
    expect(withLogo).toContain("width:90px"); // teamW 142 − gap 52
  });

  it("survives the Arabic/CJK/katakana torture names", () => {
    const html = render(16, "AFTER MATCH 3", 3, { names: GLYPH_TEAM_NAMES });
    for (const name of GLYPH_TEAM_NAMES) expect(html).toContain(name);
    expect(html).not.toContain("NaN");
    // The canvas stack keeps Noto Sans Symbols 2 + generic sans-serif so the
    // torture glyphs never tofu in the exported PNG.
    const canvasSrc = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(canvasSrc).toContain('const FONT_STACK = \'"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif\';');
  });
});

describe("pmrc-lime contrast + brand law", () => {
  // Per-pixel WCAG means measured on the art (same algorithm as the shared
  // contrast suite): charcoal row interior RGB 28/26.9/27.2, dark MATCH slot
  // RGB 11/15/5.2, near-black watermark zone RGB 20.5/20.5/20.4.
  const ROW_BAR = relativeLuminance({ r: 28, g: 26.9, b: 27.2 });
  const MATCH_SLOT = relativeLuminance({ r: 11, g: 15, b: 5.2 });
  const FOOTER = { r: 20.5, g: 20.5, b: 20.4 };

  it("white names/numerals clear the charcoal bars ≥ 12:1, muted ≥ 7:1", () => {
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.wwcdText).toBe("#FFFFFF");
    expect(st.uniformStatInk).toBe(true);
    expect(st.uniformRowInk).toBe(true);
    expect(ratioOver(ROW_BAR, CONFIG.palette.text)).toBeGreaterThanOrEqual(12);
    expect(ratioOver(ROW_BAR, CONFIG.palette.textMuted)).toBeGreaterThanOrEqual(7);
  });

  it("lime brush digits clear the near-black measured slot ≥ 4.5:1", () => {
    // Intended-ink contrast on the unlit slot backdrop. The art also bakes
    // lime "MATCH #" words in this zone (documented accepted overlap in the
    // README), so this is a palette gate, not a claim about that collision.
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#AFEE23");
    expect(ratioOver(MATCH_SLOT, "#AFEE23")).toBeGreaterThanOrEqual(4.5);
  });

  it("pins 88%-white watermark ink over the gold/black footer ≥ 4.5:1", () => {
    expect(CONFIG.palette.watermarkColor).toBe("rgba(255,255,255,0.88)");
    const a = 0.88;
    const ink = {
      r: 255 * a + FOOTER.r * (1 - a),
      g: 255 * a + FOOTER.g * (1 - a),
      b: 255 * a + FOOTER.b * (1 - a),
    };
    expect(relativeLuminance(ink) > relativeLuminance(FOOTER)).toBe(true);
    const inkLum = relativeLuminance(ink);
    const bgLum = relativeLuminance(FOOTER);
    expect((inkLum + 0.05) / (bgLum + 0.05)).toBeGreaterThanOrEqual(4.5);
    // Position/text stay hardcoded in GraphicCanvas (brand law).
    const src = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(src).toContain("const WATERMARK_SLOT: Slot = { x: 730, y: 1570, w: 280, align: \"right\" };");
    expect(src).toContain("scrimlypro.com");
  });

  it("keeps fallback gradients readable and export dimensions unchanged", () => {
    for (const bg of Object.values(CONFIG.backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
    for (const metal of [CONFIG.palette.medalGold, CONFIG.palette.medalSilver, CONFIG.palette.medalBronze]) {
      expect(ratioOver(relativeLuminance(parseHexColor(metal)), CONFIG.palette.medalText)).toBeGreaterThanOrEqual(3);
    }
    const exportSrc = readFileSync("components/graphics/export.ts", "utf8");
    expect(exportSrc).toContain("const EXPORT_W = 1080;");
    expect(exportSrc).toContain("const EXPORT_H = 1620;");
  });
});

describe("pmrc-lime artless variant SSR smoke", () => {
  it("renders the gradient MVP fallback from locked entries only", () => {
    const entries: MvpDisplayEntry[] = [
      { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
      { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
      { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
      { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
      { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
    ];
    const html = renderToStaticMarkup(
      h(MvpGraphic, { aestheticId: ID, title: "SCRIM", subtitle: "TOP 5 FRAGGERS", organizer: null, entries }),
    );
    expect(html).toContain("ALPHA");
    expect(html).toContain("ECHO");
    expect(html).not.toContain("NaN");
  });

  it("renders the gradient announcement fallback for all 25 teams", () => {
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: ID,
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: standings(25).map((r) => ({ id: r.teamId, name: r.teamName, logoUrl: r.logoUrl })),
      }),
    );
    expect(html).toContain("SQUAD 25");
    expect(html).not.toContain("NaN");
  });
});
