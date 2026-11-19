import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { GLYPH_MVP_PLAYERS } from "@/lib/fixtures/glyphNames";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hideScrimNameFor,
  imageFitStyle,
  labelsBakedInFor,
  minContrastAgainstStops,
  parseHexColor,
} from "@/lib/graphics";
import {
  fitStartingFiveNameFontSize,
  startingFiveKillsLine,
  startingFiveRowSlots,
  type MvpDisplayEntry,
} from "@/lib/graphics/mvp";

const ART_W = 3764;
const ART_H = 6688; // JPEG payload inside a .png name — 9:16, not the 2:3 canvas
const FIT = { width: 911.73445, height: 1620, left: 84.132775, top: 0 };
const SCALE = FIT.height / ART_H; // 1620/6688
const xCanvas = (x: number) => x * SCALE + FIT.left;

/** Native art-pixel bars, measured with a row-normalized crimson-deviation scan
 *  at x=3700 (clear of all portraits/chevrons). Each [top, bottom] pair maps
 *  through the exact distortion-free fit to a painted bar on the 1080×1620
 *  canvas. Row i's text container spans exactly this interval. */
const BAR_ART: Array<[number, number]> = [
  [1081, 1730],
  [1809, 2441],
  [2516, 3149],
  [3224, 3841],
  [3918, 4541],
];
const BAR_TOPS = BAR_ART.map(([top]) => top * SCALE);
const BAR_BOTTOMS = BAR_ART.map(([, bottom]) => bottom * SCALE);
const BAR_HEIGHTS = BAR_TOPS.map((top, i) => BAR_BOTTOMS[i]! - top);
const BAR_CENTERS = BAR_TOPS.map((top, i) => (top + BAR_BOTTOMS[i]!) / 2);

/** Rightmost painted content inside bar 5: a robust row-normalized deviation
 *  scan finds the ghillie sniper's barrel/scope at art x≈2670 near its lower
 *  edge → canvas x≈731 (a lax threshold reads x≈742 at the blurred bottom row;
 *  textLeft=748 still clears it). The right text zone starts strictly beyond. */
const BAR5_WEAPON_MAX_X = xCanvas(2670);
/** Portrait right edges in bars 1–4 top out at art x≈2189 → canvas x≈614. */
const PORTRAIT_MAX_X = xCanvas(2189);
/** The crimson fill runs to the art's right edge (art x3763 → canvas x995.6). */
const BAR_RIGHT_X = xCanvas(3763);

/** Read a JPEG's SOF dimensions straight from its header bytes (no decoder). */
function jpegSize(buf: Buffer): [number, number] {
  let p = 2;
  while (p + 9 < buf.length) {
    if (buf[p] !== 0xff) {
      p += 1;
      continue;
    }
    const marker = buf[p + 1]!;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      p += 2;
      continue;
    }
    const len = buf.readUInt16BE(p + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return [buf.readUInt16BE(p + 7), buf.readUInt16BE(p + 5)];
    p += 2 + len;
  }
  throw new Error("cardinal-gold/mvp.png: no JPEG SOF marker found");
}

function entries(count = 5): MvpDisplayEntry[] {
  const names = ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"];
  const teams = ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"];
  const kills = [18, 21, 19, 1, 24];
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
      aestheticId: "cardinal-gold",
      title: "SCRIM NAME",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER NAME",
      entries: list,
    }),
  );
}

describe("cardinal-gold — asset integrity", () => {
  it("ships the art as a 3764×6688 JPEG payload inside mvp.png", () => {
    const buf = readFileSync("public/templates/cardinal-gold/mvp.png");
    // The delivered file is a JPEG (SOI ffd8 / JFIF ffd8ffe0) in a .png name.
    expect(buf.subarray(0, 4).toString("hex")).toBe("ffd8ffe0");
    expect(buf.subarray(0, 8).readUInt32BE(0)).not.toBe(0x89504e47);
    expect(jpegSize(buf)).toEqual([ART_W, ART_H]);
  });
});

