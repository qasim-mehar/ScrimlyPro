import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  contrastRatio,
  getTemplate,
  hasArtForVariant,
  hideScrimNameFor,
  parseHexColor,
  selectableAestheticIds,
  splitRowsAt,
  type TemplateConfig,
} from "@/lib/graphics";
import { ewcTealStandings } from "@/lib/fixtures/ewcTeal";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("pmhi-crimson");
const st = CONFIG.standings;
const [LEFT, RIGHT] = st.columns;
const BOX_W = st.statBoxW!;

/**
 * Supplied art: a TRUE 1696×2528 PNG (not a JPEG payload), uniformly
 * width-fitted to the canvas. S = 1080/1696; the 10.19px height shortfall is
 * split into a 5.0943px letterbox top/bottom. Every pin below is measured in
 * ART pixels and converted with cx/cy — never estimated from the thumbnail.
 */
const ART_W = 1696;
const ART_H = 2528;
const S = 1080 / ART_W;
const TOP = (1620 - ART_H * S) / 2;
const cx = (artX: number) => artX * S + TOP;
const cy = (artY: number) => artY * S + TOP;
const near = (actual: number, expected: number, tol = 1) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

function standings(n: number): StandingRow[] {
  return ewcTealStandings(n);
}

function render(
  n: number,
  matchCount: number | undefined,
  subtitle = `AFTER MATCH ${matchCount ?? 6}`,
  rows = standings(n),
): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "pmhi-crimson",
      title: "SCRIM",
      subtitle,
      organizer: null,
      standings: rows,
      matchCount,
    }),
  );
}

describe("pmhi-crimson registration, art and brand law", () => {
  it("registers only the standings variant as art-backed and selectable", () => {
    expect(AESTHETICS["pmhi-crimson"]).toBeDefined();
    expect(AESTHETIC_IDS).toContain("pmhi-crimson");
    expect(VALID_TEMPLATE_IDS).toContain("pmhi-crimson");
    expect(CONFIG.id).toBe("pmhi-crimson");
    expect(CONFIG.canvas).toEqual({ w: 1080, h: 1620 }); // strict 2:3 export canvas
    expect(hasArtForVariant(CONFIG, "standings")).toBe(true);
    expect(hasArtForVariant(CONFIG, "mvp")).toBe(false);
    expect(hasArtForVariant(CONFIG, "announcement")).toBe(false);
    expect(selectableAestheticIds("standings")).toContain("pmhi-crimson");
    expect(selectableAestheticIds("mvp")).not.toContain("pmhi-crimson");
    expect(selectableAestheticIds("announcement")).not.toContain("pmhi-crimson");
  });

  it("ships the user-supplied art and reference; the reference is never a background", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings must be backed by art");
    expect(bg.src).toBe("/templates/pmhi-crimson/standings.png");
    const art = readFileSync("public/templates/pmhi-crimson/standings.png");
    // Magic-byte sniff — never re-encode a JPEG payload into a PNG-named file.
    expect([...art.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect({ w: art.readUInt32BE(16), h: art.readUInt32BE(20) }).toEqual({ w: ART_W, h: ART_H });
    expect(() => readFileSync("public/templates/pmhi-crimson/reference.png")).not.toThrow();
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const background = CONFIG.backgrounds[variant];
      expect("src" in background ? background.src : "").not.toContain("reference");
    }
  });

  it("fits the non-2:3 art uniformly with a filled letterbox — zero distortion", () => {
    const bg = CONFIG.backgrounds.standings;
    if (bg.type !== "image" || !bg.fit) throw new Error("expected a uniform ImageFit");
    expect(bg.fit.width).toBe(1080);
    expect(bg.fit.height).toBeCloseTo(ART_H * S, 6);
    expect(bg.fit.width / ART_W).toBeCloseTo(bg.fit.height / ART_H, 10);
    expect(bg.fit.left).toBe(0);
    expect(bg.fit.top).toBeCloseTo((1620 - bg.fit.height) / 2, 6);
    expect(CONFIG.canvasBackground).toBe("#2A0710");
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
  });

  it("keeps the watermark text/position hardcoded, only its ink configurable", () => {
    expect(CONFIG.palette.watermarkColor).toBe("#FFFFFF");
    const canvas = renderToStaticMarkup(h(GraphicCanvas, { config: CONFIG, variant: "standings" }));
    expect(canvas).toContain("left:730px");
    expect(canvas).toContain("top:1570px");
    expect(canvas).toContain("scrimlypro.com");
    expect(canvas).toContain("color:#FFFFFF");
    expect(canvas).toContain("width:1080px");
    expect(canvas).toContain("height:1620px");
    expect(canvas).toContain("scale(calc(100cqw / 1080px))");
    const source = readFileSync("components/graphics/GraphicCanvas.tsx", "utf8");
    expect(source).toContain("{ x: 730, y: 1570, w: 280, align: \"right\" }");
  });
});

