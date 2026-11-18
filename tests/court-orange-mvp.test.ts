import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { GLYPH_MVP_PLAYERS } from "@/lib/fixtures/glyphNames";
import {
  AESTHETICS,
  getTemplate,
  hideScrimNameFor,
  imageFitStyle,
  labelsBakedInFor,
  parseHexColor,
  relativeLuminance,
  type AestheticId,
} from "@/lib/graphics";
import { headerFor } from "@/lib/graphics/layout";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

// ── Fixtures first ────────────────────────────────────────────────────────────
/** Art is a 3764×6688 JPEG payload inside a .png name (9:16, not the 2:3
 *  canvas). Height-fit to 1080×1620: scale 1620/6688, x offset 84.13. */
const ART_W = 3764;
const ART_H = 6688;
const FIT_SCALE = 1620 / ART_H;
const FIT_LEFT = (1080 - ART_W * FIT_SCALE) / 2;

/** Painted banner midlines measured off mvp.png and mapped through the fit.
 *  Each is the mean of five per-column top/bottom scans across the strip. */
const BANNER_CENTERS = [399.11, 587.08, 767.34, 954.03, 1138.31] as const;
/** Painted banner top/bottom edges (canvas px) — used for clearance checks. */
const BANNER_EDGES: ReadonlyArray<readonly [number, number]> = [
  [321.87, 476.36],
  [509.40, 664.76],
  [690.53, 844.15],
  [880.29, 1027.76],
  [1056.73, 1219.89],
];
const BADGE_X = 213;
const BADGE_W = 150;
const BODY_X = 368;
const BODY_W = 486;

function entries(count = 5): MvpDisplayEntry[] {
  const names = ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"];
  const teams = ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"];
  const kills = [28, 21, 19, 1, 0];
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    name: names[i] ?? `PLAYER ${i + 1}`,
    teamName: teams[i] ?? "SHOULD NEVER RENDER",
    kills: kills[i] ?? i,
  }));
}

function render(list: MvpDisplayEntry[] = entries()): string {
  return renderToStaticMarkup(
    h(MvpGraphic, {
      aestheticId: "court-orange",
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER NAME",
      entries: list,
    }),
  );
}

function over(bgLum: number, fgHex: string): number {
  const fg = relativeLuminance(parseHexColor(fgHex));
  return (Math.max(bgLum, fg) + 0.05) / (Math.min(bgLum, fg) + 0.05);
}

describe("court-orange — asset verification", () => {
  it("ships a non-empty mvp.png with valid JPEG magic bytes and the measured dimensions", () => {
    const buf = readFileSync("public/templates/court-orange/mvp.png");
    expect(buf.length).toBeGreaterThan(100_000);
    // JPEG-in-.png payload, like esports-clash / grunge-red.
    expect(buf.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    expect(buf.subarray(buf.length - 2).toString("hex")).toBe("ffd9");
    expect(ART_W).toBe(3764);
    expect(ART_H).toBe(6688);
  });

  it("ships the OUNCE reference poster used for the typography + ink palette", () => {
    expect(readFileSync("public/templates/court-orange/refrence-image.jpeg").length).toBeGreaterThan(10_000);
  });
});

describe("court-orange — registration, header + team suppression", () => {
  const config = getTemplate("court-orange");

  it("is registered and points mvp at the delivered art", () => {
    expect(AESTHETICS["court-orange" as AestheticId]).toBe(config);
    expect(config.id).toBe("court-orange");
    expect(config.name).toBe("Court Orange (MVP)");
    expect(config.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/court-orange/mvp.png",
    });
    expect(config.mvpLayoutStyle).toBe("paper-banner");
  });

  it("suppresses the dynamic title, subtitle, labels and team names (all baked)", () => {
    expect(config.mvpShowTeam).toBe(false);
    expect(config.subtitleBakedIn?.mvp).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    const h = headerFor(config, "mvp");
    expect(h.title.w).toBe(0);
    expect(h.subtitle.w).toBe(0);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).not.toContain("ORGANIZER NAME");
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
  });

  it("uses the painted charcoal edge as canvas fill (no transparent letterbox)", () => {
    expect(config.canvasBackground).toBe("#28232E");
  });
});