describe("cardinal-gold — registry + baked-header suppression", () => {
  const config = getTemplate("cardinal-gold");

  it("is registered and resolves by id", () => {
    expect(AESTHETIC_IDS).toContain("cardinal-gold");
    expect(AESTHETICS["cardinal-gold"]).toBe(config);
    expect(getTemplate("cardinal-gold")).toBe(config);
    expect(config.id).toBe("cardinal-gold");
    expect(config.name).toBe("Cardinal Gold");
    expect(config.canvas).toEqual({ w: 1080, h: 1620 });
  });

  it("uses the measured starting-five-crimson layout and hides every baked header slot", () => {
    expect(config.mvpLayoutStyle).toBe("starting-five-crimson");
    expect(config.mvpShowTeam).toBe(false);
    expect(config.mvp.startingFive).toBeDefined();
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

  it("keeps the charcoal/cardinal/gold gradient on standings and art on announcement", () => {
    const standingsBg = config.backgrounds.standings;
    expect(standingsBg.type).toBe("gradient");
    if (standingsBg.type === "gradient") {
      expect(standingsBg.css).toContain("linear-gradient");
      expect(standingsBg.css).toContain("#141210"); // hardwood charcoal
      expect(standingsBg.css).toContain("#9E1B24"); // cardinal crimson swatch
      expect(standingsBg.decor).toEqual([]);
    }
    // The announcement now renders on the baked 2-column participation art.
    expect(config.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/cardinal-gold/announcement.png",
    });
    // WCAG: white ≥7:1 and varsity gold ≥4.5:1 against every gradient stop.
    const text = parseHexColor(config.palette.text);
    const gold = parseHexColor(config.palette.textMuted);
    expect(text).toEqual({ r: 255, g: 255, b: 255 });
    expect(gold).toEqual({ r: 245, g: 196, b: 81 });
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(text, bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(gold, bg.css)).toBeGreaterThanOrEqual(4.5);
    }
    // Medal digit ink clears every metal on the gradient fallback (large-text floor).
    const p = config.palette;
    for (const metal of [p.medalGold, p.medalSilver, p.medalBronze]) {
      expect(contrastRatio(parseHexColor(p.medalText), parseHexColor(metal))).toBeGreaterThanOrEqual(3);
    }
  });

  it("renders the standings gradient fallback normally and the announcement on its 2-column art", () => {
    const standingsHtml = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "cardinal-gold",
        title: "SCRIM",
        subtitle: "AFTER MATCH 1",
        organizer: null,
        standings: [{ teamId: "t0", teamName: "SQUAD 1", logoUrl: null, wwcd: 0, pp: 40, kp: 30, total: 70 }],
        matchCount: 1,
      }),
    );
    expect(standingsHtml).toContain(">RANK<");
    expect(standingsHtml).toContain(">TEAM<");
    expect(standingsHtml).toContain("SQUAD 1");

    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "cardinal-gold",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: [{ id: "t0", name: "SQUAD 1", logoUrl: null }],
      }),
    );
    // Baked "TEAM PARTICIPATION" hero must never be overdrawn by a title.
    expect(annHtml).not.toContain("SCRIM");
    expect(annHtml).toContain(">01<");
    expect(annHtml).toContain("SQUAD 1");
    expect(annHtml).toContain("left:88px");
  });

  it("keeps the brand-law watermark hardcoded bottom-right", () => {
    const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
    expect(contrastRatio(parseHexColor("#FFFFFF"), parseHexColor("#141210"))).toBeGreaterThan(15);
  });

  it("paints no team names, team logos or synthetic titles", () => {
    const html = render();
    for (const team of ["SQUAD ONE", "SQUAD TWO", "SQUAD THREE", "SQUAD FOUR", "SQUAD FIVE"]) {
      expect(html).not.toContain(team);
    }
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
  });
});