describe("pmhi-crimson 24-team two-column geometry (canvas px)", () => {
  it("bakes title, labels and ranks into the art; renders only values", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(st.ranksBakedIn).toBe(true);
    for (const col of [LEFT, RIGHT]) expect(col.ranksBakedIn ?? st.ranksBakedIn).toBe(true);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    near(st.headerLabelsY, cy(666), 1); // cyan baked label band top
  });

  it("keeps rowHeight ≤ rowPitch and seats rows 1/12/13/24 on the painted bar centres", () => {
    expect(st.rowHeight).toBeLessThanOrEqual(st.rowPitch);
    expect(st.fixedRowPitch).toBe(true);
    near(st.rowY0, cy(747), 1); // first painted bar interior top (art y746–870)
    near(st.rowPitch, 125.2 * S, 0.05);
    // Baked rank-1 ink centre art y808; least-squares pitch 125.2 art px
    // across all 12 rank centres → row 12 centre art y2186.
    const painted1 = cy(808);
    const painted12 = cy(808 + 11 * 125.2);
    const textCenter = (rowIdx: number) => st.rowY0 + rowIdx * st.rowPitch + st.rowHeight / 2;
    // Each column reuses the same 12 painted bars: #13 is right-column rowIdx 0
    // and #24 is right-column rowIdx 11 — identical centres to #1 and #12.
    near(textCenter(0), painted1, 1.5); // rows #1 and #13
    near(textCenter(11), painted12, 1.5); // rows #12 and #24
    for (let i = 0; i < 12; i++) {
      const top = st.rowY0 + i * st.rowPitch;
      expect(top).toBeGreaterThanOrEqual(st.headerLabelsY + st.rowHeight / 2);
      expect(top + st.rowHeight).toBeLessThanOrEqual(1620);
      expect(top).toBeGreaterThanOrEqual(st.rowY0 + (i - 1) * st.rowPitch + st.rowHeight - 1);
    }
  });

  it("splits 24 → [12,12] with zero dropped, 16 → [12,4], 4 → [4,0]", () => {
    expect(splitRowsAt(24, 12)).toEqual([12, 12]);
    expect(splitRowsAt(16, 12)).toEqual([12, 4]);
    expect(splitRowsAt(4, 12)).toEqual([4, 0]);
    expect(splitRowsAt(25, 12)).toEqual([12, 13]); // overflow below the painted table, never dropped
    expect(st.rowY0 + 12 * st.rowPitch).toBeLessThan(1620);
    expect(st.rowsPerColumn).toBe(12);
    expect(st.maxRowsLeft).toBe(12);
    for (const col of [LEFT, RIGHT]) expect(col.rowsPerColumn ?? st.rowsPerColumn).toBe(12);
    // 16 teams fill the painted #1–#12 / #13–#16 slots; the remaining baked
    // rows stay blank because the RANKS are printed in the art ([8,8] would
    // put team 9 on the baked #13 bar). No team is ever dropped.
    for (const count of splitRowsAt(16, 12)) {
      for (let i = 0; i < count; i++) {
        expect(st.rowY0 + i * st.rowPitch + st.rowHeight).toBeLessThanOrEqual(1620);
      }
    }
  });

  it("uses only derived stat columns — no MATCHES or aggregate columns", () => {
    for (const col of [LEFT, RIGHT]) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
      expect(col.statColumns.every((c) => c.key !== "matches")).toBe(true);
    }
    const html = render(24, 6);
    expect(html).not.toContain(">MATCHES<");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });
});

