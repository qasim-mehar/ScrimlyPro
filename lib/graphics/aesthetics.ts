import type { AestheticId, TemplateConfig } from "./types";
import { BRUSH_FONTS, FONTS, FONTS_EDITORIAL, FONTS_FULL } from "./fonts";

/** Geometry shared by the three gradient aesthetics — identical until real
 * PNG templates (P4) need per-template geometry. */
const GEOMETRY: Omit<TemplateConfig, "id" | "name" | "backgrounds" | "palette"> = {
  canvas: { w: 1080, h: 1620 },
  uniformMvpRows: true,
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
    nameFont: `700 32px ${FONTS}`,
    statFont: `700 28px ${FONTS}`,
    // 18px keeps four-letter labels (WWCD/TOTAL) inside the 58px stat boxes.
    labelFont: `700 18px ${FONTS}`,
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
    playerFont: `700 36px ${FONTS}`,
    statFont: `700 34px ${FONTS}`,
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
    slotFont: `700 30px ${FONTS}`,
    nameFont: `700 30px ${FONTS}`,
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
  uniformMvpRows: true,
  watermarkYOffset: 16, // announcement art: watermark sits in the clear footer
  // strip below the border line (ink 1592.8–1617.4 at offset 16: clears the
  // diagonal notch (ends y≈1595 at x852) and the 1620 canvas bottom by 2.65px)
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
    nameFont: `700 28px ${FONTS}`,
    statFont: `700 30px ${FONTS}`,
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
    slotFont: `700 28px ${FONTS}`,
    nameFont: `700 32px ${FONTS}`,
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
  uniformMvpRows: true,
  hideScrimName: true, // P7: the dark band between the top frame and the baked
  // title is intentionally empty — no scrim-name text renders on the art
  header: {
    title: { x: 140, y: 90, w: 800, align: "center" },
    subtitle: { x: 609, y: 265, w: 48, align: "left" }, // 48 contains "12" at 700 44px (44.57px) inside the baked chip (right edge 659.8)
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
    nameFont: `700 28px ${FONTS}`,
    statFont: `700 28px ${FONTS}`,
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

/** Challengers-red: dark theme, esports red/cyan broadcast aesthetic. Standings
 * renders over the updated overall.png (4096×6144 JPEG payload inside a .png name
 * → canvas ×1080/4096 = 0.263671875).
 * - 12 painted dark charcoal/green row bars per column: y389 top, pitch 67.3636,
 *   height 62 (row 12 bottom 1192). Ranks 1–24 are baked into the cyan edge strip
 *   → ranksBakedIn skips code rank numerals. Team slot starts at x150 (left) /
 *   x600 (right).
 * - Baked cyan header bar at y326–379 (labelsBakedIn: true) prints RANK | TEAM |
 *   [Chicken Icon] | PP | KP | TP. Stat value boxes (38px wide) center on the
 *   measured ink: left centers 373.5 (wwcd), 413.5 (pp), 454 (kp), 493 (total);
 *   right centers 831 (wwcd), 871.5 (pp), 912 (kp), 951.5 (total).
 * - Baked "OVERALL RANKINGS" block + top silver trophy → variantHideScrimName
 *   hides the title for standings (MVP keeps the session name).
 * - Subtitle slot (x966 y230 w46, #061014) drops the match number into the
 *   open cyan slot right of the baked "MATCH #" ink.
 * - MVP renders over mvp.png (5 slot cards at y519 pitch 165.5). Announcement
 *   keeps the dark gradient fallback. */
const CHALLENGERS_RED: TemplateConfig = {
  ...GEOMETRY,
  id: "challengers-red",
  name: "Challengers Red",
  backgrounds: {
    standings: { type: "image", src: "/templates/challengers-red/overall.png" },
    mvp: { type: "image", src: "/templates/challengers-red/mvp.png" },
    announcement: CHALLENGERS_RED_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    title: { x: 140, y: 18, w: 800, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 140, y: 18, w: 800, align: "center" },
    titleFont: `600 44px ${FONTS}`,
    subtitleFont: `600 40px ${FONTS}`,
    organizerFont: `500 22px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      subtitle: { x: 966, y: 230, w: 46, align: "center" },
      subtitleColor: "#061014",
      subtitleFont: `800 36px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true,
  },
  standings: {
    columns: [
      {
        rankX: 96,
        teamX: 150,
        teamW: 198,
        statColumns: [
          { key: "wwcd", x: 354.5 },
          { key: "pp", x: 394.5 },
          { key: "kp", x: 435 },
          { key: "total", x: 474 },
        ],
        stripX: 145,
        stripW: 380,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 528,
        teamX: 600,
        teamW: 206,
        statColumns: [
          { key: "wwcd", x: 812 },
          { key: "pp", x: 852.5 },
          { key: "kp", x: 893 },
          { key: "total", x: 932.5 },
        ],
        stripX: 594,
        stripW: 388,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 326,
    rowY0: 389,
    rowPitch: 67.3636,
    rowHeight: 62,
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 38,
    nameFont: `800 24px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
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
    playerFont: `700 36px ${FONTS}`,
    statFont: `700 34px ${FONTS}`,
    subtitleBakedIn: true,
  },
  palette: {
    accent: "#ff4655",
    text: "#ffffff",
    textMuted: "#b9c6d2",
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

const EWC_YELLOW_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #FFF6DC 0%, #F7E2AE 55%, #EFD08C 100%)",
  decor: [],
};

/** EWC Yellow: the PMWC-at-EWC broadcast standings art. The delivered file is
 * a 4096×6144 JPEG payload inside a .png name (like neon-green /
 * challengers-red) → canvas ×1080/4096 = 0.263671875. Every coordinate below is
 * measured from those pixels:
 * - white row bars: left art x537–1982 → 141.6–522.6, right x2306–3760 →
 *   608.0–991.4; row 1 top art1490 → 392.87, row 12 top art4786 → 1261.93,
 *   height art255 → 67.24, pitch art300 → 79.1 (tuned 79 for zero drift).
 * - baked rank badges (#1–#24, orange/silver/gold) sit left of the bars →
 *   ranksBakedIn skips the code-drawn rank numerals.
 * - baked header band y art1342–1423 → 353.9–375.2, labels RANK | TEAM |
 *   WWCD | MATCHES | PLACE PTS | ELIMS | TOTAL. Numeric ink centers (canvas,
 *   left): WWCD 304.7, MATCHES 359.4, PLACE PTS 407.5, ELIMS 446.3, TOTAL 492.9
 *   → 46-wide value boxes at 282/334/380/426/472 (non-overlapping; the right
 *   column repeats at +466). TEAM names start inside the bar at 146.
 * - baked title "OVERALL RANKINGS" ink x102.8–798.1 y199.6–268.2; the scrim
 *   name renders in the clear orange band above it (y130–164). The slanted
 *   "Match #" ribbon's white ink ends x1013.8 y234.9–271.3 → the match number
 *   slot starts at 1018 inside the ribbon.
 * - bottom flame art starts below the table (last bar bottom 1329.2); the
 *   brand-law watermark at y1570 sits over the dark purple swirls (measured
 *   glyph-zone mean luminance 0.13 → white ink reads 5.8:1).
 * MVP + announcement have no art → warm light gradient fallback; dark espresso
 * text/medal ink keeps every fallback surface high-contrast. */
const EWC_YELLOW: TemplateConfig = {
  ...GEOMETRY,
  id: "ewc-yellow",
  name: "EWC Yellow",
  backgrounds: {
    standings: { type: "image", src: "/templates/ewc-yellow/overall.png" },
    mvp: EWC_YELLOW_FALLBACK_BG,
    announcement: EWC_YELLOW_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Clear orange band above the baked "OVERALL RANKINGS" block.
      title: { x: 140, y: 130, w: 800, align: "center" },
      // Match number sits immediately right of the baked "Match #" ink
      // (ends x1013.8) inside the slanted ribbon.
      subtitle: { x: 1018, y: 232, w: 52, align: "left" },
      organizer: { x: 140, y: 130, w: 800, align: "center" },
      titleFont: `700 28px ${FONTS}`,
      subtitleFont: `800 34px ${FONTS}`,
      subtitleColor: "#2B0F00", // deep espresso inside the orange ribbon
      organizerFont: `500 22px ${FONTS}`,
    },
  },
  standings: {
    columns: [
      {
        rankX: 96, // baked badge square; no code-drawn numeral (ranksBakedIn)
        teamX: 146, // first clear pixel inside the white bar
        teamW: 132, // ends before the WWCD box at 282
        statColumns: [
          { key: "wwcd", x: 282 },
          { key: "matches", x: 334 },
          { key: "pp", x: 380 },
          { key: "kp", x: 426 },
          { key: "total", x: 472 },
        ],
        stripX: 142,
        stripW: 381,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 562,
        teamX: 612,
        teamW: 132,
        statColumns: [
          { key: "wwcd", x: 748 },
          { key: "matches", x: 800 },
          { key: "pp", x: 846 },
          { key: "kp", x: 892 },
          { key: "total", x: 938 },
        ],
        stripX: 608,
        stripW: 383,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 353,
    rowY0: 393,
    rowPitch: 79,
    rowHeight: 67,
    maxRowsLeft: 12,
    statBoxW: 46,
    logoPlate: 34,
    logoNameGap: 38,
    nameFont: `800 24px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
  },
  palette: {
    accent: "#5C2400",
    text: "#2B0F00",
    textMuted: "#4A1C00",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.22,
    wwcdBg: "rgba(255,196,0,0.26)",
    wwcdText: "#6E2B00",
    watermarkColor: "rgba(255,255,255,0.9)",
    plateBg: "#FFF6E2",
    plateRing: "rgba(58,20,0,0.30)",
    medalGold: "#B57E0D",
    medalSilver: "#7D8698",
    medalBronze: "#9C6327",
    medalText: "#FFFFFF",
  },
};

const ONYX_GREEN_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #070D09 0%, #0F1F15 100%)",
  decor: [],
};

/** Onyx Green — the PUBG Pro League (ONYX) broadcast leaderboard. The delivered
 * file is a 4096×6144 JPEG payload inside a .png name → canvas ×1080/4096 =
 * 0.263671875. Every number below was measured off those pixels (sharp scan):
 * - Baked "STANDING" stencil title x334–790 y115–245 and "MATCH #" neon ink
 *   x812–968 y261–297 → the session name is hidden for standings; only the
 *   match digits render, in the clear slot x984–1060 just above the green
 *   underline (measured x980–1064 at y294). "LEADERBOARD" parallelogram sits
 *   at y312–336, well below the slot. Painted row-bar zone mean luminance
 *   0.0207 and match slot 0.0058 → white/neon ink reads >12:1.
 * - Header band y356–392 prints TEAM | WWCD | TOTALKILL | TOTALPOINT twice.
 *   Measured label ink centers (canvas): left 316 / 394 / 475, right 800 /
 *   890 / 970. The art's right TEAM/WWCD sit only +484 from the left (the
 *   column shift is NOT uniform — measured, not assumed). 48px value boxes
 *   at 292 / 370 / 451 (right 776 / 866 / 946) center on them, stop before
 *   the 528–534 / 1028–1033 neon accent bars, and leave the team slot
 *   (x110–290 / x600–776) uncluttered.
 * - 12 dark row bars per column. Baked white rank numerals 1–24 sit at canvas
 *   centers 432, 502.5, …, 1210.5 → a 70.7727px center-to-center pitch with
 *   rowY0 400 (63px text box center 431.5, dead-on the painted rank ink) and
 *   ZERO cumulative drift through row 12. ranksBakedIn + rowsPerColumn 12
 *   split 24 teams into [12,12]; the 25th overflows below the painted table.
 * - MVP + announcement have no art → deep cyber-charcoal / matrix-green
 *   gradient fallback (never a broken render). Watermark stays hardcoded. */
const ONYX_GREEN: TemplateConfig = {
  ...GEOMETRY,
  id: "onyx-green",
  name: "Onyx Green",
  backgrounds: {
    standings: { type: "image", src: "/templates/onyx-green/overall.png" },
    mvp: ONYX_GREEN_FALLBACK_BG,
    announcement: ONYX_GREEN_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    // Standings hides the title (baked "STANDING"); these slots serve the
    // gradient-fallback MVP + announcement variants.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `700 40px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Match digits sit directly above the baked neon underline (x980–1064
      // at y294), right of the baked "MATCH #" ink (ends x968).
      subtitle: { x: 984, y: 250, w: 76, align: "center" },
      subtitleFont: `800 34px ${FONTS}`,
      subtitleColor: "#42F57E", // neon matrix green on the measured dark slot
    },
  },
  variantHideScrimName: {
    standings: true, // the art already prints "STANDING" in giant white stencil
  },
  standings: {
    columns: [
      {
        rankX: 60, // baked rank box (x48–100); no code-drawn numeral
        teamX: 110, // first clear pixel right of the rank divider at x107
        teamW: 180, // ends at 290, before the WWCD box at 292
        statColumns: [
          { key: "wwcd", x: 292 },
          { key: "kp", x: 370 },
          { key: "total", x: 451 },
        ],
        stripX: 108,
        stripW: 419, // right edge 527 — clears the neon bar's 528 start
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 552,
        teamX: 600, // first clear pixel right of the rank divider at x597
        teamW: 174, // ends at 774, 2px before the WWCD box at 776
        statColumns: [
          { key: "wwcd", x: 776 }, // ink center 799.5 (not the spec's ~810)
          { key: "kp", x: 866 },
          { key: "total", x: 946 },
        ],
        stripX: 598,
        stripW: 429, // right edge 1027 — clears the neon bar's 1028 start
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 356,
    rowY0: 400,
    rowPitch: 70.7727, // measured baked-rank ink centers (432 … 1210.5) / 11
    rowHeight: 63,
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 48,
    // 20px keeps Straight Forward / Shadow Syndicate inside the 180/174px slots.
    nameFont: `800 20px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  // ANNOUNCEMENT-ONLY geometry. The empty art is a 4096×6144 JPEG payload in
  // a .png name (uniform ×1080/4096 = 0.263671875 onto the 1080×1620 canvas).
  // A sharp scan finds exactly 25 white horizontal divider lines at the canvas
  // centres in `lineYs` (native y2346.5 … 5449.5), i.e. 24 row bands of a
  // nominal 34.0812px pitch. `lineYs` is authoritative: row i spans line i →
  // line i+1, so its text centre is the EXACT midpoint and accumulates zero
  // pitch drift across all 24 rows. The baked neon-green ticks sit at canvas
  // x172.7..198.3 (left) and x880.4..905.7 (right); content x214..868 clears
  // both by ≥15px. Reference typography = bold collegiate "mean green HOOPS":
  // Exo 2 800 20px, uppercase, 0.06em tracking, neon/white alternating ink.
  announcementLayout: {
    singleColumn: true,
    fixedRowPitch: true,
    rowsPerColumn: 24,
    leftX: 214,
    rightX: 868,
    colWidth: 654,
    rowY0: 618.7625,
    rowPitch: 34.0812,
    rowHeight: 34.0812,
    rowsBottom: 1436.7114,
    lineYs: [
      618.7625, 652.7928, 687.2839, 721.7456, 755.9321, 789.6065, 823.9597,
      857.9807, 892.0178, 925.9251, 960.1758, 994.0079, 1028.0087, 1061.9874,
      1096.0775, 1130.0834, 1164.2768, 1198.3514, 1232.6198, 1266.7584,
      1300.606, 1334.6087, 1368.8735, 1402.8487, 1436.7114,
    ],
    slotColWidth: 120,
    rankFont: `800 20px ${FONTS}`,
    nameFont: `800 20px ${FONTS}`,
    rowColors: ["#66FF1A", "#FFFFFF"],
  },
  palette: {
    accent: "#42F57E", // neon matrix green
    text: "#FFFFFF",
    textMuted: "#A8C4B0",
    rowAlt: "#121D15", // dark matrix-green card surface
    rowAltOpacity: 0.3, // subtle only — the art paints its own row gradients
    wwcdBg: "rgba(66,245,126,0.14)",
    wwcdText: "#42F57E",
    watermarkColor: "rgba(255,255,255,0.78)",
    plateBg: "rgba(66,245,126,0.12)",
    plateRing: "rgba(66,245,126,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#0A100B",
  },
};

const PMGC_CRIMSON_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #120309 0%, #1C0410 55%, #2A0615 100%)",
  decor: [],
};

/** PMGC Crimson — the 2023 PMGC Grand Finals broadcast leaderboard look. The
 * delivered file is a 4096×6144 JPEG payload inside a .png name → canvas
 * ×1080/4096 = 0.263671875. Every number below was measured off those pixels:
 * - Baked "OVERALL RANKINGS" title (measured white ink ≈ x92–800 y202–308) and
 *   the slanted gold "MATCH #" badge (gold fill x809–1056 y244–316; the dark
 *   "#" ink ends at x1002 y266). `variantHideScrimName.standings` skips the
 *   session name; the number renders in the open gold slot at x1006 y260 in
 *   deep espresso (#140A00 ≈ 9.5:1 against the measured gold, mean lum 0.456).
 * - Baked silver header bar y355–412 prints RANK | TEAM | WWCD | PLACE PTS |
 *   ELIMS | TOTAL twice (labelsBakedIn). Measured dark-ink centers (canvas):
 *   left 321 / 378.5 / 434.5 / 498.5, right 795 / 853 / 909 / 973 (≈+474).
 *   52px value boxes at 295 / 352.5 / 408.5 / 472.5 (right 769 / 827 / 883 /
 *   947) center on them, stay inside the black bars and clear of the right cap.
 * - Baked rank badges: gold #1 / crimson #2–#24 at x70–130 (left) and x548–
 *   607 (right) → ranksBakedIn skips code numerals; team slot starts at 138 /
 *   615 and stops before the first stat box (290 / 767).
 * - 12 dark row bars per column: native-scan tops 434, 510.2, 585.3, 661.0,
 *   736.2, 812.9, 888.1, 962.9, 1037.6, 1113.8, 1189.7, 1262.5; bar height
 *   ≈55 (row 12 bottom 1318.4). One fixed pitch of 75.31 keeps all 12 rows
 *   dead-center (max drift < 3px) — the art's own spacing wobbles ±2px, so a
 *   single pitch is the closest fit. rowsPerColumn 12 splits 24 → [12,12].
 * - MVP + announcement have no art → deep crimson-black / gold gradient
 *   fallback. White Exo 2 800 text reads 21:1 on the measured black row
 *   interior (lum 0.000006); the brand-law watermark stays hardcoded. */
const PMGC_CRIMSON: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgc-crimson",
  name: "PMGC Crimson",
  backgrounds: {
    standings: { type: "image", src: "/templates/pmgc-crimson/overall.png" },
    mvp: PMGC_CRIMSON_FALLBACK_BG,
    announcement: PMGC_CRIMSON_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Match digits sit inside the gold parallelogram, right of the baked "#".
      subtitle: { x: 1006, y: 260, w: 36, align: "center" },
      subtitleFont: `800 30px ${FONTS}`,
      subtitleColor: "#140A00",
      // The generic organizer slot (y236) would land on the baked title; park
      // it in the clear dark band above "OVERALL RANKINGS" if ever supplied.
      organizer: { x: 140, y: 120, w: 800, align: "center" },
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKINGS" across the top band
  },
  standings: {
    columns: [
      {
        rankX: 70, // baked gold/crimson badge x70–130; no code numeral
        teamX: 138, // first clear pixel inside the black row
        teamW: 152, // ends at 290, before the WWCD box at 295
        statColumns: [
          { key: "wwcd", x: 295 },
          { key: "pp", x: 352.5 },
          { key: "kp", x: 408.5 },
          { key: "total", x: 472.5 },
        ],
        stripX: 130,
        stripW: 396,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 547, // baked badge x548–607
        teamX: 615,
        teamW: 152, // ends at 767, before the WWCD box at 769
        statColumns: [
          { key: "wwcd", x: 769 },
          { key: "pp", x: 827 },
          { key: "kp", x: 883 },
          { key: "total", x: 947 },
        ],
        stripX: 607,
        stripW: 396,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 355,
    rowY0: 434,
    rowPitch: 75.31,
    rowHeight: 55,
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 52,
    logoPlate: 34,
    logoNameGap: 40,
    uniformStatInk: true, // every stat numeral white — the baked gold badge
    // already marks rank 1; no code-drawn accent TOTAL over the broadcast art
    nameFont: `800 23px ${FONTS}`,
    statFont: `800 25px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
  },
  palette: {
    accent: "#F5B82E", // Championship Gold
    text: "#FFFFFF",
    textMuted: "#E8D9DE",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no code strips over them
    wwcdBg: "rgba(0,0,0,0)", // rank-1 strip invisible; badge already baked
    wwcdText: "#FFFFFF", // rank-1 team name stays pure broadcast white (stat
    // ink is kept white too by standings.uniformStatInk)
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,255,255,0.10)",
    plateRing: "rgba(245,184,46,0.55)",
    medalGold: "#F5B82E",
    medalSilver: "#D8C7CB",
    medalBronze: "#B4763F",
    medalText: "#140A00",
  },
};

const PMWI_VIOLET_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #0A0524 0%, #24105C 55%, #062A4A 100%)",
  decor: [],
};

/** PMWI Violet — the 2023 PUBG Mobile World Invitational electric violet/cyan
 *  leaderboard. The delivered art is a TRUE PNG at 941×1672 (not a 4096×6144
 *  JPEG-in-.png like the other broadcast arts), i.e. taller than the 2:3
 *  canvas. It is uniformly fitted by WIDTH to 1080 (×1.1477151966 →
 *  1080×1918.979809) and offset top -130.25 = (1672 − 1620/1.1477151966)/2,
 *  the exact centred `object-fit: cover` crop. The bottom KRAFTON/LIGHTSPEED
 *  footer (art y1605+) is cropped out, leaving the dark violet gradient the
 *  brand-law watermark sits on. Every number below was measured off those art
 *  pixels through that mapping:
 *  - Cyan baked header bands art x46–454 / x486–897, y410–443 → canvas
 *    x52.8–521.1 / x557.8–1029.5, y321.1–358.9. Dark ink centres: left
 *    ELIMS 287.5 / WWCD 353 / TOTAL 419 → canvas 330 / 405.1 / 480.9; right
 *    ELIMS 743.5 / WWCD 801.5 / TOTAL 863 → canvas 853.3 / 919.9 / 990.5
 *    (the right shift is NOT uniform — measured, not assumed). ELIMS maps to
 *    the kill-points stat (`kp`), then WWCD, then TOTAL.
 *  - 12 painted dark bars per column: art tops 457…1199 (canvas 375.0…
 *    1226.6), bottoms 507…1251 (canvas 432.4…1286.3). A fixed 77.42px pitch
 *    with a 52px row box keeps all 12 rows strictly inside their bars;
 *    ranksBakedIn skips code numerals (white #1–#24 boxes are baked at art
 *    x46–99 / x486–539 → canvas 52.8–113.6 / 557.8–618.6).
 *  - Baked "OVERALL RANKINGS" (art y216–317 → canvas 98–214) and "MATCH #"
 *    (art y339–367 → canvas 240–272, white ink ends x456 → canvas 523.4).
 *    The scrim name is hidden for standings; only the match digits render in
 *    the open slot at x526 y236. The organizer is parked in the narrow dark
 *    band below "MATCH #" (y282), clear of both baked blocks and the header.
 *  - MVP + announcement have no art → deep violet/cyan gradient fallback.
 *    White Exo 2 800 row text reads >12:1 on the measured row bars (lum
 *    0.014) and the 90%-white watermark clears the violet footer. */
const PMWI_VIOLET: TemplateConfig = {
  ...GEOMETRY,
  id: "pmwi-violet",
  name: "PMWI Violet",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmwi-violet/overall.png",
      // Uniform ×1080/941 cover crop: art ratio 0.5629 is taller than 2:3, so
      // the centred crop removes art y0–130.25 and y1541.75–1672.
      fit: { width: 1080, height: 1918.979809, left: 0, top: -130.25 },
    },
    mvp: PMWI_VIOLET_FALLBACK_BG,
    announcement: PMWI_VIOLET_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep the normal header.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Open slot immediately right of the baked "MATCH #" ink (ends x523.4).
      subtitle: { x: 526, y: 236, w: 60, align: "left" },
      subtitleFont: `800 32px ${FONTS}`,
      subtitleColor: "#FFFFFF", // white digits on the measured dark violet slot
      // Park the optional organizer in the dark band below "MATCH #" (ends
      // canvas y271.7) and above the cyan header (starts y321.1) — zero text
      // collides with the baked title/subtitle art.
      organizer: { x: 140, y: 282, w: 800, align: "center" },
      organizerFont: `600 18px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKINGS" across the top band
  },
  standings: {
    columns: [
      {
        rankX: 53, // baked white rank box canvas x52.8–113.6; no code numeral
        teamX: 122, // first clear pixel right of that box
        teamW: 180, // ends at 302, before the ELIMS/kp box
        statColumns: [
          { key: "kp", x: 302 }, // ELIMS ink center 329.97
          { key: "wwcd", x: 377 }, // WWCD ink center 405.14
          { key: "total", x: 453 }, // TOTAL ink center 480.89
        ],
        stripX: 116, // starts at the baked white rank box's right edge
        stripW: 405, // right edge 521 — clears the cyan header/bar rim
        rowsBottom: 1286, // art row 12 bottom 1251 → canvas 1286.3
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 558, // baked white rank box canvas x557.8–619.8 (art x486–540)
        teamX: 628,
        teamW: 197, // ends at 825, before the ELIMS/kp box
        statColumns: [
          { key: "kp", x: 825 }, // ELIMS ink center 853.33
          { key: "wwcd", x: 892 }, // WWCD ink center 919.89
          { key: "total", x: 962 }, // TOTAL ink center 990.48
        ],
        stripX: 620, // starts just past the baked white rank box (ends 619.8)
        stripW: 409, // right edge 1029 — clears the cyan header/bar rim
        rowsBottom: 1286, // art row 12 bottom 1251 → canvas 1286.3
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 321, // cyan baked label band top — code draws no labels
    rowY0: 375.1, // art bar 1 top 457 → canvas 375.016
    rowPitch: 77.42, // measured 12-bar span (1226.62 − 375.02)/11
    rowHeight: 52, // art bar interior ≈57px; every row box stays inside
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 56, // ≥ three digits at 800 26px; right columns stay 11px apart
    logoPlate: 34,
    logoNameGap: 38,
    uniformStatInk: true, // baked #1 badge carries rank-1 emphasis
    nameFont: `800 24px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#01F9FE", // measured cyan header ink
    text: "#FFFFFF", // pure white row ink on the dark translucent bars
    textMuted: "#B8C7F5",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(1,249,254,0.10)",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.9)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(1,249,254,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#120A2E",
  },
};