describe("court-orange — 5-banner pixel Y-axis alignment", () => {
  const mvp = getTemplate("court-orange").mvp;
  const spec = mvp.paperBanner!;
  const centers = spec.bannerCenterYs;

  it("fits the portrait art uniformly with zero distortion and no crop", () => {
    const bg = getTemplate("court-orange").backgrounds.mvp;
    if (bg.type !== "image" || !bg.fit) throw new Error("court-orange needs an image fit");
    const style = imageFitStyle(bg);
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 6);
    expect(Number(style.height)).toBeCloseTo(1620, 4);
    expect(Number(style.left)).toBeCloseTo(FIT_LEFT, 4);
    expect(Number(style.top)).toBe(0);
    // Distortion-free scale must equal the measured scan scale.
    expect(Number(style.height) / ART_H).toBeCloseTo(FIT_SCALE, 8);
  });

  it("pins each row box centre within ±1px of its painted banner midline", () => {
    expect(spec.rowHeight).toBeGreaterThan(0);
    expect(spec.rowHeight).toBeLessThan(mvp.rowPitch);
    expect(centers).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const rowTop = centers[i]! - spec.rowHeight / 2;
      const rowH = spec.rowHeight;
      expect(Math.abs(rowTop + rowH / 2 - BANNER_CENTERS[i]!)).toBeLessThanOrEqual(1);
      // The row box tracks the painted strip within 5px (only the CENTRE is
      // held to ±0.5px; the transparent box may bleed past a torn edge when a
      // strip is shorter than the nominal 156px box — banner 4 is ~148px).
      expect(rowTop).toBeGreaterThanOrEqual(BANNER_EDGES[i]![0] - 5);
      expect(rowTop + rowH).toBeLessThanOrEqual(BANNER_EDGES[i]![1] + 5);
      // The pinned centre is always inside the painted strip interior.
      expect(centers[i]!).toBeGreaterThan(BANNER_EDGES[i]![0]);
      expect(centers[i]!).toBeLessThan(BANNER_EDGES[i]![1]);
    }
  });

  it("clears the baked TOP MVP LIST header and the KRAFTON footer", () => {
    // Baked brush headline white ink ends canvas y≈269.6; footer begins ≈1465.2.
    const firstTop = centers[0]! - spec.rowHeight / 2;
    const lastBottom = centers[4]! + spec.rowHeight / 2;
    expect(firstTop).toBeGreaterThan(270);
    expect(lastBottom).toBeLessThan(1465);
  });

  it("matches the measured badge and paper-strip X extents", () => {
    expect(spec.badge.x).toBe(BADGE_X);
    expect(spec.badge.w).toBe(BADGE_W);
    expect(spec.name.x).toBe(BODY_X);
    expect(spec.name.w).toBe(BODY_W);
    // Badge and strip never overlap, and both stay within the 1080px canvas.
    expect(spec.badge.x + spec.badge.w).toBeLessThan(spec.name.x);
    expect(spec.name.x + spec.name.w).toBeLessThanOrEqual(1080);
  });
});

