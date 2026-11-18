import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { GLYPH_MVP_PLAYERS } from "@/lib/fixtures/glyphNames";
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
  fitSupercrossNameFontSize,
  supercrossMvpRowSlots,
  supercrossMvpRowTops,
  type MvpDisplayEntry,
} from "@/lib/graphics/mvp";

const ART_PATH = "public/templates/apex-blaze/mvp.jpeg";
const ART_W = 3072;
const ART_H = 5440; // 3072×5440 portrait JPEG, height-fitted to the 2:3 canvas
const SCALE = 1620 / ART_H; // 0.2977941176470588

/** All canvas-space coordinates below were measured off the delivered art
 *  pixels through the fit above (sharp scan, art px × SCALE + X_OFFSET). */
const X_OFFSET = (1080 - ART_W * SCALE) / 2; // 82.588235…

/** Vertical ink bounds [top, bottom] of each baked orange P# / prefix. */
const GLYPH_BANDS: ReadonlyArray<readonly [number, number]> = [
  [901.125, 939.540],
  [968.129, 1006.246],
  [1036.621, 1075.335],
  [1106.007, 1143.529],
  [1175.393, 1214.404],
];
const GLYPH_CENTERS = GLYPH_BANDS.map(([a, b]) => (a + b) / 2);

/** Canvas Y centres of the five baked black horizontal divider rules. */
const DIVIDER_CENTERS = [954.877, 1022.923, 1091.713, 1159.610, 1228.252];

/** Canvas X where each baked orange slash ends (P1/…P5/). */
const SLASH_RIGHT_X = [394.081, 393.485, 393.188, 392.890, 385.147];

/** Canvas X where each baked horizontal rule ends. */
const LINE_RIGHT_X = [778.533, 783.596, 798.188, 804.143, 820.820];

/** JPEG SOF dimensions from header bytes (no decoder dependency). */
function jpegSize(bytes: Buffer): { w: number; h: number } {
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  let pos = 2;
  while (pos + 10 <= bytes.length) {
    if (bytes[pos] !== 0xff) {
      pos += 1;
      continue;
    }
    const marker = bytes[pos + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: bytes.readUInt16BE(pos + 5), w: bytes.readUInt16BE(pos + 7) };
    }
    pos += 2 + bytes.readUInt16BE(pos + 2);
  }
  throw new Error("apex-blaze/mvp.jpeg: no SOF marker");
}

function entries(count = 5): MvpDisplayEntry[] {
  const names = ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"];
  const teams = ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"];
  const kills = [18, 21, 19, 12, 1];
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
      aestheticId: "apex-blaze",
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER NAME",
      entries: list,
    }),
  );
}

/** Every style block that declares the CSS `font` shorthand must declare
 *  `line-height` AFTER it — §13.2 (font resets line-height to normal). */
function fontPrecedesLineHeight(html: string): boolean {
  const blocks = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
  const withFont = blocks.filter((b) => b.includes("font:"));
  return (
    withFont.length > 0 &&
    withFont.every((b) => {
      const fontAt = b.indexOf("font:");
      const lineAt = b.indexOf("line-height:1");
      return lineAt > fontAt;
    })
  );
}

describe("apex-blaze — asset integrity", () => {
  it("ships the delivered 3072×5440 portrait art", () => {
    const bytes = readFileSync(ART_PATH);
    expect(bytes.length).toBeGreaterThan(100_000);
    expect(jpegSize(bytes)).toEqual({ w: ART_W, h: ART_H });
    expect(ART_W / ART_H).toBeCloseTo(3072 / 5440, 8);
  });

  it("pins the measured fit inputs (so a re-export fails loudly)", () => {
    expect(SCALE).toBeCloseTo(0.2977941176470588, 12);
    expect(X_OFFSET).toBeCloseTo(82.58823529411768, 10);
    const pinned = [920.3325, 987.1875, 1055.978, 1124.768, 1194.8985];
    GLYPH_CENTERS.forEach((center, i) => expect(center).toBeCloseTo(pinned[i]!, 6));
  });
});

