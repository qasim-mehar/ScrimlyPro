import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  announcementRowLayout,
  contrastRatio,
  effectiveAnnouncementSpec,
  getTemplate,
  hideScrimNameFor,
  parseHexColor,
  splitRowsAt,
} from "@/lib/graphics";
import { GLYPH_TEAM_NAMES } from "@/lib/fixtures/glyphNames";
import { announcementSlotLabels, orderTeamsBySlot } from "@/lib/sessions/slots";
import type { StandingRow } from "@/lib/scoring";

const ART = "public/templates/cardinal-gold/announcement.png";
const CONFIG = getTemplate("cardinal-gold");

type AnnTeam = { id: string; name: string; logoUrl: string | null; slotNumber: number | null };

const NAMES = [
  "SQUAD ALPHA",
  "SQUAD BRAVO",
  "SQUAD CHARLIE",
  "SQUAD DELTA",
  "SQUAD ECHO",
  "SQUAD FOXTROT",
  "SQUAD GOLF",
  "SQUAD HOTEL",
  "SQUAD INDIA",
  "SQUAD JULIET",
  "SQUAD KILO",
  "SQUAD LIMA",
  "SQUAD MIKE",
  "SQUAD NOVEMBER",
  "SQUAD OSCAR",
  "SQUAD PAPA",
  "SQUAD QUEBEC",
  "SQUAD ROMEO",
  "SQUAD SIERRA",
  "SQUAD TANGO",
  "SQUAD UNIFORM",
  "SQUAD VICTOR",
  "SQUAD WHISKEY",
  "SQUAD XRAY",
];

