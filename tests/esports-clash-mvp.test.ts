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
} from "@/lib/graphics";
import {
  esportsMvpRowSlots,
  fitEsportsNameFontSize,
  fixedMvpRowTops,
  type MvpDisplayEntry,
} from "@/lib/graphics/mvp";

const ART_W = 3764;
const ART_H = 6688; // JPEG payload inside a .png name — 9:16, not the 2:3 canvas

/** Canvas-space painted card intervals, measured off mvp.png after the exact
 *  distortion-free fit (scale 1620/6688, x offset 84.13). */
const CARD_BOUNDS: Array<[number, number]> = [
  [324.8, 556.1],
  [569.2, 798.6],
  [811.0, 1040.8],
  [1054.4, 1284.0],
  [1296.9, 1497.0], // red footer with the PUBG logo starts just below
];

const SAFE_X_MAX = 0.6 * 1080; // 648 — never render text to the right of this

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
      aestheticId: "esports-clash",
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER NAME",
      entries: list,
    }),
  );
}

describe("esports-clash — registration + baked header suppression", () => {
  const config = getTemplate("esports-clash");

  it("is registered and points mvp at the delivered art", () => {
    expect(AESTHETICS["esports-clash"]).toBe(config);
    expect(config.id).toBe("esports-clash");
    expect(config.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/esports-clash/mvp.png",
    });
    expect(() => readFileSync("public/templates/esports-clash/mvp.png")).not.toThrow();
  });

  it("suppresses every code-drawn mvp header slot (the art bakes 'TOP MVP LIST')", () => {
    expect(config.mvp.subtitleBakedIn).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    expect(config.variantLabelsBakedIn?.mvp).toBe(true);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).not.toContain("ORGANIZER NAME");
  });

  it("uses clean dark gradient fallbacks for standings + announcement", () => {
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
    // The watermark slot (x760–1040) clears the baked PUBG logo (x474–605).
    expect(config.palette.watermarkColor).toBe("rgba(255,255,255,0.85)");
  });

  it("paints no team data, logos or avatars", () => {
    expect(config.mvpShowTeam).toBe(false);
    const html = render();
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
  });
});

describe("esports-clash — measured geometry", () => {
  const config = getTemplate("esports-clash");
  const mvp = config.mvp;
  const spec = mvp.esports!;

  it("renders the portrait art with a uniform, zero-distortion fit", () => {
    const bg = config.backgrounds.mvp;
    if (bg.type !== "image" || !bg.fit) throw new Error("esports-clash needs an image fit");
    const style = imageFitStyle(bg);
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 6);
    expect(style.objectFit).toBe("fill");
    expect(Number(style.left)).toBeCloseTo((1080 - Number(style.width)) / 2, 5);
    expect(Number(style.top)).toBe(0);
    // Side bars use the art's own near-black edge ink, never transparency.
    expect(config.canvasBackground).toBe("#1E1E1E");
  });

  it("seats all five entries inside the measured red/blue card intervals", () => {
    const tops = fixedMvpRowTops(5, mvp);
    expect(tops).toHaveLength(5);
    tops.forEach((top, i) => {
      const [lo, hi] = CARD_BOUNDS[i]!;
      expect(top).toBeGreaterThanOrEqual(lo - 2);
      expect(top).toBeLessThanOrEqual(hi - mvp.rowHeight + 2);
      expect(top + mvp.rowHeight).toBeLessThanOrEqual(hi + 1);
    });
    // Fixed pitch mirrors the art's measured 244/242/243/243 top deltas.
    expect(mvp.rowPitch).toBe(243);
  });

  it("keeps every text slot strictly inside the safe left zone (x < 60%)", () => {
    const tops = fixedMvpRowTops(5, mvp);
    tops.forEach((top, i) => {
      const slots = esportsMvpRowSlots(entries()[i]!, top, spec, i);
      for (const box of [slots.rank, slots.name, slots.statLabel, slots.kills]) {
        expect(box.x).toBeGreaterThanOrEqual(0.06 * 1080);
        expect(box.x + box.w).toBeLessThan(SAFE_X_MAX);
        expect(box.y + box.h).toBeLessThanOrEqual(top + spec.rowHeight);
      }
      // The kill glow alternates with the painted red/blue cards.
      expect(slots.kills.glow).toBe(spec.kills.glow[i % 2]!);
    });
  });

  it("clears the baked PUBG logo at the bottom of card 5", () => {
    const lastTop = fixedMvpRowTops(5, mvp)[4]!;
    const slots = esportsMvpRowSlots(entries()[4]!, lastTop, spec, 4);
    expect(slots.kills.y + slots.kills.h).toBeLessThan(1496.7);
  });
});