const PMGC_AQUA_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Light aqua → ice-teal with a dark-slate ink (palette.text). The row bars
  // are light ice-grey in the art, so ALL row ink must be dark; a light
  // fallback keeps that same ink WCAG-legible on the artless MVP/announcement
  // variants (≥12:1 against every stop).
  css: "linear-gradient(165deg, #EAFBF7 0%, #CBF0E8 55%, #A9E2D9 100%)",
  decor: [],
};

/** PMGC Aqua — the 2022 PMGC aqua/mint/cyan broadcast leaderboard. The art is
 *  a TRUE PNG at 968×1625 (not a 4096×6144 JPEG-in-.png like the other
 *  broadcast arts), ratio 0.5957 — taller/narrower than the 2:3 canvas. It is
 *  uniformly fitted by WIDTH to 1080 (×1080/968 = 1.1157024793 →
 *  1080×1813.016529) and centred with top −96.508264, i.e. the exact
 *  `object-fit: cover` crop (art y0–86.5 and y1538.5–1625 are trimmed). No
 *  stretch. All canvas coordinates below were measured on those art pixels
 *  and converted with canvasX = artX × S, canvasY = (artY − 86.5) × S:
 *  - 12 light ice-grey bars per column. Native bright-divider tops 415, 477,
 *    541, …, 1112, 1176 → canvas rowY0 366.5, uniform pitch 70.7, bar height
 *    ≈69 (68px text box centred on the painted bar). 24 teams → [12,12];
 *    the 25th overflows below the last painted bar, never dropped.
 *  - Baked bright-cyan rank squares (#1–#24) end at art x104 / x548 → canvas
 *    x116 / x611.4; the team/logo compartment starts there, cleanly inside
 *    the ice-grey bar. Team width stops before the first stat divider.
 *  - Baked dark header band (art y370–409 → canvas 316–360) prints RANK |
 *    TEAM | ELIMS | PLACE | WWCD | TOTAL twice. Faint painted vertical cell
 *    dividers at art x262.5/313/364/415 (left) and x708.5/759.5/810.5/861.5
 *    (right) → the FOUR stat boxes centre on art x287.75/338.5/389.5/444.25
 *    and x734/785/836/890.25 (canvas centres 321/377.7/434.6/495.7 and
 *    818.9/875.8/932.7/993.3). Order is ELIMS(kp) → PLACE(pp) → WWCD →
 *    TOTAL — NOT the WWCD-first order of the other templates. 56px boxes keep
 *    3-digit values (190/158) centred between dividers with zero overlap.
 *  - Baked "OVERALL RANKINGS" + dark cyan-bordered "MATCH #" badge (art
 *    x649–925 y245–330 → canvas x724–1032 y177–272). The baked "#" ink ends
 *    at art x814 → canvas x908; the cyan underline sits at art y308 → canvas
 *    y247. Match digits render in the open dark slot x912 y186 (above the
 *    underline, right of the #) at canvas y186–226, never overlapping either.
 *  - Row bar interior lum 0.82 → dark charcoal/teal-black ink #0D1B1E at
 *    weight 800 reads ≥14:1. The match slot (lum 0.008) and rocky footer
 *    (lum 0.038) are dark → electric-cyan digits and a 88%-white watermark.
 *  - MVP + announcement have no art → light aqua/ice gradient; dark slate ink
 *    and muted teal clear every stop. Brand-law watermark stays hardcoded. */
