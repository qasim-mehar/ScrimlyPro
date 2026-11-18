import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  getTemplate,
  hideScrimNameFor,
  imageFitStyle,
  labelsBakedInFor,
  minContrastAgainstStops,
  parseHexColor,
} from "@/lib/graphics";
import {
  duskMvpRowSlots,
  duskMvpRowTops,
  fitParchmentNameFontSize,
  fitParchmentSublineFontSize,
  parchmentNameWidthEm,
  parchmentSubline,
} from "@/lib/graphics/mvp";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";

const ID = "dusk-amber" as const;
const ART_W = 3764;
const ART_H = 6688; // JPEG payload inside a .png name — 9:16, not the 2:3 canvas
const SCALE = 1620 / ART_H; // uniform height fit: art drawn 911.734×1620 at x84.13

/** Canvas-space painted tan bar bands, measured off the delivered art with a
 *  row-threshold scan over native x700–1500 (stable for thresholds 200–600). */
const PAINTED_BARS = [
  { topNative: 1413, bottomNative: 2081 },
  { topNative: 2257, bottomNative: 2932 },
  { topNative: 3098, bottomNative: 3769 },
  { topNative: 3933, bottomNative: 4604 },
  { topNative: 4768, bottomNative: 5447 },
];

/** Leftmost solid character/scope ink in the central text band of each bar
 *  (native x, measured lum<120 with sustained-window detection). */
const PORTRAIT_INK_X = [2079, 1964, 2102, 2166, 1668];

function entries(count = 5): MvpDisplayEntry[] {
  const names = ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"];
  const teams = ["TEAM ONE", "TEAM TWO", "TEAM THREE", "TEAM FOUR", "TEAM FIVE"];
  const kills = [18, 15, 12, 1, 9];
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
      aestheticId: ID,
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER NAME",
      entries: list,
    }),
  );
}

