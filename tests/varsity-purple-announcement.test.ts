import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  announcementBarRows,
  announcementRowLayout,
  contrastRatio,
  effectiveAnnouncementSpec,
  getTemplate,
  headerFor,
  parseHexColor,
} from "@/lib/graphics";
import { announcementSlotLabels, orderTeamsBySlot } from "@/lib/sessions/slots";
import type { StandingRow, TeamRow } from "@/lib/scoring";

const ASSET = resolve(process.cwd(), "public/templates/varsity-purple/announcement.png");

/**
 * Exact painted-bar midlines measured (one-off, read-only) from the delivered
 * art's 4096×6144 pixel data with canvasX = artX × 1080/4096. The art has 13
 * bars (not 15 — the campaign brief's 15-bar figure is stale for this file);
 * the last two are noticeably wider, which is why a single rowPitch cannot
 * place every row within ±1px and `barCenterYs` is authoritative.
 */
const MEASURED_BAR_CENTERS = [
  753.18, 804.99, 857.46, 909.67, 962.14, 1014.08, 1066.29, 1118.5, 1170.7,
  1223.97, 1276.57, 1331.81, 1386.39,
];
const BAR_SPAN = { left: 233, right: 847 };
const DIVIDERS = [401, 688];
const ROW_H = 41.7;
const ROW_Y0 = 732;
const ROW_PITCH = 52.4;
const ROWS_BOTTOM = 1408;
const GLYPHS = "TEAM × · | _ ₛ ≌ 日本語 ALPHA-0123456789".slice(0, 30);

/** JPEG SOF dimensions (the art is a JPEG payload inside a `.png` name). */
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
      const marker = b[i + 1]!;
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = b.readUInt16BE(i + 2);
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
      ) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), kind: "jpeg" };
      }
      i += 2 + len;
    }
  }
  throw new Error("not a valid PNG/JPEG image");
}

type AnnounceTeam = Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">;

function teams(n: number, glyphTorture = false): AnnounceTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: glyphTorture && i === 0 ? GLYPHS : `team ${String(i + 1).padStart(2, "0")}`,
    logoUrl: null,
    slotNumber: 5 + i, // assigned 05..29 — orderTeamsBySlot keeps this order
  }));
}

