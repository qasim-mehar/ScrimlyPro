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

const ASSET = resolve(process.cwd(), "public/templates/varsity-yellow/announcement.png");
const INK = "#074725";
const WHITE = "#FFFFFF";

// Campaign single-column bar geometry (canvas px). The art's first painted
// white bar was measured at top 444.8 with a ~28px interior; the fixed-pitch
// ladder below is the geometry every row is pinned to.
const ROW_Y0 = 444.8;
const ROW_H = 28;
const ROW_PITCH = 39.7;
const ROWS_BOTTOM = 1382;
const LEFT_X = 296;
const COL_W = 488;
// Sharp-measured centre of the first painted white bar on announcement.png.
const MEASURED_BAR0_CENTER = 458.8;

type AnnounceTeam = Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">;

function teams(n: number): AnnounceTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `team ${String(i + 1).padStart(2, "0")}`, // lowercase: CSS uppercases it
    logoUrl: null,
    slotNumber: 5 + i, // 5..28 → "05".."28"
  }));
}

function pngDimensions(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  const magic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.subarray(0, 8).equals(magic)) throw new Error("not a valid PNG image");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe("varsity-yellow asset", () => {
  it("exists, is non-empty and has valid PNG magic bytes + 2:3 dimensions", () => {
    expect(existsSync(ASSET)).toBe(true);
    expect(readFileSync(ASSET).length).toBeGreaterThan(0);
    const dims = pngDimensions(ASSET);
    expect(dims.w).toBe(1080);
    expect(dims.h).toBe(1620);
    expect(dims.w / dims.h).toBeCloseTo(2 / 3, 6);
  });
});

describe("varsity-yellow registration + baked header suppression", () => {
  const t = getTemplate("varsity-yellow");

  it("is registered with single-column fixed-pitch geometry", () => {
    expect(t.id).toBe("varsity-yellow");
    expect(t.name).toBe("Varsity Yellow (Participation)");
    expect(AESTHETICS["varsity-yellow"]).toBe(t);
    expect(AESTHETIC_IDS).toContain("varsity-yellow");
    expect(t.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/varsity-yellow/announcement.png",
    });
    expect(t.announcement.singleColumn).toBe(true);
    expect(t.announcement.fixedRowPitch).toBe(true);
    expect(t.announcement.rowsPerColumn).toBe(24);
    // The template-level announcementLayout (onyx-green's path) resolves to
    // the exact same coordinates as the canonical spec.
    const effective = effectiveAnnouncementSpec(t);
    for (const key of [
      "leftX", "colWidth", "rowY0", "rowPitch", "rowHeight", "rowsBottom",
    ] as const) {
      expect(effective[key]).toBe(t.announcement[key]);
    }
    expect(effective.slotW).toBe(t.announcement.slotW);
  });

  it("suppresses the scrim name and every dynamic header on the baked art", () => {
    expect(hideScrimNameFor(t, "announcement")).toBe(true);
    const header = headerFor(t, "announcement");
    for (const slot of [header.title, header.subtitle, header.organizer]) {
      expect(slot.w).toBe(0);
      expect(slot.x).toBeLessThan(0);
    }
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "varsity-yellow",
        title: "MY SCRIM NAME",
        subtitle: "PARTICIPATING TEAMS",
        organizer: "MY ORGANIZER",
        teams: teams(4),
      }),
    );
    // The art bakes "TEAM PARTICIPATION" and the footer lockup — no dynamic
    // text may overlap them.
    expect(html).not.toContain("MY SCRIM NAME");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).not.toContain("MY ORGANIZER");
  });
});