function teams(count = 24, names: readonly string[] = NAMES): AnnTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i}`,
    name: names[i] ?? `TEAM ${i + 1}`,
    logoUrl: null,
    slotNumber: 5 + i,
  }));
}

function standings(count = 24): StandingRow[] {
  return teams(count).map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function renderAnnouncement(list: AnnTeam[] = teams()): string {
  return renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: "cardinal-gold",
      title: "26-27 SCRIM",
      subtitle: "PARTICIPATING TEAMS",
      organizer: null,
      teams: list,
    }),
  );
}

function renderStandings(list: StandingRow[] = standings()): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "cardinal-gold",
      title: "26-27 overall standings",
      subtitle: "AFTER MATCH 6",
      organizer: null,
      standings: list,
      matchCount: 6,
    }),
  );
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Assert the CSS `font` shorthand precedes `line-height` inside a style
 *  block, so the shorthand can never reset the centred line box to `normal`. */
function lineHeightAfterFont(html: string, marker: string): void {
  const at = html.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const chunk = html.slice(at, at + 600);
  const fontAt = chunk.indexOf("font:");
  const lineAt = chunk.indexOf("line-height:");
  expect(fontAt).toBeGreaterThan(-1);
  expect(lineAt).toBeGreaterThan(-1);
  expect(fontAt).toBeLessThan(lineAt);
}

function pngSize(buf: Buffer): [number, number] {
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("cardinal-gold — announcement art + registry", () => {
  it("ships a true 2:3 PNG that fits 1080×1620 with zero crop", () => {
    const [w, h] = pngSize(readFileSync(ART));
    expect([w, h]).toEqual([1664, 2496]);
    expect(w / h).toBeCloseTo(2 / 3, 6);
    expect(1080 / w).toBeCloseTo(1620 / h, 6);
  });

  it("is registered and points the announcement variant at the baked art", () => {
    expect(AESTHETIC_IDS).toContain("cardinal-gold");
    expect(AESTHETICS["cardinal-gold"]).toBe(CONFIG);
    expect(CONFIG.id).toBe("cardinal-gold");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 });
    expect(CONFIG.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/cardinal-gold/announcement.png",
    });
    // Standings keeps the deep cardinal gradient fallback; MVP art is intact.
    expect(CONFIG.backgrounds.standings.type).toBe("gradient");
    expect(CONFIG.backgrounds.mvp).toMatchObject({
      type: "image",
      src: "/templates/cardinal-gold/mvp.png",
    });
  });

  it("hides the baked hero title and renders the watermark bottom-right", () => {
    expect(hideScrimNameFor(CONFIG, "announcement")).toBe(true);
    const html = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant: "announcement" }));
    expect(html).toContain("/templates/cardinal-gold/announcement.png");
    expect(html).toContain("object-fit:cover");
    expect(html).toContain("scrimlypro.com");
    expect(html).toContain("top:1570px");
  });
});

describe("cardinal-gold — pure two-column geometry (1080×1620)", () => {
  const spec = effectiveAnnouncementSpec(CONFIG);

  it("pins the 12/12 split and the safe grid envelope", () => {
    expect(spec.rowsPerColumn).toBe(12);
    expect(spec.fixedRowPitch).toBe(true);
    expect(spec.singleColumn).toBeUndefined();
    expect(spec.leftX).toBe(88);
    expect(spec.rightX).toBe(568);
    expect(spec.colWidth).toBe(424);
    expect(spec.rowY0).toBe(455);
    expect(spec.rowPitch).toBe(76);
    expect(spec.rowHeight).toBe(54);
    expect(spec.rowsBottom).toBe(1405);

    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);

    const rows = announcementRowLayout(24, spec);
    expect(rows).toHaveLength(24);
    expect(rows.slice(0, 12).every((r) => r.x === 88)).toBe(true);
    expect(rows.slice(12).every((r) => r.x === 568)).toBe(true);
    for (const row of rows) {
      // Baked hero ink ends near canvas y408; the grid starts at 455 so the
      // "TEAM PARTICIPATION" headline has a 47px breathing gap above the table.
      expect(row.y).toBeGreaterThanOrEqual(455);
      expect(row.y + 54).toBeLessThanOrEqual(1420); // clears the KRAFTON footer
      expect(row.rowH).toBe(54);
      expect(row.pitch).toBeCloseTo(76, 6);
    }
    expect(rows[11]!.y + 54).toBeCloseTo(1345, 6);
    expect(rows[23]!.y + 54).toBeCloseTo(1345, 6);
  });

  it.each([4, 16, 24, 25])("keeps %i teams inside the safe zone", (n) => {
    const rows = announcementRowLayout(n, spec);
    expect(rows).toHaveLength(n);
    const [left, right] = splitRowsAt(n, 12);
    expect(rows.filter((r) => r.x === 88)).toHaveLength(left);
    expect(rows.filter((r) => r.x === 568)).toHaveLength(right);
    for (const row of rows) {
      expect(row.y).toBeGreaterThanOrEqual(455);
      expect(row.y + 54).toBeLessThanOrEqual(1420);
      expect(Number.isFinite(row.y)).toBe(true);
    }
  });

  it("orders assigned slot numbers first and labels them deterministically", () => {
    const shuffled = [
      { name: "ZULU", slotNumber: null },
      { name: "ALPHA", slotNumber: 24 },
      { name: "BRAVO", slotNumber: 5 },
      { name: "CHARLIE", slotNumber: 99 },
      { name: "DELTA", slotNumber: 12 },
    ];
    const ordered = orderTeamsBySlot(shuffled);
    expect(ordered.map((t) => t.name)).toEqual(["BRAVO", "DELTA", "ALPHA", "CHARLIE", "ZULU"]);
    // Unassigned "ZULU" is row 5 → its free fallback label is 06 (05 is taken).
    expect(announcementSlotLabels(ordered)).toEqual(["05", "12", "24", "99", "06"]);
  });
});

describe("cardinal-gold — announcement SSR typography + centering", () => {
  it("renders 24 teams in two columns of 12 with their slot badges", () => {
    const html = renderAnnouncement();
    for (const name of NAMES) expect(html).toContain(name);
    expect(count(html, "left:88px")).toBe(12);
    expect(count(html, "left:568px")).toBe(12);
    expect(count(html, "background:#141414")).toBe(24);
    expect(count(html, "background:rgba(20, 3, 7, 0.78)")).toBe(24);
    for (const slot of ["05", "10", "16", "24", "28"]) expect(html).toContain(`>${slot}<`);
    // The baked "TEAM PARTICIPATION" headline is never overdrawn.
    expect(html).not.toContain("TEAM PARTICIPATION");
    expect(html).not.toContain("26-27 SCRIM");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("uses the measured heavy athletic font stack, weights and ink", () => {
    const html = renderAnnouncement();
    expect(html).toContain('font:800 26px &quot;Rajdhani&quot;');
    expect(html).toContain('font:800 21px &quot;Exo 2&quot;');
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:0.04em");
    expect(html).toContain("color:#F5C451"); // gold badge numerals
    expect(html).toContain("color:#FFFFFF"); // pure-white names
    expect(html).toContain("text-shadow:0 2px 4px rgba(0, 0, 0, 0.5)");
    for (const face of ["Exo 2", "Rajdhani", "Noto Sans Symbols 2", "system-ui"]) {
      expect(html).toContain(face);
    }
    expect(CONFIG.announcement.slotFont).toBe('800 26px "Rajdhani", "Exo 2", "Noto Sans Symbols 2", sans-serif');
    expect(CONFIG.announcement.nameFont).toBe(
      '800 21px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif',
    );
  });

  it("declares line-height strictly AFTER font on every row, badge and name cell", () => {
    const html = renderAnnouncement();
    lineHeightAfterFont(html, "left:88px");
    lineHeightAfterFont(html, "left:568px");
    lineHeightAfterFont(html, "background:#141414");
    lineHeightAfterFont(html, "background:rgba(20, 3, 7, 0.78)");
    expect(html).toContain("display:flex");
    expect(html).toContain("align-items:center");
    expect(html).toContain("justify-content:center");
    expect(html).not.toMatch(/line-height:[^"']*font:800/);
  });

  it.each([4, 16, 24, 25])("stays clean at %i teams", (n) => {
    const html = renderAnnouncement(teams(n));
    expect(count(html, "height:54px")).toBe(n);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    const [left, right] = splitRowsAt(n, 12);
    expect(count(html, "left:88px")).toBe(left);
    expect(count(html, "left:568px")).toBe(right);
  });

  it("renders out-of-order slot numbers verbatim and tolerates missing logos", () => {
    const raw = [
      { id: "a", name: "ALPHA", logoUrl: null, slotNumber: 99 },
      { id: "b", name: "BRAVO", logoUrl: null, slotNumber: 5 },
      { id: "c", name: "CHARLIE", logoUrl: null, slotNumber: 24 },
      { id: "d", name: "DELTA", logoUrl: null, slotNumber: 12 },
    ];
    const html = renderAnnouncement(orderTeamsBySlot(raw));
    for (const slot of ["05", "12", "24", "99"]) expect(html).toContain(`>${slot}<`);
    expect(html).not.toContain("<img"); // no logos assigned
    const withLogo = renderAnnouncement([{ ...raw[0]!, logoUrl: "data:image/png;base64,AAAA" }]);
    expect(withLogo).toContain("<img");
    expect(withLogo).toContain("border-radius:50%");
  });

  it("ellipsizes a 30-character name and paints glyph-torture names verbatim", () => {
    const longName = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCD"; // 30 chars
    const html = renderAnnouncement(teams(1, [longName]));
    expect(html).toContain(longName);
    expect(count(html, "text-overflow:ellipsis")).toBeGreaterThanOrEqual(2);

    const glyphs = GLYPH_TEAM_NAMES.slice(0, 4);
    const glyphHtml = renderAnnouncement(teams(glyphs.length, glyphs));
    for (const name of glyphs) expect(glyphHtml).toContain(name);
    expect(glyphHtml).not.toContain("NaN");
  });
});

describe("cardinal-gold — overall ranking SSR typography + centering", () => {
  it("renders the 24-team standings in two 12-row columns from confirmed results", () => {
    const html = renderStandings();
    for (const name of NAMES) expect(html).toContain(name);
    expect(count(html, "left:62px")).toBe(12); // left-column rank boxes
    expect(count(html, "left:602px")).toBe(12); // right-column rank boxes
    expect(html).toContain(">24<"); // rank 24
    expect(html).toContain(">70<"); // rank-1 total
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("uses the 900/800 athletic display ink with uppercase + tracking + shadow", () => {
    const html = renderStandings();
    expect(html).toContain('font:900 64px &quot;Rajdhani&quot;');
    expect(html).toContain('font:800 30px &quot;Rajdhani&quot;');
    expect(html).toContain('font:800 21px &quot;Exo 2&quot;');
    expect(html).toContain('font:800 23px &quot;Rajdhani&quot;');
    expect(html).toContain("letter-spacing:0.03em");
    expect(html).toContain("letter-spacing:0.14em");
    expect(html).toContain("letter-spacing:0.04em");
    expect(html).toContain("text-shadow:0 4px 12px rgba(0, 0, 0, 0.65)");
    expect(count(html, "text-transform:uppercase")).toBeGreaterThanOrEqual(26); // 24 names + title + subtitle
    expect(html).toContain("text-transform:uppercase");
    expect(CONFIG.header.titleFont).toBe('900 64px "Rajdhani", "Exo 2", "Noto Sans Symbols 2", sans-serif');
    expect(CONFIG.standings.nameUppercase).toBe(true);
    expect(CONFIG.standings.rowsPerColumn).toBe(12);
  });

  it("declares line-height AFTER font on rank, name, stat and header cells", () => {
    const html = renderStandings();
    lineHeightAfterFont(html, "left:62px");
    lineHeightAfterFont(html, "left:602px");
    lineHeightAfterFont(html, "font:800 21px");
    lineHeightAfterFont(html, "font:800 23px");
    lineHeightAfterFont(html, "font:900 64px");
    expect(html).not.toMatch(/line-height:[^"']*font:800/);
  });

  it("keeps white and gold ink ≥4.5:1 on the badge, bars and gradient stops", () => {
    const gold = parseHexColor("#F5C451");
    const white = parseHexColor("#FFFFFF");
    const badge = parseHexColor("#141414");
    expect(contrastRatio(gold, badge)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(white, badge)).toBeGreaterThanOrEqual(4.5);
    const bg = CONFIG.backgrounds.standings;
    if (bg.type !== "gradient") throw new Error("standings gradient fallback missing");
    for (const stop of ["#5A0812", "#8A0F1D", "#2B0307", "#141210", "#9E1B24"]) {
      if (!bg.css.includes(stop)) continue;
      expect(contrastRatio(white, parseHexColor(stop))).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(gold, parseHexColor(stop))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
