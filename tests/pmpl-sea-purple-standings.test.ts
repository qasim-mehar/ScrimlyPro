import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hasArtForVariant,
  parseHexColor,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const ID = "pmpl-sea-purple";
const CONFIG: TemplateConfig = getTemplate(ID);
const ST = CONFIG.standings;

/** Exact painted white-card bounds measured on the delivered 1080×1620 art.
 *  The art's pitch is NOT uniform: these are the ground truth for row seating. */
const CARDS: ReadonlyArray<readonly [number, number]> = [
  [321, 399],
  [409, 490],
  [501, 573],
  [580, 662],
  [672, 753],
  [763, 850],
  [871, 955],
  [966, 1043],
  [1056, 1141],
  [1152, 1236],
  [1246, 1328],
  [1339, 1419],
];

function standings(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${String(i + 1).padStart(2, "0")}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : 0,
    pp: 50 - i,
    kp: 40 - i,
    total: 90 - i * 2,
    matches: 12,
  }));
}

function render(n: number, matchCount = 3): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: ID,
      title: "PMPL SEA CHAMPIONSHIP",
      subtitle: "AFTER MATCH 3",
      organizer: null,
      standings: standings(n),
      matchCount,
    }),
  );
}

describe("pmpl-sea-purple registration + art-backed availability", () => {
  it("is registered in AestheticId, AESTHETICS, AESTHETIC_IDS and the session allowlist", () => {
    expect(AESTHETICS[ID]).toBeDefined();
    expect(AESTHETIC_IDS).toContain(ID);
    expect(getTemplate(ID).id).toBe(ID);
    expect(CONFIG.name).toBe("PMPL SEA Purple");
    expect(VALID_TEMPLATE_IDS).toContain(ID);
  });

  it("is selectable for standings only (art-backed filter law)", () => {
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(selectableAestheticIds("standings")).toContain(ID);
    expect(CONFIG.backgrounds.standings).toMatchObject({ type: "image" });
    expect(hasArtForVariant(CONFIG, "mvp")).toBe(false);
    expect(hasArtForVariant(CONFIG, "announcement")).toBe(false);
  });

  it("ships a readable 1080×1620 standings PNG plus the reference", () => {
    const bytes = readFileSync("public/templates/pmpl-sea-purple/standings.png");
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect({ w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }).toEqual({ w: 1080, h: 1620 });
    expect(() => readFileSync("public/templates/pmpl-sea-purple/reference.png")).not.toThrow();
  });
});

describe("pmpl-sea-purple 2×12 overall-standings geometry", () => {
  it("splits 16 / 20 / 24 teams into the painted 12-per-column slots", () => {
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(20, 12)).toEqual([12, 8]);
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(ST.rowsPerColumn).toBe(12);
    expect(ST.maxRowsLeft).toBe(12);
    expect(ST.fixedRowPitch).toBe(true);
    expect(ST.singleColumn).not.toBe(true);
    expect(ST.columns).toHaveLength(2);
    for (const col of ST.columns) {
      expect(col.rowsPerColumn ?? ST.rowsPerColumn).toBe(12);
      expect(col.fixedRowPitch ?? ST.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? ST.ranksBakedIn).toBe(true);
    }
  });

  it("pins the nominal ladder and the exact painted card centres", () => {
    expect(ST.rowY0).toBe(321); // row-1 card top
    expect(ST.rowPitch).toBe(93.42); // least-squares fit of the 12 midlines
    expect(ST.rowHeight).toBe(72); // ≤ the narrowest painted card (73px)
    expect(ST.rowCenterYs?.length).toBe(12);
    ST.rowCenterYs?.forEach((center, i) => {
      const [top, bottom] = CARDS[i]!;
      expect(center).toBeCloseTo((top + bottom) / 2, 0);
      // The whole 72px text box stays inside the painted card — no overflow,
      // no drift, even on the irregular rows 3–6.
      expect(center - ST.rowHeight / 2).toBeGreaterThanOrEqual(top);
      expect(center + ST.rowHeight / 2).toBeLessThanOrEqual(bottom);
    });
    // Last row's box clears the painted table bottom.
    expect(ST.rowCenterYs![11]! + ST.rowHeight / 2).toBeLessThanOrEqual(CARDS[11]![1]);
  });

  it("centres every stat box in its painted compartment without crossing dividers", () => {
    const leftCells: ReadonlyArray<readonly [number, number]> = [
      [332, 380],
      [381, 443],
      [444, 515],
    ];
    const rightCells: ReadonlyArray<readonly [number, number]> = [
      [844, 892],
      [893, 955],
      [956, 1027],
    ];
    expect(ST.statBoxW).toBe(46);
    for (const [col, cells] of [
      [ST.columns[0], leftCells],
      [ST.columns[1], rightCells],
    ] as const) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["kp", "pp", "total"]);
      col.statColumns.forEach((stat, i) => {
        const [left, right] = cells[i]!;
        const centre = stat.x + ST.statBoxW! / 2;
        expect(Math.abs(centre - (left + right) / 2)).toBeLessThanOrEqual(1);
        expect(stat.x).toBeGreaterThanOrEqual(left);
        expect(stat.x + ST.statBoxW!).toBeLessThanOrEqual(right + 1);
      });
    }
    // Team + logo cells stop at the first painted divider on both tables.
    expect(ST.columns[0].teamX).toBe(113);
    expect(ST.columns[0].teamX + ST.columns[0].teamW).toBe(331);
    expect(ST.columns[1].teamX).toBe(625);
    expect(ST.columns[1].teamX + ST.columns[1].teamW).toBe(843);
  });
});