describe("apex-blaze — registry, config and fallback", () => {
  const config = getTemplate("apex-blaze");

  it("is registered and resolves through the single source of truth", () => {
    expect(AESTHETIC_IDS).toContain("apex-blaze");
    expect(AESTHETICS["apex-blaze"]).toBe(config);
    expect(config.id).toBe("apex-blaze");
    expect(config.name).toBe("Apex Blaze");
    expect(config.canvas).toEqual({ w: 1080, h: 1620 });
  });

  it("points mvp at the art and keeps the whole poster unclipped", () => {
    const bg = config.backgrounds.mvp;
    expect(bg).toMatchObject({ type: "image", src: "/templates/apex-blaze/mvp.jpeg" });
    if (bg.type !== "image" || !bg.fit) throw new Error("apex-blaze needs an image fit");
    const style = imageFitStyle(bg);
    expect(style.objectFit).toBe("fill");
    // Uniform, zero-distortion scale.
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 6);
    expect(Number(style.height)).toBe(1620);
    expect(Number(style.top)).toBe(0);
    // Full width inside the canvas → logo, card and footer are never clipped.
    expect(Number(style.left)).toBeGreaterThan(0);
    expect(Number(style.left) + Number(style.width)).toBeLessThanOrEqual(1080);
    expect(config.canvasBackground).toBe("#121010");
    // Top logo and bottom /// SX1 + KRAFTON lockup land in clear canvas bands.
    expect(500 * SCALE).toBeLessThan(200);
    expect(4700 * SCALE).toBeGreaterThan(1300);
    expect(5100 * SCALE).toBeLessThan(1620);
  });

  it("suppresses the synthetic header, ranks and team slots on MVP", () => {
    expect(config.mvpLayoutStyle).toBe("supercross-row-list");
    expect(config.mvpShowTeam).toBe(false);
    expect(config.mvp.subtitleBakedIn).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    expect(config.variantLabelsBakedIn?.mvp).toBe(true);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).not.toContain("ORGANIZER NAME");
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
  });

  it("falls back to a high-contrast track-asphalt / blaze-orange gradient", () => {
    for (const variant of ["standings", "announcement"] as const) {
      const bg = config.backgrounds[variant];
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toContain("linear-gradient");
      expect(bg.decor.some((d) => d.color === "#EA4400")).toBe(true);
      // Crisp white data ink clears every dark gradient stop (WCAG AAA).
      expect(minContrastAgainstStops(parseHexColor(config.palette.text), bg.css)).toBeGreaterThanOrEqual(7);
      // 82%-white muted ink still clears 4.5 against the brightest dark stop.
      const lum = (r: number, g: number, b: number) => {
        const lin = (c: number) => {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      };
      const inkLum = lum(
        255 * 0.82 + 0x2a * 0.18,
        255 * 0.82 + 0x12 * 0.18,
        255 * 0.82 + 0x08 * 0.18,
      );
      const stopLum = lum(0x2a, 0x12, 0x08);
      expect((inkLum + 0.05) / (stopLum + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the brand-law watermark hardcoded bottom-right and legible on both surfaces", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
    expect(html).toContain(`color:${config.palette.watermarkColor}`);
    // The right-aligned slot ends at x1040 but the height-fitted art ends at
    // x997.4: leading glyphs sit on the white card, trailing glyphs on the
    // #121010 side bar. One ink must clear both (www contrast helpers).
    const lum = ([r, g, b]: number[]) => {
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const over = (a: number[], b: number[]) => {
      const x = lum(a), y = lum(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const ink = [0x7c, 0x7c, 0x7c];
    expect(over(ink, [255, 255, 255])).toBeGreaterThanOrEqual(4);
    expect(over(ink, [18, 16, 16])).toBeGreaterThanOrEqual(4.5);
    expect(X_OFFSET + ART_W * SCALE).toBeLessThan(1040); // proves the split exists
  });
});

describe("apex-blaze — pixel-measured Y centering (≤ 1px)", () => {
  const spec = getTemplate("apex-blaze").mvp.supercross!;

  it("pins all five baked prefix ink bands and divider rule centres", () => {
    expect(GLYPH_BANDS).toHaveLength(5);
    expect(DIVIDER_CENTERS).toHaveLength(5);
    GLYPH_BANDS.forEach(([top, bottom], i) => {
      expect(bottom - top).toBeGreaterThan(30); // cap-height band ~32–39px
      expect(bottom).toBeLessThan(DIVIDER_CENTERS[i]!); // ink sits above the rule
      expect(DIVIDER_CENTERS[i]! - (top + bottom) / 2).toBeGreaterThan(28);
      expect(DIVIDER_CENTERS[i]! - (top + bottom) / 2).toBeLessThan(40);
    });
    expect(spec.rowCenterYs.length).toBe(5);
  });

  it("locks every row midpoint to its baked glyph midpoint within 1px", () => {
    const tops = supercrossMvpRowTops(5, spec);
    expect(tops).toHaveLength(5);
    tops.forEach((top, i) => {
      expect(Math.abs(top + spec.rowHeight / 2 - GLYPH_CENTERS[i]!)).toBeLessThanOrEqual(1);
      expect(Math.abs(top + spec.rowHeight / 2 - spec.rowCenterYs[i]!)).toBeLessThanOrEqual(0.001);
      // The row band bottom is the divider rule — the text never overlaps it.
      expect(top + spec.rowHeight).toBeLessThanOrEqual(DIVIDER_CENTERS[i]! + 2);
      expect(top + spec.rowHeight).toBeGreaterThanOrEqual(DIVIDER_CENTERS[i]! - 2);
    });
  });

  it("keeps the nominal rowY0 / rowPitch honest against the measured art", () => {
    const mvp = getTemplate("apex-blaze").mvp;
    const firstTop = supercrossMvpRowTops(5, spec)[0]!;
    expect(Math.abs(mvp.rowY0 - firstTop)).toBeLessThanOrEqual(0.5);
    const meanPitch = (GLYPH_CENTERS[4]! - GLYPH_CENTERS[0]!) / 4;
    expect(mvp.rowPitch).toBeCloseTo(meanPitch, 1);
    expect(spec.rowPitch).toBeCloseTo(meanPitch, 1);
    // Beyond the baked five, rows extend at the nominal pitch (never squeeze).
    const sixth = supercrossMvpRowTops(6, spec)[5]!;
    expect(sixth).toBeGreaterThan(supercrossMvpRowTops(5, spec)[4]!);
  });
});

describe("apex-blaze — horizontal prefix / rule clearance", () => {
  const spec = getTemplate("apex-blaze").mvp.supercross!;

  it("starts strictly right of every baked orange slash", () => {
    for (const slashRight of SLASH_RIGHT_X) {
      expect(spec.textLeft).toBeGreaterThan(slashRight);
      expect(spec.textLeft - slashRight).toBeGreaterThanOrEqual(8);
    }
  });

  it("seats the readout on the rules without reaching the orange brush", () => {
    const right = spec.textLeft + spec.textWidth;
    expect(right).toBe(spec.textRight);
    // Inside the longest baked rule, within a few px of the others.
    for (const lineRight of LINE_RIGHT_X) {
      expect(Math.abs(right - lineRight)).toBeLessThanOrEqual(45);
      expect(right).toBeLessThanOrEqual(Math.max(...LINE_RIGHT_X));
    }
    // The right-edge orange brush accents start at x≈946 canvas — clear.
    expect(right).toBeLessThan(946);
    expect(spec.kills.reserveWidth).toBeGreaterThan(0);
    expect(spec.nameGap).toBeGreaterThan(0);
  });

  it("keeps long IGNs out of the right-aligned kills box", () => {
    const long = "ABCDEFGHIJKLMNOPQRSTUVWX"; // 24 chars
    const short = fitSupercrossNameFontSize("JO", spec);
    const fitted = fitSupercrossNameFontSize(long, spec);
    expect(fitted).toBeLessThan(short);
    expect(fitted).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(fitted).toBeLessThanOrEqual(spec.name.maxFontSize);
    const slots = supercrossMvpRowSlots(
      { rank: 1, name: long, teamName: "SHOULD NEVER RENDER", kills: 18 },
      getTemplate("apex-blaze").mvp.rowY0,
      spec,
    );
    expect(slots.name.x + slots.name.w).toBeLessThanOrEqual(slots.kills.x);
    expect(slots.kills.x + slots.kills.w).toBeLessThanOrEqual(spec.textRight);
    // 25–30 char names clip with an ellipsis instead of colliding with kills.
    for (const n of [25, 28, 30]) {
      const huge = "W".repeat(n);
      const size = fitSupercrossNameFontSize(huge, spec);
      expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
      const s = supercrossMvpRowSlots({ rank: 1, name: huge, teamName: "X", kills: 18 }, 0, spec);
      expect(s.name.x + s.name.w).toBeLessThanOrEqual(s.kills.x);
    }
  });
});

describe("apex-blaze — SSR + reference typography", () => {
  it("renders uppercase Exo 2, deep-black dual-weight IGNs and kills", () => {
    const html = render();
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("&quot;Exo 2&quot;");
    expect(html).toContain("Rajdhani");
    expect(html).toContain("Noto Sans Symbols 2");
    expect(html).toContain("system-ui");
    expect(html).toContain("color:#0E0E0E");
    // Signature dual weight: 500 first name + 800 surname, 800 kills + 500 unit.
    expect(html).toContain("font:800 34px");
    expect(html).toMatch(/font:500 \d+px/); // 500-weight companion (kills unit here)
    expect(html).toContain("font:800 30px");
    expect(html).toContain("font:500 20px");
    expect(html).toContain("letter-spacing:0.04em");
    expect(html).toContain("letter-spacing:0.05em");
    expect(fontPrecedesLineHeight(html)).toBe(true);
    expect(html.match(/line-height:1/g)?.length).toBeGreaterThanOrEqual(15);
  });

  it("pairs a medium 500 first name with a heavy 800 surname on one line", () => {
    const html = render([
      { rank: 1, name: "JETT LAWRENCE", teamName: "SHOULD NEVER RENDER", kills: 18 },
      { rank: 2, name: "CEDRIC SOUBEYRAS", teamName: "SHOULD NEVER RENDER", kills: 12 },
    ]);
    // Auto-fit steps the size down for longer names — both weights share it.
    expect(html).toMatch(/font:500 (\d+)px/);
    expect(html).toMatch(/font:800 (\d+)px/);
    expect(html).toContain(">JETT</span>");
    expect(html).toContain(">LAWRENCE</span>");
    expect(html).toContain(">CEDRIC</span>");
    expect(html).toContain(">SOUBEYRAS</span>");
    expect(fontPrecedesLineHeight(html)).toBe(true);
    // Whitespace between the weight spans keeps the reference's word gap.
    expect(html).toContain("</span> <span style=");
  });

  it("uses flex row centering with border-box on each measured row band", () => {
    const html = render();
    expect(html).toContain("flex-direction:row");
    expect(html).toContain("align-items:center");
    expect(html).toContain("justify-content:space-between");
    expect(html).toContain("box-sizing:border-box");
    const spec = getTemplate("apex-blaze").mvp.supercross!;
    supercrossMvpRowTops(5, spec).forEach((top) => {
      expect(html).toContain(`top:${top}px`);
    });
    expect(html).toContain(`left:${spec.textLeft}px`);
    expect(html).toContain(`width:${spec.textWidth}px`);
  });

  it("renders singular 1 KILL and plural 18 KILLS on the Y centreline", () => {
    const html = render([
      { rank: 1, name: "SOLO", teamName: "SHOULD NEVER RENDER", kills: 1 },
      { rank: 2, name: "DUO PARTNER", teamName: "SHOULD NEVER RENDER", kills: 18 },
    ]);
    expect(html).toContain(">1</span>");
    expect(html).toContain(">KILL</span>");
    expect(html).toContain(">18</span>");
    expect(html).toContain(">KILLS</span>");
    expect(html).not.toContain("1 KILLS");
    expect(html).not.toContain("18 KILL");
  });

  it("renders glyph-torture names verbatim without team data", () => {
    // Single-token torture names remain byte-identical in the markup (the
    // multi-word dual-weight splitting is covered by the reference test).
    const list: MvpDisplayEntry[] = [
      { rank: 1, name: "×͜×ㅤᏚᴀᴍɪ", teamName: "SHOULD NEVER RENDER", kills: 18 },
      { rank: 2, name: "ABCDEFGHIJKLMNOPQRSTUVWX", teamName: "SHOULD NEVER RENDER", kills: 12 },
      { rank: 3, name: "TFXMAنSOOR", teamName: "SHOULD NEVER RENDER", kills: 24 },
      { rank: 4, name: "invハナン", teamName: "SHOULD NEVER RENDER", kills: 21 },
      ...GLYPH_MVP_PLAYERS.filter((p) => !/\s/u.test(p.name))
        .slice(0, 1)
        .map((p, i) => ({
          rank: i + 5,
          name: p.name,
          teamName: "SHOULD NEVER RENDER",
          kills: p.kills,
        })),
    ];
    const html = render(list);
    for (const player of list) expect(html).toContain(player.name);
    expect(html).not.toContain("SHOULD NEVER RENDER");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    // Every glyph survives the fitted down-size without leaving the row.
    const spec = getTemplate("apex-blaze").mvp.supercross!;
    for (const player of list) {
      const size = fitSupercrossNameFontSize(player.name, spec);
      expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
      expect(size).toBeLessThanOrEqual(spec.name.maxFontSize);
    }
  });

  it.each([0, 1, 3, 4, 5])("renders %i locked entries without gaps or crashes", (count) => {
    const html = render(entries(count));
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/KILLS?<\/span>/g) ?? []).length).toBe(count);
  });
});
