import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  announcementRowLayout,
  contrastRatio,
  effectiveAnnouncementSpec,
  getTemplate,
  headerFor,
  hideScrimNameFor,
  parseHexColor,
} from "@/lib/graphics";
import type { TeamRow } from "@/lib/scoring";

const ASSET = resolve(process.cwd(), "public/templates/onyx-green/announcement.png");
const DARK_FIELD = "#0B140C";
const NEON = "#66FF1A";
const WHITE = "#FFFFFF";

const T = getTemplate("onyx-green");
const LAYOUT = T.announcementLayout!;
const LINES = LAYOUT.lineYs!;
// The delivered art is a 4096×6144 JPEG payload inside a .png name (the same
// broadcast-art convention as overall.png) → uniform ×1080/4096 onto canvas.
const S = 1080 / 4096;

/** Baked neon-green tick vertical centres, measured on NATIVE art pixels
 *  (sharp scan, left x656..752 / right x3339..3435). The art rasterises them
 *  ~1 native px (≈0.3 canvas px) below the exact line midpoint, so the
 *  authoritative row-centre law stays "midpoint between white dividers". */
const TICK_LEFT_NATIVE = [
  2415.012, 2544.4825, 2674.4203, 2804.973, 2934.0657, 3062.5383, 3191.5111,
  3321.5808, 3450.1304, 3579.3198, 3708.0237, 3837.5757, 3965.8743, 4095.6121,
  4223.5193, 4353.8577, 4481.6555, 4611.909, 4741.5232, 4870.48, 4999.8262,
  5128.7403, 5257.8451, 5386.1246,
];
const TICK_RIGHT_NATIVE = [
  2415.2691, 2544.5032, 2674.8001, 2805.177, 2934.2737, 3062.9892, 3191.6455,
  3321.566, 3450.3066, 3579.5293, 3708.136, 3837.7185, 3965.9027, 4095.9028,
  4223.4737, 4353.9864, 4481.5396, 4612.0229, 4741.6002, 4870.8273, 5000.0897,
  5128.9124, 5257.9592, 5386.1174,
];

type AnnounceTeam = Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">;

function teams(n: number): AnnounceTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `team ${String(i + 1).padStart(2, "0")}`, // lowercase: CSS uppercases it
    logoUrl: null,
    slotNumber: 5 + i, // 5..28 → "05".."28"
  }));
}

function imageDimensions(file: string): { w: number; h: number; kind: "jpeg" | "png" } {
  const b = readFileSync(file);
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), kind: "png" };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = b.readUInt16BE(i + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), kind: "jpeg" };
      }
      i += 2 + len;
    }
  }
  throw new Error("not a valid PNG/JPEG image");
}

describe("onyx-green announcement asset", () => {
  it("exists, is non-empty and is a valid 2:3 image with image magic bytes", () => {
    expect(existsSync(ASSET)).toBe(true);
    expect(readFileSync(ASSET).length).toBeGreaterThan(0);
    const dims = imageDimensions(ASSET);
    // The art on disk is the 4096×6144 broadcast payload (also exactly 2:3),
    // uniformly scaled ×1080/4096 — no crop, so every measured px lands on the
    // 1080×1620 canvas. The 1024×1536 figure in the early brief was stale.
    expect(dims.kind).toBe("jpeg");
    expect(dims.w).toBe(4096);
    expect(dims.h).toBe(6144);
    expect(dims.w / dims.h).toBeCloseTo(2 / 3, 6);
  });
});

describe("onyx-green registration + header suppression", () => {
  it("registers the art for announcement while leaving standings art untouched", () => {
    expect(AESTHETICS["onyx-green"]).toBe(T);
    expect(AESTHETIC_IDS).toContain("onyx-green");
    expect(T.backgrounds.standings).toEqual({
      type: "image",
      src: "/templates/onyx-green/overall.png",
    });
    expect(T.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/onyx-green/announcement.png",
    });
  });

  it("does not move ANY top-level standings geometry", () => {
    expect(T.standings.rowY0).toBe(400);
    expect(T.standings.rowPitch).toBe(70.7727);
    expect(T.standings.rowHeight).toBe(63);
    expect(T.standings.rowsPerColumn).toBe(12);
    expect(T.standings.fixedRowPitch).toBe(true);
    expect(T.standings.columns[0].rankX).toBe(60);
    expect(T.standings.columns[1].rankX).toBe(552);
    // The 24-row table lives ONLY in the additive template-level override.
    expect(LAYOUT.singleColumn).toBe(true);
    expect(LAYOUT.rowsPerColumn).toBe(24);
  });

  it("hides the scrim name and every dynamic header over the baked title", () => {
    expect(hideScrimNameFor(T, "announcement")).toBe(true);
    const header = headerFor(T, "announcement");
    for (const slot of [header.title, header.subtitle, header.organizer]) {
      expect(slot.w).toBe(0);
      expect(slot.x).toBeLessThan(0);
    }
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "onyx-green",
        title: "MY SCRIM NAME",
        subtitle: "PARTICIPATING TEAMS",
        organizer: "MY ORGANIZER",
        teams: teams(4),
      }),
    );
    expect(html).not.toContain("MY SCRIM NAME");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).not.toContain("MY ORGANIZER");
  });
});

