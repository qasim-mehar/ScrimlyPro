import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  getTemplate,
  hideScrimNameFor,
  imageFitStyle,
  labelsBakedInFor,
  parseHexColor,
  relativeLuminance,
} from "@/lib/graphics";
import { fitSlateNameFontSize, mvpKillLabel, slateNameParts } from "@/lib/graphics/mvp";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

const ID = "urban-slate" as const;

// The delivered art is a real 3712×6656 PNG (9:16-ish portrait, not 2:3).
// Height-fit to the 1080×1620 canvas with distortion-free uniform scale.
const ART_W = 3712;
const ART_H = 6656;
const FIT_SCALE = 1620 / ART_H;
const FIT_LEFT = (1080 - ART_W * FIT_SCALE) / 2;
const c = (native: number): number => native * FIT_SCALE + FIT_LEFT;

/** Native painted off-white bar bands (first bright px, last bright px + 1),
 *  measured off mvp.png at x = 0.60·W (a clear point in every open white zone).
 *  The bands are identical ±1px across x = 0.55–0.80·W. */
const BAR_TOPS_NATIVE = [2715, 3275, 3835, 4401, 4967] as const;
const BAR_BOTTOMS_NATIVE = [3206, 3768, 4334, 4900, 5465] as const;
/** Rightmost hard portrait ink per bar (luminance < 205); Bar 5 is the ghillie
 *  sniper's rifle/scope — the furthest-right character pixel in the whole art. */
const PORTRAIT_RIGHT_NATIVE = [1677, 1426, 1623, 1564, 1701] as const;
const BAR_WHITE_RIGHT_NATIVE = 3047;

function entries(count = 5): MvpDisplayEntry[] {
  const names = ["JAYLIN SELLERS", "×͜×ㅤᏚᴀᴍɪ", "OSWINERHUNMWUNSE", "STEFAN VAAKS", "ROLLIE"];
  const teams = ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"];
  const kills = [18, 1, 14, 9, 0];
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

function over(bgLum: number, fgHex: string): number {
  const fg = relativeLuminance(parseHexColor(fgHex));
  return (Math.max(bgLum, fg) + 0.05) / (Math.min(bgLum, fg) + 0.05);
}

/* -------------------------------------------------------------------------- */

describe("urban-slate — asset integrity", () => {
  it("ships a real PNG with the exact measured IHDR dimensions", () => {
    const buf = readFileSync("public/templates/urban-slate/mvp.png");
    expect(buf.length).toBeGreaterThan(1_000_000);
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(buf.readUInt32BE(16)).toBe(ART_W);
    expect(buf.readUInt32BE(20)).toBe(ART_H);
    expect(ART_W / ART_H).toBeCloseTo(0.557692, 6);
  });

  it("ships the Providence reference poster used for the typography", () => {
    expect(readFileSync("public/templates/urban-slate/refrence-image.jpeg").length).toBeGreaterThan(10_000);
  });
});

describe("urban-slate — registry, config & baked-header suppression", () => {
  const config = getTemplate(ID);

  it("is registered and points mvp at the delivered art", () => {
    expect(AESTHETIC_IDS).toContain(ID);
    expect(AESTHETICS[ID]).toBe(config);
    expect(config.id).toBe(ID);
    expect(config.name).toBe("Urban Slate (MVP)");
    expect(config.mvpLayoutStyle).toBe("starting-five-slate-pills");
    expect(config.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/urban-slate/mvp.png",
    });
  });

  it("hides every code-drawn header slot (the art bakes STARTING Five + KRAFTON)", () => {
    expect(config.mvpShowTeam).toBe(false);
    expect(config.mvp.subtitleBakedIn).toBe(true);
    expect(config.subtitleBakedIn?.mvp).toBe(true);
    expect(labelsBakedInFor(config, "mvp")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).toBe(true);
    expect(config.variantHideScrimName?.mvp).toBe(true);
    expect(config.variantLabelsBakedIn?.mvp).toBe(true);
    expect(config.variantHeaders?.mvp?.title?.w).toBe(0);
    expect(config.variantHeaders?.mvp?.subtitle?.w).toBe(0);
    const html = render();
    expect(html).not.toContain("SCRIM NAME");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).not.toContain("ORGANIZER NAME");
  });

  it("paints no team names, logos or avatars", () => {
    const html = render();
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
  });

  it("uses clean dark urban charcoal / slate gradient fallbacks for standings + announcement", () => {
    for (const variant of ["standings", "announcement"] as const) {
      const bg = config.backgrounds[variant];
      expect(bg.type).toBe("gradient");
      if (bg.type !== "gradient") continue;
      expect(bg.css).toContain("linear-gradient");
      expect(bg.css).toContain("#141619");
      expect(bg.css).toContain("#2B2D30");
      expect(bg.decor).toEqual([]);
    }
    expect(config.palette.text).toBe("#F2F2F0");
  });

  it("keeps the brand-law watermark hardcoded bottom-right", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
    expect(config.palette.watermarkColor).toBe("rgba(242,242,240,0.88)");
  });
});

