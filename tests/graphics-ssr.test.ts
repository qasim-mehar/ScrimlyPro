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
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
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
    // grunge-red uses the measured starting-five brush lockup (no medallions,
    // plates or rank-1 strips) — pinned in its own SSR section below.
    for (const id of IDS.filter((x) => x !== "grunge-red")) {
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
    // onyx-green's announcement is art-backed (24-row single-column table);
    // it is pinned in tests/onyx-announcement.test.ts, not here.
    for (const id of IDS.filter((x) => x !== "onyx-green")) {
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
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "grunge-red",
    "esports-clash",
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

describe("P8 — onyx-green standings SSR rendering", () => {
  it("renders 24 teams on the 12/12 painted bars with baked ranks/labels skipped", () => {
    const html = renderToStaticMarkup(standings("onyx-green", "AFTER MATCH 5", 24, { matchCount: 5 }));
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
    expect(html).not.toContain(">WWCD<");
    expect(html).not.toContain("left:60px;top:400px;width:48px");
    expect((html.match(/left:110px/g) ?? []).length).toBe(12);
    expect((html.match(/left:600px/g) ?? []).length).toBe(12);
    expect(html).toContain("SQUAD 1");
    expect(html).toContain("SQUAD 24");
    // Three stat columns per side at the measured ink centers.
    for (const x of [292, 370, 451, 776, 866, 946]) expect(html).toContain(`left:${x}px`);
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("font:800 26px");
  });

  it("hides the baked-title collision and renders only the match digits", () => {
    const html = renderToStaticMarkup(standings("onyx-green", "FINAL RESULTS", 16, { matchCount: 6 }));
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain("FINAL RESULTS");
    expect(html).toContain("left:984px");
    expect(html).toContain("color:#42F57E");
    expect(html).toContain(">6<");
  });

  it("renders the MVP on the gradient fallback and the announcement on its art", () => {
    const mvp = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "onyx-green",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(mvp).toContain("SCRIM");
    expect(mvp).toContain("TOP 5 FRAGGERS");
    expect(mvp).toContain("ALPHA");

    const ann = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "onyx-green",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    // The art bakes "TEAM PARTICIPATION"; the 24-row table is line-locked.
    expect(ann).not.toContain("SCRIM");
    expect(ann).not.toContain("PARTICIPATING TEAMS");
    expect(ann).toContain("SQUAD 16");
    expect(ann).toContain("left:214px");
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

describe("grunge-red — starting-five brush MVP (SSR)", () => {
  it("renders the 5-bar lockup: rank badge, block-white name, crimson brush, ghost numeral", () => {
    const html = renderToStaticMarkup(
      h(MvpGraphic, {
        aestheticId: "grunge-red",
        title: "SCRIM",
        subtitle: "TOP 5 FRAGGERS",
        organizer: null,
        entries: mvpEntries(),
      }),
    );
    expect(html).toContain("#1 FRAGGER");
    expect(html).toContain("#5 FRAGGER");
    for (const name of ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"]) expect(html).toContain(name);
    expect(html).toContain("24 KILLS");
    expect(html).toContain(">24<");
    expect(html).toContain("color:#E51920");
    expect(html).toContain("color:#FFFFFF");
    expect(html).toContain("rgba(255,255,255,0.055)");
    expect(html).toContain("font:900 152px");
    // Baked header: neither the scrim name nor the default subtitle renders.
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain("TOP 5 FRAGGERS");
    // No team names on the art (PUBGM characters are baked into the left of the bars).
    expect(html).not.toContain("SQUAD 1");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("renders the gradient standings/announcement fallbacks with baked labels skipped only on mvp", () => {
    const standingsHtml = renderToStaticMarkup(standings("grunge-red", "AFTER MATCH 1", 4, { matchCount: 1 }));
    expect(standingsHtml).toContain(">RANK<");
    expect(standingsHtml).toContain(">TEAM<");
    expect(standingsHtml).toContain("SQUAD 4");
    // Gradient lives on GraphicCanvas (verified in the watermark test below).

    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "grunge-red",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain("PARTICIPATING TEAMS");
    expect(annHtml).toContain("SQUAD 16");
  });

  it("keeps the brand-law watermark at the fixed y on every variant", () => {
    const config = getTemplate("grunge-red");
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("scrimlypro.com");
    }
  });
});

describe("esports-clash — English esports card MVP (SSR)", () => {
  const mvpHtml = renderToStaticMarkup(
    h(MvpGraphic, {
      aestheticId: "esports-clash",
      title: "SCRIM",
      subtitle: "TOP 5 FRAGGERS",
      organizer: "ORGANIZER",
      entries: mvpEntries(),
    }),
  );

  it("renders only rank, verbatim name and kills over five measured cards", () => {
    for (let rank = 1; rank <= 5; rank++) expect(mvpHtml).toContain(`RANK #0${rank}`);
    for (const name of ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"]) expect(mvpHtml).toContain(name);
    expect((mvpHtml.match(/TOTAL KILLS/g) ?? []).length).toBe(5);
    expect(mvpHtml).toContain(">24<");
    expect(mvpHtml).toContain(">15<");
    expect(mvpHtml).not.toContain("NaN");
    expect(mvpHtml).not.toContain("undefined");
  });

  it("suppresses the baked header, scrim name, team data and default subtitle", () => {
    expect(mvpHtml).not.toContain("SCRIM");
    expect(mvpHtml).not.toContain("TOP 5 FRAGGERS");
    expect(mvpHtml).not.toContain("ORGANIZER");
    expect(mvpHtml).not.toContain("SQUAD 1");
    expect(mvpHtml).not.toContain("<img");
  });

  it("paints heavy italic skew-white names with the full glyph-safe stack", () => {
    expect(mvpHtml).toContain("font:900 44px");
    expect(mvpHtml).toContain("font:900 36px");
    expect(mvpHtml).toContain("font-style:italic");
    expect(mvpHtml).toContain("transform:skewX(-10deg)");
    expect(mvpHtml).toContain("color:#FFFFFF");
    expect(mvpHtml).toContain("Exo 2");
    expect(mvpHtml).toContain("Rajdhani");
    expect(mvpHtml).toContain("Noto Sans Symbols 2");
    expect(mvpHtml).toContain("system-ui");
  });

  it("renders gradient standings/announcement fallbacks with normal labels", () => {
    const standingsHtml = renderToStaticMarkup(standings("esports-clash", "AFTER MATCH 1", 4, { matchCount: 1 }));
    expect(standingsHtml).toContain(">RANK<");
    expect(standingsHtml).toContain(">TEAM<");
    expect(standingsHtml).toContain("SQUAD 4");
    const annHtml = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "esports-clash",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: announceTeams(16),
      }),
    );
    expect(annHtml).toContain("SCRIM");
    expect(annHtml).toContain("PARTICIPATING TEAMS");
    expect(annHtml).toContain("SQUAD 16");
  });

  it("keeps the brand-law watermark at the fixed y on every variant", () => {
    const config = getTemplate("esports-clash");
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("scrimlypro.com");
    }
  });
});

describe("P8(6) — pmgc-aqua standings SSR rendering", () => {
  const config = getTemplate("pmgc-aqua");
  const render = (subtitle: string, n: number, matchCount: number) =>
    renderToStaticMarkup(standings("pmgc-aqua", subtitle, n, { matchCount }));

  it("renders mid-session (AFTER MATCH 3) into the baked MATCH # slot", () => {
    const html = render("AFTER MATCH 3", 24, 3);
    expect(html).toContain("left:912px");
    expect(html).toContain("color:#00F5E1");
    expect(html).toContain(">3<");
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain(">RANK<");
    expect((html.match(/left:117px/g) ?? []).length).toBe(12);
    expect((html.match(/left:612px/g) ?? []).length).toBe(12);
  });

  it("renders completed (FINAL RESULTS) state with the final match number", () => {
    const html = render("FINAL RESULTS", 16, 6);
    expect(html).toContain("left:912px");
    expect(html).toContain(">6<");
    expect((html.match(/left:117px/g) ?? []).length).toBe(12);
    expect((html.match(/left:612px/g) ?? []).length).toBe(4);
  });

  it("keeps 3-digit values centred in their painted stat boxes", () => {
    const html = renderToStaticMarkup(
      h(OverallStandingsGraphic, {
        aestheticId: "pmgc-aqua",
        title: "SCRIM",
        subtitle: "FINAL RESULTS",
        organizer: null,
        matchCount: 6,
        standings: [
          {
            teamId: "t0",
            teamName: "LONG GLYPH NAME × · | ₛ ≌",
            logoUrl: null,
            wwcd: 1,
            pp: 190,
            kp: 158,
            total: 348,
          },
        ],
      }),
    );
    expect(html).toContain(">190<");
    expect(html).toContain(">158<");
    expect(html).toContain(">348<");
    for (const x of [293, 350, 407, 468]) expect(html).toContain(`left:${x}px`);
    expect(html).not.toContain("NaN");
  });

  it("keeps the hardcoded brand watermark at y1570 on all three variants", () => {
    const config = getTemplate("pmgc-aqua");
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const html = renderToStaticMarkup(h(GraphicCanvas, { config, variant }));
      expect(html).toContain("top:1570px");
      expect(html).toContain("scrimlypro.com");
    }
  });

  it("hides the scrim name only for standings", () => {
    expect(hideScrimNameFor(config, "standings")).toBe(true);
    expect(hideScrimNameFor(config, "mvp")).not.toBe(true);
    expect(hideScrimNameFor(config, "announcement")).not.toBe(true);
  });
});