function standingsRows(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function announcementHtml(list: AnnounceTeam[]) {
  return renderToStaticMarkup(
    h(
      GraphicCanvas,
      { config: getTemplate("varsity-purple"), variant: "announcement" },
      h(AnnouncementGraphic, {
        aestheticId: "varsity-purple",
        title: "SCRIM NAME",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: list,
      }),
    ),
  );
}

function stylesOf(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
}

describe("varsity-purple asset", () => {
  it("exists, is non-empty and has valid magic bytes + 2:3 dimensions", () => {
    expect(existsSync(ASSET)).toBe(true);
    expect(readFileSync(ASSET).length).toBeGreaterThan(0);
    const dims = imageDimensions(ASSET);
    expect(dims.kind).toBe("jpeg"); // JPEG payload in a .png-named file
    expect(dims.w).toBe(4096);
    expect(dims.h).toBe(6144);
    expect(dims.w / dims.h).toBeCloseTo(2 / 3, 6);
    expect(dims.w * (1080 / dims.w)).toBe(1080); // uniform ×1080/4096 fit
  });
});

describe("varsity-purple registration + measured geometry", () => {
  const config = getTemplate("varsity-purple");
  const layout = config.announcementBarLayout!;

  it("is registered with the announcement art and purple gradient fallbacks", () => {
    expect(config.id).toBe("varsity-purple");
    expect(AESTHETICS["varsity-purple"]).toBe(config);
    expect(AESTHETIC_IDS).toContain("varsity-purple");
    expect(config.canvas).toEqual({ w: 1080, h: 1620 });
    expect(config.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/varsity-purple/announcement.png",
    });
    for (const variant of ["standings", "mvp"] as const) {
      const bg = config.backgrounds[variant];
      expect(bg.type).toBe("gradient");
      if (bg.type === "gradient") {
        expect(bg.css).toContain("#1A0633");
        expect(bg.css).toContain("#3B1266");
        expect(bg.css).toContain("#120424");
      }
    }
  });

  it("pins the fixed-pitch 13-bar layout (not the brief's stale 15-bar figure)", () => {
    expect(config.announcement.fixedRowPitch).toBe(true);
    expect(config.announcement.singleColumn).toBe(true);
    expect(layout.rowY0).toBe(ROW_Y0);
    expect(layout.rowPitch).toBe(ROW_PITCH);
    expect(layout.rowHeight).toBe(ROW_H);
    expect(layout.rowsBottom).toBe(ROWS_BOTTOM);
    expect(layout.barCenterYs).toHaveLength(13);
    expect([...layout.barCenterYs]).toEqual(MEASURED_BAR_CENTERS);
    expect(layout.cells.map((c) => [c.x, c.w])).toEqual([
      [BAR_SPAN.left, DIVIDERS[0] - BAR_SPAN.left],
      [DIVIDERS[0], DIVIDERS[1] - DIVIDERS[0]],
      [DIVIDERS[1], BAR_SPAN.right - DIVIDERS[1]],
    ]);
    const effective = effectiveAnnouncementSpec(config);
    expect(effective.fixedRowPitch).toBe(true);
    expect([...effective.barCenterYs!]).toEqual(MEASURED_BAR_CENTERS);
  });

  it("seats every bar centre within ±1px of the measured painted-bar pixels", () => {
    for (let i = 0; i < MEASURED_BAR_CENTERS.length; i++) {
      const row = announcementBarRows(13, layout)[i]!;
      const center = row.y + row.rowH / 2;
      expect(center).toBeCloseTo(MEASURED_BAR_CENTERS[i]!, 1); // ±0.05px
      expect(Math.abs(center - MEASURED_BAR_CENTERS[i]!)).toBeLessThanOrEqual(1);
      // The layout helper agrees with the 3-cell helper row-for-row.
      const plain = announcementRowLayout(13, effectiveAnnouncementSpec(getTemplate("varsity-purple")))[i]!;
      expect(Math.abs(plain.y + plain.rowH! / 2 - center)).toBeLessThanOrEqual(0.001);
    }
  });

  it("agrees with the 3-cell helper at every count (including overflow >13)", () => {
    const effective = effectiveAnnouncementSpec(getTemplate("varsity-purple"));
    for (const n of [13, 15, 16, 24, 25]) {
      const barRows = announcementBarRows(n, layout);
      const plainRows = announcementRowLayout(n, effective);
      expect(plainRows).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        expect(plainRows[i]!.y + plainRows[i]!.rowH! / 2).toBeCloseTo(
          barRows[i]!.y + barRows[i]!.rowH / 2,
          6,
        );
      }
    }
  });

  it("keeps every team (4–25) on a painted bar, never between bars", () => {
    for (const n of [4, 12, 13, 15, 16, 24, 25]) {
      const rows = announcementBarRows(n, layout);
      expect(rows).toHaveLength(n);
      for (const row of rows) {
        expect(row.bar).toBeGreaterThanOrEqual(0);
        expect(row.bar).toBeLessThan(13);
        expect(row.rowH).toBe(ROW_H);
        const center = row.y + row.rowH / 2;
        expect(Math.abs(center - MEASURED_BAR_CENTERS[row.bar]!)).toBeLessThanOrEqual(1);
        // Box stays strictly inside the painted bar span.
        expect(ROW_Y0).toBeLessThan(center);
        expect(center).toBeLessThan(ROWS_BOTTOM);
      }
      // Overflow teams reuse bar 0.., so no row can drift below the last bar.
      expect(Math.max(...rows.map((r) => r.y + r.rowH))).toBeLessThanOrEqual(ROWS_BOTTOM);
    }
  });
});

describe("varsity-purple SSR — painted-bar Y-axis centering", () => {
  it.each([12, 15, 16, 24])("locks %i rows to flex-centered, bar-height boxes", (n) => {
    const html = announcementHtml(teams(n));
    const styles = stylesOf(html);
    const exactLineHeight = /(?:^|;)line-height:1(?:;|$)/;
    // Wrapper boxes: exactly rowHeight tall, top = barCentre − rowHeight/2.
    const wrappers = styles.filter(
      (s) => s.startsWith("position:absolute") && s.includes("height:41.7px"),
    );
    expect(wrappers).toHaveLength(n);
    const tops = wrappers
      .map((s) => Number(/top:(-?[\d.]+)px/.exec(s)?.[1]))
      .sort((a, b) => a - b);
    for (let i = 0; i < n; i++) {
      const center = tops[i]! + ROW_H / 2;
      const nearest = Math.min(...MEASURED_BAR_CENTERS.map((c) => Math.abs(c - center)));
      expect(nearest).toBeLessThanOrEqual(1);
    }
    for (const s of wrappers) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
      expect(s).not.toContain("padding-top");
      expect(s).not.toContain("padding-bottom");
    }
    // Primary rows contribute two height:100% flex cells each; overflow
    // rows stack slot/name without height:100%. Exclude the background <img>
    // (imageFitStyle also uses height:100%, but with object-fit: cover).
    const primary = Math.min(n, 13);
    const cells = styles.filter((s) => s.includes("height:100%") && s.includes("display:flex"));
    expect(cells).toHaveLength(primary * 2);
    for (const s of cells) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }
    // The brand-law watermark is always present, bottom-right.
    expect(html).toContain("scrimlypro.com");
  });

  it("renders reference font pairing: Rajdhani 800 slots, Exo 2 700 wide-tracked names", () => {
    const html = announcementHtml(teams(16));
    expect(html).toContain('font:800 22px &quot;Rajdhani&quot;');
    expect(html).toContain('font:700 17px &quot;Exo 2&quot;');
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:0.17em");
    expect(html).toContain("letter-spacing:0.03em");
    // Ribbon display + wide-tracked conference kicker.
    expect(html).toContain('font:900 44px &quot;Exo 2&quot;');
    expect(html).toContain('font:700 16px &quot;Exo 2&quot;');
    expect(html).toContain("letter-spacing:0.08em");
    expect(html).toContain("letter-spacing:0.32em");
    expect(html).toContain("color:#2D0C4E");
    // The baked headline is never re-rendered.
    expect(html).not.toContain("TEAM ANNOUNCEMENT");
    const t = getTemplate("varsity-purple");
    expect(t.announcement.slotFont).toBe(
      '800 22px "Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif',
    );
    expect(t.announcement.nameFont).toBe(
      '700 17px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif',
    );
  });

  it("derives slot labels via lib/sessions/slots (assigned first, then fallback)", () => {
    const list: AnnounceTeam[] = [
      { id: "a", name: "UNSEATED ONE", logoUrl: null, slotNumber: null },
      { id: "b", name: "ASSIGNED NINE", logoUrl: null, slotNumber: 9 },
      { id: "c", name: "UNSEATED TWO", logoUrl: null, slotNumber: null },
    ];
    // Unassigned teams fall back to their row number (index+1), skipping
    // numbers already taken by an assigned slot — 9 is taken, row 2 is free.
    expect(announcementSlotLabels(orderTeamsBySlot(list))).toEqual(["09", "02", "03"]);
    const html = announcementHtml(orderTeamsBySlot(list));
    expect(html).toContain(">09<");
    expect(html).toContain(">02<");
    expect(html).toContain(">03<");
  });

  it("renders 4/25 teams and 30-char Arabic/CJK/symbol names without NaN", () => {
    expect(GLYPHS).toHaveLength(30);
    for (const n of [4, 25]) {
      const html = announcementHtml(teams(n, true));
      expect(html).toContain(GLYPHS);
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
      expect(html).toContain("text-overflow:ellipsis");
      expect(stylesOf(html).filter((s) => s.includes("height:41.7px"))).toHaveLength(n);
    }
  });
});