const PMGC_AQUA: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgc-aqua",
  name: "PMGC Aqua",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmgc-aqua/overall.png",
      // Uniform ×1080/968 cover crop: art ratio 0.5957 is taller than 2:3,
      // so the centred crop removes art y0–86.5 and y1538.5–1625. No stretch.
      fit: { width: 1080, height: 1813.01652892562, left: 0, top: -96.50826446281 },
    },
    mvp: PMGC_AQUA_FALLBACK_BG,
    announcement: PMGC_AQUA_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  subtitleBakedIn: { standings: true },
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep the normal header.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Open dark area right of the baked "#" (ends canvas x908) and above
      // the baked cyan underline (canvas y247) — digits sit cleanly inside.
      subtitle: { x: 912, y: 186, w: 108, align: "center" },
      subtitleFont: `800 34px ${FONTS}`,
      subtitleColor: "#00F5E1", // electric cyan on the measured near-black slot
      // Park the optional organizer between the badge (ends y272) and the
      // baked header band (starts y316) so it collides with neither.
      organizer: { x: 140, y: 282, w: 800, align: "center" },
      organizerFont: `600 18px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKINGS" across the top band
  },
  standings: {
    columns: [
      {
        rankX: 52, // baked cyan square art x47–104; no code-drawn numeral
        teamX: 117, // first clear pixel inside the ice-grey bar
        teamW: 170, // ends at 287, before the ELIMS divider at 292.9
        statColumns: [
          { key: "kp", x: 293 }, // ELIMS centre 321
          { key: "pp", x: 350 }, // PLACE centre 377.7
          { key: "wwcd", x: 407 }, // WWCD centre 434.6
          { key: "total", x: 468 }, // TOTAL centre 495.7
        ],
        stripX: 116, // 1px left of teamX so strips never overlap the name slot
        stripW: 412, // right edge 528, inside the bar (art right divider 528.3)
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 547, // baked cyan square art x490–548
        teamX: 612, // first clear pixel inside the right ice-grey bar
        teamW: 172, // ends at 784, before the ELIMS divider at 790.5
        statColumns: [
          { key: "kp", x: 791 }, // ELIMS centre 818.9
          { key: "pp", x: 848 }, // PLACE centre 875.8
          { key: "wwcd", x: 905 }, // WWCD centre 932.7
          { key: "total", x: 965 }, // TOTAL centre 993.3
        ],
        stripX: 611, // 1px left of teamX so strips never overlap the name slot
        stripW: 414, // right edge 1025, inside the bar (art right divider 1025.3)
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 316, // baked dark header band top — code draws no labels
    rowY0: 366.5,
    rowPitch: 70.7,
    rowHeight: 68,
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 56, // 3 digits at 800 26px stay inside one painted compartment
    logoPlate: 32,
    logoNameGap: 40,
    uniformStatInk: true, // every numeral the same dark ink — the baked cyan
    // rank square already supplies rank-1 emphasis; no accent TOTAL here
    nameFont: `800 24px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
  },
  palette: {
    accent: "#0C8C84", // deep teal — legible on the light fallback gradient
    text: "#0D1B1E", // dark charcoal/teal-black ink on the light row bars
    textMuted: "#1E4A4A", // muted dark teal (labels/slots on light surfaces)
    rowAlt: "#0D1B1E",
    rowAltOpacity: 0, // the art paints the bars — no code strips over them
    wwcdBg: "rgba(0,0,0,0)", // rank-1 strip invisible; baked badge is emphasis
    wwcdText: "#0D1B1E", // rank-1 team name keeps the same dark row ink
    watermarkColor: "rgba(255,255,255,0.88)", // bright on the dark rocky footer
    plateBg: "rgba(13,27,30,0.10)",
    plateRing: "rgba(13,27,30,0.35)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#9C6327",
    medalText: "#0A1416", // distinct from palette.text so uniform MVP rows
    // never paint a medal-digit accent (≥3:1 on every metal)
  },
};

