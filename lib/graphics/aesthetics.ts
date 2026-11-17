import type { AestheticId, TemplateConfig } from "./types";

/** Font stack appended to EVERY font string in every config. Exo 2 is the
 * primary display face (P7); Rajdhani stays as the metric fallback until the
 * browser loads Exo 2, and "Noto Sans Symbols 2" covers the C1.1 glyph set
 * (× · | _ ₛ ≌) that Exo 2 lacks. */
const FONTS = '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif';

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
    nameFont: `800 22px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
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
};

/** Look up a template config by aesthetic id. Unknown/legacy ids (the seed's
 * `dev-dark-gold`) fall back to the original dark-gold skin so graphics never
 * crash on historical rows. */
export function getTemplate(id: AestheticId): TemplateConfig {
  return AESTHETICS[id] ?? AESTHETICS["dark-gold"];
}