describe("varsity-purple standings — Top Overall Ranking typography", () => {
  const html = renderToStaticMarkup(
    h(
      GraphicCanvas,
      { config: getTemplate("varsity-purple"), variant: "standings" },
      h(OverallStandingsGraphic, {
        aestheticId: "varsity-purple",
        title: "SCRIM NAME",
        subtitle: "AFTER MATCH 3",
        organizer: null,
        standings: standingsRows(16),
        matchCount: 3,
      }),
    ),
  );

  it("uses the reference font pairing with line-height AFTER every font", () => {
    expect(html).toContain('font:900 64px &quot;Exo 2&quot;');
    expect(html).toContain('font:700 24px &quot;Exo 2&quot;');
    expect(html).toContain('font:800 24px &quot;Rajdhani&quot;');
    expect(html).toContain("letter-spacing:0.08em");
    expect(html).toContain("letter-spacing:0.32em");
    expect(html).toContain("letter-spacing:0.16em");
    expect(html).toContain("text-shadow:");
    expect(html).toContain("text-transform:uppercase");
    const header = headerFor(getTemplate("varsity-purple"), "standings");
    expect(header.titleTextShadow).toContain("#2D0C4E");
  });

  it("centres every data box in a fixed-height row (font then line-height)", () => {
    const styles = stylesOf(html);
    const rowBoxes = styles.filter(
      (s) => s.startsWith("position:absolute") && s.includes("height:56px") && s.includes("font:"),
    );
    expect(rowBoxes.length).toBeGreaterThanOrEqual(16 * 4);
    for (const s of rowBoxes) {
      const lh = /line-height:(-?[\d.]+)px/.exec(s);
      expect(lh).not.toBeNull();
      expect(Number(lh![1])).toBe(56);
      expect(s.indexOf("font:")).toBeLessThan(s.indexOf(lh![0]));
    }
    expect(html).toContain("scrimlypro.com");
  });
});

describe("varsity-purple WCAG contrast (repo contrast helper)", () => {
  it("keeps white ink ≥4.5:1 on every fallback stop and the painted bars", () => {
    const config = getTemplate("varsity-purple");
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type !== "gradient") continue;
      for (const stop of bg.css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        expect(contrastRatio(parseHexColor("#FFFFFF"), parseHexColor(stop))).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Measured bar interior (55,26,84) ≈ #371A54.
    expect(contrastRatio(parseHexColor("#FFFFFF"), parseHexColor("#371A54"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps deep-varsity ribbon ink ≥4.5:1 on the white ribbon and medal ink ≥3:1", () => {
    expect(contrastRatio(parseHexColor("#2D0C4E"), parseHexColor("#FFFFFF"))).toBeGreaterThanOrEqual(4.5);
    const p = getTemplate("varsity-purple").palette;
    for (const metal of [p.medalGold, p.medalSilver, p.medalBronze]) {
      expect(contrastRatio(parseHexColor(p.medalText), parseHexColor(metal))).toBeGreaterThanOrEqual(3);
    }
  });
});
