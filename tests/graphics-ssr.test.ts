import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { effectivePitch, getTemplate, hideScrimNameFor, splitRows, type AestheticId } from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import type { StandingRow } from "@/lib/scoring";

const LOGO = "data:image/png;base64,iVBORw0KGgo=";

function rows(n: number, withLogos: boolean): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: withLogos && i % 2 === 0 ? LOGO : null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function mvpEntries(): MvpDisplayEntry[] {
  return [
    { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
    { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
    { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
    { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
    { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
  ];
}

function announceTeams(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `SQUAD ${i + 1}`,
    logoUrl: i === 0 ? LOGO : null,
  }));
}

function standings(
  aestheticId: AestheticId,
  subtitle: string,
  n: number,
  opts: { logos?: boolean; matchCount?: number } = {},
) {
  return h(OverallStandingsGraphic, {
    aestheticId,
    title: "SCRIM",
    subtitle,
    organizer: null,
    standings: rows(n, opts.logos ?? false),
    matchCount: opts.matchCount,
  });
}

describe("Fix A — matchCount/isFinal renders (SSR)", () => {
  it("pmpl-light final with matchCount renders the count, never an empty slot", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "FINAL RESULTS", 16, { matchCount: 6 }));
    expect(html).toContain(">6<");
    expect(html).not.toContain("FINAL RESULTS");
  });

  it("pmpl-light mid-session with matchCount renders the count verbatim", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 2", 16, { matchCount: 2 }));
    expect(html).toContain(">2<");
  });

  it("pmpl-light without matchCount keeps the digit-parsing fallback", () => {
    const mid = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 2", 16));
    expect(mid).toContain(">2<");
    // FINAL RESULTS with no count → the documented empty slot (callers must
    // pass matchCount; GraphicsTab always does when confirmedCount > 0).
    const fin = renderToStaticMarkup(standings("pmpl-light", "FINAL RESULTS", 16));
    expect(fin).toMatch(/left:620px;[^"]*">\s*<\/div>/);
  });

  it.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
    "gradient %s ignores matchCount — full subtitle untouched",
    (id) => {
      const html = renderToStaticMarkup(standings(id, "FINAL RESULTS", 16, { matchCount: 6 }));
      expect(html).toContain("FINAL RESULTS");
    },
  );
});

describe("Fix D — palette-driven polish (SSR presence)", () => {
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "pmgc-crimson",
  ];

  it("standings logo plates use plateBg/plateRing; rank-1 ring uses accent", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 4, { logos: true, matchCount: 1 }));
      expect(html).toContain(p.plateBg);
      expect(html).toContain(p.plateRing);
      expect(html).toContain(`2px solid ${p.accent}`);
      expect(html).toContain("border-radius:50%");
    }
  });

  it("MVP rows render uniformly (P7): neutral plates, no metals, no rank-1 accent", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      expect(getTemplate(id).uniformMvpRows).toBe(true);
      const html = renderToStaticMarkup(
        h(MvpGraphic, {
          aestheticId: id,
          title: "SCRIM",
          subtitle: "TOP 5 FRAGGERS",
          organizer: null,
          entries: mvpEntries(),
        }),
      );
      expect(html).not.toContain(`background:${p.medalGold}`); // no metal fills
      expect(html).not.toContain(`background:${p.medalSilver}`);
      expect(html).not.toContain(`background:${p.medalBronze}`);
      expect(html).not.toContain(`color:${p.medalText}`); // rank digits wear text ink
      expect(html).not.toContain(p.wwcdBg); // no rank-1 highlight strip
      expect(html).toContain(p.plateBg);
      expect(html).toContain(p.plateRing);
      expect(html).toContain("border-radius:50%");
    }
  });

  it("announcement rows render slot numbers, rounded logo plates and names", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      const spec = getTemplate(id).announcement;
      const html = renderToStaticMarkup(
        h(AnnouncementGraphic, {
          aestheticId: id,
          title: "SCRIM",
          subtitle: "PARTICIPATING TEAMS",
          organizer: null,
          teams: announceTeams(16),
        }),
      );
      expect(html).toContain(">01<"); // first slot number, zero-padded
      expect(html).toContain(">16<");
      expect(html).toContain(`left:${spec.slotX}px`);
      expect(html).toContain(`left:${spec.teamX}px`);
      expect(html).toContain(p.plateBg);
      expect(html).toContain(p.plateRing);
      expect(html).toContain("border-radius:50%");
      expect(html).toContain("SQUAD 16");
    }
  });

  it("announcement rows auto-fit the pitch (penultimate row lands inside)", () => {
    const spec = getTemplate("dark-gold").announcement;
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "dark-gold",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(4),
      }),
    );
    const pitch = (spec.rowsBottom - spec.rowsTop) / 4;
    const lastContentY = spec.rowsTop + 3 * pitch + (pitch - spec.rowHeight) / 2;
    expect(html).toContain(`top:${lastContentY}px`);
  });

  it("no graphic hardcodes the legacy raw-logo render (plates always wrap logos)", () => {
    const html = renderToStaticMarkup(standings("dark-gold", "AFTER MATCH 1", 4, { logos: true }));
    // Every logo img carries the circular crop; the 44px plate precedes it.
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(img).toContain("border-radius:50%");
  });
});