describe("esports-clash — English-only content", () => {
  it("renders rank, name, TOTAL KILLS, kills and the watermark — nothing else", () => {
    const html = render();
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) {
      expect(html).toContain(name);
    }
    for (let rank = 1; rank <= 5; rank++) {
      expect(html).toContain(`RANK #0${rank}`);
    }
    expect((html.match(/TOTAL KILLS/g) ?? []).length).toBe(5);
    expect(html).toContain(">28<");
    expect(html).toContain(">1<");
    expect(html).toContain(">0<");
    // No Chinese characters anywhere in the English lockup.
    expect(/[\u3400-\u9fff]/u.test(html)).toBe(false);
  });

  it.each([0, 1, 3, 4, 5])("renders %i locked entries without gaps or crashes", (count) => {
    const html = render(entries(count));
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/RANK #0\d/g) ?? []).length).toBe(count);
    expect((html.match(/TOTAL KILLS/g) ?? []).length).toBe(count);
  });

  it.each([0, 1, 28, 99])("showcases the exact kill value at %i kills", (kills) => {
    const html = render([{ rank: 1, name: "SOLO", teamName: "SQUAD ONE", kills }]);
    expect(html).toContain(`>${kills}<`);
    expect(html).toContain("TOTAL KILLS");
  });
});

describe("esports-clash — slanted esports typography", () => {
  const spec = getTemplate("esports-clash").mvp.esports!;

  it("uses heavy italic skew-white names and pure-white black-weight kills", () => {
    const html = render();
    expect(html).toContain(`font:900 44px ${spec.name.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain("font-style:italic");
    expect(html).toContain("transform:skewX(-10deg)");
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("text-shadow:0 2px 10px rgba(0,0,0,0.85)");
    expect(html).toContain(`font:900 36px ${spec.kills.fontFamily.replaceAll('"', "&quot;")}`);
    // Red glow on card 1, blue on card 2.
    expect(html).toContain("0 0 18px rgba(255,45,61,0.55)");
    expect(html).toContain("0 0 18px rgba(45,135,220,0.55)");
  });

  it("uses 700 italic letter-spaced ranks and 700 muted English stat labels", () => {
    const html = render();
    expect(html).toContain("letter-spacing:0.12em");
    expect(html).toContain("color:rgba(255,255,255,0.85)");
    expect(html).toContain("letter-spacing:0.1em");
    expect(html).toContain("color:rgba(255,255,255,0.72)");
    expect(spec.statLabel.text).toBe("TOTAL KILLS");
    expect(spec.rank.fontWeight).toBe(700);
    expect(spec.statLabel.fontWeight).toBe(700);
  });

  it("keeps the full glyph-safe stack (Exo 2 → Rajdhani → Noto Symbols → system-ui)", () => {
    expect(spec.name.fontFamily).toBe(
      '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif',
    );
    for (const font of [spec.rank.fontFamily, spec.name.fontFamily, spec.statLabel.fontFamily, spec.kills.fontFamily]) {
      expect(font).toContain('"Exo 2"');
      expect(font).toContain("Rajdhani");
      expect(font).toContain("Noto Sans Symbols 2");
      expect(font).toContain("system-ui");
    }
  });

  it("auto-fits 2-char to 24-char names without leaving the left safe zone", () => {
    const two = fitEsportsNameFontSize("JO", spec);
    const long = fitEsportsNameFontSize("ABCDEFGHIJKLMNOPQRSTUVWX", spec);
    expect(two).toBe(spec.name.maxFontSize);
    expect(long).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(long).toBeLessThan(two);
    expect(long * 24 * 0.7).toBeLessThanOrEqual(spec.name.w + 40); // skew margin
  });

  it("auto-fits a 20-char clan-tagged glyph name inside the left zone", () => {
    const clanTag = "[Clan]الاسم_الطويل≌";
    const size = fitEsportsNameFontSize(clanTag, spec);
    expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(size).toBeLessThanOrEqual(spec.name.maxFontSize);
    const slots = esportsMvpRowSlots(
      { rank: 1, name: clanTag, teamName: "SQUAD ONE", kills: 28 },
      getTemplate("esports-clash").mvp.rowY0,
      spec,
      0,
    );
    expect(slots.name.text).toBe(clanTag);
    expect(slots.name.x + slots.name.w).toBeLessThan(SAFE_X_MAX);
    const html = render([{ rank: 1, name: clanTag, teamName: "SQUAD ONE", kills: 28 }]);
    expect(html).toContain(clanTag);
    expect(html).not.toContain("SQUAD ONE");
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
    for (const name of ["TFXMAنSOOR", "SNOW | أحمد", "×", "·", "≌", "ₛ", "|", "_"]) {
      const size = fitEsportsNameFontSize(name, spec);
      expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
      expect(size).toBeLessThanOrEqual(spec.name.maxFontSize);
    }
  });
});