describe("pmhi-crimson stat + team cells", () => {
  it("centres WWCD / PLACE PTS / ELIMS / TOTAL boxes on their baked ink", () => {
    // Ink-span centres measured on the art (art px) and converted via cx().
    const measured = {
      left: [cx(451), cx(572), cx(686), cx(775.5)],
      right: [cx(1281.5), cx(1403), cx(1515.5), cx(1605.5)],
    };
    for (const [col, centers] of [
      [LEFT, measured.left],
      [RIGHT, measured.right],
    ] as const) {
      const actual = col.statColumns.map((c) => c.x + BOX_W / 2);
      actual.forEach((x, i) => near(x, centers[i]!, 0.5));
      for (let i = 1; i < col.statColumns.length; i++) {
        expect(col.statColumns[i]!.x).toBeGreaterThanOrEqual(col.statColumns[i - 1]!.x + BOX_W);
      }
      const boxes = col.statColumns.map((c) => ({ x: c.x, right: c.x + BOX_W }));
      expect(Math.min(...boxes.map((b) => b.x))).toBeGreaterThan(col.teamX + col.teamW);
      expect(Math.max(...boxes.map((b) => b.right))).toBeLessThan(1080);
    }
  });

  it("starts TEAM on the measured divider ink and truncates long names inside it", () => {
    near(LEFT.teamX, cx(205), 1);
    near(RIGHT.teamX, cx(1036), 1);
    expect(LEFT.teamW).toBe(130);
    expect(RIGHT.teamW).toBe(130);
    expect(LEFT.teamX + LEFT.teamW).toBeLessThan(LEFT.statColumns[0]!.x);
    const longRows: StandingRow[] = [
      {
        teamId: "arabic",
        teamName: "فريق النجوم الحمراء الطويل جدا",
        logoUrl: null,
        wwcd: 0,
        pp: 1,
        kp: 2,
        total: 3,
      },
      {
        teamId: "cjk",
        teamName: "赤い星のとても長いチーム名",
        logoUrl: null,
        wwcd: 0,
        pp: 0,
        kp: 1,
        total: 1,
      },
    ];
    const html = render(2, 6, "AFTER MATCH 6", longRows);
    expect(html).toContain("فريق النجوم الحمراء الطويل جدا");
    expect(html).toContain("赤い星のとても長いチーム名");
    expect(html).toContain("overflow:hidden");
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("width:130px");
  });

  it("bounds a logo plate inside the row and narrows the name box", () => {
    const row: StandingRow = {
      teamId: "logo",
      teamName: "TRB Gaming",
      logoUrl: "data:image/png;base64,iVBORw0KGgo=",
      wwcd: 1,
      pp: 10,
      kp: 20,
      total: 30,
    };
    const html = render(1, 6, "AFTER MATCH 6", [row]);
    const plateTop = st.rowY0 + (st.rowHeight - st.logoPlate!) / 2;
    expect(plateTop).toBeGreaterThanOrEqual(st.rowY0);
    expect(plateTop + st.logoPlate!).toBeLessThanOrEqual(st.rowY0 + st.rowHeight);
    expect(html).toContain(`top:${plateTop}px`);
    expect(html).toContain(`width:${st.logoPlate!}px`);
    expect(html).toContain(`width:${LEFT.teamW - st.logoNameGap!}px`);
  });

  it("reads ≥7:1 for white ink on dark crimson rows, ≥4.5 where the art lightens", () => {
    // Mean of the blank row-1 interior (art x250–800, y750–870) = #6E0D1D;
    // sample pixels #65091C / #800B1C. All are far darker than the white ink.
    for (const crimson of ["#6E0D1D", "#65091C", "#800B1C"]) {
      expect(
        contrastRatio(parseHexColor(CONFIG.palette.text), parseHexColor(crimson)),
      ).toBeGreaterThanOrEqual(7);
    }
    // The baked pink helmet lightens the lower-right cells (#A53445 at row 12):
    // still ≥4.5:1 for normal text and well above the 3:1 large-text floor.
    expect(
      contrastRatio(parseHexColor(CONFIG.palette.text), parseHexColor("#A53445")),
    ).toBeGreaterThanOrEqual(4.5);
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.wwcdText).toBe("#FFFFFF");
    for (const font of [st.nameFont, st.statFont]) {
      expect(font.startsWith("800 ")).toBe(true);
      expect(font).toContain('"Exo 2"');
      expect(font).toContain('"Rajdhani"'); // metric fallback (never leads)
    }
    expect(st.uniformRowInk).toBe(true);
    expect(st.uniformStatInk).toBe(true);
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
  });
});