describe("varsity-yellow 1–24 team white-bar Y-axis centering", () => {
  const spec = effectiveAnnouncementSpec(getTemplate("varsity-yellow"));

  it.each([1, 4, 8, 12, 16, 20, 24])("pins all %i rows in the single column", (n) => {
    const rows = announcementRowLayout(n, spec);
    expect(rows).toHaveLength(n);
    expect(spec.leftX).toBe(LEFT_X);
    expect(spec.colWidth).toBe(COL_W);
    expect(spec.rowY0).toBe(ROW_Y0);
    expect(spec.rowPitch).toBe(ROW_PITCH);
    expect(spec.rowHeight).toBe(ROW_H);
    expect(spec.rowsBottom).toBe(ROWS_BOTTOM);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      // Single column, never split: identical fixed top/height for every row.
      expect(row.y).toBeCloseTo(ROW_Y0 + i * ROW_PITCH, 6);
      expect(row.pitch).toBe(ROW_PITCH);
      expect(row.rowH).toBe(ROW_H);
      // The row box (and therefore its text midline) stays inside the painted
      // white bars' horizontal bounds x281..799.
      expect(LEFT_X).toBeGreaterThanOrEqual(281);
      expect(LEFT_X + COL_W).toBeLessThanOrEqual(799);
      // Zero cumulative vertical drift: each row's midpoint is the exact
      // fixed-pitch bar-centre ladder, not a stretched rowsBottom auto-fit.
      const mid = row.y + row.rowH! / 2;
      expect(mid).toBeCloseTo(ROW_Y0 + i * ROW_PITCH + ROW_H / 2, 6);
    }
  });

  it("centres row 1 on the measured first bar and clears both baked lockups", () => {
    const rows = announcementRowLayout(24, spec);
    const firstMid = rows[0]!.y + rows[0]!.rowH! / 2;
    expect(firstMid).toBeCloseTo(MEASURED_BAR0_CENTER, 1); // ±0.75px tolerance
    expect(rows[0]!.y).toBeGreaterThanOrEqual(440); // clears "TEAM PARTICIPATION"
    const lastBottom = rows[23]!.y + rows[23]!.rowH!;
    expect(lastBottom).toBeLessThanOrEqual(1390); // clears PUBG | KRAFTON footer
    expect(lastBottom).toBeLessThanOrEqual(ROWS_BOTTOM + 5);
  });

  it("never stretches the pitch when fewer than 24 teams exist", () => {
    for (const n of [1, 7, 16, 23]) {
      const rows = announcementRowLayout(n, spec);
      expect(new Set(rows.map((r) => r.pitch))).toEqual(new Set([ROW_PITCH]));
      expect(new Set(rows.map((r) => r.rowH))).toEqual(new Set([ROW_H]));
      for (let i = 0; i < rows.length; i++) {
        expect(rows[i]!.y).toBeCloseTo(ROW_Y0 + i * ROW_PITCH, 6);
      }
    }
  });
});

describe("varsity-yellow SSR — Y-axis centering, font style and forest-green ink", () => {
  const html = renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: "varsity-yellow",
      title: "SCRIM",
      subtitle: "PARTICIPATING TEAMS",
      organizer: null,
      teams: teams(24),
    }),
  );
  const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
  const exactLineHeight = /(?:^|;)line-height:1(?:;|$)/;

  it("renders all 24 zero-padded slot labels 05..28 and team names", () => {
    for (let slot = 5; slot <= 28; slot++) {
      expect(html).toContain(`>${String(slot).padStart(2, "0")}<`);
    }
    for (let i = 1; i <= 24; i++) {
      expect(html).toContain(`team ${String(i).padStart(2, "0")}`);
    }
  });

  it("pins flex centering and line-height AFTER the font shorthand on every cell", () => {
    // 24 row wrappers: single-column bars at x296 / width 488 / height 28.
    const wrappers = styles.filter(
      (s) => s.startsWith("position:absolute") && s.includes("height:28px"),
    );
    expect(wrappers).toHaveLength(24);
    for (const s of wrappers) {
      expect(s).toContain("left:296px");
      expect(s).toContain("width:488px");
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }

    // 48 cells (slot + name): flex/center, height:100%, font then line-height:1.
    const cells = styles.filter((s) => s.includes("height:100%"));
    expect(cells).toHaveLength(48);
    for (const s of cells) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }
  });

  it("pins Rajdhani 700, uppercase, 0.05em tracking and forest-green ink", () => {
    expect(html).toContain('font:700 19px &quot;Rajdhani&quot;');
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:0.05em");
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain(`color:${INK}`); // deep forest green on the white bars

    const t = getTemplate("varsity-yellow");
    expect(t.announcement.rankFont).toBe('700 19px "Rajdhani", "Exo 2", "Noto Sans Symbols 2", sans-serif');
    expect(t.announcement.nameFont).toBe('700 19px "Rajdhani", "Exo 2", "Noto Sans Symbols 2", sans-serif');
    expect(t.announcement.inkColor).toBe(INK);
    expect(t.announcement.accentColor).toBe(INK);
    expect(t.announcement.mutedColor).toBe("#14532D");
    expect(t.announcement.cardBg).toBe("transparent");
    expect(t.palette.accent).toBe(INK);
    expect(t.palette.text).toBe(INK);
  });

  it("renders every row for the edge counts without NaN/undefined", () => {
    for (const n of [1, 4, 12, 24]) {
      const markup = renderToStaticMarkup(
        h(AnnouncementGraphic, {
          aestheticId: "varsity-yellow",
          title: "SCRIM",
          subtitle: "PARTICIPATING TEAMS",
          organizer: null,
          teams: teams(n),
        }),
      );
      expect(markup).not.toContain("NaN");
      expect(markup).not.toContain("undefined");
      expect(markup).toContain(`team ${String(n).padStart(2, "0")}`);
      expect(markup.match(/left:296px/g)).toHaveLength(n);
    }
  });
});

describe("varsity-yellow WCAG contrast (repo contrast helper)", () => {
  it("forest-green ink clears AAA (7:1) against the painted white bars", () => {
    expect(contrastRatio(parseHexColor(INK), parseHexColor(WHITE))).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(parseHexColor(INK), parseHexColor(WHITE))).toBeGreaterThan(10);
  });
});