describe("cardinal-gold — measured geometry (1080×1620 canvas)", () => {
  const config = getTemplate("cardinal-gold");
  const spec = config.mvp.startingFive!;

  it("fits the 9:16 art uniformly by height so no baked artwork is clipped", () => {
    const bg = config.backgrounds.mvp;
    if (bg.type !== "image" || !bg.fit) throw new Error("cardinal-gold needs an image fit");
    const style = imageFitStyle(bg);
    expect(Number(style.width) / ART_W).toBeCloseTo(Number(style.height) / ART_H, 6);
    expect(style.objectFit).toBe("fill"); // pre-scaled uniformly, never stretched
    expect(Number(style.height)).toBe(1620);
    expect(Number(style.top)).toBe(0);
    expect(Number(style.left)).toBeCloseTo((1080 - Number(style.width)) / 2, 5);
    // Letterbox side bars are filled with the art's own hardwood-black ink.
    expect(config.canvasBackground).toBe("#141210");
    // STARTING top edge (art y515) and PUBG MOBILE | KRAFTON footer bottom
    // (art y5823) both map inside [0,1620] — nothing baked is cut off.
    expect(515 * SCALE).toBeGreaterThan(0);
    expect(5823 * SCALE).toBeLessThan(1620);
  });

  it("pins the exact top/height/centre of all five painted crimson bars", () => {
    expect(spec.barTops.length).toBe(5);
    expect(spec.barBottoms.length).toBe(5);
    BAR_TOPS.forEach((top, i) => expect(spec.barTops[i]).toBeCloseTo(top, 3));
    BAR_BOTTOMS.forEach((bottom, i) => expect(spec.barBottoms[i]).toBeCloseTo(bottom, 3));
    BAR_HEIGHTS.forEach((height, i) => expect(spec.barBottoms[i]! - spec.barTops[i]!).toBeCloseTo(height, 3));
    BAR_CENTERS.forEach((center, i) =>
      expect(spec.barTops[i]! + (spec.barBottoms[i]! - spec.barTops[i]!) / 2).toBeCloseTo(center, 3),
    );
  });

  it("centres every stacked text block on its bar within ≤1px", () => {
    const list = entries();
    const markup = render(list);
    BAR_TOPS.forEach((top, i) => {
      const s = startingFiveRowSlots(list[i]!, i, spec);
      // The DOM container is exactly the painted bar interval ...
      expect(s.top).toBeCloseTo(top, 3);
      expect(s.top + s.height).toBeCloseTo(BAR_BOTTOMS[i]!, 3);
      expect(s.height).toBeCloseTo(BAR_HEIGHTS[i]!, 3);
      // ... and flex-centring the two-line group makes its midpoint the bar's
      // exact measured centre (zero drift, no pitch accumulation).
      expect((s.top + (s.top + s.height)) / 2).toBeCloseTo(s.centerY, 6);
      expect(s.centerY).toBeCloseTo(BAR_CENTERS[i]!, 3);
      expect(s.centerY).toBeCloseTo(top + s.height / 2, 3);
      expect(Math.abs((s.top + s.height / 2) - BAR_CENTERS[i]!)).toBeLessThanOrEqual(1);
      // The rendered container is locked to that exact interval.
      expect(markup).toContain(`top:${s.top}px`);
      expect(markup).toContain(`height:${s.height}px`);
    });
  });

  it("seats the text box right of every portrait, including bar 5's sniper barrel", () => {
    expect(spec.textLeft).toBeGreaterThan(PORTRAIT_MAX_X + 20); // bars 1–4
    expect(spec.textLeft).toBeGreaterThan(BAR5_WEAPON_MAX_X + 10); // bar 5 rifle
    expect(spec.textLeft + spec.textWidth).toBeLessThan(BAR_RIGHT_X - 20); // right padding
    for (let i = 0; i < 5; i++) {
      const s = startingFiveRowSlots(entries()[i]!, i, spec);
      expect(s.textLeft).toBe(spec.textLeft);
      expect(s.textWidth).toBe(spec.textWidth);
      expect(s.textLeft).toBeGreaterThan(BAR5_WEAPON_MAX_X);
      expect(s.textLeft + s.textWidth).toBeLessThan(BAR_RIGHT_X);
    }
  });

  it("uses the fixed five-row bar geometry for all 5 locked entries", () => {
    for (const count of [0, 1, 3, 4, 5]) {
      const html = render(entries(count));
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
      expect((html.match(/text-align:right/g) ?? []).length).toBe(count * 2);
    }
  });
});

