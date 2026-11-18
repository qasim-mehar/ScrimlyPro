import { createElement as h } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { GLYPH_MVP_PLAYERS } from "@/lib/fixtures/glyphNames";
import { AESTHETICS, getTemplate, hideScrimNameFor } from "@/lib/graphics";
import { imageFitStyle, labelsBakedInFor } from "@/lib/graphics/layout";
import {
  fitMvpNameFontSize,
  fixedMvpRowTops,
  grungeMvpRowSlots,
  mvpKillLabel,
} from "@/lib/graphics/mvp";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

const ART_W = 4488;
const ART_H = 5608;

/** Bar intervals measured off the delivered art (JPEG-in-.png, native scan).
 *  Each dark bar is a uniform-luminance band (~31 gray) bounded by a bright
 *  grunge separator / red tick. Native art-pixel tops and bottoms: */
const MEASURED_BAR_TOPS = [897, 1795, 2636, 3477, 4374];
const MEASURED_BAR_BOTTOMS = [1682, 2524, 3421, 4262, 5107];

/** Canvas-space bars from the calibration brief (fraction of 1620). */
const BRIEF_FRACTIONS: Array<[number, number]> = [
  [0.136, 0.268],
  [0.28, 0.412],
  [0.423, 0.555],
  [0.567, 0.699],
  [0.71, 0.843],
];

function entries(count = 5): MvpDisplayEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    name: ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"][i] ?? `PLAYER ${i + 1}`,
    teamName: ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"][i] ?? "SQUAD X",
    kills: [24, 21, 19, 17, 15][i] ?? i,
  }));
}

function render(list: MvpDisplayEntry[] = entries()): string {
  return renderToStaticMarkup(
    h(MvpGraphic, {
      aestheticId: "grunge-red",
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: null,
      entries: list,
    }),
  );
}

describe("grunge-red — registration + baked header flags", () => {
  const config = getTemplate("grunge-red");

  it("is registered and points mvp at the delivered art", () => {
    expect(AESTHETICS["grunge-red"]).toBe(config);
    expect(config.id).toBe("grunge-red");
    expect(config.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/grunge-red/mvp.png",
    });
    expect(() => readFileSync("public/templates/grunge-red/mvp.png")).not.toThrow();
  });

  it("suppresses every code-drawn mvp header slot (the art bakes 'MVP LIST')", () => {
    expect(config.mvp.subtitleBakedIn).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    expect(config.variantLabelsBakedIn?.mvp).toBe(true);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
  });

  it("uses clean dark-crimson gradient fallbacks for standings + announcement", () => {
    for (const variant of ["standings", "announcement"] as const) {
      const bg = config.backgrounds[variant];
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toContain("linear-gradient");
      expect(bg.decor).toEqual([]);
    }
  });

  it("keeps the brand-law watermark hardcoded bottom-right", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
    expect(config.palette.watermarkColor).toBe("rgba(255,255,255,0.78)");
  });
});

