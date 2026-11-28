import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETIC_IDS,
  AESTHETICS,
  contrastRatio,
  getTemplate,
  hideScrimNameFor,
  minContrastAgainstStops,
  parseHexColor,
  splitRowsAt,
  subtitleBakedInFor,
  type TemplateConfig,
} from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { StandingRow } from "@/lib/scoring";

const CONFIG: TemplateConfig = getTemplate("pmgc-sapphire");
const st = CONFIG.standings;

/** Art: true 1536×2730 PNG, uniform width fit ×1080/1536 with a centred
 *  object-fit:cover crop. Every coordinate below is measured in canvas space
 *  after that mapping (see the config comment in aesthetics.ts). */
const S = 1080 / 1536;
const TOP = (1620 - 2730 * S) / 2; // -149.765625

function standings(n: number): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SAPPHIRE ${i + 1}`,
    logoUrl: null,
    wwcd: i === 0 ? 2 : i < 3 ? 1 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function render(n: number, subtitle: string, matchCount: number): string {
  return renderToStaticMarkup(
    h(OverallStandingsGraphic, {
      aestheticId: "pmgc-sapphire",
      title: "SCRIM",
      subtitle,
      organizer: null,
      standings: standings(n),
      matchCount,
    }),
  );
}

describe("pmgc-sapphire registration + art fit", () => {
  it("is registered in AESTHETICS, AESTHETIC_IDS and the session allowlist", () => {
    expect(AESTHETICS["pmgc-sapphire"]).toBeDefined();
    expect(AESTHETIC_IDS).toContain("pmgc-sapphire");
    expect(getTemplate("pmgc-sapphire").id).toBe("pmgc-sapphire");
    expect(getTemplate("pmgc-sapphire").name).toBe("PMGC Sapphire");
    expect(VALID_TEMPLATE_IDS).toContain("pmgc-sapphire");
  });

  it("backs standings with the measured 1536×2730 overall.png", () => {
    const bg = CONFIG.backgrounds.standings;
    expect(bg.type).toBe("image");
    if (bg.type !== "image") throw new Error("standings background must be art");
    expect(bg.src).toBe("/templates/pmgc-sapphire/overall.png");
    const bytes = readFileSync("public/templates/pmgc-sapphire/overall.png");
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(1536);
    expect(bytes.readUInt32BE(20)).toBe(2730);
    // Distortion-free fit + centred crop, never a stretch to 2:3.
    expect(bg.fit).toBeDefined();
    const fit = bg.fit!;
    expect(fit.width).toBe(1080);
    expect(fit.width / 1536).toBeCloseTo(S, 10);
    expect(fit.height).toBeCloseTo(2730 * S, 6);
    expect(fit.height / 2730).toBeCloseTo(fit.width / 1536, 10);
    expect(fit.left).toBe(0);
    expect(fit.top).toBeCloseTo(TOP, 6);
    expect(fit.top).toBeCloseTo((1620 - fit.height) / 2, 6);
  });

  it("uses dark-sapphire gradient fallbacks for the artless MVP + announcement", () => {
    for (const variant of ["mvp", "announcement"] as const) {
      expect(CONFIG.backgrounds[variant].type).toBe("gradient");
    }
    const css = (CONFIG.backgrounds.mvp as { css: string }).css;
    expect(css).toContain("#0A1329");
    expect(css).toContain("#162E62");
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.text), css)).toBeGreaterThanOrEqual(4.5);
    expect(minContrastAgainstStops(parseHexColor(CONFIG.palette.textMuted), css)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pmgc-sapphire 8+8 row geometry", () => {
  it("splits 16 teams into exactly two columns of eight rows", () => {
    expect(splitRowsAt(16, 8)).toEqual([8, 8]);
    expect(splitRowsAt(19, 8)).toEqual([8, 11]); // overflow beyond the two painted columns
    expect(st.rowsPerColumn).toBe(8);
    expect(st.maxRowsLeft).toBe(8);
    expect(st.fixedRowPitch).toBe(true);
    expect(st.ranksBakedIn).toBe(false); // the art bakes NO rank numerals
    for (const col of st.columns) {
      expect(col.rowsPerColumn ?? st.rowsPerColumn).toBe(8);
      expect(col.fixedRowPitch ?? st.fixedRowPitch).toBe(true);
      expect(col.ranksBakedIn ?? st.ranksBakedIn).toBe(false);
    }
  });

  it("pins rowY0 253, pitch 78 and height 66 to the painted bar centreline", () => {
    // Measured bar centres on the 1080×1620 canvas:
    // 284.5, 364.5, 443.5, 521.5, 597.5, 675.5, 753, 830.5, …
    const measured = [284.5, 364.5, 443.5, 521.5, 597.5, 675.5, 753, 830.5];
    expect(st.rowY0).toBe(253);
    expect(st.rowPitch).toBe(78);
    expect(st.rowHeight).toBe(66);
    for (let i = 0; i < measured.length; i++) {
      const centre = st.rowY0 + i * st.rowPitch + st.rowHeight / 2;
      expect(Math.abs(centre - measured[i])).toBeLessThan(2); // zero meaningful drift
    }
  });

  it("pins both columns' stat boxes under the baked headers (exact arrangement)", () => {
    for (const col of st.columns) {
      expect(col.statColumns.map((c) => c.key)).toEqual(["wwcd", "pp", "kp", "total"]);
    }
    expect(st.columns[0].statColumns.map((c) => c.x)).toEqual([279, 343, 406, 470]);
    expect(st.columns[1].statColumns.map((c) => c.x)).toEqual([794, 856, 919, 983]);
    expect(st.statBoxW).toBe(52);
    for (const col of st.columns) {
      const boxes = [...col.statColumns].sort((a, b) => a.x - b.x);
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + st.statBoxW!);
      }
      expect(col.teamX + col.teamW).toBeLessThanOrEqual(boxes[0].x - 2);
    }
    // Measured ink centres — each value box is centred on its header label.
    const centres = [305.4, 369, 432.2, 496.5, 820, 882, 945, 1009];
    const boxes = [...st.columns[0].statColumns, ...st.columns[1].statColumns];
    boxes.forEach((box, i) => {
      expect(Math.abs(box.x + st.statBoxW! / 2 - centres[i])).toBeLessThanOrEqual(1);
    });
  });
});

describe("pmgc-sapphire baked header + right-aligned 'M N' badge", () => {
  it("bakes labels and title into the art while leaving rank badges to the renderer", () => {
    expect(CONFIG.labelsBakedIn).toBe(true);
    expect(CONFIG.subtitleMode).toBe("matchNumber");
    expect(subtitleBakedInFor(CONFIG, "standings")).toBe(false);
    expect(hideScrimNameFor(CONFIG, "standings")).toBe(true);
    expect(hideScrimNameFor(CONFIG, "mvp")).not.toBe(true);
    expect(st.headerLabelsY).toBe(205);
    expect(st.rankPrefix).toBe("#");
  });

  it("seats the 'M N' badge right of OVERALL RANKINGS in title-weight white ink", () => {
    const sub = CONFIG.variantHeaders?.standings?.subtitle;
    expect(sub).toEqual({ x: 824, y: 88, w: 180, align: "left" });
    expect(CONFIG.subtitlePrefix).toBe("M ");
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toContain("900 56px");
    expect(CONFIG.variantHeaders?.standings?.subtitleFont).toContain('"Exo 2"');
    expect(CONFIG.variantHeaders?.standings?.subtitleColor).toBe("#FFFFFF");
    // Ink of the baked title ends at canvas x814 — the slot starts clear of it.
    expect(sub!.x!).toBeGreaterThanOrEqual(814);
    expect(sub!.x! + sub!.w!).toBeLessThanOrEqual(1080);
  });
});

describe("pmgc-sapphire two-tone ink + WCAG AA contrast", () => {
  it("pins dark navy on ranks 1-3 and pure white on ranks 4-16", () => {
    expect(st.topRowsCount).toBe(3);
    expect(st.topRowsTextColor).toBe("#141A29");
    expect(st.topRowsRankInk).toBe("#141A29");
    expect(CONFIG.palette.text).toBe("#FFFFFF");
    expect(CONFIG.palette.accent).toBe("#60CDFF");
    // No code strips over the painted bars.
    expect(CONFIG.palette.rowAltOpacity).toBe(0);
    expect(CONFIG.palette.wwcdBg).toBe("rgba(0,0,0,0)");
  });

  it("dark navy clears the peach/gold top-3 bars (WCAG AA > 4.5:1)", () => {
    const ratio = contrastRatio(parseHexColor("#141A29"), parseHexColor("#F5A975"));
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("pure white clears the navy rows 4-16 (WCAG AA > 4.5:1)", () => {
    const ratio = contrastRatio(parseHexColor("#FFFFFF"), parseHexColor("#132A56"));
    expect(ratio).toBeGreaterThan(4.5);
  });
});

describe("pmgc-sapphire standings SSR (16-team measured layout)", () => {
  it("renders 8 left + 8 right rows with unbaked '#1'..'#16' rank badges", () => {
    const html = render(16, "AFTER MATCH 3", 3);
    expect((html.match(/left:116px/g) ?? []).length).toBe(8);
    expect((html.match(/left:628px/g) ?? []).length).toBe(8);
    expect((html.match(/left:40px/g) ?? []).length).toBe(8);
    expect((html.match(/left:548px/g) ?? []).length).toBe(8);
    for (const rank of ["#1", "#4", "#8", "#9", "#16"]) {
      expect(html).toContain(`>${rank}<`);
    }
    expect(html).toContain("SAPPHIRE 1");
    expect(html).toContain("SAPPHIRE 16");
    expect(html).not.toContain("NaN");
  });

  it("paints ranks 1-3 in #141A29 and ranks 4-16 in white / cyan", () => {
    const html = render(16, "AFTER MATCH 3", 3);
    // 3 ranks + 3 names + 12 stats on the peach bars.
    expect((html.match(/color:#141A29/g) ?? []).length).toBeGreaterThanOrEqual(18);
    // 13 names + 52 stats on the navy bars.
    expect((html.match(/color:#FFFFFF/g) ?? []).length).toBeGreaterThanOrEqual(65);
    // 13 unbaked rank numerals from #4 down.
    expect((html.match(/color:#60CDFF/g) ?? []).length).toBeGreaterThanOrEqual(13);
  });

  it("declares line-height AFTER the font shorthand on every row box", () => {
    const html = render(16, "AFTER MATCH 3", 3);
    expect(html).toContain("line-height:66px");
    expect(html).toMatch(/font:800 20px[^>]*?line-height:66px/);
    expect(html).toMatch(/font:800 22px[^>]*?line-height:66px/);
  });

  it("renders the 'M 3' / 'M 6' badge and hides the baked standings title", () => {
    const mid = render(16, "AFTER MATCH 3", 3);
    expect(mid).toContain("left:824px");
    expect(mid).toContain(">M 3<");
    expect(mid).toContain("font:900 56px");
    expect(mid).not.toContain("SCRIM");
    const final = render(16, "FINAL RESULTS", 6);
    expect(final).toContain(">M 6<");
    // Dev/legacy callers that omit matchCount still get the bare "M" badge.
    const noCount = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "pmgc-sapphire",
        title: "SCRIM",
        subtitle: "FINAL RESULTS",
        organizer: null,
        standings: standings(16),
      }),
    );
    expect(noCount).toContain(">M<");
  });

  it("renders all four stat values per row and the artless MVP + announcement fallbacks", () => {
    const html = render(16, "AFTER MATCH 3", 3);
    for (const x of [279, 343, 406, 470, 794, 856, 919, 983]) {
      expect(html).toContain(`left:${x}px`);
    }

    const entries: MvpDisplayEntry[] = [
      { rank: 1, name: "ALPHA", teamName: "SAPPHIRE 1", kills: 24 },
      { rank: 2, name: "BRAVO", teamName: "SAPPHIRE 2", kills: 21 },
      { rank: 3, name: "CHARLIE", teamName: "SAPPHIRE 3", kills: 19 },
      { rank: 4, name: "DELTA", teamName: "SAPPHIRE 4", kills: 17 },
      { rank: 5, name: "ECHO", teamName: "SAPPHIRE 5", kills: 15 },
    ];
    const mvpHtml = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "pmgc-sapphire",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries,
      }),
    );
    expect(mvpHtml).toContain("SCRIM");
    expect(mvpHtml).toContain("ALPHA");
    expect(mvpHtml).not.toContain("NaN");

    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmgc-sapphire",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: standings(16).map((r) => ({ id: r.teamId, name: r.teamName, logoUrl: r.logoUrl })),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain("SAPPHIRE 16");
    expect(annHtml).not.toContain("NaN");
  });
});
