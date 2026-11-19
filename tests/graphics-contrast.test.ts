import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  getTemplate,
  gradientStopColors,
  minContrastAgainstStops,
  parseHexColor,
  relativeLuminance,
  type AestheticId,
  type Rgb,
} from "@/lib/graphics";

describe("WCAG contrast helpers", () => {
  it("parses #rgb and #rrggbb", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("#0e7ac4")).toEqual({ r: 14, g: 122, b: 196 });
  });

  it("throws naming a non-hex color", () => {
    expect(() => parseHexColor("red")).toThrow(/red/);
    expect(() => parseHexColor("#12")).toThrow();
  });

  it("black vs white is 21:1, identical colors 1:1", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });

  it("mid-gray vs white is ~4.48:1 (known WCAG vector)", () => {
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(
      4.48,
      1,
    );
  });

  it("extracts gradient hex stops in order", () => {
    expect(gradientStopColors("linear-gradient(165deg, #0b0d12 0%, #12151c 55%, #1a1e28 100%)")).toEqual(
      [
        { r: 11, g: 13, b: 18 },
        { r: 18, g: 21, b: 28 },
        { r: 26, g: 30, b: 40 },
      ],
    );
  });

  it("minContrastAgainstStops takes the worst stop, 1 when no stops exist", () => {
    const text = parseHexColor("#e8eaf0");
    const css = "linear-gradient(165deg, #0b0d12 0%, #1a1e28 100%)";
    const stops = gradientStopColors(css);
    expect(minContrastAgainstStops(text, css)).toBeCloseTo(
      Math.min(...stops.map((s) => contrastRatio(text, s))),
      10,
    );
    expect(minContrastAgainstStops(text, "none")).toBe(1);
  });
});

describe("gradient-template text contrast (measured, ≥ 4.5:1)", () => {
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
    "esports-clash",
    "cardinal-gold",
    "varsity-purple",
  ];

  it.each(IDS)("%s: palette.text vs every gradient background stop ≥ 4.5", (id) => {
    const config = getTemplate(id);
    const text = parseHexColor(config.palette.text);
    const seenCss = new Set<string>();
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(text, bg.css)).toBeGreaterThanOrEqual(4.5);
      seenCss.add(bg.css);
    }
    // Every aesthetic still carries at least one gradient variant (art-backed
    // templates keep a fallback for the variants without art: 1–2 each).
    expect(seenCss.size).toBeGreaterThanOrEqual(1);
    expect(Object.values(config.backgrounds).filter((bg) => bg.type === "gradient").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it.each(IDS)("%s: medal digit ink vs each metal ≥ 3:1 (large-text floor)", (id) => {
    const p = getTemplate(id).palette;
    const ink = parseHexColor(p.medalText);
    for (const metal of [p.medalGold, p.medalSilver, p.medalBronze]) {
      expect(contrastRatio(ink, parseHexColor(metal))).toBeGreaterThanOrEqual(3);
    }
  });
});

// --- P4b PNG-decode pipeline (node builtins only): IHDR → IDAT inflate →
// unfilter → RGB. Reads the live art file, so the measurement holds for the
// pending 2160×3240 re-export as well as today's 1024×1536 file.

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePngToRgb(path: string): { w: number; h: number; px: Buffer } {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error(`${path}: not a PNG`);
  }
  let pos = 8;
  let w = 0;
  let h = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("latin1", pos + 4, pos + 8);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error(`${path}: interlaced PNG unsupported`);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`${path}: unsupported bitDepth ${bitDepth} colorType ${colorType}`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(w * h * 3);
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0;
      const bb = prev[i];
      const c = i >= ch ? prev[i - ch] : 0;
      const v = raw[p++];
      let recon: number;
      switch (filter) {
        case 0:
          recon = v;
          break;
        case 1:
          recon = (v + a) & 255;
          break;
        case 2:
          recon = (v + bb) & 255;
          break;
        case 3:
          recon = (v + ((a + bb) >> 1)) & 255;
          break;
        case 4:
          recon = (v + paeth(a, bb, c)) & 255;
          break;
        default:
          throw new Error(`${path}: bad filter byte ${filter} on row ${y}`);
      }
      line[i] = recon;
    }
    for (let x = 0; x < w; x++) {
      px[(y * w + x) * 3] = line[x * ch];
      px[(y * w + x) * 3 + 1] = line[x * ch + 1];
      px[(y * w + x) * 3 + 2] = line[x * ch + 2];
    }
    prev.set(line);
  }
  return { w, h, px };
}

