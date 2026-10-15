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
    // worst of the five per-row digit bands at art x3538–3628 (KILLS center
    // 3583), row middle ±121 art px: rows 1–5 = .0228/.0194/.0210/.0189/.0199
    killsBand: 0.0228,
    // art(531,30,3034,250) = canvas(140,8,800,66) — clear top band
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