describe("typography + rank-1 emphasis (both themes, SSR)", () => {
  it.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
    "gradient %s draws uppercase, letter-spaced code labels",
    (id) => {
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 16));
      for (const label of ["RANK", "TEAM", "WWCD", "PP", "KP", "TOTAL"]) {
        expect(html).toContain(`>${label}<`);
      }
      expect(html).toMatch(/letter-spacing:0?\.05em/);
    },
  );

  it("pmpl-light draws no code labels (baked into the art)", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 1", 16, { matchCount: 1 }));
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
  });

  it("rank-1 keeps its emphasis treatment in light and dark themes", () => {
    for (const id of ["pmpl-light", "dark-gold"] as AestheticId[]) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 16, { matchCount: 1 }));
      expect(html).toContain(p.wwcdBg);
      expect(html).toContain(p.accent);
    }
  });
});

describe("row auto-fit at 16/19/25 teams (SSR)", () => {
  it.each([16, 19, 25])("pmpl-light renders %i teams on the auto-fit pitch", (n) => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 6", n, { matchCount: 6 }));
    const st = getTemplate("pmpl-light").standings;
    const [leftCount] = splitRows(n);
    const pitch = effectivePitch(st.rowY0, st.rowPitch, st.columns[0].rowsBottom, leftCount);
    const lastTop = st.rowY0 + (leftCount - 1) * pitch;
    // The component uses the auto-fit pitch: the last left-column row sits
    // exactly on the computed top (the fixed 80px pitch would put 25-team
    // rows at top:1331px instead).
    expect(html).toContain(`top:${lastTop}px`);
    if (n === 25) expect(html).not.toContain("top:1331px");
    expect(html).toContain(`SQUAD ${n}`);
  });
});

describe("P6 — neon-green single-column standings (SSR)", () => {
  it("renders all rows in ONE full-width table on the auto-fit pitch", () => {
    const html = renderToStaticMarkup(standings("neon-green", "AFTER MATCH 6", 16, { matchCount: 6 }));
    const st = getTemplate("neon-green").standings;
    const pitch = (st.columns[0].rowsBottom! - st.rowY0) / 16;
    const lastTop = st.rowY0 + 15 * pitch;
    expect(html).toContain(`top:${lastTop}px`); // row 16 at the very bottom
    expect(html).toContain("SQUAD 16");
    // The second column spec is skipped entirely — every strip is the single
    // wide one (x116, w848).
    expect(html).toContain("width:848px");
  });

  it("draws no code labels (baked into the art) and only the match number", () => {
    const html = renderToStaticMarkup(standings("neon-green", "FINAL RESULTS", 16, { matchCount: 6 }));
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).toContain(">6<");
    expect(html).not.toContain("FINAL RESULTS");
  });
});

describe("P6 — baked-subtitle templates (SSR)", () => {
  it("challengers-red MVP skips the baked TOP 5 FRAGGERS line", () => {
    const html = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "challengers-red",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(html).not.toContain("TOP 5 FRAGGERS");
    expect(html).toContain("ALPHA");
    expect(html).toContain(">24<");
  });

  it("neon-green MVP (gradient fallback) still renders its subtitle", () => {
    const html = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "neon-green",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(html).toContain("TOP 5 FRAGGERS");
  });

  it("pmpl-light announcement skips the baked title line and moves the scrim name into the strip", () => {
    const spec = getTemplate("pmpl-light").announcement;
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmpl-light",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(html).not.toContain("PARTICIPATING TEAMS");
    // Scrim name at the announcement strip override (x140 y36 w800), not the
    // standings slot (x295 y6 w490).
    expect(html).toContain("left:140px");
    expect(html).toContain("top:36px");
    expect(html).not.toContain("left:295px");
    expect(html).toContain(`left:${spec.slotX}px`);
    expect(html).toContain(">01<");
  });

  it("challengers-red announcement (gradient fallback) still renders its subtitle", () => {
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "challengers-red",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(html).toContain("PARTICIPATING TEAMS");
    expect(html).toContain(">01<");
  });
});