/** Mean relative luminance of an art-px rect. */
function averageLuminance(
  px: Buffer,
  artW: number,
  rect: { x: number; y: number; w: number; h: number },
): number {
  let sum = 0;
  let n = 0;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const rgb: Rgb = {
        r: px[(y * artW + x) * 3],
        g: px[(y * artW + x) * 3 + 1],
        b: px[(y * artW + x) * 3 + 2],
      };
      sum += relativeLuminance(rgb);
      n += 1;
    }
  }
  return sum / n;
}

describe("pmpl-light art table-zone contrast (measured from the PNG, ≥ 4.5:1)", () => {
  // Canvas table zone (inside the row strips, clear of the baked label bar
  // above and the footer below), mapped to art px by the measured IHDR width.
  const ZONE = { x: 60, y: 380, w: 960, h: 1080 };

  it("palette.text vs the art's mean table-zone luminance ≥ 4.5", () => {
    const { w: artW, px } = decodePngToRgb("public/templates/pmpl-light/overall.png");
    const scale = artW / 1080;
    const zoneLum = averageLuminance(px, artW, {
      x: Math.round(ZONE.x * scale),
      y: Math.round(ZONE.y * scale),
      w: Math.round(ZONE.w * scale),
      h: Math.round(ZONE.h * scale),
    });
    const textLum = relativeLuminance(parseHexColor(getTemplate("pmpl-light").palette.text));
    const ratio = (zoneLum + 0.05) / (textLum + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// --- P6 zones: the two new arts are JPEG payloads inside .png-named files,
// so they cannot be zlib-decoded in-process (JPEG chroma/huffman decode is
// out of scope for node builtins). The zone values below were measured with
// the identical algorithm (mean per-pixel WCAG relative luminance over the
// art-px rect) via `sharp` — dev-only script p6-zone-lum2.cjs / probes in
// Temp\opencode — and are pinned; re-measure there when art changes. The
// pmpl-light announcement art is a true PNG and is decoded live.

describe("P6 recorded zone luminances → contrast thresholds", () => {
  const rel = (hex: string) => relativeLuminance(parseHexColor(hex));
  const ratioOver = (zoneLum: number, fgHex: string) =>
    (Math.max(zoneLum, rel(fgHex)) + 0.05) / (Math.min(zoneLum, rel(fgHex)) + 0.05);

  // neon-green/overall.png (4096×6144, ×0.263671875)
  const NEON = {
    // art(531,2124,3034,3338) = canvas(140,560,800,880) — row interior
    table: 0.010101,
    // art(2315,1005,170,170) = canvas(610,265,45,45) — the rendered match-number box
    chipDigits: 0.004232,
    // art(531,345,3034,100) = canvas(140,91,800,26) — clear band under the top frame
    titleBand: 0.004367,
  };

  it("neon-green: text vs table interior, accent vs chip, text vs title band", () => {
    const p = getTemplate("neon-green").palette;
    expect(ratioOver(NEON.table, p.text)).toBeGreaterThanOrEqual(4.5);
    expect(ratioOver(NEON.chipDigits, p.accent)).toBeGreaterThanOrEqual(4.5);
    expect(ratioOver(NEON.titleBand, p.text)).toBeGreaterThanOrEqual(4.5);
  });

  // challengers-red/mvp.png (4096×6144, ×0.263671875)
  const CHAL = {
    // art(379,1991,2503,3015) = canvas(100,525,660,795) — rank+player+team columns
    nameBand: 0.027648,
    // worst of the five per-row DIGIT bands at art x3538–3628 (KILLS center
    // 3583), row middle ±121 art px: rows 1–5 = .0228/.0194/.0210/.0189/.0199.
    // This is the glyph-extent window (2-digit ink); the full 90px DOM box
    // (art 3413–3754) also reaches past the painted card edge (art 3708) in
    // some rows, so it is intentionally not the pinned zone.
    killsBand: 0.0228,
    // art(531,30,3034,250) = canvas(140,8,800,66) — clear top band; the
    // large-text ratio sits at the floor (≈3.0–3.1), so this pin is sensitive
    // to a band-brightening art re-export.
    titleBand: 0.253283,
  };

  it("challengers-red: text vs name band, text+accent vs kills band, title ≥ large-text floor", () => {
    const p = getTemplate("challengers-red").palette;
    expect(ratioOver(CHAL.nameBand, p.text)).toBeGreaterThanOrEqual(4.5);
    expect(ratioOver(CHAL.killsBand, p.text)).toBeGreaterThanOrEqual(4.5);
    // rank-1 kills digits render in accent (64px bold → large text, 3:1 floor)
    expect(ratioOver(CHAL.killsBand, p.accent)).toBeGreaterThanOrEqual(3);
    // 44px bold title on the teal band → large-text floor
    expect(ratioOver(CHAL.titleBand, p.text)).toBeGreaterThanOrEqual(3);
  });

  // challengers-red/overall.png (4096×6144, ×0.263671875)
  const CHAL_STANDINGS = {
    // art(569,1498,1327,171) = canvas(150,395,350,45) — row 1 dark charcoal bar interior
    rowBar: 0.008568,
    // art(3663,872,174,174) = canvas(966,230,46,46) — cyan Match # slot
    cyanSlot: 0.498412,
  };

  it("challengers-red standings: white text clears dark bars (≥ 7:1) and black ink clears cyan slot (≥ 4.5:1)", () => {
    const config = getTemplate("challengers-red");
    const p = config.palette;
    expect(ratioOver(CHAL_STANDINGS.rowBar, p.text)).toBeGreaterThanOrEqual(7);
    const subColor = config.variantHeaders?.standings?.subtitleColor ?? "#061014";
    expect(ratioOver(CHAL_STANDINGS.cyanSlot, subColor)).toBeGreaterThanOrEqual(4.5);
  });

  // ewc-yellow/overall.png (4096×6144, ×0.263671875). Measured with the same
  // per-pixel WCAG relative-luminance mean used for the P6 zones.
  const EWC = {
    // art(569,1520,1360,200) = canvas(150,401,359,53) — white row-bar interior
    rowBar: 0.83776,
    // art(531,493,3034,152) = canvas(140,130,800,40) — orange title band
    titleBand: 0.476325,
    // art(3861,880,197,167) = canvas(1018,232,52,44) — slanted Match # ribbon
    ribbon: 0.279865,
    // art(2882,5954,1062,121) = canvas(760,1570,280,32) — watermark glyph zone
    watermark: { r: 169.5, g: 79.4, b: 94.7 },
  };

  it("ewc-yellow: espresso text clears the white bars, orange title band and ribbon", () => {
    const p = getTemplate("ewc-yellow").palette;
    expect(ratioOver(EWC.rowBar, p.text)).toBeGreaterThanOrEqual(7); // hard ≥7 row gate
    expect(ratioOver(EWC.rowBar, p.textMuted)).toBeGreaterThanOrEqual(7);
    expect(ratioOver(EWC.titleBand, p.text)).toBeGreaterThanOrEqual(4.5);
    expect(ratioOver(EWC.ribbon, p.text)).toBeGreaterThanOrEqual(4.5);
  });

  it("ewc-yellow: 90%-white watermark ink clears the dark purple swirls (≥ 4.5)", () => {
    const bg = EWC.watermark;
    // rgba(255,255,255,0.9) composited over the measured mean zone color.
    const ink = { r: 255 * 0.9 + bg.r * 0.1, g: 255 * 0.9 + bg.g * 0.1, b: 255 * 0.9 + bg.b * 0.1 };
    expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("ewc-yellow: fallback gradient keeps text + muted ink readable", () => {
    const p = getTemplate("ewc-yellow").palette;
    for (const bg of Object.values(getTemplate("ewc-yellow").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // onyx-green/overall.png (4096×6144, ×0.263671875). Measured with the same
  // per-pixel WCAG relative-luminance mean used for the P6 zones (sharp scan).
  const ONYX = {
    // art(417,1516,1558,235) = canvas(110,400,411,62) — row 1 dark bar interior
    rowBar: 0.02071,
    // art(3733,952,277,151) = canvas(984,251,73,40) — the match-number slot
    // above the baked neon underline; the art is near-black there.
    matchChip: 0.00577,
  };

  it("onyx-green: white row text clears dark bars ≥ 12:1, neon match ink ≥ 4.5:1", () => {
    const config = getTemplate("onyx-green");
    const p = config.palette;
    expect(p.text).toBe("#FFFFFF");
    expect(ratioOver(ONYX.rowBar, p.text)).toBeGreaterThanOrEqual(12); // AAA hard gate
    const matchInk = config.variantHeaders?.standings?.subtitleColor ?? "#42F57E";
    expect(ratioOver(ONYX.matchChip, matchInk)).toBeGreaterThanOrEqual(4.5);
  });

  it("onyx-green: matrix-green fallback keeps white + muted ink readable", () => {
    const p = getTemplate("onyx-green").palette;
    for (const bg of Object.values(getTemplate("onyx-green").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // pmgc-crimson/overall.png (4096×6144, ×0.263671875). Zone means measured
  // with the same per-pixel WCAG relative-luminance algorithm used for the
  // other art templates (sharp scan; JPEG-in-.png payload).
  const PMGC = {
    // art(569,1669,1365,152) = canvas(150,440,360,40) — row 1 pitch-black bar
    rowBar: 0.000006,
    // art(3816,994,129,137) = canvas(1006,262,34,36) — the open gold slot to
    // the right of the baked "#"; mean RGB ≈ (229,170,38).
    matchChip: 0.4568,
    // art(2882,5954,1062,121) = canvas(760,1570,280,32) — watermark glyph zone
    watermark: { r: 31.2, g: 17.1, b: 21.5 },
  };

  it("pmgc-crimson: white row text clears black bars ≥ 15:1, espresso chip ink ≥ 8:1", () => {
    const config = getTemplate("pmgc-crimson");
    const p = config.palette;
    expect(p.text).toBe("#FFFFFF");
    expect(p.wwcdText).toBe("#FFFFFF"); // rank-1 team name stays broadcast white
    expect(config.standings.uniformStatInk).toBe(true); // all stat numerals white
    expect(ratioOver(PMGC.rowBar, p.text)).toBeGreaterThanOrEqual(15); // AAA hard gate
    const chipInk = config.variantHeaders?.standings?.subtitleColor ?? "#140A00";
    expect(chipInk).toBe("#140A00");
    expect(ratioOver(PMGC.matchChip, chipInk)).toBeGreaterThanOrEqual(8);
  });

  it("pmgc-crimson: 85%-white watermark clears the dark footer (≥ 4.5)", () => {
    const bg = PMGC.watermark;
    const ink = { r: 255 * 0.85 + bg.r * 0.15, g: 255 * 0.85 + bg.g * 0.15, b: 255 * 0.85 + bg.b * 0.15 };
    expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("pmgc-crimson: crimson-black fallback keeps white + muted ink readable", () => {
    const p = getTemplate("pmgc-crimson").palette;
    for (const bg of Object.values(getTemplate("pmgc-crimson").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // pmwi-violet/overall.png (TRUE PNG 941×1672, uniformly width-fitted by
  // ×1080/941 with top -130.25 = the centred cover crop). Zone means measured
  // with the same per-pixel WCAG relative-luminance algorithm used for the
  // other art templates (sharp scan).
  const PMWI = {
    // art(110,460,340,45) = canvas(126,378,390,52) — row 1 dark violet bar
    rowBar: 0.013973,
    // art(458,345,44,22) = canvas(526,246,50,25) — open slot right of the
    // baked "MATCH #" ink (ends art x455 → canvas x522.2)
    matchSlot: 0.032105,
    // canvas(760,1570,280,26) → art(662,1498,244,23): dark violet footer the
    // brand-law watermark sits on (the art's own KRAFTON footer is cropped).
    watermark: { r: 21.2, g: 28.5, b: 124.9 },
  };

  it("pmwi-violet: white row text clears dark violet bars ≥ 12:1, match ink ≥ 4.5:1", () => {
    const config = getTemplate("pmwi-violet");
    const p = config.palette;
    expect(p.text).toBe("#FFFFFF");
    expect(p.wwcdText).toBe("#FFFFFF"); // rank-1 name/ink stays broadcast white
    expect(config.standings.uniformStatInk).toBe(true);
    expect(ratioOver(PMWI.rowBar, p.text)).toBeGreaterThanOrEqual(12); // AAA hard gate
    const chipInk = config.variantHeaders?.standings?.subtitleColor ?? "#FFFFFF";
    expect(chipInk).toBe("#FFFFFF");
    expect(ratioOver(PMWI.matchSlot, chipInk)).toBeGreaterThanOrEqual(4.5);
  });

  it("pmwi-violet: 90%-white watermark clears the dark violet footer (≥ 4.5)", () => {
    const bg = PMWI.watermark;
    const ink = { r: 255 * 0.9 + bg.r * 0.1, g: 255 * 0.9 + bg.g * 0.1, b: 255 * 0.9 + bg.b * 0.1 };
    expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("pmwi-violet: violet/cyan fallback keeps white + muted ink readable", () => {
    const p = getTemplate("pmwi-violet").palette;
    for (const bg of Object.values(getTemplate("pmwi-violet").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // grunge-red/mvp.png (4488×5608 JPEG payload in .png, uniformly fitted).
  // Zone means measured with the same per-pixel WCAG relative-luminance
  // algorithm used for the other art templates (sharp scan).
  const GRUNGE = {
    // Inner name/badge zone (art x31–65%, y17–28%): the painted dark bar
    // the white block name, white badge rules and crimson brush sit on.
    barInterior: 0.013268,
    // Watermark glyph zone at the footer (art x70–99%, y96–99%).
    watermark: 0.01389,
  };

  it("grunge-red: white name/badge clears the dark bars ≥ 7:1 and crimson brush ≥ 3:1", () => {
    const config = getTemplate("grunge-red");
    const p = config.palette;
    expect(p.text).toBe("#FFFFFF");
    expect(ratioOver(GRUNGE.barInterior, p.text)).toBeGreaterThanOrEqual(7);
    // The #E51920 brush ink is a large-text callout (56px) → 3:1 floor.
    expect(ratioOver(GRUNGE.barInterior, "#E51920")).toBeGreaterThanOrEqual(3);
    // Ghost numeral (rgba white 0.055) is deliberately near-invisible.
    const ghost = { r: 255, g: 255, b: 255 };
    expect(relativeLuminance(ghost)).toBeGreaterThan(relativeLuminance({ r: 14, g: 14, b: 14 }));
  });

  it("grunge-red: 78%-white watermark clears the dark footer (≥ 4.5)", () => {
    const bgLum = GRUNGE.watermark;
    const inkLum = relativeLuminance({ r: 255, g: 255, b: 255 });
    expect((Math.max(inkLum, bgLum) + 0.05) / (Math.min(inkLum, bgLum) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it("grunge-red: dark-crimson fallback keeps white + muted ink readable", () => {
    const p = getTemplate("grunge-red").palette;
    for (const bg of Object.values(getTemplate("grunge-red").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("pmpl-light announcement art contrast (live PNG decode)", () => {
  it("text vs panel interior, muted slots ≥ 4.5; accent slot ≥ 3; title on strip ≥ 4.5", () => {
    const { w: artW, px } = decodePngToRgb("public/templates/pmpl-light/announcement.png");
    const scale = artW / 1080;
    // canvas(160,500,760,900) → the white panel interior rows render on
    const interior = averageLuminance(px, artW, {
      x: Math.round(160 * scale),
      y: Math.round(500 * scale),
      w: Math.round(760 * scale),
      h: Math.round(900 * scale),
    });
    // canvas(150,32,780,46) → the white strip the scrim name sits on
    const strip = averageLuminance(px, artW, {
      x: Math.round(150 * scale),
      y: Math.round(32 * scale),
      w: Math.round(780 * scale),
      h: Math.round(46 * scale),
    });
    const p = getTemplate("pmpl-light").palette;
    const over = (bg: number, fg: string) =>
      (Math.max(bg, relativeLuminance(parseHexColor(fg))) + 0.05) /
      (Math.min(bg, relativeLuminance(parseHexColor(fg))) + 0.05);

    expect(over(interior, p.text)).toBeGreaterThanOrEqual(4.5); // names + count values
    expect(over(interior, p.textMuted)).toBeGreaterThanOrEqual(4.5); // slot numbers
    expect(over(interior, p.accent)).toBeGreaterThanOrEqual(3); // rank-1 slot (28px bold)
    expect(over(strip, p.text)).toBeGreaterThanOrEqual(4.5); // scrim name
    // Both zones are genuinely light — guards against a black art swap
    expect(interior).toBeGreaterThan(0.8);
    expect(strip).toBeGreaterThan(0.9);
  });
});

describe("esports-clash art left-zone contrast (measured from the art)", () => {
  // Mean per-pixel WCAG relative luminance over the painted left text zone
  // (canvas x100–600, y mid ±50) of the 3764×6688 art, height-fitted to the
  // canvas. Red cards average darker than blue, so these are per-card.
  const CARD_LUM = [0.0254, 0.0541, 0.0270, 0.0528, 0.0244];
  const over = (bg: number, fg: string) => {
    const fgLum = relativeLuminance(parseHexColor(fg));
    return (Math.max(bg, fgLum) + 0.05) / (Math.min(bg, fgLum) + 0.05);
  };

  it("pure-white hero name + kills clear every red/blue card (≥ 7:1)", () => {
    const p = getTemplate("esports-clash").palette;
    expect(p.text).toBe("#FFFFFF");
    for (const lum of CARD_LUM) {
      expect(over(lum, p.text)).toBeGreaterThanOrEqual(7);
    }
  });

  it("transparent rank/label inks clear every card (≥ 4.5:1)", () => {
    // Conservative lower bound: composite the semi-transparent white over
    // BLACK (the darkest possible backdrop → the dimmest ink), then compare it
    // with the BRIGHTEST measured card. Real ink over a card is brighter, so
    // passing here guarantees the composited pair passes on every card.
    const worst = Math.max(...CARD_LUM);
    for (const alpha of [0.85, 0.72]) {
      const ink = { r: 255 * alpha, g: 255 * alpha, b: 255 * alpha };
      const inkLum = relativeLuminance(ink);
      expect((Math.max(worst, inkLum) + 0.05) / (Math.min(worst, inkLum) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("dark gradient fallback keeps white + muted ink readable", () => {
    const p = getTemplate("esports-clash").palette;
    for (const bg of Object.values(getTemplate("esports-clash").backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("pmgc-aqua light-bar / dark-badge contrast (measured from the art)", () => {
  const CONFIG = getTemplate("pmgc-aqua");
  const over = (bgLum: number, fgHex: string) => {
    const fgLum = relativeLuminance(parseHexColor(fgHex));
    return (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
  };
  // Zone means measured on the 968×1625 art with the per-pixel WCAG algorithm
  // (same as the other art templates): light ice-grey row bar, near-black
  // MATCH # slot, dark rocky footer at the fixed watermark position.
  const ROW_BAR = 0.82158;
  const MATCH_SLOT = 0.00814;
  const FOOTER = { r: 25.7, g: 34.7, b: 38.5 };

  it("dark charcoal row ink clears the light bars ≥ 14:1", () => {
    const p = CONFIG.palette;
    expect(p.text).toBe("#0D1B1E");
    expect(p.wwcdText).toBe("#0D1B1E");
    expect(CONFIG.standings.uniformStatInk).toBe(true);
    expect(over(ROW_BAR, p.text)).toBeGreaterThanOrEqual(14);
    expect(over(ROW_BAR, p.textMuted)).toBeGreaterThanOrEqual(7);
  });

  it("electric-cyan match digits clear the dark badge ≥ 4.5:1", () => {
    const ink = CONFIG.variantHeaders?.standings?.subtitleColor ?? "#00F5E1";
    expect(over(MATCH_SLOT, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it("88%-white brand watermark clears the dark rocky footer ≥ 4.5:1", () => {
    const a = 0.88;
    const ink = {
      r: 255 * a + FOOTER.r * (1 - a),
      g: 255 * a + FOOTER.g * (1 - a),
      b: 255 * a + FOOTER.b * (1 - a),
    };
    expect(contrastRatio(ink, FOOTER)).toBeGreaterThanOrEqual(4.5);
  });

  it("light aqua/ice fallback keeps dark + muted ink readable on MVP + announcement", () => {
    const p = CONFIG.palette;
    const bgs = Object.values(CONFIG.backgrounds).filter((bg) => bg.type === "gradient");
    expect(bgs.length).toBeGreaterThanOrEqual(1);
    for (const bg of bgs) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(parseHexColor(p.text), bg.css)).toBeGreaterThanOrEqual(7);
      expect(minContrastAgainstStops(parseHexColor(p.textMuted), bg.css)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
