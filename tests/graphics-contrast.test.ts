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
  const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom", "pmpl-light"];

  it.each(IDS)("%s: palette.text vs every gradient background stop ≥ 4.5", (id) => {
    const config = getTemplate(id);
    const text = parseHexColor(config.palette.text);
    const seenCss = new Set<string>();
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type !== "gradient") continue;
      expect(minContrastAgainstStops(text, bg.css)).toBeGreaterThanOrEqual(4.5);
      seenCss.add(bg.css);
    }
    // Every aesthetic backs at least two variants with a gradient; shared
    // background objects (one css for all three variants) count once.
    expect(seenCss.size).toBeGreaterThanOrEqual(1);
    expect(Object.values(config.backgrounds).filter((bg) => bg.type === "gradient").length).toBeGreaterThanOrEqual(
      2,
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