const GRUNGE_RED_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #0A0506 0%, #1A080C 55%, #2A0A10 100%)",
  decor: [],
};

/** Grunge Red — the "starting five" brush-overlay MVP art. The delivered file
 *  is a 4488×5608 JPEG payload inside a .png name (native ratio 0.8003, not
 *  2:3). Every slot below is measured off those pixels:
 *  - five painted dark bars span art x 8.9%–76.9% (silhouettes x 8.9%–31%);
 *    red left ticks / separator peaks at art y 905, 1699, 2571, 3434, 4323,
 *    5122. `fit` scales the art uniformly by 0.2691 (1208×1509, no distortion)
 *    and offsets it (-11,-17) so those bars land on the calibration brief's
 *    canvas intervals 13.6–26.8%, 28–41.2%, 42.3–55.5%, 56.7–69.9%, 71–84.3%.
 *  - the art bakes "MVP LIST" in crimson brush, the header labels and the
 *    PUBGM helmet characters; only rank badge + player name + kill brush +
 *    ghost kill numeral are rendered (never team names or logos).
 *  - standings/announcement have no art → clean dark-crimson gradient fallback. */
const GRUNGE_RED: TemplateConfig = {
  ...GEOMETRY,
  id: "grunge-red",
  name: "Grunge Red",
  backgrounds: {
    standings: GRUNGE_RED_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/grunge-red/mvp.png",
      fit: { width: 1207.599624, height: 1508.961384, left: -11, top: -17 },
    },
    announcement: GRUNGE_RED_FALLBACK_BG,
  },
  uniformMvpRows: true,
  mvpLayoutStyle: "starting-five-brush",
  mvpShowTeam: false,
  // The 0.8-ratio portrait art is uniformly fitted (scale 0.2691) to land its
  // painted bars on the measured canvas slots; the short bottom letterbox is
  // filled with the art's dark ink so exports never show a transparent strip.
  canvasBackground: "#0A0506",
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true },
  header: {
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `700 40px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  mvp: {
    rowY0: 226,
    rowPitch: 232,
    rowHeight: 204,
    rankX: 370,
    playerX: 482,
    playerW: 340,
    teamX: 482, // never rendered (mvpShowTeam: false)
    teamW: 340,
    killsX: 496,
    killsW: 290,
    rankFont: `700 64px ${FONTS}`,
    playerFont: `800 68px ${FONTS_FULL}`,
    statFont: `400 56px ${BRUSH_FONTS}`,
    subtitleBakedIn: true,
    brush: {
      rowHeight: 204,
      badge: {
        x: 370,
        w: 110,
        fontFamily: FONTS,
        // "#N FRAGGER" is a single-line callout inside the 110px frame.
        // Measured 20px italic Exo 2 (letter-spacing .08em) needs ~131px and
        // wraps to two lines, overflowing the 48px badge box; 16px fits ~105px.
        fontSize: 16,
        fontWeight: 600,
        color: "#FFFFFF",
        rule: "rgba(255,255,255,0.78)",
      },
      name: {
        x: 482,
        w: 340,
        maxFontSize: 68,
        minFontSize: 24,
        fontFamily: FONTS_FULL,
        fontWeight: 800,
        color: "#FFFFFF",
      },
      kills: {
        x: 496,
        w: 290,
        fontFamily: BRUSH_FONTS,
        fontSize: 56,
        fontWeight: 400,
        color: "#E51920",
      },
      watermark: {
        x: 650,
        w: 180,
        fontFamily: FONTS,
        fontSize: 152,
        fontWeight: 900,
        color: "rgba(255,255,255,0.055)",
      },
    },
  },
  palette: {
    accent: "#E51920", // the painted "MVP LIST" brush ink
    text: "#FFFFFF",
    textMuted: "#C9CDD2",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(229,25,32,0.14)",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.78)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(229,25,32,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#0A0506",
  },
};

const ESPORTS_CLASH_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #15161a 0%, #1e1e20 55%, #2a1015 100%)",
  decor: [],
};

/** Esports Clash — the "TOP MVP LIST" PUBGM art (delivered as a 3764×6688 JPEG
 *  payload inside a .png name, i.e. 9:16, not the 2:3 canvas). Every number
 *  below is measured off those pixels through the distortion-free `fit`:
 *  scale = 1620/6688 = 0.2422248804 → art drawn 911.734×1620 at x84.13 (the
 *  ~84px side bars are filled by `canvasBackground` with the art's own #1e1e1e
 *  edge ink). The baked header spans canvas y132–292; five alternating cards
 *  start at y325/568/811/1054/1297 (pitch 243, painted height ≈231), and the
 *  PUBG MOBILE logo occupies y1497–1597 — so row 5 ends at 1493, clear of it.
 *  Text is confined to canvas x100–570 (< 60% = 648); the helmet characters
 *  are painted from x≈843 onward, so the left zone never touches them.
 *  Only RANK #01–#05, the player IGN and TOTAL KILLS are rendered (English
 *  only; no team names, logos or avatars). Standings/announcement fall back
 *  to a clean dark gradient. */
const ESPORTS_CLASH: TemplateConfig = {
  ...GEOMETRY,
  id: "esports-clash",
  name: "Esports Clash",
  backgrounds: {
    standings: ESPORTS_CLASH_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/esports-clash/mvp.png",
      fit: { width: 911.73445, height: 1620, left: 84.132775, top: 0 },
    },
    announcement: ESPORTS_CLASH_FALLBACK_BG,
  },
  canvasBackground: "#1E1E1E",
  uniformMvpRows: true,
  mvpLayoutStyle: "esports-card",
  mvpShowTeam: false,
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true },
  header: {
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS_FULL}`,
    subtitleFont: `700 40px ${FONTS_FULL}`,
    organizerFont: `500 24px ${FONTS_FULL}`,
  },
  mvp: {
    rowY0: 325,
    rowPitch: 243,
    rowHeight: 196,
    rankX: 100,
    playerX: 100,
    playerW: 470,
    teamX: 570, // never rendered (mvpShowTeam: false)
    teamW: 0,
    killsX: 100,
    killsW: 200,
    rankFont: `700 15px ${FONTS_FULL}`,
    playerFont: `800 44px ${FONTS_FULL}`,
    statFont: `800 34px ${FONTS_FULL}`,
    subtitleBakedIn: true,
    esports: {
      rowHeight: 196,
      rank: {
        x: 100,
        y: 18,
        w: 190,
        fontFamily: FONTS_FULL,
        fontSize: 15,
        fontWeight: 700,
        color: "rgba(255,255,255,0.85)",
      },
      name: {
        x: 100,
        y: 44,
        w: 470, // right edge 570 = 52.8% — inside the 60% safe zone
        maxFontSize: 44,
        minFontSize: 18,
        fontFamily: FONTS_FULL,
        fontWeight: 900,
        color: "#FFFFFF",
      },
      statLabel: {
        x: 100,
        y: 122,
        w: 240,
        fontFamily: FONTS_FULL,
        fontSize: 13,
        fontWeight: 700,
        color: "rgba(255,255,255,0.72)",
        text: "TOTAL KILLS",
      },
      kills: {
        x: 100,
        y: 143,
        w: 200,
        fontFamily: FONTS_FULL,
        fontSize: 36,
        fontWeight: 900,
        color: "#FFFFFF",
        glow: ["0 0 18px rgba(255,45,61,0.55)", "0 0 18px rgba(45,135,220,0.55)"],
      },
    },
  },
  palette: {
    accent: "#FF2D3D", // painted red card ink
    text: "#FFFFFF",
    textMuted: "#C9CDD2",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(255,45,61,0.14)",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(255,255,255,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#101014",
  },
};