describe("urban-slate — pixel-measured aspect fit & geometry", () => {
  const config = getTemplate(ID);

  it("fits the whole portrait art with zero distortion and zero clipping", () => {
    const bg = config.backgrounds.mvp;
    if (bg.type !== "image" || !bg.fit) throw new Error("urban-slate needs an image fit");
    const style = imageFitStyle(bg);
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 6);
    expect(Number(style.height)).toBeCloseTo(1620, 4);
    expect(Number(style.width)).toBeCloseTo(ART_W * FIT_SCALE, 4);
    expect(Number(style.left)).toBeCloseTo(FIT_LEFT, 4);
    expect(Number(style.top)).toBe(0);
    expect(style.objectFit).toBe("fill");
    // Nothing cropped: the entire art (frame + STARTING Five + KRAFTON) is on canvas.
    expect(Number(style.left)).toBeGreaterThanOrEqual(0);
    expect(Number(style.top)).toBeGreaterThanOrEqual(0);
    expect(Number(style.left) + Number(style.width)).toBeLessThanOrEqual(1080 + 0.001);
    expect(Number(style.top) + Number(style.height)).toBeLessThanOrEqual(1620 + 0.001);
    expect(config.canvasBackground).toBe("#141414");
  });

  it("pins the five measured off-white bar boxes on the 1080×1620 canvas", () => {
    const spec = config.mvp.slatePills!;
    expect(spec.bars).toHaveLength(5);
    spec.bars.forEach((bar, i) => {
      expect(bar.top).toBeCloseTo(c(BAR_TOPS_NATIVE[i]!), 3);
      // The box height is centred on the pixel midpoint of the painted band.
      const bandHeight = (BAR_BOTTOMS_NATIVE[i]! - BAR_TOPS_NATIVE[i]!) * FIT_SCALE;
      expect(Math.abs(bar.height - bandHeight)).toBeLessThanOrEqual(1);
      expect(bar.centerY).toBeCloseTo(c((BAR_TOPS_NATIVE[i]! + BAR_BOTTOMS_NATIVE[i]! - 1) / 2), 3);
      // Internally consistent: centre is exactly top + height/2.
      expect(bar.top + bar.height / 2).toBeCloseTo(bar.centerY, 6);
    });
    // Nominal pitch mirrors the art's measured top deltas (136.3/136.3/137.8/137.8).
    expect(config.mvp.rowPitch).toBeGreaterThan(136);
    expect(config.mvp.rowPitch).toBeLessThan(138);
  });

  it("clears the baked STARTING Five headline and the PUBG MOBILE | KRAFTON footer", () => {
    const spec = config.mvp.slatePills!;
    expect(spec.bars[0]!.top).toBeGreaterThan(700); // headline ends ~y712
    expect(spec.bars[4]!.top + spec.bars[4]!.height).toBeLessThan(1450); // footer starts ~y1465
  });
});