describe("pmpl-sea-purple typography + contrast", () => {
  it("uses Exo 2 800 uppercase names", () => {
    expect(ST.nameFont).toMatch(/^800 \d+px "Exo 2"/);
    expect(ST.nameUppercase).toBe(true);
    expect(ST.statFont).toMatch(/^800 \d+px "Exo 2"/);
  });

  it("paints the match digits in neon-yellow Permanent Marker after the baked #", () => {
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(CONFIG.labelsBakedIn).toBe(true);
    const header = CONFIG.variantHeaders?.standings;
    expect(header).toBeDefined();
    if (!header) throw new Error("standings header override is required");
    const sub = header.subtitle;
    expect(sub).toBeDefined();
    if (!sub) throw new Error("match-number subtitle slot is required");
    expect(sub.x).toBeGreaterThanOrEqual(992); // baked '#' ink ends at x986
    expect(sub.x + (sub.w ?? 0)).toBeLessThanOrEqual(1080);
    const font = header.subtitleFont ?? "";
    expect(font).toContain("var(--font-brush)");
    expect(font).toContain("Permanent Marker");
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#EAFF00");
    expect(CONFIG.variantHeaders?.standings?.subtitleTextTransform).toBe("uppercase");
  });

  it("clears AAA contrast for #111318 (and secondary #1a1c23) over white cards", () => {
    const white = parseHexColor("#ffffff");
    expect(CONFIG.palette.text).toBe("#111318");
    expect(CONFIG.palette.textMuted).toBe("#1a1c23");
    expect(contrastRatio(parseHexColor(CONFIG.palette.text), white)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(parseHexColor(CONFIG.palette.textMuted), white)).toBeGreaterThanOrEqual(7);
  });

  it("keeps the fixed white brand watermark and parks rank-1 synthetic ink", () => {
    expect(CONFIG.palette.watermarkColor).toBe("#ffffff");
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
    expect(ST.uniformRowInk).toBe(true);
    expect(ST.uniformStatInk).toBe(true);
  });
});

describe("pmpl-sea-purple 24-team render", () => {
  it("seats 24 rows on the measured centres and paints the brush match digits", () => {
    const html = render(24);
    expect(html).toContain("top:324px"); // row 1  = 360 − 72/2
    expect(html).toContain("top:1343px"); // row 12 = 1379 − 72/2
    expect(html).toContain("height:72px");
    expect(html).toContain("var(--font-brush)");
    expect(html).toContain(">3<"); // only the confirmed match number
    for (const row of standings(24)) expect(html).toContain(row.teamName);
  });

  it("never pours a 16- or 20-team session past the painted table", () => {
    for (const n of [16, 20]) {
      const html = render(n);
      const names = html.match(/SQUAD \d+/g) ?? [];
      // Exactly n rows: 12 in the left painted ladder, n−12 in the right one;
      // nothing dropped and nothing rendered past the 12th card.
      expect(names).toHaveLength(n);
      expect(names[n - 1]).toBe(`SQUAD ${String(n).padStart(2, "0")}`);
      expect(html).toContain("top:324px");
      // Row-12 top appears 5× (strip + name + 3 stats) in the left column only.
      expect(html.match(/top:1343px/g)?.length).toBe(5);
    }
  });
});