describe("pmhi-crimson baked MATCH # digit slot", () => {
  const standingsHeader = CONFIG.variantHeaders?.standings;
  const sub = standingsHeader?.subtitle ?? { x: 0, y: 0 };
  const subFont = standingsHeader?.subtitleFont ?? "";

  it("uses Exo 2 800 uppercase pure-white ink inside the measured right box", () => {
    near(sub.x, cx(854), 0.5); // red pill ends art x853; black slot starts 854
    near(sub.x + sub.w!, cx(1060), 0.5); // slot's right red border
    near(sub.y, cy(522), 0.5);
    expect(sub.align).toBe("center");
    expect(subFont.startsWith("800 36px ")).toBe(true);
    expect(subFont).toContain('"Exo 2"');
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#FFFFFF");
    expect(CONFIG.variantHeaders?.standings?.subtitleTextTransform).toBe("uppercase");
  });

  it("positions MATCH 1 and MATCH 10 in the slot without overflow", () => {
    for (const n of [1, 10]) {
      const html = render(24, n, `AFTER MATCH ${n}`);
      expect(html).toContain(`left:${sub.x}px`);
      expect(html).toContain(`top:${sub.y}px`);
      expect(html).toContain(`>${n}<`);
      expect(html).toContain("text-transform:uppercase");
    }
    // At 800 36px, Exo 2 digits are ≤0.62em wide; two digits ≤44.7px, well
    // inside the 131.17px measured box and clear of the baked pill ink.
    expect(2 * 0.62 * 36).toBeLessThan(sub.w!);
    expect(sub.x!).toBeGreaterThan(cx(853));
    expect(sub.x! + sub.w!).toBeLessThanOrEqual(cx(1061));
  });

  it("renders no title/labels/ranks from code (24 baked ranks stay untouched)", () => {
    const html = render(24, 6);
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain(">TOTAL<");
    expect((html.match(/left:136px/g) ?? []).length).toBe(12);
    expect((html.match(/left:665px/g) ?? []).length).toBe(12);
    expect(html).toContain("4THRIVES ESPORTS"); // rank 1
    expect(html).toContain("DX RAIDERS"); // rank 24, not dropped
  });

  it("fills the left painted column first at 16 and renders no bogus right rows at 4", () => {
    const html16 = render(16, 6);
    expect((html16.match(/left:136px/g) ?? []).length).toBe(12);
    expect((html16.match(/left:665px/g) ?? []).length).toBe(4);
    expect(html16).toContain("VOIN ESPORTS"); // rank 16

    const html4 = render(4, 6);
    expect((html4.match(/left:136px/g) ?? []).length).toBe(4);
    expect(html4).not.toContain("left:665px");
    expect(html4).not.toContain("NaN");
  });
});