describe("urban-slate — Y-axis row centring (≤1px)", () => {
  const spec = getTemplate(ID).mvp.slatePills!;

  it("every stack midpoint equals its painted bar midpoint within one pixel", () => {
    for (let i = 0; i < 5; i++) {
      const bar = spec.bars[i]!;
      const rowTop = bar.top;
      const rowHeight = bar.height;
      expect(Math.abs(rowTop + rowHeight / 2 - bar.centerY)).toBeLessThanOrEqual(0.001);
      expect(Math.abs(rowTop + rowHeight / 2 - c((BAR_TOPS_NATIVE[i]! + BAR_BOTTOMS_NATIVE[i]! - 1) / 2))).toBeLessThanOrEqual(1);
      expect(bar.centerY).toBeGreaterThan(bar.top);
      expect(bar.centerY).toBeLessThan(bar.top + bar.height);
      expect(bar.centerY).toBeGreaterThan(c(BAR_TOPS_NATIVE[i]!));
      expect(bar.centerY).toBeLessThan(c(BAR_BOTTOMS_NATIVE[i]!));
    }
  });

  it("locks each rendered row box to its exact measured [top, height] and [left, width]", () => {
    const html = render();
    for (const bar of spec.bars) {
      expect(html).toContain(`top:${bar.top}px`);
      expect(html).toContain(`height:${bar.height}px`);
    }
    expect(html).toContain(`left:${spec.textLeft}px`);
    expect(html).toContain(`width:${spec.textWidth}px`);
    // Flex column centred on both axes with border-box sizing (zero drift).
    expect(html).toContain("flex-direction:column");
    expect(html).toContain("justify-content:center");
    expect(html).toContain("align-items:center");
    expect(html).toContain("text-align:center");
    expect(html).toContain("box-sizing:border-box");
  });
});

describe("urban-slate — portrait & sniper-scope clearance", () => {
  it("the open white zone starts right of all five portraits, including Bar 5's scope", () => {
    const spec = getTemplate(ID).mvp.slatePills!;
    const maxPortrait = Math.max(...PORTRAIT_RIGHT_NATIVE);
    expect(maxPortrait).toBe(1701); // Bar 5 ghillie sniper rifle/scope
    expect(spec.textLeft).toBeGreaterThan(c(maxPortrait));
    expect(spec.textLeft - c(maxPortrait)).toBeGreaterThan(10); // safe margin
    expect(spec.textLeft).toBeCloseTo(c(1757), 3);
    // Text zone ends inside the rounded white bar's right inner edge.
    expect(spec.textLeft + spec.textWidth).toBeLessThan(c(BAR_WHITE_RIGHT_NATIVE));
    expect(spec.textLeft + spec.textWidth).toBeCloseTo(c(3002), 3);
  });
});