const RUNDOWN_ORANGE_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #D93800 0%, #EA580C 55%, #F59E0B 100%)",
  decor: [],
};

/** Rundown Orange — the "team participation" single-column announcement art.
 *
 *  Measured from `public/templates/rundown-orange/announcement.png` (a 4096×6144
 *  JPEG payload inside a `.png` name → canvas ×1080/4096 = 0.263671875, no
 *  crop). The art paints 29 full-width WHITE DIVIDER LINES at canvas x212–868:
 *
 *    LINE_Y = [289.1162, 329.9853, 370.9863, 411.5918, 452.5933, 493.3301,
 *              533.9354, 574.5405, 615.1739, 656.1685, 696.8847, 737.0880,
 *              776.7379, 816.9293, 857.3441, 897.5391, 937.7497, 977.8273,
 *              1017.6409, 1057.1924, 1096.8750, 1136.1623, 1175.4492,
 *              1214.8614, 1254.4190, 1293.9858, 1333.6525, 1373.0715,
 *              1412.3584]
 *
 *  Rows 0–23 live between consecutive lines 0–24 (`rowsBottom` = line 24).
 *  The art's spacing is NOT perfectly uniform (39.29–41.00 canvas px), so
 *  `lineYs` stores the exact measured centres: row i spans line i → line i+1
 *  and its text-box centre is the exact pixel midpoint, with ZERO cumulative
 *  pitch drift. `rowY0`/`rowPitch`/`rowHeight` are the nominal (average) values
 *  kept for config consumers; `lineYs` is authoritative in
 *  `announcementRowLayout`. Rows never stretch with team count (fixedRowPitch)
 *  and never split into two columns (singleColumn). Logo plates and row strips
 *  are suppressed (transparent cardBg) so the baked lines stay unobstructed.
 *
 *  The art bakes "team participation", the vertical "rundown" watermarks and
 *  the PUBG MOBILE | KRAFTON footer — the scrim name, subtitle and organizer
 *  are therefore suppressed for the announcement variant. Standings + MVP
 *  fall back to the warm orange gradient. Typography follows refrence-image.jpg.
 */