describe("P7 � font swap + config flags (SSR)", () => {
  const IDS: AestheticId[] = [
    "dark-gold",
    "purple-butterfly",
    "pink-blossom",
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "pmgc-crimson",
  ];

  it("rendered graphics carry the Exo 2 font stack in their inline styles", () => {
    const html = renderToStaticMarkup(standings("dark-gold", "AFTER MATCH 1", 4));
    // React escapes the quotes in style attributes: `&quot;Exo 2&quot;`
    expect(html).toContain("Exo 2");
    expect(html).toContain("Rajdhani"); // fallback position
    expect(html.indexOf("Exo 2")).toBeLessThan(html.indexOf("Rajdhani"));
  });

  it.each(IDS)("%s renders 16/19/25 teams cleanly (SSR)", (id) => {
    for (const n of [16, 19, 25]) {
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", n, { matchCount: 1 }));
      expect(html).toContain(`SQUAD ${n}`); // last row rendered
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
    }
  });

  it("hideScrimName skips the scrim-name slot per variant (neon-green everywhere)", () => {
    for (const id of IDS) {
      const config = getTemplate(id);
      expect(config.hideScrimName === true).toBe(id === "neon-green");
      const htmls = {
        standings: renderToStaticMarkup(standings(id, "AFTER MATCH 1", 4, { matchCount: 1 })),
        mvp: renderToStaticMarkup(
          h(MvpGraphic, {
            aestheticId: id,
            title: "SCRIM",
            subtitle: "TOP 5 FRAGGERS",
            organizer: null,
            entries: mvpEntries(),
          }),
        ),
        announcement: renderToStaticMarkup(
          h(AnnouncementGraphic, {
            aestheticId: id,
            title: "SCRIM",
            subtitle: "PARTICIPATING TEAMS",
            organizer: null,
            teams: announceTeams(4),
          }),
        ),
      };
      for (const variant of ["standings", "mvp", "announcement"] as const) {
        const hidden = hideScrimNameFor(config, variant);
        if (hidden) expect(htmls[variant]).not.toContain("SCRIM");
        else expect(htmls[variant]).toContain("SCRIM");
      }
    }
  });

  it("watermark keeps the brand-law y except the announcement (watermarkYOffset)", () => {
    for (const id of IDS) {
      const config = getTemplate(id);
      const offset = config.watermarkYOffset ?? 0;
      const standingsHtml = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "standings" }));
      const mvpHtml = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "mvp" }));
      const annHtml = renderToStaticMarkup(h(GraphicCanvas, { config, variant: "announcement" }));
      expect(standingsHtml).toContain("top:1570px");
      expect(mvpHtml).toContain("top:1570px"); // offset never leaks into mvp
      expect(annHtml).toContain(`top:${1570 + offset}px`);
      expect(standingsHtml).toContain("scrimlypro.com");
      expect(annHtml).toContain("scrimlypro.com");
    }
  });
});

describe("P8 — ewc-yellow standings SSR rendering", () => {
  it("renders standings with matches stat column, 12-split, and omits duplicate rank numbers", () => {
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "ewc-yellow",
        title: "SCRIM",
        subtitle: "AFTER MATCH 5",
        organizer: null,
        standings: rows(24, false),
        matchCount: 5,
      }),
    );
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain("left:96px;top:393px;width:48px");
    expect((html.match(/>5</g) ?? []).length).toBeGreaterThanOrEqual(24);
    expect((html.match(/left:146px/g) ?? []).length).toBe(12);
    expect((html.match(/left:612px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
  });

  it("renders MVP cleanly with gradient fallback", () => {
    const html = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "ewc-yellow",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(html).toContain("SCRIM");
    expect(html).toContain("TOP 5 FRAGGERS");
    expect(html).toContain("ALPHA");
    expect(html).toContain(">24<");
  });

  it("renders announcement cleanly with gradient fallback", () => {
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "ewc-yellow",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(html).toContain("SCRIM");
    expect(html).toContain("PARTICIPATING TEAMS");
    expect(html).toContain(">01<");
    expect(html).toContain(">16<");
    expect(html).toContain("SQUAD 16");
  });
});

describe("P8 — pmgc-crimson standings SSR rendering", () => {
  it("renders 24 teams on the 12/12 painted bars with baked ranks/labels skipped", () => {
    const html = renderToStaticMarkup(standings("pmgc-crimson", "AFTER MATCH 5", 24, { matchCount: 5 }));
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain("left:70px");
    expect(html).not.toContain("left:547px");
    expect((html.match(/left:138px/g) ?? []).length).toBe(12);
    expect((html.match(/left:615px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
    // Four stat columns per side at the measured silver-header ink centers.
    for (const x of [295, 352.5, 408.5, 472.5, 769, 827, 883, 947]) {
      expect(html).toContain(`left:${x}px`);
    }
    expect(html).toContain("font:800 25px");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });

  it("hides the baked-title collision and renders only the match digits in the gold slot", () => {
    const html = renderToStaticMarkup(standings("pmgc-crimson", "FINAL RESULTS", 16, { matchCount: 6 }));
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain("FINAL RESULTS");
    expect(html).toContain("left:1006px");
    expect(html).toContain("color:#140A00");
    expect(html).toContain(">6<");
  });

  it("renders the MVP and announcement variants on the crimson gradient fallback", () => {
    const mvp = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "pmgc-crimson",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(mvp).toContain("SCRIM");
    expect(mvp).toContain("TOP 5 FRAGGERS");
    expect(mvp).toContain("ALPHA");
    expect(mvp).toContain(">24<");

    const ann = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "pmgc-crimson",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(ann).toContain("SCRIM");
    expect(ann).toContain("PARTICIPATING TEAMS");
    expect(ann).toContain(">01<");
    expect(ann).toContain("SQUAD 16");
  });
});
