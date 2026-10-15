import type { AestheticId, TemplateConfig } from "./types";

/** Font stack appended to EVERY font string in every config. "Noto Sans Symbols 2"
 * covers the C1.1 glyph set (× · | _ ₛ ≌) that Rajdhani lacks. */
const FONTS = '"Rajdhani", "Noto Sans Symbols 2", sans-serif';

/** Geometry shared by the three gradient aesthetics — identical until real
 * PNG templates (P4) need per-template geometry. */
const GEOMETRY: Omit<TemplateConfig, "id" | "name" | "backgrounds" | "palette"> = {
  canvas: { w: 1080, h: 1620 },
  header: {
    title: { x: 90, y: 96, w: 900, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `700 72px ${FONTS}`,
    subtitleFont: `600 40px ${FONTS}`,
    organizerFont: `500 26px ${FONTS}`,
  },
  standings: {
    columns: [
      {
        rankX: 62,
        teamX: 116,
        teamW: 158,
        statColumns: [
          { key: "wwcd", x: 265 },
          { key: "pp", x: 330 },
          { key: "kp", x: 395 },
          { key: "total", x: 455 },
        ],
        stripX: 58,
        stripW: 462,
      },
      {
        rankX: 602,
        teamX: 656,
        teamW: 158,
        statColumns: [
          { key: "wwcd", x: 805 },
          { key: "pp", x: 870 },
          { key: "kp", x: 935 },
          { key: "total", x: 995 },
        ],
        stripX: 598,
        stripW: 462,
      },
    ],
    headerLabelsY: 372,
    rowY0: 415,
    rowPitch: 80,
    rowHeight: 60,
    maxRowsLeft: 13,
    nameFont: `600 32px ${FONTS}`,
    statFont: `600 28px ${FONTS}`,
    labelFont: `700 24px ${FONTS}`,
  },
  mvp: {
    rowY0: 470,
    rowPitch: 165,
    rowHeight: 120,
    rankX: 130,
    playerX: 300,
    playerW: 420,
    teamX: 740,
    teamW: 230,
    killsX: 960,
    killsW: 90,
    rankFont: `700 64px ${FONTS}`,
    playerFont: `600 36px ${FONTS}`,
    statFont: `600 34px ${FONTS}`,
  },
  announcement: {
    // P6 list geometry: vertical rows (slot number, logo plate, team name),
    // auto-fitted between rowsTop/rowsBottom for 4–25 teams. Shared by the
    // gradient aesthetics until their real art lands (then per-template).
    rowsTop: 430,
    rowsBottom: 1470,
    slotX: 120,
    slotW: 48,
    logoX: 187,
    teamX: 250,
    teamW: 700,
    logoSize: 30, // +10 plate ring = 40 ≤ the 41.6px pitch at 25 teams
    rowHeight: 40,
    slotFont: `600 30px ${FONTS}`,
    nameFont: `600 30px ${FONTS}`,
  },
};

const DARK_GOLD_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #0b0d12 0%, #12151c 55%, #1a1e28 100%)",
  decor: [
    { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#f5c542", opacity: 0.9 },
    { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#f5c542", opacity: 0.35 },
    { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#f5c542", opacity: 0.25 },
    { kind: "circle", x: 890, y: 90, w: 270, color: "#f5c542", opacity: 0.07 },
    { kind: "circle", x: -70, y: 1490, w: 230, color: "#f5c542", opacity: 0.06 },
  ],
};

const DARK_GOLD: TemplateConfig = {
  ...GEOMETRY,
  id: "dark-gold",
  name: "Dark Gold",
  backgrounds: {
    standings: DARK_GOLD_BG,
    mvp: DARK_GOLD_BG,
    announcement: DARK_GOLD_BG,
  },
  palette: {
    accent: "#f5c542",
    text: "#e8eaf0",
    textMuted: "#8b93a7",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(245,197,66,.16)",
    wwcdText: "#f5c542",
    watermarkColor: "rgba(255,255,255,0.7)",
    plateBg: "rgba(255,255,255,0.07)",
    plateRing: "rgba(245,197,66,0.45)",
    medalGold: "#f5c542",
    medalSilver: "#c9d1dd",
    medalBronze: "#d19a5b",
    medalText: "#11141b",
  },
};

const PURPLE_BUTTERFLY_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #150e2a 0%, #241640 55%, #2d1b4e 100%)",
  decor: [
    { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#c084fc", opacity: 0.9 },
    { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#c084fc", opacity: 0.35 },
    { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#c084fc", opacity: 0.25 },
    { kind: "circle", x: -90, y: 70, w: 280, color: "#c084fc", opacity: 0.08 },
    { kind: "circle", x: 910, y: 1490, w: 240, color: "#c084fc", opacity: 0.06 },
  ],
};

const PURPLE_BUTTERFLY: TemplateConfig = {
  ...GEOMETRY,
  id: "purple-butterfly",
  name: "Purple Butterfly",
  backgrounds: {
    standings: PURPLE_BUTTERFLY_BG,
    mvp: PURPLE_BUTTERFLY_BG,
    announcement: PURPLE_BUTTERFLY_BG,
  },
  palette: {
    accent: "#c084fc",
    text: "#ece9f7",
    textMuted: "#9a92b8",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(192,132,252,.15)",
    wwcdText: "#c084fc",
    watermarkColor: "rgba(255,255,255,0.7)",
    plateBg: "rgba(255,255,255,0.07)",
    plateRing: "rgba(192,132,252,0.45)",
    medalGold: "#f0c44c",
    medalSilver: "#c9d1dd",
    medalBronze: "#d19a5b",
    medalText: "#1c1533",
  },
};

const PINK_BLOSSOM_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #251119 0%, #3d1c2b 55%, #522537 100%)",
  decor: [
    { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#ff9ec7", opacity: 0.9 },
    { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#ff9ec7", opacity: 0.35 },
    { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#ff9ec7", opacity: 0.25 },
    { kind: "circle", x: 860, y: 110, w: 260, color: "#ff9ec7", opacity: 0.07 },
    { kind: "circle", x: -60, y: 1500, w: 220, color: "#ff9ec7", opacity: 0.07 },
  ],
};

const PINK_BLOSSOM: TemplateConfig = {
  ...GEOMETRY,
  id: "pink-blossom",
  name: "Pink Blossom",
  backgrounds: {
    standings: PINK_BLOSSOM_BG,
    mvp: PINK_BLOSSOM_BG,
    announcement: PINK_BLOSSOM_BG,
  },
  palette: {
    accent: "#ff9ec7",
    text: "#f7ecef",
    textMuted: "#b89aa6",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(255,158,199,.14)",
    wwcdText: "#ff9ec7",
    watermarkColor: "rgba(255,255,255,0.7)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(255,158,199,0.45)",
    medalGold: "#f0c44c",
    medalSilver: "#ccd2de",
    medalBronze: "#d29a5c",
    medalText: "#2c1521",
  },
};

const PMPL_LIGHT_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #f4f6fb 0%, #e8ecf5 100%)",
  decor: [],
};

/** PMPL-light: first real art-backed template (P4). Standings renders over
 * the user's light-theme PNG; the announcement art landed in P6 (list panel:
 * baked logo, "PARTICIPATING TEAMS" title, SLOT NO | TEAM label band and
 * labels all in the art). Standings geometry measured from the art pixels
 * (P4b: 1024×1536 art → ×1.0546875); announcement geometry from the P6 art
 * (2132×3200 → ×1080/2132 = 0.50657): panel 61.3–1016.7 × 381–1549, label
 * band y 393.6–411.3 ("SLOT NO" center 149.4, "TEAM" starts 252.8),
 * divider y 425.5, rows auto-fit 440→1540, white scrim strip x139.8–940.2
 * y30.4–81 (title override below), light interior (text is dark navy). */
const PMPL_LIGHT: TemplateConfig = {
  ...GEOMETRY,
  id: "pmpl-light",
  name: "PMPL Light",
  backgrounds: {
    standings: { type: "image", src: "/templates/pmpl-light/overall.png" },
    mvp: PMPL_LIGHT_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/pmpl-light/announcement.png" },
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  header: {
    title: { x: 295, y: 6, w: 490, align: "center" },
    subtitle: { x: 620, y: 54, w: 80, align: "left" },
    organizer: { x: 340, y: 104, w: 400, align: "center" },
    titleFont: `600 30px ${FONTS}`,
    subtitleFont: `700 44px ${FONTS}`,
    organizerFont: `500 22px ${FONTS}`,
  },
  variantHeaders: {
    announcement: {
      // Scrim name renders in the announcement art's own top strip
      // (x139.8–940.2 y30.4–81); the baked title/logo below stay untouched.
      title: { x: 140, y: 36, w: 800, align: "center" },
      titleFont: `600 28px ${FONTS}`,
    },
  },
  standings: {
    columns: [
      {
        rankX: 59,
        teamX: 116,
        teamW: 158,
        statColumns: [
          { key: "kp", x: 284 },
          { key: "pp", x: 350 },
          { key: "wwcd", x: 410 },
          { key: "total", x: 470 },
        ],
        stripX: 46,
        stripW: 490,
        rowsBottom: 1469,
      },
      {
        rankX: 556,
        teamX: 614,
        teamW: 158,
        statColumns: [
          { key: "kp", x: 784 },
          { key: "pp", x: 849 },
          { key: "wwcd", x: 906 },
          { key: "total", x: 968 },
        ],
        stripX: 544,
        stripW: 490,
        rowsBottom: 1469,
      },
    ],
    headerLabelsY: 323,
    rowY0: 371,
    rowPitch: 80,
    rowHeight: 64,
    maxRowsLeft: 13,
    nameFont: `600 28px ${FONTS}`,
    statFont: `600 30px ${FONTS}`,
    labelFont: `700 24px ${FONTS}`,
  },
  announcement: {
    rowsTop: 440,
    rowsBottom: 1540,
    slotX: 125,
    slotW: 48, // slot numbers center under the baked "SLOT NO" (center 149.4)
    logoX: 191,
    teamX: 253, // names left-align with the baked "TEAM" label (starts 252.8)
    teamW: 750,
    logoSize: 30,
    rowHeight: 40,
    slotFont: `600 28px ${FONTS}`,
    nameFont: `600 32px ${FONTS}`,
    subtitleBakedIn: true, // art bakes "PARTICIPATING TEAMS"
  },
  palette: {
    accent: "#0e7ac4",
    text: "#1c2333",
    textMuted: "#5b6678",
    rowAlt: "#0b1526",
    rowAltOpacity: 0.045,
    wwcdBg: "rgba(230,160,20,0.16)",
    wwcdText: "#8a5a00",
    watermarkColor: "rgba(20,28,44,0.55)",
    plateBg: "#ffffff",
    plateRing: "rgba(28,35,51,0.18)",
    medalGold: "#b57e0d",
    medalSilver: "#7d8698",
    medalBronze: "#9c6327",
    medalText: "#ffffff",
  },
};

const NEON_GREEN_STANDINGS_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #0a0f0a 0%, #101810 100%)",
  decor: [],
};

/** Neon-green: dark theme, neon green accent. Standings renders over the
 * user's art (4096×6144 JPEG → ×0.263671875 to the 1080×1620 canvas).
 * The art holds ONE full-width table (RANK | TEAM | PP | KP | chicken |
 * TOTAL baked in a single label row) → singleColumn. Baked label ink
 * (art px → canvas): RANK 758 → 199.9, TEAM 1256–1482 → starts 331.2,
 * PP 2361.5 → 622.6, KP 2724.5 → 718.4, chicken 3070 → 809.5, TOTAL
 * 3430.5 → 904.5; value boxes (58 wide, rank 48) center on them and the
 * team names left-align with the baked TEAM label (teamX 332). Scrim name:
 * the dark band between the top frame (ends art y340) and the baked title
 * (starts art y460) is clear in the middle — title slot y90. MATCH # chip
 * art x1594–2502 y994–1186, "#" ink ends x2290 → the number slot sits just
 * right of it, inside the chip. Table zone art y1584–5568 (blank panel —
 * no baked row separators; rows auto-fit), strip art x440–3656 → 116–964.
 * PUBG logo art y5700+ (clear of rows); watermark zone verified clear. */
const NEON_GREEN: TemplateConfig = {
  ...GEOMETRY,
  id: "neon-green",
  name: "Neon Green",
  backgrounds: {
    standings: { type: "image", src: "/templates/neon-green/overall.png" },
    mvp: NEON_GREEN_STANDINGS_FALLBACK_BG,
    announcement: NEON_GREEN_STANDINGS_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  header: {
    title: { x: 140, y: 90, w: 800, align: "center" },
    subtitle: { x: 609, y: 265, w: 44, align: "left" },
    organizer: { x: 140, y: 90, w: 800, align: "center" },
    titleFont: `600 28px ${FONTS}`,
    subtitleFont: `700 44px ${FONTS}`,
    organizerFont: `500 22px ${FONTS}`,
  },
  standings: {
    columns: [
      {
        rankX: 176,
        teamX: 332,
        teamW: 250,
        statColumns: [
          { key: "pp", x: 594 },
          { key: "kp", x: 689 },
          { key: "wwcd", x: 780 },
          { key: "total", x: 876 },
        ],
        stripX: 116,
        stripW: 848,
        rowsBottom: 1468,
      },
      {
        rankX: 176,
        teamX: 332,
        teamW: 250,
        statColumns: [
          { key: "pp", x: 594 },
          { key: "kp", x: 689 },
          { key: "wwcd", x: 780 },
          { key: "total", x: 876 },
        ],
        stripX: 116,
        stripW: 848,
        rowsBottom: 1468,
      },
    ],
    headerLabelsY: 365,
    rowY0: 418,
    rowPitch: 42,
    rowHeight: 40,
    maxRowsLeft: 25,
    singleColumn: true,
    nameFont: `600 28px ${FONTS}`,
    statFont: `600 28px ${FONTS}`,
    labelFont: `700 24px ${FONTS}`,
  },
  palette: {
    accent: "#00e66a",
    text: "#f0f4f0",
    textMuted: "#7a8a7a",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(0,230,106,0.14)",
    wwcdText: "#00e66a",
    watermarkColor: "rgba(255,255,255,0.7)",
    plateBg: "rgba(255,255,255,0.07)",
    plateRing: "rgba(0,230,106,0.45)",
    medalGold: "#f0c44c",
    medalSilver: "#c9d1dd",
    medalBronze: "#d19a5b",
    medalText: "#0a0f0a",
  },
};

const CHALLENGERS_RED_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #0f1015 0%, #141821 100%)",
  decor: [],
};

/** Challengers-red: dark theme, esports red accent. MVP renders over the
 * user's art (4096×6144 JPEG → ×0.263671875). NOTE: the delivered art is a
 * TEAL/dark-navy design (not red) — the red palette still reads on the dark
 * slot cards (measured 5.45:1) and the aesthetic id is kept per spec.
 * 5 slot cards art y: 1968–2500, 2588–3128, 3216–3760, 3850–4390, 4480–5028
 * (pitch ≈630). "TOP 5 FRAGGERS" + "KILLS" baked → subtitleBakedIn, code
 * draws names + kills numbers only. Kills column centers on the baked KILLS
 * ink (art x3464–3702, center 3583 → canvas 944.7) over the slots' dark
 * interior (digit-band mean lum 0.019–0.023 across all five rows — the
 * chevrons stay clear of the mid-band). Scrim strip is the clear top band
 * (art y18–285); the title renders in palette.text there — accent red on
 * that teal is 1.13:1 (unreadable), so the engine's title=text convention
 * wins. Bottom PUBG logo starts below art y5300 (clear of slot 5); watermark
 * zone has baked corner ticks (P2, brand-law position kept). */
const CHALLENGERS_RED: TemplateConfig = {
  ...GEOMETRY,
  id: "challengers-red",
  name: "Challengers Red",
  backgrounds: {
    standings: CHALLENGERS_RED_FALLBACK_BG,
    mvp: { type: "image", src: "/templates/challengers-red/mvp.png" },
    announcement: CHALLENGERS_RED_FALLBACK_BG,
  },
  header: {
    title: { x: 140, y: 18, w: 800, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 140, y: 18, w: 800, align: "center" },
    titleFont: `600 44px ${FONTS}`,
    subtitleFont: `600 40px ${FONTS}`,
    organizerFont: `500 22px ${FONTS}`,
  },
  mvp: {
    rowY0: 519,
    rowPitch: 165.5, // best fit for the art's drifting 620–634 art (163.5–167 canvas) card pitch
    rowHeight: 140,
    rankX: 110,
    playerX: 280,
    playerW: 200,
    teamX: 490,
    teamW: 210,
    killsX: 900, // centers the 90-wide box under the baked KILLS ink (944.7)
    killsW: 90,
    rankFont: `700 64px ${FONTS}`,
    playerFont: `600 36px ${FONTS}`,
    statFont: `600 34px ${FONTS}`,
    subtitleBakedIn: true,
  },
  palette: {
    accent: "#ff4655",
    text: "#f0f0f4",
    textMuted: "#7a7a8a",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(255,70,85,0.14)",
    wwcdText: "#ff4655",
    watermarkColor: "rgba(255,255,255,0.7)",
    plateBg: "rgba(255,255,255,0.07)",
    plateRing: "rgba(255,70,85,0.45)",
    medalGold: "#f0c44c",
    medalSilver: "#c9d1dd",
    medalBronze: "#d19a5b",
    medalText: "#0f1015",
  },
};

export const AESTHETICS: Record<AestheticId, TemplateConfig> = {
  "dark-gold": DARK_GOLD,
  "purple-butterfly": PURPLE_BUTTERFLY,
  "pink-blossom": PINK_BLOSSOM,
  "pmpl-light": PMPL_LIGHT,
  "neon-green": NEON_GREEN,
  "challengers-red": CHALLENGERS_RED,
};

/** Look up a template config by aesthetic id. */
export function getTemplate(id: AestheticId): TemplateConfig {
  return AESTHETICS[id];
}