describe("grunge-red — measured geometry", () => {
  const config = getTemplate("grunge-red");
  const mvp = config.mvp;

  it("renders the portrait art with a uniform (zero-distortion) scale", () => {
    const bg = config.backgrounds.mvp;
    expect(bg.type).toBe("image");
    if (bg.type !== "image" || !bg.fit) throw new Error("grunge-red needs an image fit");
    const style = imageFitStyle(bg);
    const scaleX = Number(style.width) / ART_W;
    const scaleY = Number(style.height) / ART_H;
    expect(scaleX).toBeCloseTo(scaleY, 6); // zero distortion
    expect(style.left).toBeLessThan(0); // portrait art is wider than the 2:3 canvas
    expect(style.top).toBeLessThan(0);
    expect(style.objectFit).toBe("fill"); // pre-scaled uniformly, never stretched
  });

  it("keeps all five rows inside the brief's painted bar Y intervals", () => {
    const tops = fixedMvpRowTops(5, mvp);
    expect(tops).toHaveLength(5);
    tops.forEach((top, i) => {
      const [lo, hi] = BRIEF_FRACTIONS[i]!;
      expect(top).toBeGreaterThanOrEqual(lo * 1620);
      expect(top + mvp.rowHeight).toBeLessThanOrEqual(hi * 1620);
    });
  });

  it("seats rows on the art's measured bar boundaries through the fitted image", () => {
    const bg = config.backgrounds.mvp;
    if (bg.type !== "image" || !bg.fit) throw new Error("grunge-red needs an image fit");
    const { width, height, left, top } = bg.fit;
    const scaleY = height / ART_H;
    const tops = fixedMvpRowTops(5, mvp);
    tops.forEach((rowTop, i) => {
      const artTop = MEASURED_BAR_TOPS[i]! * scaleY + top;
      const artBottom = MEASURED_BAR_BOTTOMS[i]! * scaleY + top;
      // The painted bar (mapped through the uniform fit) brackets the row.
      expect(rowTop).toBeGreaterThanOrEqual(artTop - 14);
      expect(rowTop).toBeLessThanOrEqual(artTop + 14);
      expect(rowTop + mvp.rowHeight).toBeGreaterThanOrEqual(artBottom - 14);
      expect(rowTop + mvp.rowHeight).toBeLessThanOrEqual(artBottom + 14);
    });
    // Horizontal: the art's silhouette zone (x < 31% art) ends before the badge.
    const scaleX = width / ART_W;
    const silhouetteRight = 0.31 * ART_W * scaleX + left;
    expect(silhouetteRight).toBeLessThan(mvp.brush!.badge.x);
    expect(mvp.brush!.badge.x / 1080).toBeGreaterThan(0.31);
  });

  it("uses the starting-five brush lockup and never shows team slots", () => {
    expect(config.mvpLayoutStyle).toBe("starting-five-brush");
    expect(config.mvpShowTeam).toBe(false);
    expect(config.mvp.brush).toBeDefined();
  });

  it("auto-fits long names without crossing the badge or the bar edge", () => {
    const spec = config.mvp.brush!;
    for (const name of ["JO", "ROLLIE", "NMS · TITANIUM", "TFXMAنSOOR × 乡 ≌ ₛ | 24CHARNAME"]) {
      const size = fitMvpNameFontSize(name, spec);
      expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
      expect(size).toBeLessThanOrEqual(spec.name.maxFontSize);
      const slots = grungeMvpRowSlots(
        { rank: 1, name, teamName: "SQUAD ONE", kills: 24 },
        mvp.rowY0,
        spec,
      );
      expect(slots.name.x).toBeGreaterThanOrEqual(slots.badge.x + slots.badge.w);
      expect(slots.name.x + slots.name.w).toBeLessThanOrEqual(0.769 * 1080 + 90); // inside the painted bar
      expect(slots.kills.x + slots.kills.w).toBeLessThanOrEqual(0.769 * 1080 + 90);
    }
  });

  it("renders fewer than five locked entries without gaps or crashes", () => {
    for (const count of [0, 1, 3, 4]) {
      const html = render(entries(count));
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
      expect((html.match(/#\d+ FRAGGER/g) ?? []).length).toBe(count);
    }
  });
});

describe("grunge-red — content + typography", () => {
  it("renders only rank callouts, names, kills and the watermark — never team data", () => {
    const html = render();
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) {
      expect(html).toContain(name);
    }
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
    expect(html).toContain("#1 FRAGGER");
    expect(html).toContain("#5 FRAGGER");
    expect(html).toContain("24 KILLS");
    expect(html).toContain(">24<"); // giant background numeral
    // The watermark is a GraphicCanvas (parent) concern; verified in the
    // baked-header test's full-canvas render above.
  });

  it("uses block white 800/900 names, crimson brush kills and ghost numerals", () => {
    const html = render();
    expect(html).toContain("font:800 56px"); // capped at 56px for short IGNs
    expect(html).toContain("Exo 2"); // React escapes the quotes in the stack
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("color:#E51920");
    expect(html).toContain("rgba(255,255,255,0.055)");
    expect(html).toContain("font:900 152px");
    expect(html).toContain("rotate(-2deg)");
    expect(html).toContain("text-shadow:0 2px 8px rgba(0,0,0,0.7)");
    expect(html).toContain("text-shadow:0 2px 6px rgba(0,0,0,0.85)");
    // Framed rank badge: two 1.5px white rules.
    expect((html.match(/1\.5px solid rgba\(255,255,255,0\.78\)/g) ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it.each([0, 1, 25, 99])("kill label at %i kills", (kills) => {
    expect(mvpKillLabel(kills)).toBe(kills === 1 ? "1 KILL" : `${kills} KILLS`);
    const html = render([
      { rank: 1, name: "SOLO", teamName: "SQUAD ONE", kills },
    ]);
    expect(html).toContain(mvpKillLabel(kills));
  });

  it("renders PUBG glyph-torture names verbatim (no throwing, no stripping)", () => {
    const glyphEntries: MvpDisplayEntry[] = GLYPH_MVP_PLAYERS.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      teamName: "SHOULD NEVER RENDER",
      kills: p.kills,
    }));
    const html = render(glyphEntries);
    for (const player of glyphEntries) expect(html).toContain(player.name);
    expect(html).not.toContain("SHOULD NEVER RENDER");
  });

  it("overlaps the red brush across the bottom of the white name block", () => {
    const spec = getTemplate("grunge-red").mvp.brush!;
    const slots = grungeMvpRowSlots(
      { rank: 1, name: "ROLLIE", teamName: "SQUAD ONE", kills: 24 },
      getTemplate("grunge-red").mvp.rowY0,
      spec,
    );
    const nameBottom = slots.name.y + slots.name.h;
    const overlap = nameBottom - slots.kills.y;
    expect(overlap).toBeGreaterThan(0);
    expect(overlap / slots.name.h).toBeCloseTo(0.18, 1);
  });
});