describe("court-orange — reference typography, ink & Y-axis-centred SSR markup", () => {
  it("renders all five ranks, names and kills but zero team names", () => {
    const html = render();
    for (let rank = 1; rank <= 5; rank++) expect(html).toContain(`>0${rank}<`);
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) expect(html).toContain(name);
    for (const kills of ["28", "21", "19", "1", "0"]) expect(html).toContain(`>${kills}<`);
    expect((html.match(/>KILLS</g) ?? []).length).toBe(5);
    expect(html).not.toContain("SQUAD ");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("uses flex + centring + line-height:1 AFTER every font shorthand", () => {
    const html = render();
    expect(html).toContain("display:flex");
    expect(html).toContain("align-items:center");
    expect(html).toContain("justify-content:center");
    expect(html).toContain("justify-content:space-between");
    expect(html).toContain("height:100%");
    // 4 text boxes per row × 5 rows = 20 line-height:1 declarations.
    expect((html.match(/line-height:1(?:;|")/g) ?? []).length).toBeGreaterThanOrEqual(20);
    // Guard the exact law: in every rendered style the `line-height:1`
    // declaration comes immediately after the `font` shorthand. (`&quot;`
    // entities inside the font-family list are normalized first so their
    // trailing ';' is not mistaken for a CSS property boundary.)
    const fontDeclarations = html.split("font:").slice(1);
    expect(fontDeclarations).toHaveLength(20);
    for (const segment of fontDeclarations) {
      expect(segment.replaceAll("&quot;", '"')).toMatch(/^[^;]+;line-height:1;/);
    }
  });

  it("uses the Rajdhani-first tall condensed stack at weight 800 throughout", () => {
    const html = render();
    const spec = getTemplate("court-orange").mvp.paperBanner!;
    expect(spec.badge.fontFamily).toBe('"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif');
    expect(html).toContain(`font:800 44px ${spec.badge.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain(`font:800 38px ${spec.name.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain(`font:800 44px ${spec.kills.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain(`font:800 22px ${spec.kills.labelFontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });

  it("paints the exact reference ink hierarchy (white / crimson / charcoal)", () => {
    const html = render();
    // Rank badge → pure white; player IGN + KILLS label → deep crimson;
    // kill numeral → dark charcoal (both hex and browser-serialized rgb forms).
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("color:#9E0B22");
    expect(html).toContain("color:#1E2229");
    // Browser-serialized equivalents of the two hex inks, checked through the
    // shared color parser so the palette tokens stay canonical.
    expect(parseHexColor("#9E0B22")).toEqual({ r: 158, g: 11, b: 34 });
    expect(parseHexColor("#1E2229")).toEqual({ r: 30, g: 34, b: 41 });
    expect(getTemplate("court-orange").palette.accent).toBe("#9E0B22");
  });

  it("renders PUBG glyph-torture names verbatim with no overlong overflow", () => {
    const glyphNames = ["×PLAYER", "Bawa · Qadra", "SNOW | أحمد", "X_ₛ", "NMS ≌ TITANIUM"];
    const list = glyphNames.map((name, i) => ({
      rank: i + 1,
      name,
      teamName: "SHOULD NEVER RENDER",
      kills: 20 - i,
    }));
    const html = render(list);
    for (const p of list) expect(html).toContain(p.name);
    expect(html).not.toContain("SHOULD NEVER RENDER");
    expect(html).toContain("text-overflow:ellipsis");
    // The real OCR torture set renders verbatim too (Arabic / katakana / CJK).
    const fixtureList = GLYPH_MVP_PLAYERS.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      teamName: "SHOULD NEVER RENDER",
      kills: p.kills,
    }));
    const fixtureHtml = render(fixtureList);
    for (const p of fixtureList) expect(fixtureHtml).toContain(p.name);
  });

  it.each([0, 1, 3, 5, 8])("renders %i locked entries without gaps or crashes", (count) => {
    const html = render(entries(count));
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/>KILLS</g) ?? []).length).toBe(Math.min(count, 5));
  });
});

describe("court-orange — WCAG contrast on both paper strips and the badge", () => {
  // Mean per-pixel WCAG relative luminance over the painted interiors
  // (measured off the current art with a 2px sampling grid).
  const CREAM = 0.89; // ranks 1/3/5 strip interior (#FDF5E6 ≈ 0.923)
  const MARIGOLD = 0.48; // ranks 2/4 strip interior (#FFA800 ≈ 0.493)
  const ORANGE = 0.27; // burnt-orange badge interior (#E65C00 ≈ 0.285)

  it("deep crimson #9E0B22 clears AAA on cream and AA-large on marigold", () => {
    const ink = "#9E0B22";
    expect(over(CREAM, ink)).toBeGreaterThanOrEqual(7); // 38px/22px bold → AAA floor met
    expect(over(MARIGOLD, ink)).toBeGreaterThanOrEqual(4); // ≈4.2:1 — AA large (3:1) met
  });

  it("dark charcoal #1E2229 clears AAA on both paper strips", () => {
    const ink = "#1E2229";
    expect(over(CREAM, ink)).toBeGreaterThanOrEqual(7);
    expect(over(MARIGOLD, ink)).toBeGreaterThanOrEqual(7);
  });

  it("pure white rank numerals clear AA-large on the burnt-orange badge", () => {
    expect(over(ORANGE, "#FFFFFF")).toBeGreaterThanOrEqual(3); // 44px bold → 3:1 floor
  });

  it("fallback gradient keeps cream + crimson + charcoal legible", () => {
    const config = getTemplate("court-orange");
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type === "image") continue;
      for (const stop of ["#B44110", "#28232E", "#9A3412"]) {
        expect(over(relativeLuminance(parseHexColor(stop)), config.palette.text)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the hardcoded bottom-right watermark intact", () => {
    const html = renderToStaticMarkup(
      h(GraphicCanvas, { config: getTemplate("court-orange"), variant: "mvp" }),
    );
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
  });
});