const RUNDOWN_ORANGE: TemplateConfig = {
  ...GEOMETRY,
  id: "rundown-orange",
  name: "Rundown Orange (Participation)",
  backgrounds: {
    standings: RUNDOWN_ORANGE_FALLBACK_BG,
    mvp: RUNDOWN_ORANGE_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/rundown-orange/announcement.png" },
  },
  header: {
    title: { x: 0, y: 0, w: 0 },
    subtitle: { x: 0, y: 0, w: 0 },
    organizer: { x: 0, y: 0, w: 0 },
    titleFont: `500 1px ${FONTS_EDITORIAL}`,
    subtitleFont: `500 1px ${FONTS_EDITORIAL}`,
    organizerFont: `500 1px ${FONTS_EDITORIAL}`,
  },
  variantHideScrimName: { announcement: true },
  variantHeaders: {
    // HeaderSpec slots are coordinate objects (not strings): park every
    // dynamic slot off-canvas at zero width. AnnouncementGraphic's
    // single-column path skips the header entirely, so the art's baked
    // "team participation" / footer lockups stay unobstructed.
    announcement: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  announcement: {
    rowsTop: 289.1162, // first baked line — clears the "team participation" band
    rowsBottom: 1254.419, // line 24 — clears the PUBG MOBILE | KRAFTON footer
    slotX: 212, // left edge of the baked lines (canvas x212)
    slotW: 88, // fixed left column, tabular '#' labels
    logoX: 300,
    teamX: 300, // team name follows the slot column, left-aligned
    teamW: 568, // ends at x868, the baked lines' right edge
    logoSize: 30,
    rowHeight: 40.22095, // nominal pitch; exact per-row heights come from lineYs
    slotFont: `500 22px ${FONTS_EDITORIAL}`,
    nameFont: `500 23px ${FONTS_EDITORIAL}`,
    subtitleBakedIn: true, // art bakes "team participation"
    // --- Single-column, line-locked geometry ---
    singleColumn: true,
    fixedRowPitch: true,
    rowY0: 289.1162,
    rowPitch: 40.22095,
    rowsPerColumn: 24,
    leftX: 212,
    rightX: 868,
    colWidth: 656,
    lineYs: [
      289.1162, 329.9853, 370.9863, 411.5918, 452.5933, 493.3301, 533.9354,
      574.5405, 615.1739, 656.1685, 696.8847, 737.0880, 776.7379, 816.9293,
      857.3441, 897.5391, 937.7497, 977.8273, 1017.6409, 1057.1924, 1096.8750,
      1136.1623, 1175.4492, 1214.8614, 1254.4190, 1293.9858, 1333.6525,
      1373.0715, 1412.3584,
    ],
    rankFont: `500 22px ${FONTS_EDITORIAL}`,
    inkColor: "#FFFFFF",
    accentColor: "#FFFFFF",
    mutedColor: "#FED7AA",
    cardBg: "transparent",
  },
  palette: {
    accent: "#FFFFFF", // pure-white slot + name ink (refrence-image.jpg)
    text: "#FFFFFF",
    textMuted: "#FED7AA",
    rowAlt: "rgba(0,0,0,0)",
    rowAltOpacity: 0, // no code stripes — the baked dividers do the separating
    wwcdBg: "rgba(0,0,0,0)", // no rank-1 pill over the art
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,255,255,0.10)",
    plateRing: "rgba(255,255,255,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#2B0F00",
  },
};