describe("cardinal-gold — reference typography + content (SSR)", () => {
  const spec = getTemplate("cardinal-gold").mvp.startingFive!;

  it("renders a crisp white kills line and a warm varsity-gold IGN in uppercase 800", () => {
    const html = render();
    expect(html).toContain("#1 • 18 KILLS");
    expect(html).toContain("#4 • 1 KILL");
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("color:#F5C451");
    expect(html).toContain(`font:800 ${spec.kills.fontSize}px`);
    expect(html).toContain(`font:800 ${spec.name.maxFontSize}px`);
    expect((html.match(/text-transform:uppercase/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(html).toContain("letter-spacing:0.08em");
    expect(html).toContain("letter-spacing:0.05em");
    for (const name of ["ROLLIE", "CONNOR", "BRICE", "JIWAN", "BRAXTON"]) expect(html).toContain(name);
  });

  it("uses the full glyph-safe athletic stack with Exo 2 leading", () => {
    const html = render();
    for (const face of [spec.kills.fontFamily, spec.name.fontFamily]) {
      expect(face).toBe('"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif');
    }
    for (const token of ["Exo 2", "Rajdhani", "Noto Sans Symbols 2", "system-ui"]) expect(html).toContain(token);
  });

  it("right-aligns inside the crimson zone and preserves line-height AFTER font", () => {
    const html = render();
    expect(html).toContain("text-align:right");
    expect(html).toContain("align-items:flex-end");
    expect(html).toContain("flex-direction:column");
    expect(html).toContain("justify-content:center");
    expect(html).toContain("box-sizing:border-box");
    // CSS font-shorthand law (§13.2): lineHeight MUST follow font or the
    // shorthand resets it to `normal` and breaks vertical centring.
    expect(html).toMatch(/font:800 21px[^"]*line-height:1\.1/);
    expect(html).toMatch(/font:800 30px[^"]*line-height:1\.08/);
    expect(html).not.toMatch(/line-height:[^"']*font:800/);
  });

  it.each([0, 1, 18, 99])("formats the kills line deterministically at %i kills", (kills) => {
    expect(startingFiveKillsLine(1, kills)).toBe(kills === 1 ? "#1 • 1 KILL" : `#1 • ${kills} KILLS`);
    const html = render([{ rank: 1, name: "SOLO", teamName: "SQUAD ONE", kills }]);
    expect(html).toContain(startingFiveKillsLine(1, kills));
    expect(html).not.toContain("SQUAD ONE");
  });

  it("steps down long IGNs and keeps them inside the open right zone", () => {
    const short = fitStartingFiveNameFontSize("JO", spec);
    const long = fitStartingFiveNameFontSize("ABCDEFGHIJKLMNOPQRSTUVWX", spec);
    expect(short).toBe(spec.name.maxFontSize);
    expect(long).toBeGreaterThanOrEqual(spec.name.minFontSize);
    expect(long).toBeLessThan(short);
    const html = render([{ rank: 1, name: "ABCDEFGHIJKLMNOPQRSTUVWX", teamName: "SQUAD ONE", kills: 18 }]);
    expect(html).toContain(`font:800 ${long}px`);
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
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
    for (const name of ["×͜×ㅤᏚᴀᴍɪ", "TFXMAنSOOR", "SNOW | أحمد", "ＮＣＴ FEAr"]) {
      const size = fitStartingFiveNameFontSize(name, spec);
      expect(size).toBeGreaterThanOrEqual(spec.name.minFontSize);
      expect(size).toBeLessThanOrEqual(spec.name.maxFontSize);
    }
  });
});