describe("onyx-green 1–24 team single-column geometry", () => {
  const spec = effectiveAnnouncementSpec(T);

  it("folds the override in for onyx-green and passes other templates through by identity", () => {
    expect(spec).not.toBe(T.announcement);
    expect(spec.leftX).toBe(LAYOUT.leftX);
    expect(spec.slotW).toBe(120);
    for (const id of ["rundown-orange", "royal-blue", "dark-gold"] as const) {
      const t = getTemplate(id);
      expect(effectiveAnnouncementSpec(t)).toBe(t.announcement);
    }
  });

  it.each([1, 4, 8, 12, 16, 20, 24])("locks every row of %i teams to its baked band", (n) => {
    const rows = announcementRowLayout(n, spec);
    expect(rows).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      expect(rows[i]!.y).toBeCloseTo(LINES[i]!, 3);
      expect(rows[i]!.pitch).toBeCloseTo(LINES[i + 1]! - LINES[i]!, 3);
      // Text centre = exact vertical midpoint of white line i and i+1.
      expect(rows[i]!.y + rows[i]!.pitch / 2).toBeCloseTo((LINES[i]! + LINES[i + 1]!) / 2, 3);
    }
    // One fixed-width column for ANY team count — never split, never stretched.
    expect(LAYOUT.singleColumn).toBe(true);
    expect(LAYOUT.fixedRowPitch).toBe(true);
    expect(LAYOUT.leftX).toBe(214);
    expect(LAYOUT.colWidth).toBe(654);
    expect(LAYOUT.leftX + LAYOUT.colWidth).toBe(868);
  });

  it("centres all 24 rows on the divider midpoints with zero cumulative drift", () => {
    const rows = announcementRowLayout(24, spec);
    expect(LINES).toHaveLength(25);
    expect(LAYOUT.rowY0).toBeCloseTo(LINES[0]!, 3);
    expect(LAYOUT.rowsBottom).toBeCloseTo(LINES[24]!, 3);
    expect(LAYOUT.rowHeight).toBeCloseTo((LINES[24]! - LINES[0]!) / 24, 3);
    rows.forEach((row, i) => {
      const midpoint = (LINES[i]! + LINES[i + 1]!) / 2;
      expect(Math.abs(row.y + row.pitch / 2 - midpoint)).toBeLessThanOrEqual(0.001);
    });
    expect(LAYOUT.rowPitch).toBeCloseTo((LINES[24]! - LINES[0]!) / 24, 3);
  });

  it("clears both baked neon-green tick marks horizontally and tracks them vertically", () => {
    // Left ticks end at canvas x198.3, right ticks start at canvas x880.4.
    expect(LAYOUT.leftX).toBeGreaterThan(198.3);
    expect(LAYOUT.leftX + LAYOUT.colWidth).toBeLessThan(880.4);
    const rows = announcementRowLayout(24, spec);
    rows.forEach((row, i) => {
      const center = row.y + row.pitch / 2;
      expect(Math.abs(center - TICK_LEFT_NATIVE[i]! * S)).toBeLessThanOrEqual(1.2);
      expect(Math.abs(center - TICK_RIGHT_NATIVE[i]! * S)).toBeLessThanOrEqual(1.2);
    });
  });
});

describe("onyx-green announcement SSR — typography, centering, alternating ink", () => {
  const html = renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: "onyx-green",
      title: "SCRIM",
      subtitle: "PARTICIPATING TEAMS",
      organizer: null,
      teams: teams(24),
    }),
  );

  it("renders all 24 slot numbers 05..28 and uppercase-ready team names", () => {
    for (let slot = 5; slot <= 28; slot++) {
      expect(html).toContain(`>${String(slot).padStart(2, "0")}<`);
    }
    for (let i = 1; i <= 24; i++) {
      expect(html).toContain(`team ${String(i).padStart(2, "0")}`);
    }
    expect((html.match(/left:214px/g) ?? []).length).toBe(24);
    expect((html.match(/width:654px/g) ?? []).length).toBe(24);
  });

  it("pins flex centering + line-height AFTER the font shorthand on every cell", () => {
    expect(html).toContain("display:flex");
    expect(html).toContain("align-items:center");
    expect(html).toContain("line-height:1");
    expect((html.match(/height:100%/g) ?? []).length).toBeGreaterThanOrEqual(48);
    const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
    const fontStyles = styles.filter((s) => s.includes("font:"));
    expect(fontStyles.length).toBeGreaterThanOrEqual(72); // 24 rows × 3 cells
    for (const s of fontStyles) {
      expect(s.indexOf("font:")).toBeLessThan(s.indexOf("line-height:1"));
    }
  });

  it("uses Exo 2 800 uppercase names, tabular slots and 0.06em athletic tracking", () => {
    expect(html).toContain('font:800 20px &quot;Exo 2&quot;');
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:0.06em");
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(LAYOUT.rankFont).toBe('800 20px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif');
    expect(LAYOUT.nameFont).toBe('800 20px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif');
  });

  it("alternates neon-green even rows and pure-white odd rows", () => {
    expect(LAYOUT.rowColors).toEqual([NEON, WHITE]);
    // 12 even + 12 odd rows × 2 ink cells (slot + name) each.
    expect((html.match(/color:#66FF1A/g) ?? []).length).toBe(24);
    expect((html.match(/color:#FFFFFF/g) ?? []).length).toBe(24);
  });

  it("keeps both row inks WCAG-legible on the dark art field", () => {
    const field = parseHexColor(DARK_FIELD);
    expect(contrastRatio(parseHexColor(NEON), field)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHexColor(WHITE), field)).toBeGreaterThanOrEqual(4.5);
  });
});