describe("urban-slate — reference typography, ink & SSR markup", () => {
  const spec = getTemplate(ID).mvp.slatePills!;

  it("renders IGN + KILLS for all five locked entries, never team data", () => {
    const html = render();
    // Two-part names are split into weight spans, so assert their tokens.
    for (const token of ["JAYLIN", "SELLERS", "STEFAN", "VAAKS"]) expect(html).toContain(token);
    for (const name of ["×͜×ㅤᏚᴀᴍɪ", "OSWINERHUNMWUNSE", "ROLLIE"]) expect(html).toContain(name);
    for (const label of ["18 KILLS", "1 KILL", "14 KILLS", "9 KILLS", "0 KILLS"]) expect(html).toContain(label);
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("uses the Rajdhani-first tall condensed stack for IGNs and Exo 2 for KILLS", () => {
    const html = render();
    expect(spec.name.fontFamily).toBe('"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif');
    expect(spec.kills.fontFamily).toBe('"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif');
    expect(html).toContain(`font:800 40px ${spec.name.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain(`font:800 15px ${spec.kills.fontFamily.replaceAll('"', "&quot;")}`);
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:-0.01em");
    expect(html).toMatch(/letter-spacing:0\.10?em/);
  });

  it("renders the dual-weight split for two-token names, all-bold for single tokens", () => {
    expect(slateNameParts("JAYLIN SELLERS")).toEqual({ lead: "JAYLIN ", main: "SELLERS", hasSplit: true });
    expect(slateNameParts("TEAM SAMI")).toEqual({ lead: "TEAM ", main: "SAMI", hasSplit: true });
    expect(slateNameParts("[Clan]ROLLIE")).toEqual({ lead: "[Clan]", main: "ROLLIE", hasSplit: true });
    expect(slateNameParts("ROLLIE")).toEqual({ lead: "", main: "ROLLIE", hasSplit: false });
    const html = render();
    expect(html).toContain('<span style="font-weight:500">JAYLIN </span>');
    expect(html).toContain('<span style="font-weight:800">SELLERS</span>');
    // The locked IGN is preserved byte-for-byte: the separator survives the split.
    expect(html).toContain('JAYLIN </span><span style="font-weight:800">SELLERS</span>');
    expect(html).not.toContain('font-weight:500">OSWINERHUNMWUNSE');
    expect(html).not.toContain('font-weight:500">ROLLIE');
  });

  it("declares lineHeight AFTER every font shorthand on both text lines", () => {
    const html = render();
    // 5 IGN lines + 5 KILLS lines = 10 font shorthands.
    const declarations = html.split("font:").slice(1);
    expect(declarations).toHaveLength(10);
    for (const segment of declarations) {
      expect(segment.replaceAll("&quot;", '"')).toMatch(/^[^;]+;line-height:(0\.94|1\.05);/);
    }
  });

  it("uses deep charcoal ink on the off-white bar and chalk-white on the fallback", () => {
    const html = render();
    expect(html).toContain("color:#181818");
    expect(parseHexColor("#181818")).toEqual({ r: 24, g: 24, b: 24 });
    expect(getTemplate(ID).palette.text).toBe("#F2F2F0");
  });

  it("auto-steps 2–30 char IGNs inside the open zone without wrapping", () => {
    expect(fitSlateNameFontSize("JO", spec)).toBe(spec.name.maxFontSize);
    const long = fitSlateNameFontSize("OSWINERHUNMWUNSE", spec);
    expect(long).toBeLessThan(spec.name.maxFontSize);
    expect(long).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(fitSlateNameFontSize("ABCDEFGHIJKLMNOPQRSTUVWXYZABCD", spec)).toBe(spec.name.minFontSize);
    const html = render();
    expect(html).toContain("white-space:nowrap");
    expect(html).toContain("overflow:hidden");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("max-width:100%");
  });

  it("renders PUBG glyph-torture IGNs verbatim (no throwing, no stripping)", () => {
    const list: MvpDisplayEntry[] = [
      { rank: 1, name: "TFXMAنSOOR", teamName: "SHOULD NEVER RENDER", kills: 24 },
      { rank: 2, name: "SNOW | أحمد", teamName: "SHOULD NEVER RENDER", kills: 21 },
      { rank: 3, name: "×͜×ㅤᏚᴀᴍɪ", teamName: "SHOULD NEVER RENDER", kills: 1 },
      { rank: 4, name: "NMS ≌ 乡 ₛ", teamName: "SHOULD NEVER RENDER", kills: 9 },
      { rank: 5, name: "≌_ₛ", teamName: "SHOULD NEVER RENDER", kills: 4 },
    ];
    const html = render(list);
    for (const entry of list) {
      for (const token of entry.name.split(/\s+/u).filter(Boolean)) expect(html).toContain(token);
    }
    expect(html).not.toContain("SHOULD NEVER RENDER");
  });

  it.each([0, 1, 3, 5, 8])("renders %i locked entries with no gaps or crashes", (count) => {
    const html = render(entries(count));
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect((html.match(/line-height:1\.05;/g) ?? []).length).toBe(Math.min(count, 5));
  });

  it.each([0, 1, 18])("formats %i kills deterministically", (kills) => {
    expect(mvpKillLabel(kills)).toBe(kills === 1 ? "1 KILL" : `${kills} KILLS`);
    const html = render([{ rank: 1, name: "SOLO", teamName: "SHOULD NEVER RENDER", kills }]);
    expect(html).toContain(mvpKillLabel(kills));
  });
});

describe("urban-slate — WCAG contrast", () => {
  it("charcoal #181818 clears AAA on the off-white painted bars", () => {
    const barLum = relativeLuminance(parseHexColor("#EFEFEF"));
    expect(over(barLum, "#181818")).toBeGreaterThanOrEqual(7);
  });

  it("chalk-silver #F2F2F0 clears AA on every fallback gradient stop", () => {
    for (const stop of ["#141619", "#2B2D30"]) {
      expect(over(relativeLuminance(parseHexColor(stop)), "#F2F2F0")).toBeGreaterThanOrEqual(4.5);
    }
  });
});