const ROYAL_BLUE_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(180deg, #002B7F 0%, #003DA5 55%, #001E5A 100%)",
  decor: [],
};

/** Royal Blue — the PUBG MOBILE "TEAM PARTICIPATION" announcement art (ref:
 *  public/templates/royal-blue/refrence-image.jpeg, the condensed athletic
 *  schedule typography in varsity gold + pure white).
 *
 *  The baked art (`announcement.png`, 1080×1620) owns everything at
 *  y0..380 (PUBG MOBILE logo, "TEAM PARTICIPATION" title,
 *  HOME | AWAY | NEUTRAL sub-bar) and y1180..1620 (soldier, bridge,
 *  parachutes). All data is confined to the safe window y425..1145:
 *  two columns of 12 rows, left x110 / right x560, each column 410 wide.
 *
 *  Geometry: rowY0 425, rowHeight 44, rowPitch 58, fixedRowPitch true.
 *  Row 12 bottom = 425 + 11*58 + 44 = 1107 <= 1145, so rows NEVER stretch
 *  into the bottom art when fewer than 24 teams are present; beyond 24 the
 *  overflow column auto-fits inside rowsBottom (announcementRowLayout).
 *
 *  Ink hierarchy (WCAG ≥ 4.5:1 against the measured #00338D royal field):
 *  slot '#' in Varsity Gold #FFB81C (the baked logo/HOME ink) at Exo 2 800,
 *  tabular-nums so #05..#28 align to the pixel; team name in pure #FFFFFF
 *  at Exo 2 700, uppercase with 0.04em athletic tracking. No code strips,
 *  plates or dynamic header text obscure the baked artwork (cardBg
 *  transparent, announcement scrim name/title/subtitle all suppressed).
 *  Standings + MVP have no art → clean royal-blue gradient fallback.
 */
const ROYAL_BLUE: TemplateConfig = {
  ...GEOMETRY,
  id: "royal-blue",
  name: "Royal Blue (Participation)",
  backgrounds: {
    standings: ROYAL_BLUE_FALLBACK_BG,
    mvp: ROYAL_BLUE_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/royal-blue/announcement.png" },
  },
  header: {
    title: { x: -9999, y: -9999, w: 0 },
    subtitle: { x: -9999, y: -9999, w: 0 },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `500 1px ${FONTS}`,
    subtitleFont: `500 1px ${FONTS}`,
    organizerFont: `500 1px ${FONTS}`,
  },
  variantHideScrimName: { announcement: true },
  variantHeaders: {
    // HeaderSpec slots are coordinate objects (not strings): park every
    // dynamic slot off-canvas at zero width. The two-column announcement path
    // skips the header entirely, so the baked "TEAM PARTICIPATION" lockup and
    // the HOME|AWAY|NEUTRAL sub-bar stay unobstructed.
    announcement: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  announcement: {
    rowsTop: 425, // rowY0 — clears the baked top title + sub-bar band (y0..380)
    rowsBottom: 1145, // clears the baked soldier/bridge/parachute art (y1180+)
    slotX: 110, // left column origin (= leftX)
    slotW: 56, // "05".."28" at 800 22px tabular-nums
    logoX: 172, // optional logo plate, left column
    teamX: 202, // team name follows the slot/logo compartment
    teamW: 310, // ends at x512, inside the 410px column (110..520)
    logoSize: 22,
    rowHeight: 44,
    slotFont: `800 22px ${FONTS}`,
    nameFont: `700 22px ${FONTS}`,
    subtitleBakedIn: true, // the art bakes "TEAM PARTICIPATION"
    // --- Two-column, fixed-pitch geometry (1–24 teams) ---
    fixedRowPitch: true,
    rowY0: 425,
    rowPitch: 58,
    rowsPerColumn: 12,
    leftX: 110,
    rightX: 560,
    colWidth: 410,
    rankFont: `800 22px ${FONTS}`,
    inkColor: "#FFFFFF",
    accentColor: "#FFB81C",
    mutedColor: "#93C5FD",
    cardBg: "transparent",
  },
  palette: {
    accent: "#FFB81C", // Varsity Gold — baked PUBG MOBILE/HOME ink
    text: "#FFFFFF", // pure white team names
    textMuted: "#93C5FD",
    rowAlt: "transparent",
    rowAltOpacity: 0, // no code stripes — the clean royal field shows through
    wwcdBg: "transparent",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,184,28,0.10)",
    plateRing: "rgba(255,184,28,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0B1533",
  },
};