/** Minimal JPEG SOF reader — the art is a JPEG inside a .png-named file. */
function imageSize(bytes: Buffer): { w: number; h: number } {
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  let pos = 2;
  while (pos < bytes.length) {
    expect(bytes[pos]).toBe(0xff);
    const marker = bytes[pos + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    pos += 2 + bytes.readUInt16BE(pos + 2);
  }
  throw new Error("JPEG without an SOF marker");
}

describe("dusk-amber — asset integrity", () => {
  it("ships the delivered art with exact magic bytes and pinned dimensions", () => {
    const bytes = readFileSync("public/templates/dusk-amber/mvp.png");
    expect(bytes.length).toBeGreaterThan(1_000_000);
    // ff d8 ff e0 = JPEG SOI + JFIF APP0 (NOT a true PNG, despite the name).
    expect([...bytes.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(imageSize(bytes)).toEqual({ w: ART_W, h: ART_H });
  });
});

describe("dusk-amber — registry + config", () => {
  const config = getTemplate(ID);

  it("is registered in AESTHETICS, AESTHETIC_IDS and the session allowlist", () => {
    expect(AESTHETICS[ID]).toBe(config);
    expect(AESTHETIC_IDS).toContain(ID);
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(config.id).toBe(ID);
    expect(config.name).toBe("Dusk Amber");
    expect(config.canvas).toEqual({ w: 1080, h: 1620 });
  });

  it("points MVP at the delivered art with a uniform, zero-distortion height fit", () => {
    expect(config.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/dusk-amber/mvp.png",
    });
    const style = imageFitStyle(config.backgrounds.mvp);
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 8);
    expect(Number(style.height)).toBe(1620);
    expect(Number(style.top)).toBe(0);
    expect(Number(style.left)).toBeCloseTo((1080 - Number(style.width)) / 2, 5);
    expect(style.objectFit).toBe("fill"); // pre-scaled uniformly, never stretched
    expect(config.canvasBackground).toBe("#1E1A22");
  });

  it("wires the draft-parchment-bars layout and hides team + every header slot", () => {
    expect(config.mvpLayoutStyle).toBe("draft-parchment-bars");
    expect(config.mvpShowTeam).toBe(false);
    expect(config.mvp.parchment).toBeDefined();
    expect(config.mvp.subtitleBakedIn).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantLabelsBakedIn?.mvp).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).not.toContain("ORGANIZER NAME");
  });

  it("falls back to a cohesive dusk-violet → warm-amber gradient on the other variants", () => {
    for (const variant of ["standings", "announcement"] as const) {
      const bg = config.backgrounds[variant];
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toContain("linear-gradient");
      expect(bg.decor).toEqual([]);
      // WCAG: warm-white ink clears 4.5:1 against every gradient stop.
      expect(minContrastAgainstStops(parseHexColor(config.palette.text), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
    expect(config.palette.accent).toBe("#E6B87A");
  });

  it("keeps the brand-law watermark hardcoded bottom-right", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
  });
});

describe("dusk-amber — Y-axis centring math (≤ 1px, all five bars)", () => {
  const spec = getTemplate(ID).mvp.parchment!;

  it("pins the measured painted bar geometry on the 1080×1620 canvas", () => {
    expect(spec.barCenterYs).toHaveLength(5);
    PAINTED_BARS.forEach((bar, i) => {
      const top = bar.topNative * SCALE;
      const bottom = bar.bottomNative * SCALE;
      expect(spec.barCenterYs[i]!).toBeCloseTo((top + bottom) / 2, 1);
      expect(top).toBeGreaterThan(300);
      expect(bottom).toBeLessThan(1400);
    });
    expect(spec.rowHeight).toBeLessThan(
      Math.min(...PAINTED_BARS.map((b) => (b.bottomNative - b.topNative) * SCALE)),
    );
  });

  it.each([1, 2, 3, 4, 5])("rank %i: text-block midpoint == painted bar midpoint", (rank) => {
    const i = rank - 1;
    const bar = PAINTED_BARS[i]!;
    const paintedTop = bar.topNative * SCALE;
    const paintedBottom = bar.bottomNative * SCALE;
    const paintedCenter = (paintedTop + paintedBottom) / 2;

    const slot = duskMvpRowSlots(entries()[i]!, i, spec);
    expect(slot.barCenterY).toBeCloseTo(paintedCenter, 1);
    expect(slot.blockCenterY).toBeCloseTo(paintedCenter, 1); // zero drift
    expect(Math.abs(slot.blockCenterY - paintedCenter)).toBeLessThanOrEqual(1);
    // The whole 156px row (and therefore the text block) sits inside the paint.
    expect(slot.barTop).toBeGreaterThanOrEqual(paintedTop);
    expect(slot.barBottom).toBeLessThanOrEqual(paintedBottom);
    expect(slot.blockTop).toBeGreaterThanOrEqual(slot.barTop);
    expect(slot.blockBottom).toBeLessThanOrEqual(slot.barBottom);
  });

  it("uses exact measured bar centres, never a drifting single pitch", () => {
    const tops = duskMvpRowTops(5, spec);
    expect(tops).toHaveLength(5);
    tops.forEach((top, i) => expect(top).toBeCloseTo(spec.barCenterYs[i]! - spec.rowHeight / 2, 6));
    // The art's pitch genuinely wobbles — a single average would drift >1px.
    const pitches = PAINTED_BARS.slice(1).map((b, i) => (b.topNative - PAINTED_BARS[i]!.topNative) * SCALE);
    expect(Math.max(...pitches) - Math.min(...pitches)).toBeGreaterThan(1);
  });

  it("clears the bar-5 sniper rifle barrel below the text block", () => {
    const slot = duskMvpRowSlots(entries()[4]!, 4, spec);
    // Rifle barrel/shadow starts ≈1293 canvas; the two-line block ends ≈1276.
    expect(slot.blockBottom).toBeLessThan(1290);
  });
});

describe("dusk-amber — portrait clearance", () => {
  const spec = getTemplate(ID).mvp.parchment!;

  it("keeps the right edge of the text box left of every character portrait", () => {
    const rightEdge = spec.textLeft + spec.textWidth;
    expect(rightEdge).toBe(470);
    PAINTED_BARS.forEach((_bar, i) => {
      const portraitCanvas = PORTRAIT_INK_X[i]! * SCALE + (1080 - ART_W * SCALE) / 2;
      expect(rightEdge).toBeLessThan(portraitCanvas - 10);
    });
  });

  it("auto-fits 2-char to 30-char IGNs without crossing the text axis", () => {
    const short = fitParchmentNameFontSize("JO", spec);
    const long = fitParchmentNameFontSize("ABCDEFGHIJKLMNOPQRSTUVWXYZABCD", spec);
    expect(short).toBe(spec.name.maxFontSize);
    expect(long).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(long).toBeLessThan(short);
    const slots = duskMvpRowSlots(
      { rank: 1, name: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCD", teamName: "TEAM ONE", kills: 3 },
      0,
      spec,
    );
    expect(slots.name.x + slots.name.w).toBeLessThanOrEqual(470);
    expect(slots.subline.x + slots.subline.w).toBeLessThanOrEqual(470);
  });
});

describe("dusk-amber — SSR + athletic-block typography", () => {
  it("renders only IGNs and deterministic RANK/KILLS sublines (no team data)", () => {
    const html = render();
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) {
      expect(html).toContain(name);
    }
    for (const team of ["TEAM ONE", "TEAM TWO", "TEAM THREE", "TEAM FOUR", "TEAM FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
    for (let rank = 1; rank <= 5; rank++) {
      expect(html).toContain(`RANK 0${rank} /`);
    }
    expect(html).toContain("18 KILLS");
    expect(html).toContain("1 KILL");
  });

  it("uses uppercase 800–900 Exo 2 names with wide tracking and print shadow", () => {
    const html = render();
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("font:900 46px");
    expect(html).toContain("Exo 2");
    expect(html).toContain("letter-spacing:0.12em");
    expect(html).toContain("letter-spacing:0.16em");
    expect(html).toContain("text-shadow:2px 2px 0 rgba(34, 29, 26, 0.20)");
    expect(html).toContain("color:#221D1A");
    expect(html).toMatch(/font:800 \d+px/); // subline auto-fits to keep KILLS visible
    expect(html).toContain("text-align:right");
    expect(html).toContain("align-items:flex-end");
    expect(html).toContain("box-sizing:border-box");
  });

  it("keeps line-height explicit and AFTER the font shorthand on both lines", () => {
    const html = render();
    // React serializes style object keys in insertion order: `font:` then
    // `line-height:`. If `font` came last it would reset line-height:normal.
    // `&quot;` inside the font stack itself contains a semicolon, so the
    // match must be non-greedy rather than `[^;]*`.
    expect(html).toMatch(/font:900 46px.*?;line-height:1/);
    expect(html).toMatch(/font:800 \d+px.*?;line-height:1/);
  });

  it("renders the full glyph-safe stack and glyph-torture IGNs verbatim", () => {
    const spec = getTemplate(ID).mvp.parchment!;
    expect(spec.name.fontFamily).toBe(
      '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif',
    );
    const torture: MvpDisplayEntry[] = [
      { rank: 1, name: "×͜×ㅤᏚᴀᴍɪ", teamName: "SHOULD NEVER RENDER", kills: 18 },
      { rank: 2, name: "ABCDEFGHIJKLMNOPQRSTUVWX", teamName: "SHOULD NEVER RENDER", kills: 1 },
      { rank: 3, name: "[CLAN]الاسم_≌ₛ", teamName: "SHOULD NEVER RENDER", kills: 7 },
    ];
    const html = render(torture);
    for (const entry of torture) expect(html).toContain(entry.name);
    expect(html).not.toContain("SHOULD NEVER RENDER");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it.each([0, 1, 3, 4, 5])("renders %i locked entries without gaps or crashes", (count) => {
    const html = render(entries(count));
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/RANK 0\d \/ /g) ?? []).length).toBe(count);
  });

  it("formats RANK/KILLS deterministically (01..05, singular KILL)", () => {
    expect(parchmentSubline({ rank: 1, name: "X", teamName: "T", kills: 1 })).toBe("RANK 01 / 1 KILL");
    expect(parchmentSubline({ rank: 5, name: "X", teamName: "T", kills: 18 })).toBe("RANK 05 / 18 KILLS");
  });

  it("fits the KILLS subline inside the text box instead of ellipsizing it", () => {
    const spec = getTemplate(ID).mvp.parchment!;
    for (const kills of [0, 1, 9, 18, 100]) {
      const text = parchmentSubline({ rank: 5, name: "X", teamName: "T", kills });
      const size = fitParchmentSublineFontSize(text, spec.name.maxFontSize, spec);
      // 0.16em tracking is part of the width budget — never let CSS clip KILLS.
      expect(parchmentNameWidthEm(text, 0.16) * size).toBeLessThanOrEqual(spec.textWidth);
      expect(size).toBeGreaterThanOrEqual(10);
      expect(size).toBeLessThanOrEqual(Math.round(spec.name.maxFontSize * spec.subline.ratio));
    }
    // The full 18-kill label steps down from the 52–55% nominal size.
    const long = "RANK 05 / 18 KILLS";
    expect(fitParchmentSublineFontSize(long, 46, spec)).toBeLessThan(Math.round(46 * spec.subline.ratio));
    expect(render()).toContain("RANK 05 / 9 KILLS");
    expect(render()).toContain("18 KILLS");
  });
});