/** Collegiate athletic condensed stack matched to the OREGON MEN'S BASKETBALL
 *  2025-26 schedule reference: Rajdhani leads, Exo 2 keeps the established
 *  metric fallback, Noto Sans Symbols 2 guards the PUBG glyph set. */
const FONTS_ATHLETIC = '"Rajdhani", "Exo 2", "Noto Sans Symbols 2", sans-serif';

const VARSITY_YELLOW_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(180deg, #065F31 0%, #044322 100%)",
  decor: [],
};

/** Varsity Yellow — the PUBG MOBILE "TEAM PARTICIPATION" single-column art.
 *
 *  The source art (`announcement.jpeg`, a 4096×6144 JPEG converted 1:1 to the
 *  1080×1620 `announcement.png`) bakes the PUBG MOBILE logo + dark-green
 *  "TEAM PARTICIPATION" ribbon at y0..415, the yellow board with its stacked
 *  white row bars, and the PUBG MOBILE | KRAFTON lockup at y1405..1485.
 *
 *  Measured white-bar pixels on the canvas (sharp scan, threshold >200):
 *  bar 1 top 444.8, mean height ≈28, bar 1 centre 458.8, last bar bottom
 *  1355.8. The campaign geometry locks the fixed-pitch single column to
 *  rowY0 444.8 / rowHeight 28 / rowPitch 39.7 / rowsBottom 1382, with 24
 *  painted row bands (rowsPerColumn 24). NOTE: the delivered art actually
 *  paints 22 bars at ~42.2px pitch; the campaign geometry above is used by
 *  deliberate decision (the prompt's 24-band spec), so rows beyond the first
 *  drift from those bars. `announcementRowLayout` therefore
 *  places row i at top = rowY0 + i*rowPitch with height = rowHeight; its
 *  vertical midpoint is the row's text centre. Fewer than 24 teams never
 *  stretch the pitch — the unused bars below team N stay clean and empty.
 *
 *  Content is confined to x296..784 inside the painted bars (canvas x281..799):
 *  left-aligned Slot '#' column at x296 (105 wide), team name at x401. Both
 *  ink colours are the deep forest green #074725 of the reference schedule /
 *  KRAFTON footer (>10:1 WCAG AAA on the white bars), cardBg transparent so
 *  the painted bars show through with no double-drawn boxes. Typography is
 *  Rajdhani-led 700 19px uppercase, 0.05em tracking, tabular slot numerals.
 *
 *  The art bakes the title/footer, so the announcement variant hides every
 *  dynamic header slot. Standings + MVP have no art → deep forest gradient. */
const VARSITY_YELLOW: TemplateConfig = {
  ...GEOMETRY,
  id: "varsity-yellow",
  name: "Varsity Yellow (Participation)",
  backgrounds: {
    standings: VARSITY_YELLOW_FALLBACK_BG,
    mvp: VARSITY_YELLOW_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/varsity-yellow/announcement.png" },
  },
  header: {
    title: { x: -9999, y: -9999, w: 0 },
    subtitle: { x: -9999, y: -9999, w: 0 },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `500 1px ${FONTS}`,
    subtitleFont: `500 1px ${FONTS}`,
    organizerFont: `500 1px ${FONTS}`,
  },
  variantHideScrimName: { announcement: true },
  variantHeaders: {
    announcement: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  announcement: {
    rowsTop: 444.8,
    rowsBottom: 1382,
    slotX: 296,
    slotW: 105,
    logoX: 401,
    teamX: 401,
    teamW: 383, // ends at x784 = leftX + colWidth
    logoSize: 30,
    rowHeight: 28,
    slotFont: `700 19px ${FONTS_ATHLETIC}`,
    nameFont: `700 19px ${FONTS_ATHLETIC}`,
    subtitleBakedIn: true, // art bakes "TEAM PARTICIPATION"
    // --- Single-column, fixed-pitch bar geometry (1–24 teams) ---
    singleColumn: true,
    fixedRowPitch: true,
    rowsPerColumn: 24,
    rowY0: 444.8,
    rowPitch: 39.7,
    leftX: 296,
    rightX: 784,
    colWidth: 488,
    rankFont: `700 19px ${FONTS_ATHLETIC}`,
    inkColor: "#074725",
    accentColor: "#074725",
    mutedColor: "#14532D",
    cardBg: "transparent",
    tracking: "0.05em",
    uppercaseNames: true,
  },
  // Template-level override (onyx-green's pattern) — identical coordinates to
  // the spec above so both resolution paths agree exactly.
  announcementLayout: {
    singleColumn: true,
    fixedRowPitch: true,
    rowsPerColumn: 24,
    leftX: 296,
    rightX: 784,
    colWidth: 488,
    rowY0: 444.8,
    rowPitch: 39.7,
    rowHeight: 28,
    rowsBottom: 1382,
    slotColWidth: 105,
    rankFont: `700 19px ${FONTS_ATHLETIC}`,
    nameFont: `700 19px ${FONTS_ATHLETIC}`,
  },
  palette: {
    accent: "#074725", // deep forest green — both slot + name ink
    text: "#074725",
    textMuted: "#14532D",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the white bars — no code strips
    wwcdBg: "rgba(0,0,0,0)", // no rank-1 pill over the baked art
    wwcdText: "#074725",
    watermarkColor: "rgba(7,71,37,0.85)",
    plateBg: "rgba(7,71,37,0.08)",
    plateRing: "rgba(7,71,37,0.35)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#FFFFFF",
  },
};

export const AESTHETICS: Record<AestheticId, TemplateConfig> = {
  "dark-gold": DARK_GOLD,
  "purple-butterfly": PURPLE_BUTTERFLY,
  "pink-blossom": PINK_BLOSSOM,
  "pmpl-light": PMPL_LIGHT,
  "neon-green": NEON_GREEN,
  "challengers-red": CHALLENGERS_RED,
  "ewc-yellow": EWC_YELLOW,
  "onyx-green": ONYX_GREEN,
  "pmgc-crimson": PMGC_CRIMSON,
  "pmgc-aqua": PMGC_AQUA,
  "pmwi-violet": PMWI_VIOLET,
  "grunge-red": GRUNGE_RED,
  "esports-clash": ESPORTS_CLASH,
  "rundown-orange": RUNDOWN_ORANGE,
  "royal-blue": ROYAL_BLUE,
  "varsity-yellow": VARSITY_YELLOW,
};

/** Registered ids in render order — the single source for chips, dev selectors
 *  and registration tests (never a hand-maintained second list). */
export const AESTHETIC_IDS = Object.keys(AESTHETICS) as AestheticId[];

/** Look up a template config by aesthetic id. Unknown/legacy ids (the seed's
 * `dev-dark-gold`) fall back to the original dark-gold skin so graphics never
 * crash on historical rows. */
export function getTemplate(id: AestheticId): TemplateConfig {
  return AESTHETICS[id] ?? AESTHETICS["dark-gold"];
}
