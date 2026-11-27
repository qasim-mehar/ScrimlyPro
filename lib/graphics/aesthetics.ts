import type { AestheticId, AnnouncementBarLayout, TemplateConfig } from "./types";
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
    standings: {
      // Standings-only: baked "MATCH #" ink ends x622; digits start at x632
      // (10px gap) inside the pink ribbon. The shared header.subtitle stays
      // unchanged for the gradient MVP/announcement fallbacks.
      subtitle: { x: 632, y: 54, w: 72, align: "left" },
      subtitleFont: `800 48px ${FONTS}`,
      subtitleColor: "#0e7ac4",
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
    // 22px fits the 158px team cells far better than the old 28px.
    nameFont: `700 22px ${FONTS}`,
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
  variantHeaders: {
    standings: {
      // Re-measured: baked "MATCH #" ink ends x617; digits start x628 (11px
      // gap), inside the chip's right edge x677. Shared header untouched.
      subtitle: { x: 628, y: 262, w: 48, align: "left" },
      subtitleFont: `800 48px ${FONTS}`,
      subtitleColor: "#00e66a",
    },
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
    nameFont: `700 26px ${FONTS}`,
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
      // Baked "MATCH #" ink ends x964.3; the cyan chip ends x1012.3. Digits
      // fill that whole 48px slot instead of floating small inside it.
      subtitle: { x: 964, y: 224, w: 48, align: "center" },
      subtitleColor: "#061014",
      subtitleFont: `800 48px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true,
  },
  standings: {
    // Rank 1 must not wear accent red ink, strip or plate ring on this art.
    uniformRowInk: true,
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
    // 21px keeps Zero Degree / Shadow Syndicate / Rawalpindi inside the
    // 198/206px name boxes without premature ellipsis.
    nameFont: `800 21px ${FONTS}`,
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
 * MVP + announcement have no art → warm light gradient fallback; Spanish Orange
 * primary text with dark espresso muted/medal ink. */
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
      // Re-measured on the current 4096px art (canvas ×1080/4096): the baked
      // "Match #" ink ends x1016. The digits start at x1028 (12px gap) inside
      // the ribbon and stay clear of its right edge (x1080).
      subtitle: { x: 1028, y: 228, w: 50, align: "left" },
      organizer: { x: 140, y: 130, w: 800, align: "center" },
      titleFont: `700 28px ${FONTS}`,
      subtitleFont: `800 38px ${FONTS}`,
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
    // Re-measured bar 1 art y1491–1741 → canvas 393.1–459.0 (height 65.9);
    // bar pitch art ~300 → 79.1 canvas. Box centre 393+33 = 426 lands on the
    // painted bar centre (426.0) once line-height is applied AFTER `font`.
    rowY0: 393,
    rowPitch: 79,
    rowHeight: 66,
    maxRowsLeft: 12,
    statBoxW: 46,
    logoPlate: 34,
    logoNameGap: 38,
    // 20px keeps TRB Gaming / 4NM Esports / Nova Legends inside the 132px box.
    nameFont: `800 20px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
  },
  palette: {
    accent: "#5C2400",
    text: "#e86100", // Spanish Orange — primary ink for EWC Yellow text
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
 * - The ANNOUNCEMENT art (`announcement.png`) is a separate 4096×6144 JPEG
 *   payload with 25 baked white divider lines at canvas y618.7625…1436.7114
 *   (uniform pitch 34.0812). Its 24 row bands are measured into
 *   `announcementLayout` below — a template-level override so NONE of the
 *   standings numbers above move. MVP keeps the matrix-green fallback.
 *   Watermark stays hardcoded. */
const ONYX_GREEN: TemplateConfig = {
  ...GEOMETRY,
  id: "onyx-green",
  name: "Onyx Green",
  backgrounds: {
    standings: { type: "image", src: "/templates/onyx-green/overall.png" },
    mvp: ONYX_GREEN_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/onyx-green/announcement.png" },
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
      // Re-measured: baked "MATCH #" ink ends x975; digits start at x986
      // (11px gap) and sit above the neon underline (x980–1064 at y294).
      subtitle: { x: 986, y: 246, w: 72, align: "center" },
      subtitleFont: `800 38px ${FONTS}`,
      subtitleColor: "#42F57E", // neon matrix green on the measured dark slot
    },
    announcement: {
      // HeaderSpec slots are coordinate objects (not strings): park every
      // dynamic slot off-canvas at zero width. The art already bakes the
      // PUBG MOBILE logo and "TEAM PARTICIPATION" headline at y0..570, so no
      // dynamic title/subtitle/organizer may touch it.
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  variantHideScrimName: {
    standings: true, // the art already prints "STANDING" in giant white stencil
    announcement: true, // the art already prints "TEAM PARTICIPATION"
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
      // Re-measured: baked "#" ink ends x1005; digits sit inside the gold slot
      // from x1012 (7px gap) to x1056, clear of the parallelogram's right edge.
      subtitle: { x: 1012, y: 250, w: 44, align: "center" },
      subtitleFont: `800 44px ${FONTS}`,
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
    // 20px keeps TRB Gaming / 4NM Esports inside the 152px name box; genuinely
    // long names (Straight Forward) still ellipsize.
    nameFont: `800 20px ${FONTS}`,
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
 *  leaderboard. The art on disk is now a JPEG payload at 1882×3344 — exactly 2×
 *  the 941×1672 file this config was first measured against. The uniform
 *  WIDTH fit to 1080 (×1080/1882 → 1080×1918.979809) with top 0 shows the
 *  COMPLETE art from its top edge, including the baked PUBG MOBILE logo at the
 *  upper left. The art runs past the canvas bottom (y1620..1919 is cropped).
 *  Every number below is measured on the current 1882px art through that
 *  mapping (artY × 1080/1882, no vertical offset):
 *  - Cyan baked header bands: canvas y451.4–489.2 (was 321.1–358.9 under the
 *    old crop). Dark ink centres: left ELIMS 330 / WWCD 405.1 / TOTAL 480.9;
 *    right ELIMS 853.3 / WWCD 919.9 / TOTAL 990.5 (the right shift is NOT
 *    uniform — measured, not assumed). ELIMS maps to the kill-points stat
 *    (`kp`), then WWCD, then TOTAL.
 *  - 12 painted dark bars per column: bar 1 canvas 524.6–582.5 (height ~58),
 *    last bar top canvas 1375.6. A fixed 77.42px pitch with a 54px row box
 *    centred at 553.3 (rowY0 526.25) lands every row dead-centre in its bar;
 *    ranksBakedIn skips code numerals (white #1–#24 boxes bake at canvas
 *    x52.8–113.6 / x557.8–618.6).
 *  - Baked "OVERALL RANKINGS" canvas y228.3–344.3 and "MATCH #" canvas
 *    y389.1–421.2 (white ink ends x523.4). The scrim name is hidden for
 *    standings; only the match digits render in the open slot at x534
 *    y382.3. The organizer is parked in the dark band below "MATCH #"
 *    (y412.3), clear of both baked blocks and the cyan header.
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
      // Uniform ×1080/1882 width fit, anchored at the top so the baked PUBG
      // MOBILE logo is fully visible; the art's bottom y1620..1919 is cropped.
      fit: { width: 1080, height: 1918.979809, left: 0, top: 0 },
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
      // Re-measured: baked "MATCH #" ink ends x523.4; digits start x534
      // (11px gap) in the open dark slot above the cyan header band, shifted
      // 130.25px down now that the art is anchored to its top edge.
      subtitle: { x: 534, y: 382, w: 64, align: "left" },
      subtitleFont: `800 56px ${FONTS}`,
      subtitleColor: "#FFFFFF", // white digits on the measured dark violet slot
      // Park the optional organizer in the dark band below "MATCH #" (ends
      // canvas y421.2) and above the cyan header (starts y451.4) — zero text
      // collides with the baked title/subtitle art.
      organizer: { x: 140, y: 412, w: 800, align: "center" },
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
        rowsBottom: 1435, // art row 12 bottom canvas 1435.6 (top-anchored fit)
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
        rowsBottom: 1435, // art row 12 bottom canvas 1435.6 (top-anchored fit)
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 451, // cyan baked label band top — code draws no labels
    rowY0: 526.25, // bar 1 top canvas 524.6; box centre 553.3 = bar centre
    rowPitch: 77.42, // measured 12-bar span (1245.6 − 394.4)/11
    rowHeight: 54, // bar interior 54–58px across the 12 rows (no bottom overflow)
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 56, // ≥ three digits at 800 26px; right columns stay 11px apart
    logoPlate: 34,
    logoNameGap: 38,
    uniformStatInk: true, // baked #1 badge carries rank-1 emphasis
    nameFont: `800 21px ${FONTS}`, // keeps Zero Degree / Shadow Syndicate inside 180/197px
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

/** PMGC Aqua — the 2022 PMGC aqua/mint/cyan broadcast leaderboard. The art on
 *  disk is now a JPEG payload at 3872×6500 — exactly 4× the 968×1625 file this
 *  config was first measured against. The uniform WIDTH fit to 1080
 *  (×1080/3872 → 1080×1813.016529) and top −96.508264 remain the exact
 *  centred `object-fit: cover` crop (art y0–346 and y6154–6500 trimmed): the
 *  art is an integer upscale, not a new composition. All canvas coordinates
 *  below were re-measured on the current art and converted with
 *  canvasX = artX × S, canvasY = artY × S − 96.508264:
 *  - 12 light ice-grey bars per column. Re-measured bright-divider tops art
 *    1656, 1909, … → canvas 365.4, 436.1, …, 1220.6: uniform pitch 70.7, bar
 *    height ≈69 (68px text box centred on the painted bar). 24 teams → [12,12];
 *    the 25th overflows below the last painted bar, never dropped. Both columns
 *    share the same painted geometry — the stale result PNG's "PLACE-only /
 *    right-column" lift came from the line-height reset, not per-column art.
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
      // Re-measured: baked "#" ink ends canvas x910; digits are centred from
      // x920 (10px gap) in the dark slot above the cyan underline (y247).
      subtitle: { x: 920, y: 178, w: 96, align: "center" },
      subtitleFont: `800 64px ${FONTS}`,
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
    // 21px keeps Karachi Snipers / Shadow Syndicate inside the 170/172px slots.
    nameFont: `800 21px ${FONTS}`,
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
    playerFont: `800 56px ${FONTS_FULL}`,
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
        // Widened from 340 → 400 (still inside the painted bar, which ends
        // x≈911) and capped at 56px: the old 68px/340px pair ellipsized
        // "4NM | BROKEN_X" and "TRB HANAN OP".
        w: 400,
        maxFontSize: 56,
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
// NOTE: the loaded cuts are Rajdhani 500/600/700 and Exo 2 500/600/700/800.
// The 900/800 weights in cardinal-gold's athletic lockup are therefore the
// browser's real synthesis of those loaded faces (no unloaded font is named),
// matching the heavy block ink of the refrence-image without touching the
// app-level font imports.

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
 *  bar 1 top 445, mean height ≈28, bar 1 centre 459, last bar bottom 1355,
 *  22 painted bars at a 42px pitch. The fixed-pitch single column is locked
 *  to those measured bars: rowY0 445 / rowHeight 28 / rowPitch 42 /
 *  rowsBottom 1356 / rowsPerColumn 22. `announcementRowLayout` places row i
 *  at top = rowY0 + i*rowPitch with height = rowHeight; its vertical midpoint
 *  is the row's text centre. Fewer than 22 teams never stretch the pitch —
 *  the unused bars below team N stay clean and empty.
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
    rowsTop: 445,
    rowsBottom: 1356,
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
    // --- Single-column, fixed-pitch bar geometry (1–22 teams) ---
    singleColumn: true,
    fixedRowPitch: true,
    rowsPerColumn: 22,
    rowY0: 445,
    rowPitch: 42,
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
    rowsPerColumn: 22,
    leftX: 296,
    rightX: 784,
    colWidth: 488,
    rowY0: 445,
    rowPitch: 42,
    rowHeight: 28,
    rowsBottom: 1356,
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

const COURT_ORANGE_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #B44110 0%, #28232E 60%, #9A3412 100%)",
  decor: [],
};

// Court Orange uses the tall squared condensed athletic face from the OUNCE
// reference poster first (Rajdhani), with Exo 2 / Noto Symbols / system-ui as
// the glyph-safe fallbacks demanded by the shared font stack.
const PAPER_FONTS = '"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif';

/** Court Orange — the "TOP MVP LIST" paper-cutout art. The delivered file is
 *  a 3764×6688 JPEG payload inside a .png name (9:16, not the 2:3 canvas): the
 *  same height-fit as esports-clash → scale 1620/6688 = 0.2422248804, drawn
 *  911.734×1620 at x84.13, with the ~84px side bars filled by the art's own
 *  charcoal edge ink (`canvasBackground`). Nothing is cropped: the baked
 *  PUBG MOBILE / TOP MVP LIST header and the PUBG MOBILE | KRAFTON footer stay
 *  intact. The five painted banners were measured off those pixels (canvas
 *  midlines 399.11 / 587.08 / 767.34 / 954.03 / 1138.31); each row box is
 *  156px tall and centred on its measured midline, so the rank badge and the
 *  name/kills flex rows land dead-on the paper strip's Y-axis. Alternating
 *  strips are Cream #FDF5E6 (ranks 1/3/5) and Marigold #FFA800 (2/4) in the
 *  art; crimson #9E0B22 names + KILLS label and charcoal #1E2229 numerals are
 *  the matching reference inks (see refrence-image.jpeg). Standings +
 *  announcement have no art → burnt-orange/charcoal gradient fallback. */
const COURT_ORANGE: TemplateConfig = {
  ...GEOMETRY,
  id: "court-orange",
  name: "Court Orange (MVP)",
  backgrounds: {
    standings: COURT_ORANGE_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/court-orange/mvp.png",
      fit: { width: 911.73445, height: 1620, left: 84.132775, top: 0 },
    },
    announcement: COURT_ORANGE_FALLBACK_BG,
  },
  canvasBackground: "#28232E",
  uniformMvpRows: true,
  mvpLayoutStyle: "paper-banner",
  mvpShowTeam: false,
  // The art already bakes the PUBG MOBILE logo, "TOP MVP LIST" brush headline
  // and the KRAFTON footer: no dynamic header/team text may cover them.
  subtitleBakedIn: { mvp: true },
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true },
  variantHeaders: {
    mvp: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  header: {
    ...GEOMETRY.header,
    titleFont: `800 44px ${PAPER_FONTS}`,
    subtitleFont: `800 38px ${PAPER_FONTS}`,
    organizerFont: `600 22px ${PAPER_FONTS}`,
  },
  mvp: {
    // Nominal uniform geometry (paper-banner renderer seats rows from the
    // exact measured midlines in `paperBanner.bannerCenterYs` instead).
    rowY0: 321.11,
    rowPitch: 184.8,
    rowHeight: 156,
    rankX: 213, // orange badge left edge
    playerX: 368, // paper strip left edge
    playerW: 486,
    teamX: 368, // never rendered (mvpShowTeam: false)
    teamW: 0,
    killsX: 696,
    killsW: 158,
    rankFont: `800 44px ${PAPER_FONTS}`,
    playerFont: `800 38px ${PAPER_FONTS}`,
    statFont: `800 44px ${PAPER_FONTS}`,
    subtitleBakedIn: true,
    paperBanner: {
      rowHeight: 156,
      bannerCenterYs: [399.11, 587.08, 767.34, 954.03, 1138.31],
      paddingX: 28,
      killsGap: 10,
      badge: {
        x: 213,
        w: 150,
        fontFamily: PAPER_FONTS,
        fontSize: 44,
        fontWeight: 800,
        color: "#FFFFFF", // crisp white rank numerals on burnt orange
      },
      name: {
        x: 368,
        w: 486,
        maxFontSize: 38,
        minFontSize: 18,
        fontFamily: PAPER_FONTS,
        fontWeight: 800,
        color: "#9E0B22", // deep crimson poster headline ink
      },
      kills: {
        fontFamily: PAPER_FONTS,
        fontSize: 44,
        fontWeight: 800,
        color: "#1E2229", // dark charcoal numeral ink
        labelFontFamily: PAPER_FONTS,
        labelFontSize: 22,
        labelFontWeight: 800,
        labelColor: "#9E0B22", // deep crimson KILLS label
        labelText: "KILLS",
      },
    },
  },
  palette: {
    accent: "#9E0B22", // deep crimson (player IGN + KILLS label)
    text: "#FDF5E6", // cream fallback ink (passes the art on every gradient stop)
    textMuted: "#FFE8CC",
    rowAlt: "#FDF5E6",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(158,11,34,0.14)",
    wwcdText: "#9E0B22",
    watermarkColor: "rgba(255,255,255,0.88)",
    plateBg: "rgba(253,245,230,0.1)",
    plateRing: "rgba(158,11,34,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#1E2229",
  },
};

const DUSK_AMBER_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Dusk violet → warm amber-black. Every stop stays dark so the warm-white
  // palette ink clears 4.5:1 on the artless standings/announcement variants.
  css: "linear-gradient(165deg, #1E1A22 0%, #2A1F33 55%, #3A2A24 100%)",
  decor: [],
};

/** Dusk Amber — the "draft parchment bars" MVP art. The delivered file is a
 *  3764×6688 JPEG payload inside a .png name (9:16, like esports-clash) →
 *  fitted by HEIGHT to the 2:3 canvas (uniform ×0.2422248804, drawn 911.73×1620
 *  at x84.13); the ~84px side bars are filled with a dark dusk-charcoal token
 *  (#1E1A22) so exports never expose transparency. The
 *  PUBG MOBILE logo, poster frame, vertical copy and five character portraits
 *  are all baked in, so the MVP variant paints ONLY the five locked entries.
 *
 *  Measured tan-bar bands (native y, row-threshold scan x700–1500; stable
 *  across thresholds 200–600):
 *    tops 1413 / 2257 / 3098 / 3933 / 4768
 *    bottoms 2081 / 2932 / 3769 / 4604 / 5447
 *  → canvas centres 423.17 / 628.45 / 831.68 / 1033.94 / 1237.16. The uneven
 *  pitch (±2px cumulative drift) is why `barCenterYs` pins the exact centres
 *  instead of a single rowPitch. Each text block is centred on its own bar
 *  centre, so its midpoint equals the bar's painted midpoint for every rank.
 *
 *  Horizontal: tan ink starts at canvas x≈214; the open parchment zone ends
 *  before the earliest portrait/scope ink (bar 5's sniper objective starts
 *  ≈488, the other four ≥532). The shared right-aligned text axis ends at
 *  x470 — 18px clear of the worst case — so no helmet, hood or rifle scope
 *  can obscure an IGN. Standings + announcement have no art → dusk gradient. */
const DUSK_AMBER: TemplateConfig = {
  ...GEOMETRY,
  id: "dusk-amber",
  name: "Dusk Amber",
  backgrounds: {
    standings: DUSK_AMBER_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/dusk-amber/mvp.png",
      fit: { width: 911.7344497607655, height: 1620, left: 84.13277511961724, top: 0 },
    },
    announcement: DUSK_AMBER_FALLBACK_BG,
  },
  canvasBackground: "#1E1A22",
  uniformMvpRows: true,
  mvpLayoutStyle: "draft-parchment-bars",
  mvpShowTeam: false,
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true },
  header: {
    // Fallback variants (standings/announcement gradient) keep the normal header.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  mvp: {
    rowY0: 345.17, // nominal first bar top (centre 423.17 − rowHeight/2)
    rowPitch: 203.5, // nominal average — exact per-row centres are in parchment.barCenterYs
    rowHeight: 156,
    rankX: 224, // never rendered (mvpShowTeam: false)
    playerX: 224,
    playerW: 246,
    teamX: 470,
    teamW: 0,
    killsX: 470,
    killsW: 0,
    rankFont: `800 20px ${FONTS_FULL}`,
    playerFont: `900 46px ${FONTS_FULL}`,
    statFont: `800 24px ${FONTS_FULL}`,
    subtitleBakedIn: true,
    parchment: {
      rowHeight: 156,
      barCenterYs: [423.17, 628.45, 831.68, 1033.94, 1237.16],
      textLeft: 224,
      textWidth: 246, // right edge 470 — clears the bar-5 scope (≥488)
      name: {
        fontFamily: FONTS_FULL,
        fontWeight: 900,
        maxFontSize: 46,
        minFontSize: 14,
        color: "#221D1A",
        letterSpacing: "0.12em",
        lineHeight: 1,
        textShadow: "2px 2px 0 rgba(34, 29, 26, 0.20)",
      },
      subline: {
        fontFamily: FONTS_FULL,
        fontWeight: 800,
        ratio: 0.53,
        color: "#221D1A",
        letterSpacing: "0.16em",
        lineHeight: 1,
        gap: 8,
      },
    },
  },
  palette: {
    accent: "#E6B87A", // the painted warm-amber bar ink (swatch)
    text: "#FFF3E2", // warm white — high-contrast on the dusk gradient fallback
    textMuted: "#D8C3A8",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(230,184,122,0.16)",
    wwcdText: "#E6B87A",
    watermarkColor: "rgba(255,255,255,0.82)",
    plateBg: "rgba(230,184,122,0.10)",
    plateRing: "rgba(230,184,122,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#1E1A22",
  },
};


const CARDINAL_GOLD_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  // Hardwood charcoal → cardinal crimson → charcoal. Both text inks clear
  // every stop: #FFFFFF ≥7:1, varsity gold #F5C451 ≥4.5:1.
  css: "linear-gradient(165deg, #141210 0%, #9E1B24 55%, #141210 100%)",
  decor: [],
};

/** Cardinal Gold — the vertical hardwood-black "STARTING FIVE" PUBGM art
 *  (3764×6688 JPEG payload inside a .png name, i.e. 9:16 like esports-clash).
 *  The art is height-fitted to the 1080×1620 canvas by ×1620/6688 =
 *  0.2422248804 → 911.734×1620 at x84.132775, so the baked STARTING top edge,
 *  all five crimson bars, the FIVE | SC lockup and the PUBG MOBILE | KRAFTON
 *  footer stay 100% unclipped; the ~84px side bars are filled with #141210.
 *
 *  Every coordinate below was measured off those pixels through the fit above:
 *  - five flat crimson bars (#9D2234-ish) at art y1081..1730, 1809..2441,
 *    2516..3149, 3224..3841, 3918..4541 → canvas barTops/barBottoms below.
 *    `barTops`/`barBottoms` are authoritative: row i's text block is centred
 *    on the exact midpoint, so the five bars carry ZERO cumulative pitch drift.
 *  - the character portraits occupy canvas x≤615 in bars 1–4; bar 5's ghillie
 *    sniper barrel reaches canvas x≈731 near its lower edge. The open right
 *    zone therefore starts at x748 and ends at x968 (27.6px inside the art's
 *    crimson right edge at x995.6) — the weapon is never touched.
 *  - the art bakes STARTING / FIVE | SC / PUBG MOBILE | KRAFTON, so the MVP
 *    variant hides every synthetic header slot and paints no team data.
 *  - standings has no art → charcoal/cardinal/gold gradient carrying the same
 *    Exo 2 / Rajdhani 800–900 athletic typography as the baked announcement.
 *
 *  ANNOUNCEMENT art (`announcement.png`, 1664×2496, exactly 2:3): the baked
 *  "TEAM PARTICIPATION" hero owns y0..~408 and the PUBG MOBILE | KRAFTON
 *  footer y~1465..1575. The 24-team grid lives in y455..1405 as two 12-row
 *  columns (x88..512 / x568..992) at a fixed 76px pitch with 54px row boxes —
 *  shifted 30px below the baked headline so it breathes before the table.
 *  Matte-black #141414 56×54 slot badges and translucent cardinal name bars
 *  seat pure-white Exo 2 800 / Rajdhani 800 ink dead-centre on every row. */
const CARDINAL_GOLD: TemplateConfig = {
  ...GEOMETRY,
  id: "cardinal-gold",
  name: "Cardinal Gold",
  backgrounds: {
    standings: CARDINAL_GOLD_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/cardinal-gold/mvp.png",
      fit: { width: 911.73445, height: 1620, left: 84.132775, top: 0 },
    },
    // announcement.png is a TRUE 1664×2496 art — exactly the 2:3 canvas
    // ratio. `object-fit: cover` maps art pixels onto 1080×1620 uniformly
    // (×0.6490385, zero crop), so every coordinate below is already measured
    // in canvas space. The baked PUBG MOBILE / "TEAM PARTICIPATION" hero owns
    // y0..~405 and the KRAFTON footer y~1500+, leaving the 24-team grid clear.
    announcement: { type: "image", src: "/templates/cardinal-gold/announcement.png" },
  },
  canvasBackground: "#141210",
  uniformMvpRows: true,
  mvpLayoutStyle: "starting-five-crimson",
  mvpShowTeam: false,
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true, announcement: true },
  variantHeaders: {
    // The two-column announcement path skips the header entirely; park every
    // synthetic slot off-canvas anyway so the baked hero lockup is untouchable.
    announcement: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  header: {
    // Standings uses the charcoal/cardinal gradient fallback, so it wears the
    // measured display ink from refrence-image: heavy 900 block title with a
    // crisp dark shadow, gold 800 wide-tracked uppercase subtitle.
    title: { x: 90, y: 84, w: 900, align: "center" },
    subtitle: { x: 140, y: 176, w: 800, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `900 64px ${FONTS_ATHLETIC}`,
    subtitleFont: `800 30px ${FONTS_ATHLETIC}`,
    organizerFont: `600 22px ${FONTS_FULL}`,
    titleLetterSpacing: "0.03em",
    subtitleLetterSpacing: "0.14em",
    titleTextShadow: "0 4px 12px rgba(0, 0, 0, 0.65)",
    titleTextTransform: "uppercase",
    subtitleTextTransform: "uppercase",
  },
  standings: {
    ...GEOMETRY.standings,
    nameFont: `800 21px ${FONTS_FULL}`,
    nameUppercase: true,
    nameLetterSpacing: "0.04em",
    statFont: `800 23px ${FONTS_ATHLETIC}`,
    labelFont: `800 18px ${FONTS_ATHLETIC}`,
    statBoxW: 52,
    // 24 teams → 12/12; 25 → 12/13 (splitRowsAt fills the left column first).
    rowsPerColumn: 12,
  },
  mvp: {
    rowY0: 261.8451,
    rowPitch: 171.7979,
    rowHeight: 152.7954,
    rankX: 748,
    playerX: 748,
    playerW: 220,
    teamX: 748, // never rendered (mvpShowTeam: false)
    teamW: 0,
    killsX: 748,
    killsW: 220,
    rankFont: `800 21px ${FONTS_FULL}`,
    playerFont: `800 30px ${FONTS_FULL}`,
    statFont: `800 21px ${FONTS_FULL}`,
    subtitleBakedIn: true,
    startingFive: {
      rowY0: 261.8451,
      rowPitch: 171.7979,
      rowHeight: 152.7954,
      barTops: [261.8451, 438.1848, 609.4378, 780.933, 949.0371],
      barBottoms: [419.049, 591.2709, 762.7661, 930.3858, 1099.9432],
      textLeft: 748,
      textWidth: 220,
      kills: {
        fontFamily: FONTS_FULL,
        fontSize: 21,
        fontWeight: 800,
        letterSpacing: "0.08em",
        lineHeight: "1.1",
        color: "#FFFFFF",
      },
      name: {
        fontFamily: FONTS_FULL,
        maxFontSize: 30,
        minFontSize: 14,
        fontWeight: 800,
        letterSpacing: "0.05em",
        lineHeight: "1.08",
        color: "#F5C451",
      },
    },
  },
  announcement: {
    // Safe grid: y455..1405, x88..512 (left) and x568..992 (right). The baked
    // "TEAM PARTICIPATION" headline ends near y~408; the grid starts 47px below
    // it instead of 17px. The KRAFTON footer and bottom-left crimson shards sit
    // below y~1460. 12 rows/column at a FIXED 76px pitch (54px row box) → row
    // 12 bottom = 455 + 11*76 + 54 = 1345, and a 25th team (right column row
    // 13) auto-fits to 74.7px → 1405.
    rowsTop: 455,
    rowsBottom: 1405,
    slotX: 88,
    slotW: 56, // matte-black "01".."24" badge
    logoX: 154,
    teamX: 190,
    teamW: 322, // ends at x512, inside the 424px left column
    logoSize: 28,
    rowHeight: 54,
    slotFont: `800 26px ${FONTS_ATHLETIC}`, // heavy condensed Rajdhani numerals
    nameFont: `800 21px ${FONTS_FULL}`, // Exo 2 800 uppercase, glyph-safe
    subtitleBakedIn: true, // "TEAM PARTICIPATION" is baked into the art
    // --- Two-column, fixed-pitch geometry (4–25 teams) ---
    fixedRowPitch: true,
    rowY0: 455,
    rowPitch: 76,
    rowsPerColumn: 12,
    leftX: 88,
    rightX: 568,
    colWidth: 424,
    rankFont: `800 26px ${FONTS_ATHLETIC}`,
    inkColor: "#FFFFFF",
    accentColor: "#F5C451", // cardinal gold badge numerals
    mutedColor: "#F5C451",
    cardBg: "transparent", // no code stripes over the broadcast art
    tracking: "0.04em",
    uppercaseNames: true,
    slotBadgeBg: "#141414",
    teamBarBg: "rgba(20, 3, 7, 0.78)",
    nameTextShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
  },
  palette: {
    accent: "#F5C451", // varsity gold — the baked name ink + fallback accent
    text: "#FFFFFF", // crisp white kills line + row text
    textMuted: "#F5C451", // varsity gold stays ≥4.5:1 on every fallback stop
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(245,196,81,0.14)",
    wwcdText: "#F5C451",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(245,196,81,0.5)",
    medalGold: "#F5C451",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#141210",
  },
};


const APEX_BLAZE_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #141212 0%, #1F1714 55%, #2A1208 100%)",
  decor: [
    // Blaze-orange hairlines at the frame edges — the #EA4400 accent lives in
    // the decor + palette (never as a light gradient stop that would break
    // white text contrast against the gradient).
    { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#EA4400" },
    { kind: "bar", x: 0, y: 1612, w: 1080, h: 8, color: "#EA4400" },
  ],
};

/** Apex Blaze — "TOP 5 /// FINISHES" Supercross / AUSX Open art.
 *
 *  Art: `public/templates/apex-blaze/mvp.jpeg`, a 3072×5440 portrait JPEG. It is
 *  uniformly height-fitted to the 2:3 canvas: scale = 1620/5440 =
 *  0.2977941176 → drawn 914.823529×1620 at x82.588235, y0. The whole poster is
 *  therefore visible (PUBG MOBILE logo at top, white textured card, /// SX1 +
 *  PUBG MOBILE | KRAFTON footer) with only dark side bars, filled by
 *  `canvasBackground: "#121010"`.
 *
 *  Measured through that fit (art px × scale + offset):
 *   - Orange P# / glyph-ink bands (canvas Y): 901.1–939.5, 968.1–1006.2,
 *     1036.6–1075.3, 1106.0–1143.5, 1175.4–1214.4. Their exact midpoints are
 *     `rowCenterYs` — the art's pitch is NOT uniform (66.9/68.8/68.8/70.1),
 *     so the array (not a single rowPitch) is authoritative for Y centering.
 *   - Black divider rules (canvas Y): 954.9, 1022.9, 1091.7, 1159.6, 1228.3 —
 *     ~34px below each glyph centre, i.e. the row band's bottom edge.
 *   - Baked slash right edges (canvas X): 394.1/393.5/393.2/392.9/385.1 →
 *     `textLeft` 404 clears every row. Rule right edges: 778–821 →
 *     `textRight` 818 seats the kills readout on the rule without reaching the
 *     orange brush accents at x≥946.
 *
 *  The art bakes "PUBG MOBILE", "TOP 5 /// FINISHES" and the P1/..P5/ prefixes,
 *  so the synthetic header, ranks and team slots are all suppressed. Type follows
 *  `refrence-image.jpeg`: Exo 2 uppercase, medium (500) first name + heavy (800)
 *  surname, KILLS readout in 800 + 500 on the same centreline. Standings and
 *  announcement fall back to a dark track-asphalt / blaze-orange gradient. */
const APEX_BLAZE: TemplateConfig = {
  ...GEOMETRY,
  id: "apex-blaze",
  name: "Apex Blaze",
  backgrounds: {
    standings: APEX_BLAZE_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/apex-blaze/mvp.jpeg",
      fit: { width: 914.823529, height: 1620, left: 82.588235, top: 0 },
    },
    announcement: APEX_BLAZE_FALLBACK_BG,
  },
  canvasBackground: "#121010",
  uniformMvpRows: true,
  mvpLayoutStyle: "supercross-row-list",
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
    rowY0: 885.833,
    rowPitch: 68.642,
    rowHeight: 69,
    rankX: 0, // never rendered — P1/..P5/ are baked into the art
    playerX: 404,
    playerW: 266,
    teamX: 404, // never rendered (mvpShowTeam: false)
    teamW: 0,
    killsX: 694,
    killsW: 124,
    rankFont: `700 24px ${FONTS_FULL}`,
    playerFont: `800 34px ${FONTS_FULL}`,
    statFont: `800 30px ${FONTS_FULL}`,
    subtitleBakedIn: true,
    supercross: {
      rowHeight: 69,
      rowCenterYs: [920.333, 987.188, 1055.978, 1124.768, 1194.899],
      rowPitch: 68.642,
      textLeft: 404,
      textRight: 818,
      textWidth: 414,
      nameGap: 8,
      name: {
        maxFontSize: 34,
        minFontSize: 16,
        fontFamily: FONTS_FULL,
        fontWeight: 800,
        softWeight: 500,
        color: "#0E0E0E",
        tracking: "0.04em",
      },
      kills: {
        fontFamily: FONTS_FULL,
        numberFontSize: 30,
        unitFontSize: 20,
        numberFontWeight: 800,
        unitFontWeight: 500,
        color: "#0E0E0E",
        tracking: "0.05em",
        reserveWidth: 124,
        singular: "KILL",
        plural: "KILLS",
      },
    },
  },
  palette: {
    accent: "#EA4400", // the baked slash / /// brush ink
    text: "#FFFFFF", // crisp white ink on the dark fallback gradients
    textMuted: "rgba(255,255,255,0.82)",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(234,68,0,0.16)",
    wwcdText: "#FFFFFF",
    // The brand-law watermark slot ends at x1040 while the height-fitted art
    // ends at x997.4 — its trailing glyphs sit on the #121010 side bar, the
    // leading ones on the art's white card. Track-grey ink clears 4:1 on BOTH
    // surfaces (4.17 on #FFF, 4.54 on #121010); pure black would vanish on the
    // bar, pure white would vanish on the card.
    watermarkColor: "#7C7C7C",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(234,68,0,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#141212",
  },
};


const URBAN_SLATE_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(165deg, #141619 0%, #2B2D30 55%, #141619 100%)",
  decor: [],
};

// Urban Slate follows the Providence "STARTING Five" reference poster: a tall
// flat-sided condensed block face (Rajdhani first) for the player IGN and a
// wide-tracked geometric face (Exo 2 first) for the KILLS subline. Both keep
// the full glyph-safe fallback chain demanded by the shared font stack.
const SLATE_NAME_FONTS = '"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif';
const SLATE_KILLS_FONTS = '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif';

/** Urban Slate — the dark street-map "STARTING Five" PUBGM poster framed over
 *  a hardwood border. The 3712×6656 PNG is a 9:16-style portrait (not 2:3): a
 *  uniform height fit (scale 1620/6656 = 0.2433894) draws the art 903.46px wide
 *  at x88.27, with the ~88px side bars filled by the art's #141414 edge ink.
 *  Nothing is cropped: the baked STARTING Five headline and the PUBG MOBILE |
 *  KRAFTON footer stay intact. Five rounded off-white bars were measured off
 *  those pixels (native tops 2715/3275/3835/4401/4967, bottoms
 *  3206/3768/4334/4900/5465); their canvas midlines are 808.70 / 945.24 /
 *  1082.27 / 1220.03 / 1357.67. Each bar carries a monochrome PUBGM character
 *  on the left (the Bar-5 ghillie sniper scope reaches native x1701) and an
 *  open white zone on the right (canvas x515.90–818.92). Only the two-line
 *  IGN + KILLS stack is painted, centred on each measured bar midline; no team
 *  names, logos or synthetic headers (mvpShowTeam: false, header baked).
 *  Re-measured 2026-11-23: mapping native tops directly with the real 1620/6656
 *  scale gives canvas bars 661–780, 797–917, 934–1054, 1071–1192, 1209–1330 —
 *  the older bar array sat ~88px too low and left text on the bar edges.
 *  Standings/announcement have no art → dark urban charcoal/slate gradient. */
const URBAN_SLATE: TemplateConfig = {
  ...GEOMETRY,
  id: "urban-slate",
  name: "Urban Slate (MVP)",
  backgrounds: {
    standings: URBAN_SLATE_FALLBACK_BG,
    mvp: {
      type: "image",
      src: "/templates/urban-slate/mvp.png",
      fit: { width: 903.461538, height: 1620, left: 88.269231, top: 0 },
    },
    announcement: URBAN_SLATE_FALLBACK_BG,
  },
  canvasBackground: "#141414",
  uniformMvpRows: true,
  mvpLayoutStyle: "starting-five-slate-pills",
  mvpShowTeam: false,
  // The art bakes the STARTING Five headline, the hardwood frame and the
  // PUBG MOBILE | KRAFTON lockup: no code-drawn header text may cover them.
  subtitleBakedIn: { mvp: true },
  variantLabelsBakedIn: { mvp: true },
  variantHideScrimName: { mvp: true },
  variantHeaders: {
    mvp: {
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: -9999, y: -9999, w: 0 },
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  header: {
    ...GEOMETRY.header,
    titleFont: `800 44px ${SLATE_NAME_FONTS}`,
    subtitleFont: `800 38px ${SLATE_NAME_FONTS}`,
    organizerFont: `600 22px ${SLATE_NAME_FONTS}`,
  },
  mvp: {
    // Nominal geometry (the slate-pill renderer seats rows from the exact
    // measured boxes in `slatePills.bars` instead).
    rowY0: 661.0457,
    rowPitch: 137.0282,
    rowHeight: 120,
    rankX: 0,
    playerX: 515.9044, // open white zone's left edge (never rendered as a plate)
    playerW: 303.0198,
    teamX: 515.9044, // never rendered (mvpShowTeam: false)
    teamW: 0,
    killsX: 515.9044,
    killsW: 303.0198,
    rankFont: `800 44px ${SLATE_NAME_FONTS}`,
    playerFont: `800 40px ${SLATE_NAME_FONTS}`,
    statFont: `800 15px ${SLATE_KILLS_FONTS}`,
    subtitleBakedIn: true,
    slatePills: {
      bars: [
        { top: 661.0457, height: 119.2608, centerY: 720.6761 },
        { top: 797.1004, height: 119.9910, centerY: 857.0959 },
        { top: 933.6418, height: 121.2079, centerY: 994.24575 },
        { top: 1071.1569, height: 121.4513, centerY: 1131.88255 },
        { top: 1209.1587, height: 120.9645, centerY: 1269.64095 },
      ],
      textLeft: 515.9044,
      textWidth: 303.0198,
      name: {
        fontFamily: SLATE_NAME_FONTS,
        maxFontSize: 40,
        minFontSize: 26,
        lightWeight: 500,
        boldWeight: 800,
        color: "#181818",
      },
      kills: {
        fontFamily: SLATE_KILLS_FONTS,
        fontSize: 15,
        fontWeight: 800,
        color: "#181818",
        letterSpacing: "0.10em",
      },
    },
  },
  palette: {
    accent: "#2B2D30", // slate chrome on the fallback variants
    text: "#F2F2F0", // crisp chalk-white ink (WCAG AA on every gradient stop)
    textMuted: "#C9CDD2",
    rowAlt: "#F2F2F0",
    rowAltOpacity: 0.06,
    wwcdBg: "rgba(242,242,240,0.10)",
    wwcdText: "#F2F2F0",
    watermarkColor: "rgba(242,242,240,0.88)",
    plateBg: "rgba(242,242,240,0.10)",
    plateRing: "rgba(242,242,240,0.35)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#D19A5B",
    medalText: "#141619",
  },
};


const VARSITY_PURPLE_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  // Deep varsity purple → royal violet → near-black. White/ivory ink clears
  // 14:1 on every stop (measured by tests/graphics-contrast.test.ts).
  css: "linear-gradient(165deg, #1A0633 0%, #3B1266 55%, #120424 100%)",
  decor: [
    { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#C4B5FD", opacity: 0.55 },
    { kind: "bar", x: 0, y: 1508, w: 1080, h: 2, color: "#C4B5FD", opacity: 0.3 },
  ],
};

// Exo 2 leads the geometric/athletic display + name faces; Rajdhani leads the
// tall condensed stat numerals. Both keep the full glyph-safe fallback chain
// (Noto Sans Symbols 2 + system-ui) so Arabic/CJK/katakana/clan glyphs never
// tofu (Graphics Engine law §11).
const VARSITY_CONDENSED_FONTS =
  '"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif';

/**
 * Varsity Purple — the "TEAM ANNOUNCEMENT" painted-bar poster.
 *
 * Art: `announcement.png`, a 4096×6144 JPEG payload inside a .png name (canvas
 * ×1080/4096 = 0.263671875, no crop). Sharp pixel scans of the delivered art:
 * - top white ribbon x244..836, y0..~158; the baked metallic "TEAM
 *   ANNOUNCEMENT" headline occupies y≈188..409 (never re-rendered).
 * - 13 painted translucent dark-purple bars, span x233..847, two baked
 *   dividers at x401/x688 → 3 cells (left slot x233..401, centre team name
 *   x401..688, right overflow x688..847).
 * - bar 1 top canvas y732.2, mean interior height 41.7, mean pitch ~52.4;
 *   the last two bars are wider, so `barCenterYs` pins all 13 EXACT midlines
 *   (753.18 … 1386.39) — a single pitch cannot land every row within ±1px.
 *   `announcementBarRows` seats every row box on those midlines, so the text
 *   midpoint is always dead-on a painted bar for 4–25 teams: teams 1–13 use
 *   left slot + centre name, teams 14–25 reuse the same bars in the right cell.
 * - Typography follows refrence-image.jpeg: Exo 2 900 tracked ribbon display,
 *   Exo 2 700 0.32em wide-tracked kicker, Rajdhani 800 condensed outer/slot
 *   ink, Exo 2 700 0.17em wide-tracked team names. Standing-only fallback uses
 *   the same fonts with white ink + a deep-purple drop-shadow headline.
 */
const VARSITY_PURPLE_BAR_CENTERS = [
  753.18, 804.99, 857.46, 909.67, 962.14, 1014.08, 1066.29, 1118.5, 1170.7,
  1223.97, 1276.57, 1331.81, 1386.39,
] as const;

const VARSITY_PURPLE_BAR_LAYOUT: AnnouncementBarLayout = {
  barCenterYs: VARSITY_PURPLE_BAR_CENTERS,
  rowY0: 732,
  rowPitch: 52.4,
  rowHeight: 41.7,
  rowsBottom: 1408,
  cells: [
    { x: 233, w: 168 }, // left slot cell
    { x: 401, w: 287 }, // centre team-name cell
    { x: 688, w: 212 }, // right overflow cell — art bar ends x~903; 900 leaves 3px inset
  ],
};

const VARSITY_PURPLE: TemplateConfig = {
  ...GEOMETRY,
  id: "varsity-purple",
  name: "Varsity Purple (Participation)",
  backgrounds: {
    standings: VARSITY_PURPLE_FALLBACK_BG,
    mvp: VARSITY_PURPLE_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/varsity-purple/announcement.png" },
  },
  uniformMvpRows: true,
  header: {
    // Announcement: the session name sits in the art's empty top white ribbon
    // (the "2021-22" slot of the reference); the subtitle is the wide-tracked
    // conference kicker just below it and above the baked metallic headline.
    title: { x: 244, y: 44, w: 592, align: "center" },
    subtitle: { x: 244, y: 158, w: 592, align: "center" },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `900 44px ${FONTS_FULL}`,
    subtitleFont: `700 16px ${FONTS_FULL}`,
    organizerFont: `500 1px ${FONTS_FULL}`,
    titleLetterSpacing: "0.08em",
    subtitleLetterSpacing: "0.32em",
  },
  variantHeaders: {
    announcement: {
      // The baked art owns the "TEAM ANNOUNCEMENT" headline + footer lockup;
      // no dynamic organizer text may be painted anywhere on it.
      organizer: { x: -9999, y: -9999, w: 0 },
    },
    standings: {
      // Top Overall Ranking on the artless gradient: metallic white display
      // headline + 0.32em kicker; every data box keeps line-height AFTER font.
      title: { x: 140, y: 84, w: 800, align: "center" },
      subtitle: { x: 140, y: 196, w: 800, align: "center" },
      organizer: { x: 140, y: 260, w: 800, align: "center" },
      titleFont: `900 64px ${FONTS_FULL}`,
      subtitleFont: `700 24px ${FONTS_FULL}`,
      organizerFont: `600 18px ${FONTS_FULL}`,
      subtitleColor: "#FFFFFF",
      titleLetterSpacing: "0.08em",
      subtitleLetterSpacing: "0.32em",
      titleTextShadow: "0 4px 0 #2D0C4E, 0 10px 22px rgba(18,4,36,0.85)",
    },
  },
  standings: {
    columns: [
      {
        rankX: 62,
        teamX: 116,
        teamW: 170,
        statColumns: [
          { key: "wwcd", x: 300 },
          { key: "pp", x: 365 },
          { key: "kp", x: 430 },
          { key: "total", x: 495 },
        ],
        stripX: 58,
        stripW: 500,
      },
      {
        rankX: 572,
        teamX: 626,
        teamW: 170,
        statColumns: [
          { key: "wwcd", x: 800 },
          { key: "pp", x: 865 },
          { key: "kp", x: 930 },
          { key: "total", x: 995 },
        ],
        stripX: 568,
        stripW: 500,
      },
    ],
    headerLabelsY: 372,
    rowY0: 415,
    rowPitch: 66,
    rowHeight: 56,
    maxRowsLeft: 13,
    nameFont: `700 17px ${FONTS_FULL}`,
    statFont: `800 24px ${VARSITY_CONDENSED_FONTS}`,
    labelFont: `700 18px ${FONTS_FULL}`,
    nameLetterSpacing: "0.16em",
    nameUppercase: true,
  },
  announcement: {
    rowsTop: 732,
    rowsBottom: 1408,
    slotX: 233,
    slotW: 168,
    logoX: 401,
    teamX: 401,
    teamW: 287,
    logoSize: 22,
    rowHeight: 41.7,
    slotFont: `800 22px ${VARSITY_CONDENSED_FONTS}`,
    nameFont: `700 17px ${FONTS_FULL}`,
    // The stacked overflow cell is narrower than the primary name cell: smaller
    // ink + lighter tracking keeps long names readable beside their slot number.
    overflowNameFont: `700 15px ${FONTS_FULL}`,
    overflowTracking: "0.06em",
    subtitleBakedIn: false,
    singleColumn: true,
    fixedRowPitch: true,
    rowY0: 732,
    rowPitch: 52.4,
    rowsPerColumn: 13,
    leftX: 233,
    rightX: 900,
    colWidth: 667,
    barCenterYs: VARSITY_PURPLE_BAR_CENTERS,
    barCells: VARSITY_PURPLE_BAR_LAYOUT.cells,
    inkColor: "#FFFFFF",
    accentColor: "#FFFFFF",
    mutedColor: "#E9D5FF",
    cardBg: "transparent",
    tracking: "0.17em",
    uppercaseNames: true,
  },
  announcementBarLayout: VARSITY_PURPLE_BAR_LAYOUT,
  palette: {
    accent: "#C4B5FD",
    text: "#FFFFFF",
    textMuted: "#E9D5FF",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.06,
    wwcdBg: "rgba(196,181,253,0.16)",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.88)",
    plateBg: "rgba(196,181,253,0.12)",
    plateRing: "rgba(196,181,253,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#2D0C4E",
  },
};

// Varsity Orange leads with the prompt's Rajdhani → Exo 2 athletic pair and
// keeps the Noto Symbols / system-ui tail demanded by the glyph law (§11) for
// Arabic / CJK / katakana team names.
const FONTS_VARSITY_ORANGE =
  '"Rajdhani", "Exo 2", "Noto Sans Symbols 2", system-ui, sans-serif';

const VARSITY_ORANGE_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  // Dark orange → carbon. Both text inks on the artless standings/MVP variants
  // are crisp white (≥7:1 on every stop); the charcoal #111111 / varsity
  // #E85319 inks are the LIGHT announcement art's measured reference colors.
  css: "linear-gradient(165deg, #1A0E08 0%, #2E1105 55%, #141210 100%)",
  decor: [],
};

/**
 * Varsity Orange — the "team Announcement" varsity-athletic participation art.
 *
 * Art: `announcement.png` is a TRUE 2048×3072 PNG (exactly the 2:3 canvas), so
 * `object-fit: cover` maps it onto 1080×1620 at a uniform ×0.52734375 with no
 * crop. Every coordinate below was measured off the art at canvas scale:
 *
 * - Two vertical DASHED ORANGE PIPES at canvas x461–466 (center 463.5 → 464)
 *   and x832–836 (center 834). Each pipe paints exactly 12 dash segments in
 *   the list band: tops 480, 545/546, 611, 676/677, 742, 808, 874, 939/940,
 *   1005, 1071, 1137, 1204 and bottoms 522, 587, 652, 718, 783, 849, 915,
 *   981, 1047, 1113, 1179, 1246 — a nominal 42px dash on a 65.8182px pitch.
 *   `rowY0` 480 + `rowPitch` 65.8182 + `rowHeight` 42 therefore seats every
 *   row's text midpoint DEAD-CENTER on its dash with ZERO cumulative drift
 *   (row 12 top = 480 + 11×65.8182 = 1204, center = 1225 = dash 12's center).
 * - The art bakes the "team Announcement" headline, the ghost "2026" and the
 *   PUBG MOBILE | KRAFTON footer, so every dynamic header slot is parked
 *   off-canvas and the scrim name is suppressed for the announcement variant.
 * - Pipe-split ink (slotPosition "right"): the team name is RIGHT-aligned in
 *   [pipe − 12 − 152, pipe − 12] and the slot number LEFT-aligned in
 *   [pipe + 12, pipe + 132]. Content clears the left ball art (x ≤ 348) and
 *   long names ellipsize before the pipe. Reference ink: charcoal #111111
 *   names, varsity orange #E85319 slots, Rajdhani/Exo 2 800.
 * - Standings + MVP have no art → dark orange/carbon gradient fallback.
 */
const VARSITY_ORANGE: TemplateConfig = {
  ...GEOMETRY,
  id: "varsity-orange",
  name: "Varsity Orange",
  backgrounds: {
    standings: VARSITY_ORANGE_FALLBACK_BG,
    mvp: VARSITY_ORANGE_FALLBACK_BG,
    announcement: { type: "image", src: "/templates/varsity-orange/announcement.png" },
  },
  uniformMvpRows: true,
  header: {
    title: { x: -9999, y: -9999, w: 0 },
    subtitle: { x: -9999, y: -9999, w: 0 },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `800 1px ${FONTS_VARSITY_ORANGE}`,
    subtitleFont: `800 1px ${FONTS_VARSITY_ORANGE}`,
    organizerFont: `800 1px ${FONTS_VARSITY_ORANGE}`,
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
    rowsTop: 480, // dash 1 top — clears the baked "team Announcement" band
    // Dash 12 bottom is 1246. The extra pitch (→1311.818) is RESERVED so a
    // 25th team still keeps the fixed pitch: splitRowsAt(25,12) puts 13 in the
    // right column, and without room here `announcementRowLayout` would shrink
    // that column's pitch and drag all 13 rows off their painted dashes. The
    // overflow row lands at y1269.8 (center 1290.8) — still on the cream card,
    // clear of the PUBG MOBILE | KRAFTON footer (y1465+).
    rowsBottom: 1311.8181818181819,
    slotX: 476, // pipe 1 (464) + pipeGap 12
    slotW: 120, // "01".."24" at 800 22px tabular-nums
    logoX: 300, // no logo plate renders in pipe-split mode
    teamX: 300,
    teamW: 152, // right edge 452 = pipe 1 − pipeGap 12
    logoSize: 0,
    rowHeight: 42, // the painted dash height — the flex box IS the dash
    slotFont: `800 22px ${FONTS_VARSITY_ORANGE}`,
    nameFont: `800 22px ${FONTS_VARSITY_ORANGE}`,
    subtitleBakedIn: true, // the art bakes "team Announcement"
    // --- Two 12-row columns, fixed pitch locked to the baked dashes ---
    fixedRowPitch: true,
    rowY0: 480,
    rowPitch: 65.81818181818181, // (dash 12 center 1225 − dash 1 center 501) / 11
    rowsPerColumn: 12,
    leftX: 464, // pipe 1 center (measured x461–466)
    rightX: 834, // pipe 2 center (measured x832–836)
    colWidth: 420,
    slotPosition: "right",
    pipeGap: 12,
    rankFont: `800 22px ${FONTS_VARSITY_ORANGE}`,
    inkColor: "#111111", // charcoal team names on the cream card
    accentColor: "#E85319", // varsity-orange slot numerals
    cardBg: "transparent", // the baked cream card shows through
    tracking: "0.02em",
  },
  palette: {
    accent: "#E85319", // varsity orange — the baked slot ink
    text: "#FFFFFF", // crisp white on the dark standings/MVP fallback gradients
    textMuted: "#F5D0BC",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(232,83,25,0.16)",
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(232,83,25,0.10)",
    plateRing: "rgba(232,83,25,0.50)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#1A120E",
  },
};

const PMSL_COBALT_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Deep cobalt → navy → ink-blue. White + pale-lilac ink clear every stop;
  // this is used only by the artless MVP/announcement variants (parking lot).
  css: "linear-gradient(165deg, #0D1230 0%, #141B4A 55%, #1A2460 100%)",
  decor: [],
};

/**
 * PMSL Cobalt — the 2024 PMSL SEA Spring broadcast standings board.
 *
 * Art: `overall.png` is a TRUE 1686×2528 PNG (ratio 0.66693, within a pixel of
 * 2:3). The uniform width fit S = 1080/1686 = 0.6405694 gives a 1080×1619.359
 * box centred at top +0.3203 — no stretch, no crop of any painted slot. Every
 * canvas number below was measured off those pixels with
 * canvasX = artX × S, canvasY = artY × S + 0.3203.
 *
 * - The art bakes the "OVERALL RANKINGS" headline, the two empty header pills,
 *   the label band, all rank squares and all row bars → labelsBakedIn +
 *   ranksBakedIn + dual `headerPills` (blue = session name, yellow = stage).
 * - Header pills measured by fill colour: blue x54–568 y304–363 (centre 311,
 *   333.5), yellow x571–1027 y305–363 (centre 799, 334). White 900 ink in the
 *   blue pill reads 4.7:1; deep navy #1E2B7B 900 ink in the yellow pill 9.9:1.
 * - Header ink centres / painted cell dividers (canvas): RANK 53–108, TEAM
 *   108–278, PLACE PTS 278–330 (ink 304.5), ELIMS 330–379 (ink 355),
 *   TOTAL PTS 379–433 (ink 408), MATCHES 433–498 (ink 468), WWCD 498–~535
 *   (chicken icon ink 520). Right table repeats at +492..+494, NOT a uniform
 *   shift (rank divider 601, team 770, place 823, elims 872, total 925,
 *   matches 990, wwcd 1030). Stat order is pp → kp → total → matches → wwcd.
 * - 12 painted row bars/column: baked rank-square tops 447, 507, 566, …,
 *   1105 and bottoms ~497, …, 1156 → rowY0 447, fixed pitch 59.82, box
 *   height 51 (text centre 472.5 = row-1 badge centre, row 12 centre 1130.5).
 *   24 teams → [12,12]; the 25th overflows below the painted table.
 * - Row interior mean luminance 0.024 → pure-white Exo 2 700 names / 800 stats
 *   read ≥14:1. Art bakes the rank-1 blue badge, so uniformRowInk/uniformStatInk
 *   keep every numeral white with no synthetic rank-1 accent.
 * - MVP + announcement have no art → deep cobalt/navy gradient fallback.
 */
const PMSL_COBALT: TemplateConfig = {
  ...GEOMETRY,
  id: "pmsl-cobalt",
  name: "PMSL Cobalt",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmsl-cobalt/overall.png",
      // Uniform width fit; centred 0.32px letterbox. No distortion.
      fit: { width: 1080, height: 1619.3594306049824, left: 0, top: 0.3202846975088968 },
    },
    mvp: PMSL_COBALT_FALLBACK_BG,
    announcement: PMSL_COBALT_FALLBACK_BG,
  },
  labelsBakedIn: true,
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep the normal header.
    // Standings seats title/subtitle in the two baked pills via headerPills.
    title: { x: 54, y: 304, w: 515, align: "center" },
    subtitle: { x: 571, y: 305, w: 457, align: "center" },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `900 30px ${FONTS}`,
    subtitleFont: `900 30px ${FONTS}`,
    organizerFont: `500 1px ${FONTS}`,
  },
  standings: {
    columns: [
      {
        rankX: 53, // baked blue/white rank square x53–100; no code numeral
        teamX: 106, // first clear pixel right of the rank square
        teamW: 170, // ends at 276, 2px before the PLACE PTS divider (278)
        statColumns: [
          { key: "pp", x: 286 }, // PLACE PTS cell 278–330, centre 304
          { key: "kp", x: 336.5 }, // ELIMS cell 330–379, centre 354.5
          { key: "total", x: 388 }, // TOTAL PTS cell 379–433, centre 406
          { key: "matches", x: 447.5 }, // MATCHES cell 433–498, centre 465.5
          { key: "wwcd", x: 498.5 }, // chicken cell 498–535, centre 516.5
        ],
        stripX: 106,
        stripW: 429, // right edge 535, inside the painted bar
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 547, // baked rank square x547–594
        teamX: 600,
        teamW: 170, // ends at 770, before the right PLACE PTS divider
        statColumns: [
          { key: "pp", x: 778.5 }, // cell 770–823, centre 796.5
          { key: "kp", x: 829.5 }, // cell 823–872, centre 847.5
          { key: "total", x: 880.5 }, // cell 872–925, centre 898.5
          { key: "matches", x: 939.5 }, // cell 925–990, centre 957.5
          { key: "wwcd", x: 992 }, // cell 990–1030, centre 1010
        ],
        stripX: 600,
        stripW: 430, // right edge 1030
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 393, // baked label band top — code draws no labels
    rowY0: 447,
    rowPitch: 59.82, // baked rank-square ink centres / 11
    rowHeight: 51,
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 36, // fits the narrow 37px WWCD compartment without crossing dividers
    logoPlate: 34,
    logoNameGap: 40,
    uniformRowInk: true, // the baked blue #1 badge carries rank-1 emphasis
    uniformStatInk: true, // every stat numeral stays broadcast white
    nameFont: `700 21px ${FONTS}`,
    statFont: `800 24px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
    headerPills: {
      left: {
        box: { x: 54, y: 304, w: 515, align: "center" },
        height: 60,
        font: `900 30px ${FONTS}`,
        color: "#FFFFFF", // white on the measured blue fill (4.7:1)
        text: "title",
      },
      right: {
        box: { x: 571, y: 305, w: 457, align: "center" },
        height: 59,
        font: `900 30px ${FONTS}`,
        color: "#1E2B7B", // deep navy on the measured yellow fill (9.9:1)
        text: "subtitle",
      },
    },
  },
  palette: {
    accent: "#5E5EFE", // the measured blue pill / rank-badge fill
    text: "#FFFFFF", // pure white row ink on the dark cobalt bars (≥14:1)
    textMuted: "#DCD9FF", // pale lilac for supporting slots
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no code strips over them
    wwcdBg: "rgba(0,0,0,0)", // no synthetic rank-1 strip; badge is baked
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.85)", // clears the cobalt footer
    plateBg: "rgba(255,255,255,0.10)",
    plateRing: "rgba(94,94,254,0.5)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0D1230",
  },
};

const PMGC_SAPPHIRE_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Dark sapphire → royal blue. Pure white + electric-cyan ink clear every
  // stop (≥ 4.5:1), so the artless MVP/announcement variants stay legible.
  css: "linear-gradient(165deg, #0A1329 0%, #162E62 100%)",
  decor: [],
};

/** PMGC Sapphire — the 2024 PMGC Group Stage broadcast leaderboard. The art is
 *  a TRUE 1536×2730 PNG (taller than 2:3), uniformly width-fitted to 1080
 *  (×0.703125 → 1080×1919.53125) and centre-cropped (top −149.765625): the
 *  exact `object-fit: cover` mapping of art pixels onto the 1080×1620 canvas.
 *  Every number below was measured off those pixels after that fit:
 *  - Baked "OVERALL RANKINGS" ink ends canvas x814 and spans y79..168. The
 *    empty slot immediately to its right (x824, y88, w180) carries the dynamic
 *    "M N" badge in white Exo 2 900 — the reference art's "GROUP / DAY" block.
 *    variantHideScrimName.standings hides the session name (title is baked).
 *  - Baked header band y≈205..245 prints RANK | TEAM | WWCD | PLACE PTS |
 *    ELIMS | TOTAL twice (labelsBakedIn). Measured ink centres: left 305.4 /
 *    369 / 432.2 / 496.5, right 820 / 882 / 945 / 1009 (≈+512, uniform).
 *    52px value boxes sit at 279 / 343 / 406 / 470 and 794 / 856 / 919 /
 *    983 — centred on the baked labels, non-overlapping both sides.
 *  - 14 painted bars per column; a fixed ≈78px pitch with a 66px box centred
 *    at rowY0 253 lands ranks 1..8 dead-centre on the top eight bars (max
 *    measured drift < 2px). The art bakes NO rank numerals, so the renderer
 *    draws "#1".."#16" (rankPrefix). rowsPerColumn 8 splits 16 → [8,8].
 *  - Ranks 1–3 (left column) sit on peach/gold bars → dark-navy #141A29 ink;
 *    ranks 4–16 sit on navy bars → pure #FFFFFF ink. Rank numerals follow the
 *    same rule, with electric-cyan #60CDFF from rank 4 down.
 *  - MVP + announcement have no art → dark sapphire gradient fallback. The
 *    brand-law watermark stays hardcoded. */
const PMGC_SAPPHIRE: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgc-sapphire",
  name: "PMGC Sapphire",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmgc-sapphire/overall.png",
      fit: { width: 1080, height: 1919.53125, left: 0, top: -149.765625 },
    },
    mvp: PMGC_SAPPHIRE_FALLBACK_BG,
    announcement: PMGC_SAPPHIRE_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  subtitlePrefix: "M ", // right-aligned badge reads "M 3" / "M" with no count
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep the normal header.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${FONTS}`,
    subtitleFont: `700 40px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // The baked title's right edge is x814; the badge starts 10px clear of
      // it and sits on the title's own baseline band (ink y79..168).
      subtitle: { x: 824, y: 88, w: 180, align: "left" },
      subtitleFont: `900 56px ${FONTS}`,
      subtitleColor: "#FFFFFF",
      // No optional organizer text may touch the baked title or header band.
      organizer: { x: -9999, y: -9999, w: 0 },
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKINGS"
  },
  standings: {
    columns: [
      {
        rankX: 40, // centre 64 — under the baked "RANK" label (centre ~61)
        teamX: 116, // first clear pixel right of the rank compartment
        teamW: 150, // ends at 266, before the WWCD box at 279
        statColumns: [
          { key: "wwcd", x: 279 }, // WWCD ink centre 305.4
          { key: "pp", x: 343 }, // PLACE PTS ink centre 369
          { key: "kp", x: 406 }, // ELIMS ink centre 432.2
          { key: "total", x: 470 }, // TOTAL ink centre 496.5
        ],
        stripX: 38,
        stripW: 486,
        rowsPerColumn: 8,
        fixedRowPitch: true,
      },
      {
        rankX: 548, // centre 572 — under the right baked "RANK" label
        teamX: 628,
        teamW: 150, // ends at 778, before the WWCD box at 794
        statColumns: [
          { key: "wwcd", x: 794 }, // ink centre 820
          { key: "pp", x: 856 }, // ink centre 882
          { key: "kp", x: 919 }, // ink centre 945
          { key: "total", x: 983 }, // ink centre 1009
        ],
        stripX: 546,
        stripW: 486,
        rowsPerColumn: 8,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 205,
    rowY0: 253, // bar 1 top canvas 250; 66px box centre 286 ≈ painted centre 284.5
    rowPitch: 78, // least-squares fit of the 14 painted bar centres (~78.1)
    rowHeight: 66,
    maxRowsLeft: 8,
    rowsPerColumn: 8,
    fixedRowPitch: true,
    ranksBakedIn: false, // table-wide default; art leaves the rank boxes empty
    statBoxW: 52,
    rankPrefix: "#", // unbaked rank badges: "#1".."#16"
    topRowsCount: 3, // left-column ranks 1–3 ride the peach/gold bars
    topRowsTextColor: "#141A29", // dark navy on peach (≈8.9:1 WCAG AA)
    topRowsRankInk: "#141A29",
    nameFont: `800 20px ${FONTS}`,
    statFont: `800 22px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#60CDFF", // electric-cyan rank numeral from #4 down
    text: "#FFFFFF", // pure white on the navy bars (≈14:1 WCAG AA)
    textMuted: "#60CDFF",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no code strips over them
    wwcdBg: "rgba(0,0,0,0)", // rank-1 ink is supplied by topRowsTextColor
    wwcdText: "#141A29",
    watermarkColor: "rgba(255,255,255,0.85)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(96,205,255,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0A1329",
  },
};

const EWC_TEAL_FONTS = '"Rajdhani", "Exo 2", sans-serif';

const EWC_TEAL_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Deep jungle-teal → broadcast green: the artless MVP/announcement variants
  // keep white row ink ≥ 10:1 on every stop.
  css: "linear-gradient(165deg, #062E20 0%, #0B4228 100%)",
  decor: [],
};

/**
 * EWC Teal — the 2024 Esports World Cup cyber-teal broadcast standings art.
 *
 * Art: `overall.png` is a TRUE 1027×1532 PNG (ratio 0.6704, 0.6% wider than
 * 2:3). A uniform HEIGHT fit to the canvas gives S = 1620/1532 =
 * 1.0574412532637076, drawn 1085.992×1620 at left −2.996 (a 3px object-fit:
 * cover crop on each side). Every coordinate below is measured on art pixels
 * through canvasX = artX·S − 2.996, canvasY = artY·S — no stretch, no drift.
 *
 * - A SINGLE full-width ladder. 24 dark-slate bars (#09203A mean interior)
 *   from art y263 to y1422; bar tops fit art 262.5 + i·48.48 → canvas rowY0
 *   279, fixed pitch 51.27, painted height 46.5. The 24 yellow rank tabs
 *   (numerals 1–24) are baked into the left of every bar → ranksBakedIn.
 * - Baked header band (art y238–259 → canvas 252–274) prints WWCD | MATCHES |
 *   PLACEMENT POINTS | ELIM. POINTS | TOTAL POINTS → labelsBakedIn. Measured
 *   label-ink centres (art x517/620/726/815/916) land on canvas 543/653/765/
 *   858/965; 88px value boxes at 499/609/721/814/921 centre on them without
 *   overlapping (the tightest pair is 93px apart).
 * - Baked "OVERALL RANKING" headline (ends art y98 → canvas 104) and the
 *   cyber-teal "MATCH#" lockup (ink art x503–897, y114–214 → canvas x529–946,
 *   y121–226). The digits slot starts at x954, 8px right of the "#" ink, and
 *   sits in the clear yellow field above the header band. Scrim name hidden.
 * - Team ink starts at art x145 → canvas 150 inside the navy bar and stops at
 *   x490, nine pixels before the WWCD box, so long names ellipsize cleanly.
 * - Pure-white Rajdhani-led 700 team / 800 stat ink reads >14:1 on the navy
 *   bars; #062E20 digits read >9:1 on the yellow MATCH# field. The art bakes
 *   its own rank-1 yellow tab, so uniformRowInk/uniformStatInk keep every
 *   row's data ink identical. MVP + announcement fall back to jungle-teal.
 */
const EWC_TEAL: TemplateConfig = {
  ...GEOMETRY,
  id: "ewc-teal",
  name: "EWC Teal",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/ewc-teal/overall.png",
      // Uniform ×1620/1532 height fit; centred object-fit: cover crop (3px
      // per side). No distortion, so every measured slot stays pixel-exact.
      fit: {
        width: 1085.9921671018278,
        height: 1620,
        left: -2.9960835509139088,
        top: 0,
      },
    },
    mvp: EWC_TEAL_FALLBACK_BG,
    announcement: EWC_TEAL_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep a normal header;
    // standings overrides park the title/organizer and move the digit slot.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `700 54px ${EWC_TEAL_FONTS}`,
    subtitleFont: `600 36px ${EWC_TEAL_FONTS}`,
    organizerFont: `500 24px ${EWC_TEAL_FONTS}`,
  },
  variantHeaders: {
    standings: {
      // The art bakes "OVERALL RANKING" + "MATCH#": hide the scrim name, park
      // the optional organizer, and paint ONLY the confirmed-match digits in
      // the open yellow field after the "#" (ink ends canvas x945.5).
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: 954, y: 118, w: 118, align: "left" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${EWC_TEAL_FONTS}`,
      subtitleFont: `900 100px ${EWC_TEAL_FONTS}`,
      subtitleColor: "#062E20",
      subtitleTextTransform: "uppercase",
      organizerFont: `500 1px ${EWC_TEAL_FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKING" + "MATCH#"
  },
  standings: {
    columns: [
      {
        rankX: 80, // baked yellow rank tab; no code-drawn numeral
        teamX: 150, // first clear pixel inside the dark-slate bar
        teamW: 340, // ends at 490, 9px before the WWCD value box
        statColumns: [
          { key: "wwcd", x: 499 }, // label ink centre 543
          { key: "matches", x: 609 }, // 653
          { key: "pp", x: 721 }, // 765
          { key: "kp", x: 814 }, // 858
          { key: "total", x: 921 }, // 965
        ],
        stripX: 146,
        stripW: 344,
        ranksBakedIn: true,
        rowsPerColumn: 24,
        fixedRowPitch: true,
      },
      {
        // The single-column renderer skips this spec entirely; it mirrors
        // column[0] so dev readouts stay honest if the flag is ever toggled.
        rankX: 80,
        teamX: 150,
        teamW: 340,
        statColumns: [
          { key: "wwcd", x: 499 },
          { key: "matches", x: 609 },
          { key: "pp", x: 721 },
          { key: "kp", x: 814 },
          { key: "total", x: 921 },
        ],
        stripX: 146,
        stripW: 344,
        ranksBakedIn: true,
        rowsPerColumn: 24,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 252, // baked label band top — code draws no labels
    rowY0: 279, // painted bar 1 top (art 263)
    rowPitch: 51.27, // least-squares fit of the 24 baked bar tops
    rowHeight: 46.5,
    maxRowsLeft: 24,
    rowsPerColumn: 24,
    singleColumn: true,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 88,
    uniformRowInk: true, // the baked gold tab already marks rank 1
    uniformStatInk: true,
    // Rajdhani-led condensed display face: 700 names / 800 data numerals.
    nameFont: `700 24px ${EWC_TEAL_FONTS}`,
    statFont: `800 28px ${EWC_TEAL_FONTS}`,
    labelFont: `700 18px ${EWC_TEAL_FONTS}`,
  },
  palette: {
    accent: "#0B7A6E", // deep teal accent for the gradient fallback
    text: "#FFFFFF", // crisp white team + stat ink on the dark-slate bars
    textMuted: "#BEE3DE",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)", // no rank-1 pill over the baked yellow tab
    wwcdText: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.88)",
    plateBg: "rgba(255,255,255,0.08)",
    plateRing: "rgba(255,255,255,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#062E20",
  },
};

const PMGC_LEAGUE_BLUE_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Royal blue → cobalt → navy. White watermark/text clears every stop;
  // used only by the artless MVP + announcement variants (parking lot).
  css: "linear-gradient(165deg, #0E3A9E 0%, #1565D8 55%, #0A1F6B 100%)",
  decor: [],
};

/**
 * PMGC League Blue — the 2021 PMGC League East broadcast standings board.
 *
 * Art: `overall.png` is a TRUE 1024×1536 PNG (exactly 2:3); the uniform width
 * fit is S = 1080/1024 = 1.0546875 with zero crop, so every canvas number
 * below is artX × S / artY × S. No distortion, no fit offsets.
 *
 * - The art bakes the "OVERALL RANKINGS" headline, the white "MATCH #" words,
 *   both yellow label bands, every rank square (1–24) and all 24 white row
 *   cards. The scrim name and the code label/rank rows are suppressed; the
 *   subtitle slot paints ONLY the confirmed-match digits (subtitleMode:
 *   "matchNumber") in the open blue field after the baked "#", seated on the
 *   measured text ink centre. Nothing is re-rendered over baked art.
 * - Baked label ink (canvas centres): left RANK 77.5 / TEAM 164 / ELIMS 253.8
 *   / RANK(pp) 322.3 / MATCHES 403.5 / TOTAL 486.3; right +516.8 (the shift is
 *   NOT uniform — each box is pinned to its own measured label). Stat order is
 *   ELIMS(kp) → RANK(pp) → MATCHES → TOTAL; the first RANK label is the baked
 *   placement numeral in the blue square, not a value column.
 * - 12 painted cards/column: interiors art y445–493, 502–552, …, 1101–1153.
 *   Painted centres row 1 = art 469 (canvas 494.65), row 12 = art 1127
 *   (canvas 1188.63). Least-squares fit of ALL 12 centres (intercept 492.64):
 *   rowY0 466.8 / pitch 63.19 / box height 51.68 — max residual 2px (the art's pitch is
 *   not perfectly uniform: first gap 58 art px, middle gaps 60–60.5); the
 *   endpoint-only fit drifted up to 4px in mid-table. rowHeight ≤ rowPitch.
 *   24 teams fill [12,12] exactly; 16 fill 12 + 4 (the remaining slots stay
 *   blank — an 8+8 split would print the wrong baked ranks 13–20 for teams
 *   9–16). Fixed pitch never stretches rows off the painted cards.
 * - Row interiors are near-white (luminance 0.987) → #0A1128 Exo 2 800 names
 *   and stats read ≈18:1. The digit slot sits on royal-blue ink (luminance
 *   0.145) → #FFFFFF reads ≈5.4:1. Art bakes the rank squares, so
 *   uniformRowInk/uniformStatInk keep every numeral in the same navy ink.
 * - MVP + announcement have no art → royal-blue gradient fallback.
 */
const PMGC_LEAGUE_BLUE: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgc-league-blue",
  name: "PMGC League Blue",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmgc-league-blue/overall.png",
      // Native 2:3 art: exact full-canvas fit, no letterbox, no distortion.
      fit: { width: 1080, height: 1620, left: 0, top: 0 },
    },
    mvp: PMGC_LEAGUE_BLUE_FALLBACK_BG,
    announcement: PMGC_LEAGUE_BLUE_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep a normal header.
    title: { x: 90, y: 96, w: 900, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `700 72px ${FONTS}`,
    subtitleFont: `600 40px ${FONTS}`,
    organizerFont: `500 26px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // The art bakes "OVERALL RANKINGS" and "MATCH #": hide the scrim name
      // and paint only the digits in the clear blue field after the "#".
      // Baked ink: art x438–586 → canvas x462–618.05, art y313–347 →
      // canvas y330.1–366.0 (ink centre 348.05). Slot x628 starts 10px past
      // the "#"; its 52px box is centred at x654 for both "MATCH 1" and
      // "MATCH 10" with no horizontal drift (~14px visible gap for two
      // digits). y326 + 44/2 = 348 (ink centre).
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: 628, y: 326, w: 52, align: "center" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${FONTS}`,
      subtitleFont: `800 44px ${FONTS}`,
      subtitleColor: "#FFFFFF",
      subtitleTextTransform: "uppercase",
      organizerFont: `500 1px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // baked "OVERALL RANKINGS" — never re-render the title
  },
  standings: {
    columns: [
      {
        rankX: 44, // baked blue rank square art x42–101; no code numeral
        teamX: 112, // first clear pixel of the white card (art x106)
        teamW: 116, // ends at 228, ~2px before the ELIMS value box
        statColumns: [
          { key: "kp", x: 229.76 }, // ELIMS cell centre canvas 253.76
          { key: "pp", x: 298.25 }, // RANK cell centre 322.25
          { key: "matches", x: 379.48 }, // MATCHES centre 403.48
          { key: "total", x: 462.25 }, // TOTAL centre 486.25
        ],
        stripX: 112,
        stripW: 415, // card right edge canvas 527.3 — no synthetic strip
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 550, // baked blue rank square art x522–582
        teamX: 620, // first clear pixel of the right card (art x587)
        teamW: 125, // ends at 745, ~1.5px before the ELIMS value box
        statColumns: [
          { key: "kp", x: 746.55 }, // ELIMS centre 770.55
          { key: "pp", x: 813.97 }, // RANK centre 837.97
          { key: "matches", x: 893.77 }, // MATCHES centre 917.77
          { key: "total", x: 974.45 }, // TOTAL centre 998.45
        ],
        stripX: 620,
        stripW: 415, // card right edge canvas 1034.7
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 405, // baked yellow label band top (art y384)
    rowY0: 466.8, // least-squares seat (box centre 492.64; row-1 card 494.65)
    rowPitch: 63.19, // least-squares fit of all 12 painted card centres
    rowHeight: 51.68, // art interior height 49; ≤ rowPitch
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 48, // four compartments per side; 69px minimum label-centre gap
    logoPlate: 28,
    logoNameGap: 32,
    uniformRowInk: true, // baked squares already mark every rank
    uniformStatInk: true,
    nameFont: `800 19px ${FONTS}`, // reference-length names still fit beside a logo
    statFont: `800 24px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#1565D8", // the measured royal-blue rank-square fill
    text: "#0A1128", // dark navy ink on the near-white cards (≈18:1)
    textMuted: "#FFFFFF", // pale ink clears every royal-blue fallback stop
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the cards — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)", // the baked rank squares carry all emphasis
    wwcdText: "#0A1128",
    watermarkColor: "#FFFFFF", // brand law: text/position stay fixed
    plateBg: "rgba(255,255,255,0.75)",
    plateRing: "rgba(21,101,216,0.55)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0A1F6B",
  },
};

const PMGO_BRAZIL_GREEN_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Light lime-cream → white: the art's row ink is deep near-black, so the
  // artless MVP/announcement fallbacks keep that same ink WCAG-legible. These
  // variants have no art and are excluded from the picker.
  css: "linear-gradient(165deg, #F7FBE8 0%, #E8F6C4 55%, #D6F836 100%)",
  decor: [],
};

/**
 * PMGO Brazil Green — the 2024 PMGO Brazil Main Event OVERALL leaderboard.
 *
 * Art: `overall.png` is a TRUE 1024×1536 PNG (exact 2:3 canvas ratio), so the
 * uniform ×1080/1024 = 1.0546875 fit lands every painted slot on the canvas
 * with zero crop and zero distortion:
 *   canvasX = artX × 1.0546875, canvasY = artY × 1.0546875.
 *
 * Measured off those pixels (SECOND PASS, re-verified against the current art):
 * - The art bakes the white "OVERALL RANKINGS" headline, the green→yellow
 *   header bands, all RANK/TEAM/WWCD/PLACE PTS./ELIMS/TOTAL labels, every
 *   "#1"–"#24" rank square and all 24 white row bars → labelsBakedIn +
 *   ranksBakedIn + no dynamic scrim name anywhere (title ink is pure #FFFFFF).
 * - 12 painted row bars per column: art tops 413, 477, 541, 606, 670, 734,
 *   799, 863, 927, 991, 1056, 1120 and bottoms 466, 530, 595, 659, 723, 788,
 *   852, 916, 980, 1045, 1109, 1173. Row-1 centre canvas 463.54, row-12 centre
 *   1209.20 → pitch 67.7876 with a 56px box whose centre lands on both ends
 *   (intermediate drift < 0.5px). 24 teams → [12,12]; the 25th overflows the
 *   painted table, never dropped.
 * - Header ink centres (art→canvas): WWCD 287→302.7, PLACE PTS. 351→370.2,
 *   ELIMS 415→437.7, TOTAL 477.5→503.6 (left) and 770→812.1, 834→879.6,
 *   898→947.1, 961→1013.6 (right). The stat boxes are 48px wide and centred
 *   on the measured INK centres (303.2/371.8/439.8/503.6 and 812.6/880.7/
 *   949.8/1013.0), never crossing the painted cell dividers.
 * - Rank squares: art x35–81 (left), x518–564 (right); team cells art x82–253
 *   and x566–736. Rank numerals are baked, so no code rank is drawn.
 * - Yellow-green "MATCH #" badge fill: art x376–648, y252–322 → canvas
 *   x396.56–683.44, y265.78–339.61 (centre y302.70). The baked "#" ink ends
 *   art x607 → canvas x640.20. The dynamic confirmed-match digits therefore
 *   render in the measured free slot x640.2–683.2 (centre x661.7), dead-centre on
 *   the badge's Y axis, in Exo 2 900 black ink. Re-rendering the words would
 *   duplicate the baked "MATCH #" lockup (see README Assumptions).
 * - Deep near-black #0B0F1A row ink on the near-white bars reads >7:1;
 *   black digits on the lime badge read >7:1; the hardcoded watermark uses
 *   the brand lime #D6F836 over the art's dark footer.
 */
const PMGO_BRAZIL_GREEN: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgo-brazil-green",
  name: "PMGO Brazil Green",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmgo-brazil-green/overall.png",
      // Uniform ×1080/1024 width fit: exact 2:3 art, so the image lands at
      // 1080×1620 with no crop. The black edge ink fills behind it.
      fit: { width: 1080, height: 1620, left: 0, top: 0 },
    },
    mvp: PMGO_BRAZIL_GREEN_FALLBACK_BG,
    announcement: PMGO_BRAZIL_GREEN_FALLBACK_BG,
  },
  canvasBackground: "#000000",
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  subtitleBakedIn: { standings: true },
  uniformMvpRows: true,
  hideScrimName: true, // the art bakes "OVERALL RANKINGS"; fallback titles parked
  header: {
    title: { x: -9999, y: -9999, w: 0 },
    // Painted only on standings: digits in the free slot right of the baked
    // "#", vertically centred on the yellow-green badge's measured midpoint.
    subtitle: { x: 640.2, y: 284.7, w: 43, align: "center" },
    organizer: { x: -9999, y: -9999, w: 0 },
    titleFont: `500 1px ${FONTS}`,
    subtitleFont: `900 36px ${FONTS}`,
    subtitleColor: "#000000",
    subtitleTextTransform: "uppercase",
    organizerFont: `500 1px ${FONTS}`,
  },
  standings: {
    columns: [
      {
        rankX: 37, // baked yellow/black rank square art x35–81
        teamX: 88, // first clear pixel inside the white bar
        teamW: 178, // ends at 266, before the WWCD divider at 270
        statColumns: [
          { key: "wwcd", x: 279.2 }, // baked ink centre 303.2
          { key: "pp", x: 347.8 }, // 371.8
          { key: "kp", x: 415.8 }, // 439.8
          { key: "total", x: 479.6 }, // 503.6
        ],
        stripX: 88,
        stripW: 178,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 546, // baked rank square art x518–564
        teamX: 598,
        teamW: 178, // ends at 776, before the right WWCD divider
        statColumns: [
          { key: "wwcd", x: 788.6 }, // baked ink centre 812.6
          { key: "pp", x: 856.7 }, // 880.7
          { key: "kp", x: 925.75 }, // 949.75
          { key: "total", x: 989 }, // 1013.0
        ],
        stripX: 598,
        stripW: 178,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 366, // baked green→yellow label band top
    rowY0: 435.54, // box centre 463.54 = painted row-1 centre
    rowPitch: 67.7876, // measured row-1 → row-12 centre distance / 11
    rowHeight: 56, // inside the 56.95–58.01px painted bars
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 48,
    logoPlate: 34,
    logoNameGap: 38,
    uniformRowInk: true, // the baked yellow #1 badge is the rank-1 emphasis
    uniformStatInk: true,
    nameFont: `800 22px ${FONTS}`,
    statFont: `800 24px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#D6F836", // the badge / brand lime
    text: "#0B0F1A", // deep near-black name + stat ink on the white bars
    textMuted: "#0B0F1A",
    rowAlt: "#0B0F1A",
    rowAltOpacity: 0, // the art paints the bars — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)",
    wwcdText: "#0B0F1A",
    watermarkColor: "#D6F836", // lime on the art's dark footer
    plateBg: "rgba(11,15,26,0.08)",
    plateRing: "rgba(11,15,26,0.35)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0B0F1A",
  },
};

const PMGO_TEAL_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Artless MVP + announcement variants only: deep broadcast teal → snow-teal.
  // The near-white title/label ink clears 4.5:1 on both stops.
  css: "linear-gradient(165deg, #062B3A 0%, #0A4256 100%)",
  decor: [],
};

/**
 * PMGO Teal — the 2025 PMGO Main Event "OVERALL STANDINGS" snow-scene board.
 *
 * Art: `overall.png` is a TRUE 1696×2528 PNG supplied by the user (the repo's
 * established art filename). Uniform WIDTH fit S = 1080/1696 = 0.63679245
 * gives a 1080×1609.811 box centred at top +5.094 — no stretch, no distortion.
 * Every number below was measured on art pixels through
 * canvasX = artX·S, canvasY = artY·S + 5.094. `refrence.jpeg` is the visual
 * reference only and is NEVER registered as a background.
 *
 * - The art bakes the "OVERALL STANDINGS" headline (art x252–1491, y267–406 →
 *   canvas x160–949, centre 555), the cyan "MATCH #" lockup (art x717–981,
 *   y437–499 → canvas x457–625, y283–323), both cyan header bars with their
 *   TEAM / chicken / PLACE PTS. / ELIMS / TOTAL labels, all 24 rank badges and
 *   all row bars → labelsBakedIn + ranksBakedIn + hidden scrim name. Only the
 *   confirmed-match DIGITS are painted after the baked "#" (subtitleMode:
 *   "matchNumber"); the words are never printed twice.
 * - Two painted tables, 12 bars each. Row-1 bar top art y646 → canvas 416.46;
 *   pitch (2003−646)/11 = 123.3636 art → 78.56 canvas; bar height 108 art →
 *   68.77 canvas (text centre 450.53 = row-1 painted centre; row 12 centre
 *   1315.1 vs baked 1314.5, <0.6px drift). 24 → [12,12] via rowsPerColumn 12.
 * - Stat ink centres (art → canvas): WWCD chicken 467→297.4, PLACE 570.5→
 *   363.3, ELIMS 678→431.8, TOTAL 766.5→488.1 (left); right +806 art → 811.0/
 *   876.2/945.3/1001.7, NOT a uniform shift. 52px value boxes centred there
 *   stay inside their header compartments and never cross a divider.
 * - Team ink starts just right of the baked white rank separator (left art
 *   x209–212 → canvas ≤135, right art x1015–1019 → canvas ≤649) and stops
 *   before the WWCD box (left 271, right 785).
 * - Deep navy #0B1220 data ink on the measured teal plates (mean #51A6B9)
 *   reads 6.7:1; the brightest ELIMS/TOTAL plates clear 7:1. The baked
 *   near-white title (#F0FDFF) reads 10.4:1 on the measured dark-teal field
 *   (#0B4259), and the cyan digits (#2DD4EE) read 6.1:1 — both above WCAG AA.
 * - MVP + announcement have no art → deep-teal gradient fallback.
 */
const PMGO_TEAL: TemplateConfig = {
  ...GEOMETRY,
  id: "pmgo-teal",
  name: "PMGO Teal",
  canvasBackground: "#043350", // sampled top edge behind the 5px letterbox
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmgo-teal/overall.png",
      // Uniform width fit; centred 5.09px letterbox. No distortion.
      fit: {
        width: 1080,
        height: 1609.811320754717,
        left: 0,
        top: 5.094339622641428,
      },
    },
    mvp: PMGO_TEAL_FALLBACK_BG,
    announcement: PMGO_TEAL_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  subtitleBakedIn: { standings: true }, // "MATCH #" is in the art; digits only
  uniformMvpRows: true,
  header: {
    // Fallback variants keep a normal Exo 2 800 uppercase header; standings
    // parks the title/organizer (the art bakes them) and moves the digit slot.
    title: { x: 90, y: 96, w: 900, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `800 62px ${FONTS}`,
    subtitleFont: `700 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
    titleTextTransform: "uppercase",
  },
  variantHeaders: {
    standings: {
      title: { x: -9999, y: -9999, w: 0 },
      // Baked "#" ink ends canvas x624.7; digits start 9.3px right of it and
      // sit on the measured cyan-ink band (y283–323), below the baked title.
      subtitle: { x: 634, y: 278, w: 68, align: "left" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${FONTS}`,
      subtitleFont: `800 56px ${FONTS}`,
      subtitleColor: "#2DD4EE",
      organizerFont: `500 1px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // "OVERALL STANDINGS" is baked into the art
  },
  standings: {
    columns: [
      {
        rankX: 49, // baked rank badge; no code-drawn numeral
        teamX: 136, // first clear pixel right of the baked white separator
        teamW: 134, // ends at 270, before the WWCD value box (271.4)
        statColumns: [
          { key: "wwcd", x: 271.4 }, // chicken ink centre 297.4
          { key: "pp", x: 337.3 }, // PLACE PTS ink centre 363.3
          { key: "kp", x: 405.8 }, // ELIMS ink centre 431.8
          { key: "total", x: 462.1 }, // TOTAL ink centre 488.1
        ],
        stripX: 42, // painted bar x66–824
        stripW: 483,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 577, // baked rank badge of the right table
        teamX: 651, // right separator ends art x1019 (canvas 648.9)
        teamW: 133, // ends at 784, before the WWCD box (785)
        statColumns: [
          { key: "wwcd", x: 785 }, // chicken ink centre 811.0
          { key: "pp", x: 850.2 }, // PLACE PTS ink centre 876.2
          { key: "kp", x: 919.3 }, // ELIMS ink centre 945.3
          { key: "total", x: 975.7 }, // TOTAL ink centre 1001.7
        ],
        stripX: 555, // painted bar x871–1629
        stripW: 482,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 366.2, // baked label band top — code draws no labels
    rowY0: 416.46, // painted bar 1 top (art 646)
    rowPitch: 78.56, // (art 2003 − 646) / 11 × S
    rowHeight: 68.77, // painted bar interior (art 108 × S)
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 52,
    logoPlate: 32,
    logoNameGap: 38,
    uniformRowInk: true, // baked badges carry the rank emphasis
    uniformStatInk: true,
    nameFont: `800 25px ${FONTS_FULL}`, // system-ui keeps Arabic/CJK glyphs
    statFont: `800 27px ${FONTS_FULL}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#F0FDFF", // measured baked headline ink; fallback accent
    text: "#0B1220", // deep navy data ink on the teal plates (≥6.7:1)
    textMuted: "#F0FDFF", // pale header ink on dark teal (10.4:1)
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)",
    wwcdText: "#0B1220",
    watermarkColor: "#FFFFFF", // hard legibility on the snowy footer
    plateBg: "rgba(255,255,255,0.18)",
    plateRing: "rgba(11,18,32,0.35)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#062B3A",
  },
};

const PMHI_CRIMSON_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // The PMHI art only backs standings. MVP + announcement fall back to the
  // same deep-crimson broadcast wash; pure-white ink clears every stop.
  css: "linear-gradient(165deg, #2A0710 0%, #5C0D1E 55%, #1A0508 100%)",
  decor: [],
};

/**
 * PMHI Crimson — the 2023 PMHI Indonesia broadcast OVERALL standings board.
 *
 * Art: `standings.png` is a TRUE 1696×2528 PNG (byte-identical to the supplied
 * `overall.png`). It is NOT exactly 2:3, so it is uniformly WIDTH-fitted:
 * S = 1080/1696 = 0.6367924528 → 1080×1609.8113, centred with a 5.0943px
 * letterbox top/bottom (filled by `canvasBackground`). No stretching; every
 * number below is an art-pixel measurement converted by canvasY = artY×S + 5.0943.
 *
 * - Art bakes the teal "OVERALL RANKINGS" title, the cyan label band
 *   (art y666–742 → canvas 429.2–477.6), all #1–#24 rank ink and all row
 *   bars → labelsBakedIn + ranksBakedIn + hidden scrim name. No code labels,
 *   no code numerals, no re-rendered title.
 * - 12 painted bars per column: baked row-1 rank centre art y808 → canvas
 *   519.7; separator tops 746, 872, 994, 1119, 1245, … → least-squares pitch
 *   125.2 art = 79.73 canvas. Text box top art y747 → canvas 480.7, height
 *   78 (≤ pitch), so row 1's centre lands on the baked rank ink and row 12's
 *   centre is canvas 1396.7 (last bar bottom ≈1436). 24 → [12,12].
 * - Header label ink centres (canvas): left WWCD 292.3 / PLACE PTS 369.3 /
 *   ELIMS 441.9 / TOTAL 498.9; right +528.9 (821.1 / 898.5 / 970.2 / 1027.5).
 *   The right shift is NOT uniform; each 48px stat box is centred on its own
 *   measured ink. TEAM starts at art 205 / 1036 → canvas 136 / 665.
 * - The red "MATCH #" pill occupies art x646–853 y522–598; the empty black
 *   digit slot is art x854–1060 → canvas x548.9 w131.2 y337.5. Exo 2 800
 *   uppercase pure-white digits are centred in that box (≤3 digits fit).
 * - Row interiors are dark crimson (#6E0D1D mean): pure-white Exo 2 800
 *   names/stats clear 7:1. The rank-1 emphasis is baked into the art, so no
 *   synthetic strip/accent is drawn. MVP + announcement use the crimson wash.
 */
const PMHI_CRIMSON: TemplateConfig = {
  ...GEOMETRY,
  id: "pmhi-crimson",
  name: "PMHI Crimson",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmhi-crimson/standings.png",
      fit: {
        width: 1080,
        height: 1609.811320754717,
        left: 0,
        top: 5.094339622641509,
      },
    },
    mvp: PMHI_CRIMSON_FALLBACK_BG,
    announcement: PMHI_CRIMSON_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  // Neutral deep-crimson fill behind the 5.09px uniform-fit letterbox: no
  // transparent strip in the exported PNG, no stretching. The supplied art's
  // own top/bottom edges differ in brightness, so one colour cannot match both.
  canvasBackground: "#2A0710",
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
      // The art bakes "OVERALL RANKINGS" and the words "MATCH #"; park the
      // title/organizer and paint ONLY the confirmed-match digits in the
      // measured black slot to the right of the baked pill.
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: 548.92, y: 337.5, w: 131.17, align: "center" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${FONTS}`,
      subtitleFont: `800 36px ${FONTS}`,
      subtitleColor: "#FFFFFF",
      subtitleTextTransform: "uppercase",
      organizerFont: `500 1px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL RANKINGS"
  },
  standings: {
    columns: [
      {
        rankX: 43.3, // baked white rank ink x69–104 art; no code numeral
        teamX: 136, // first clear pixel of the TEAM cell (art x205)
        teamW: 130, // ends at 266, 2px before the WWCD box
        statColumns: [
          { key: "wwcd", x: 268.29 },
          { key: "pp", x: 345.34 },
          { key: "kp", x: 417.93 },
          { key: "total", x: 474.93 },
        ],
        stripX: 38,
        stripW: 490,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 565.47, // baked rank ink art x895–931
        teamX: 665, // TEAM cell starts art x1036 (NOT +529 uniform)
        teamW: 130,
        statColumns: [
          { key: "wwcd", x: 797.14 },
          { key: "pp", x: 874.51 },
          { key: "kp", x: 946.15 },
          { key: "total", x: 1003.46 },
        ],
        stripX: 560,
        stripW: 490,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 429.2, // cyan baked label band top (art y666)
    rowY0: 480.72, // text box top art y747; row-1 centre = 519.7
    rowPitch: 79.73, // least-squares fit of the 12 baked bar centres (125.2 art)
    rowHeight: 78, // painted interior height, always ≤ rowPitch
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 48,
    logoPlate: 30,
    logoNameGap: 36,
    uniformRowInk: true, // rank-1 badge is baked; no synthetic highlight
    uniformStatInk: true,
    nameFont: `800 22px ${FONTS}`,
    statFont: `800 26px ${FONTS}`,
    labelFont: `700 20px ${FONTS}`,
  },
  palette: {
    accent: "#46D6D5", // the art's teal title ink
    text: "#FFFFFF", // pure-white Exo 2 800 names + stats
    textMuted: "#CFE9E8",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)",
    wwcdText: "#FFFFFF",
    watermarkColor: "#FFFFFF", // brand watermark ink; position stays hardcoded
    plateBg: "rgba(255,255,255,0.10)",
    plateRing: "rgba(255,255,255,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#1A0508",
  },
};

const PMNC_PAKISTAN_LIME_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // Artless MVP/announcement fallbacks: light lime → fresh green. The dark
  // #050505 row ink from the standings art clears 7:1 on every stop.
  css: "linear-gradient(165deg, #F2F9D6 0%, #D9F09A 55%, #B9E050 100%)",
  decor: [],
};

/**
 * PMNC Pakistan Lime — the Pakistan National Championship broadcast leaderboard.
 *
 * Art: `public/templates/pmnc-pakistan-lime/overall.png`, a TRUE 1696×2528 PNG
 * (ratio 0.6710, 0.6% wider than 2:3). Uniform HEIGHT fit S = 1620/2528 =
 * 0.6408227848 draws 1086.835×1620 at left −3.4177 — a 3.4px cover crop per
 * side, zero distortion. Every canvas number below was measured off those
 * pixels through canvasX = artX·S − 3.4177, canvasY = artY·S.
 *
 * - The art bakes the two-line "OVERALL LEADERBOARD" headline (white ink art
 *   x59–759 y23–299), the black label bands (art y364–420 → canvas 233.3–269.2)
 *   printing TEAMS | PLACE | KILL | TOTAL twice, all rank numerals #1–#24 and
 *   both 12-row tables → labelsBakedIn + ranksBakedIn + hideScrimName.
 * - Baked rank-ink centres (art y500, 667, 837.5 … 2393) give canvas centres
 *   320.41 … 1533.49: rowY0 272.4114 with a 96px box seats rows 1/13 at 320.41
 *   and rows 12/24 at 1533.49 exactly. The art's pitch is mildly non-uniform
 *   (167→174 art px), so mid-table rows drift ≤7px; a single fixed pitch is the
 *   closest fit (per-row centre arrays exist only on the MVP/announcement
 *   layouts, not on `StandingsTableSpec`).
 * - Measured label-ink centres (canvas): left PLACE 387.5 / KILL 442.1 / TOTAL
 *   495.9; right 906.0 / 959.7 / 1013.3 (uniform +518px shift). 46px value
 *   boxes at 364.5/419/473 and 883/936.5/990.5 centre on them without overlap.
 *   The chicken (WWCD) compartment is the open gap left of PLACE: centres 333 /
 *   851 → boxes at 310 / 828. Team slots start at x106 / x634, 5px clear of
 *   the FULL baked rank ink (right edges x101 / x629 for #12 / #24).
 * - Baked "MATCH #" ink ends art x1246 → canvas x795.7, centred canvas y120.2
 *   in the white banner. That banner is a parallelogram whose RIGHT edge
 *   tapers from canvas x860 at y77 to x844 at y102 and x828 at y128 — the
 *   white wedge after the baked "#" is only ~50px wide. The digits therefore
 *   sit at x802 in italic 800 36px (with −0.04em tracking): two digits occupy
 *   ≈41px and stay fully on white through their y78–106 ink band. A larger
 *   face would spill onto the green field (#5C8A00 there is 2:1, illegible).
 *   `subtitleMode: "matchNumber"` paints ONLY the confirmed-match number.
 * - Row interiors are white/light-grey (row 1 lime #81BA15): #050505 Exo 2 800
 *   ink reads ≥8:1. The brand-law watermark stays hardcoded at y1570; dark
 *   #0F1115 ink clears the light row-12 band. MVP + announcement have no art →
 *   light lime gradient fallback.
 */
const PMNC_PAKISTAN_LIME: TemplateConfig = {
  ...GEOMETRY,
  id: "pmnc-pakistan-lime",
  name: "PMNC Pakistan Lime",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmnc-pakistan-lime/overall.png",
      // Uniform ×1620/2528 height fit; centred cover crop (3.42px/side), no
      // distortion, so every measured slot lands exactly on the config coords.
      fit: {
        width: 1086.8354430379747,
        height: 1620,
        left: -3.417721518987349,
        top: 0,
      },
    },
    mvp: PMNC_PAKISTAN_LIME_FALLBACK_BG,
    announcement: PMNC_PAKISTAN_LIME_FALLBACK_BG,
  },
  canvasBackground: "#81BA15", // hidden by the cover crop; matches row-1 lime
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    // Fallback variants (MVP/announcement gradient) keep a normal header;
    // standings parks the synthetic slots and seats the digits in the banner.
    title: { x: 140, y: 84, w: 800, align: "center" },
    subtitle: { x: 190, y: 168, w: 700, align: "center" },
    organizer: { x: 340, y: 236, w: 400, align: "center" },
    titleFont: `800 54px ${FONTS}`,
    subtitleFont: `600 36px ${FONTS}`,
    organizerFont: `500 24px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // The art bakes "OVERALL LEADERBOARD" + "MATCH #": hide the scrim name,
      // park the optional organizer, and paint ONLY the confirmed-match digits
      // in the measured white slot after the "#" (ink ends canvas x795).
      title: { x: -9999, y: -9999, w: 0 },
      subtitle: { x: 802, y: 72, w: 44, align: "left" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${FONTS}`,
      subtitleFont: `italic 800 36px ${FONTS}`,
      subtitleLetterSpacing: "-0.04em",
      subtitleColor: "#5C8A00",
      subtitleTextTransform: "uppercase",
      organizerFont: `500 1px ${FONTS}`,
    },
  },
  variantHideScrimName: {
    standings: true, // the art bakes "OVERALL LEADERBOARD"
  },
  standings: {
    columns: [
      {
        rankX: 50, // baked rank ink centre x74; no code numeral
        teamX: 106, // 5px clear of the widest baked rank ink (#12 ends x101)
        teamW: 198, // ends at 304, 6px before the WWCD box at 310
        statColumns: [
          { key: "wwcd", x: 310 }, // chicken compartment centre 333
          { key: "pp", x: 364.5 }, // PLACE label ink centre 387.5
          { key: "kp", x: 419 }, // KILL ink centre 442.1
          { key: "total", x: 473 }, // TOTAL ink centre 495.9
        ],
        stripX: 106,
        stripW: 420,
        ranksBakedIn: true,
        fixedRowPitch: true,
      },
      {
        rankX: 568, // baked rank ink centre x592.5
        teamX: 634, // 5px clear of the widest baked rank ink (#24 ends x629)
        teamW: 188, // ends at 822, 6px before the WWCD box at 828
        statColumns: [
          { key: "wwcd", x: 828 }, // centre 851
          { key: "pp", x: 883 }, // centre 906
          { key: "kp", x: 936.5 }, // centre 959.5
          { key: "total", x: 990.5 }, // centre 1013.5
        ],
        stripX: 634,
        stripW: 420,
        ranksBakedIn: true,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 233, // black baked label band top (art y364)
    rowY0: 272.4113924050633, // row-1 box centre 320.41 = baked rank ink centre
    rowPitch: 110.2797756041427, // baked rank ink centres 320.41 … 1533.49 / 11
    rowHeight: 96, // ≤ pitch; painted bar interior 96–100px
    maxRowsLeft: 12,
    // `rowsPerColumn` is deliberately NOT set: the engine's default splitRows()
    // yields 24 → [12,12] but 16 → [8,8] — exactly the reference image's 8+8
    // layout with the remaining baked rows left blank.
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 46,
    logoPlate: 30,
    logoNameGap: 34,
    uniformRowInk: true, // the art bakes its own rank-1 lime bar
    uniformStatInk: true,
    nameFont: `800 21px ${FONTS}`,
    statFont: `800 25px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#5C8A00",
    text: "#050505",
    textMuted: "#050505",
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the bars — no code strips over them
    wwcdBg: "rgba(0,0,0,0)", // no synthetic rank-1 pill over the baked lime bar
    wwcdText: "#050505",
    watermarkColor: "#0F1115",
    plateBg: "rgba(5,5,5,0.08)",
    plateRing: "rgba(92,138,0,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#FFFFFF",
  },
};

const PMPL_SEA_PURPLE_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  // The standings art paints DARK charcoal ink on white cards, so the two
  // artless (parked) variants use a light lavender→white fallback; the dark
  // footer bar keeps the fixed white brand watermark legible there too.
  css: "linear-gradient(165deg, #EDE9F6 0%, #FFFFFF 100%)",
  decor: [{ kind: "bar", x: 0, y: 1520, w: 1080, h: 100, color: "#2A0B45" }],
};

/**
 * PMPL SEA Purple — the 2022 PMPL SEA Championship "OVERALL RANKINGS" board.
 *
 * Art: the supplied blank is a 1696×2528 PNG (ratio 0.6709, 0.6% wider than
 * 2:3). It is delivered as `standings.png` by a uniform ×1620/2528 height fit
 * to 1087×1620, centre-cropped 3px to an EXACT 1080×1620 canvas — no stretch,
 * no distortion. Every coordinate below was re-measured on that delivered
 * canvas pixel-for-pixel (no reliance on stale art comments).
 *
 * - The art bakes the orange "OVERALL RANKINGS" headline, the neon-yellow
 *   brush "MATCH #" lockup, BOTH label bands, every rank badge and every white
 *   card row → labelsBakedIn + ranksBakedIn + hideScrimName. Fifteen-to-twenty-
 *   four teams fill the left ladder first (12 slots) then the right one.
 * - Row cards are NOT equally spaced: their measured midpoints (canvas) are
 *   360, 449.5, 537, 621, 712.5, 806.5, 913, 1004.5, 1098.5, 1194, 1287, 1379
 *   (nominal least-squares pitch 93.42). `rowCenterYs` seats each text box on
 *   its own card centre; a single pitch would drift ~18px on rows 4–6.
 * - Left white cards span x113–515, dividers at x331–332 / 380–381 / 443–444;
 *   right cards x625–1027, dividers at x843–844 / 892–893 / 955–956. The art
 *   prints exactly THREE stat compartments per side — ELIMS, RANK PTS, TOTAL
 *   PTS — mapped to the domain's kp / pp / total stats (there is no baked
 *   BONUS PTS column; ELIMS is the elimination-points stat). 46px value boxes
 *   at 333/389/456 and 845/901/968 centre on those compartments without
 *   crossing a divider; team cells are [113,331) and [625,843).
 * - The baked '#' ink ends at canvas x986, y159–233. The 88px-wide match slot
 *   starts at x992 (6px gap) and uses Permanent Marker (`--font-brush`) 76px
 *   in #EAFF00, matching the brush lockup; only the confirmed digits render.
 * - #111318 team ink reads ~17:1 on the white cards; #1a1c23 is the muted
 *   secondary ink. Uniform row/stat ink keeps the baked rank badges in charge
 *   of all rank-1 emphasis. Fixed pure-white watermark ink on the black footer.
 */
const PMPL_SEA_PURPLE: TemplateConfig = {
  ...GEOMETRY,
  id: "pmpl-sea-purple",
  name: "PMPL SEA Purple",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmpl-sea-purple/standings.png",
    },
    mvp: PMPL_SEA_PURPLE_FALLBACK_BG,
    announcement: PMPL_SEA_PURPLE_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  uniformMvpRows: true,
  header: {
    title: { x: 90, y: 96, w: 900, align: "center" },
    subtitle: { x: 190, y: 188, w: 700, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `700 72px ${FONTS}`,
    subtitleFont: `600 40px ${FONTS}`,
    organizerFont: `500 26px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      title: { x: -9999, y: -9999, w: 0 },
      // Digits only: the art already prints the brush "MATCH #" words.
      subtitle: { x: 992, y: 156, w: 88, align: "left" },
      organizer: { x: -9999, y: -9999, w: 0 },
      titleFont: `500 1px ${FONTS}`,
      subtitleFont: `900 76px ${BRUSH_FONTS}`,
      subtitleColor: "#EAFF00",
      subtitleTextTransform: "uppercase",
      organizerFont: `500 1px ${FONTS}`,
    },
  },
  hideScrimName: true,
  variantHideScrimName: { standings: true },
  standings: {
    columns: [
      {
        rankX: 73, // baked badge x35–112; no code-drawn numeral
        teamX: 113, // first clear pixel inside the left white card
        teamW: 218, // ends at the first divider (x331)
        statColumns: [
          { key: "kp", x: 333 }, // ELIMS cell [332,380], centre 356
          { key: "pp", x: 389 }, // RANK PTS cell [381,443], centre 412
          { key: "total", x: 456 }, // TOTAL PTS cell [444,515], centre 479.5
        ],
        stripX: 113,
        stripW: 403,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 585, // baked right-column badge x548–623
        teamX: 625,
        teamW: 218, // ends at x843, the right table's first divider
        statColumns: [
          { key: "kp", x: 845 }, // ELIMS cell [844,892], centre 868
          { key: "pp", x: 901 }, // RANK PTS cell [893,955], centre 924
          { key: "total", x: 968 }, // TOTAL PTS cell [956,1027], centre 991.5
        ],
        stripX: 625,
        stripW: 402,
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 282, // baked label band — code draws no labels
    rowY0: 321, // first painted card top
    rowPitch: 93.42, // least-squares fit of the 12 baked card midlines
    rowHeight: 72, // stays inside the narrowest painted card (73px)
    rowCenterYs: [
      360, 449.5, 537, 621, 712.5, 806.5, 913, 1004.5, 1098.5, 1194, 1287,
      1379,
    ],
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 46, // the tight ELIMS compartment is only 48px wide
    logoPlate: 44,
    logoNameGap: 52,
    uniformRowInk: true, // baked rank-1 badge owns the emphasis
    uniformStatInk: true,
    nameUppercase: true,
    nameFont: `800 24px ${FONTS}`,
    statFont: `800 24px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`,
  },
  palette: {
    accent: "#EAFF00", // neon-yellow brush lockup
    text: "#111318", // dark charcoal on the white cards (~17:1)
    textMuted: "#1a1c23", // secondary stats/supporting ink
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0, // the art paints the cards — no synthetic strips
    wwcdBg: "rgba(0,0,0,0)",
    wwcdText: "#111318",
    watermarkColor: "#ffffff", // fixed brand ink on the black footer
    plateBg: "rgba(17,19,24,0.08)",
    plateRing: "rgba(17,19,24,0.28)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#111318",
  },
};

const PMRC_LIME_FALLBACK_BG: TemplateConfig["backgrounds"]["standings"] = {
  type: "gradient",
  // The art is black (#0B0D12); the artless MVP/announcement fallbacks keep
  // that same near-black field with a faint lime lift so pure-white ink stays
  // WCAG AAA on every stop (≥ 14:1, pinned in the template suite).
  css: "linear-gradient(165deg, #0B0D12 0%, #12151B 55%, #1A1E16 100%)",
  decor: [],
};

/** PMRC Lime — the 2024 PMGC "OVERALL RANKINGS" broadcast poster.
 *
 *  Art: `overall.png` is a TRUE 1024×1536 PNG (exact 2:3), drawn full-cover
 *  at the uniform canvas scale S = 1080/1024 = 1.0546875 with no crop. Every
 *  coordinate below is measured on those pixels and converted by artPx × S.
 *
 *  - Baked header: "OVERALL" (mean ink #FB8903) over "RANKINGS" (#FFFFFF) in
 *    the top band, then an orange→lime-gold bar at art y460–493 (canvas
 *    485.1–520.1) printing TEAM | ELIMS | PLACEMENT | TOTAL PTS twice. Dark
 *    label ink centres (canvas): left 210.3 / 310.4 / 383.4 / 481.2, right
 *    682.4 / 782.3 / 855.1 / 952.8. `labelsBakedIn` draws no label row and
 *    `variantHideScrimName.standings` hides the session title.
 *  - Baked "MATCH #" lime brush lockup (measured mean #AFEE23) spans art
 *    x387–599 / y336–392 → canvas x408.2–632.0 / y354.5–413.4, centred at
 *    (520, 384) between the two lime rules at canvas x314–377 and x694–764.
 *    The dynamic MATCH N slot is centred there. The art's own words stay in
 *    place; `subtitlePrefix` supplies "MATCH " once the renderer applies it.
 *  - 12 painted rank plates per column (art x67–121 / x516–570; white with
 *    black #1..#24 baked in) at art tops 504, 563, …, 1174. Their measured
 *    canvas centres are 557.4 … 1265.1; a single fixed pitch of 64.55 with a
 *    53px text box seats every row within 2.3px of its painted centre (zero
 *    cumulative drift), so `ranksBakedIn` draws no code numerals. A 25th team
 *    falls below the last plate — never dropped.
 *  - Charcoal row interiors (mean RGB 28/27/27) hold short white team names
 *    and three stat values, in order ELIMS(kp) → PLACEMENT(pp) → TOTAL PTS.
 *    Value boxes are 50px wide, centred on the baked header ink; the logo
 *    plate sits in the narrow compartment just right of the rank plate and
 *    the name shifts +52px past the first painted rule (art x172 → canvas
 *    181.4), exactly as the filled reference's flag + logo + name lockup.
 *  - Bottom-right watermark zone (canvas x730–1010 / y1570–1600) averages
 *    RGB 20.5/20.5/20.4 — the gold arc ends before x660 — so the hardcoded
 *    brand-law watermark uses 88% white ink (≈14:1).
 *  - MVP + announcement have no art → near-black gradient fallback. */
const PMRC_LIME: TemplateConfig = {
  ...GEOMETRY,
  id: "pmrc-lime",
  name: "PMRC Lime",
  backgrounds: {
    standings: {
      type: "image",
      src: "/templates/pmrc-lime/overall.png",
      // The 1024×1536 source is uniformly upscaled to the exact canvas —
      // zero crop, zero distortion (art px × 1080/1024 = every coordinate).
      fit: { width: 1080, height: 1620, left: 0, top: 0 },
    },
    mvp: PMRC_LIME_FALLBACK_BG,
    announcement: PMRC_LIME_FALLBACK_BG,
  },
  labelsBakedIn: true,
  subtitleMode: "matchNumber",
  subtitleBakedIn: { standings: false }, // the dynamic text supplies "MATCH " + digits
  subtitlePrefix: "MATCH ",
  uniformMvpRows: true,
  variantHideScrimName: {
    standings: true, // art bakes "OVERALL RANKINGS" in the top band
  },
  header: {
    // Fallback variants (MVP/announcement gradient) keep a normal title; the
    // standings override below moves the only dynamic ink into the brush slot.
    title: { x: 90, y: 84, w: 900, align: "center" },
    subtitle: { x: 390, y: 357, w: 260, align: "center" },
    organizer: { x: 340, y: 250, w: 400, align: "center" },
    titleFont: `800 46px ${FONTS}`,
    subtitleFont: `400 48px ${BRUSH_FONTS}`,
    organizerFont: `500 22px ${FONTS}`,
  },
  variantHeaders: {
    standings: {
      // Box centred on the measured baked "MATCH #" ink (canvas 520, 384).
      // 48px marker ink stays inside the 260px slot between the baked rules.
      subtitle: { x: 390, y: 357, w: 260, align: "center" },
      subtitleFont: `400 48px ${BRUSH_FONTS}`,
      subtitleColor: "#AFEE23",
      // Park the optional organizer in the clear dark band below the brush
      // slot (ends y413) and above the baked header bar (starts y485).
      organizer: { x: 140, y: 440, w: 800, align: "center" },
      organizerFont: `600 18px ${FONTS}`,
    },
  },
  standings: {
    columns: [
      {
        rankX: 70.7, // baked white rank plate art x67–121
        teamX: 135, // first clear pixel inside the charcoal row (art x128)
        teamW: 142, // stops before the ELIMS value box at x285
        statColumns: [
          { key: "kp", x: 285 }, // ELIMS ink centre 310.4
          { key: "pp", x: 358 }, // PLACEMENT ink centre 383.4
          { key: "total", x: 456 }, // TOTAL PTS ink centre 481.2
        ],
        stripX: 129,
        stripW: 398, // right edge 527, inside the art's left bar (art x500)
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
      {
        rankX: 544.2, // baked right rank plate art x516–570
        teamX: 610, // first clear pixel right of that plate (art x578)
        teamW: 142, // stops before the ELIMS value box at x757
        statColumns: [
          { key: "kp", x: 757 }, // ELIMS ink centre 782.3
          { key: "pp", x: 830 }, // PLACEMENT ink centre 855.1
          { key: "total", x: 928 }, // TOTAL PTS ink centre 952.8
        ],
        stripX: 603,
        stripW: 414, // right edge 1017, inside the art's right bar (art x964)
        ranksBakedIn: true,
        rowsPerColumn: 12,
        fixedRowPitch: true,
      },
    ],
    headerLabelsY: 485, // baked orange→lime bar top (art y460)
    // Least-squares fit through the 12 measured plate centres (canvas
    // 557.4 … 1265.1): box centre = rowY0 + rowHeight/2 + i*rowPitch.
    rowY0: 528.69,
    rowPitch: 64.5461,
    rowHeight: 53, // ≤ rowPitch; plate interior ~50–53 art px
    maxRowsLeft: 12,
    rowsPerColumn: 12,
    fixedRowPitch: true,
    ranksBakedIn: true,
    statBoxW: 50,
    logoPlate: 28, // the filled reference's small square logo
    logoNameGap: 52, // WITH a logo the name starts past rule 1 (canvas 181);
    // without a logo it starts at teamX in the narrow flag/logo compartment
    uniformRowInk: true, // rank 1 is already marked by its white plate
    uniformStatInk: true, // every numeral pure white on the charcoal bars
    nameFont: `800 21px ${FONTS}`, // short reference names fit the clear cell
    statFont: `800 24px ${FONTS}`,
    labelFont: `700 18px ${FONTS}`, // labels baked; kept for config consumers
  },
  palette: {
    accent: "#AFEE23", // measured lime brush ink
    text: "#FFFFFF", // pure white row ink on the charcoal bars
    textMuted: "#C9D2C7", // muted sage on fallback gradients (≥ 9:1)
    rowAlt: "#FFFFFF",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(175,238,35,0.10)",
    wwcdText: "#FFFFFF", // the baked white plate supplies rank-1 emphasis
    watermarkColor: "rgba(255,255,255,0.88)", // dark gold/black footer zone
    plateBg: "rgba(255,255,255,0.10)",
    plateRing: "rgba(175,238,35,0.45)",
    medalGold: "#F0C44C",
    medalSilver: "#C9D1DD",
    medalBronze: "#B4763F",
    medalText: "#0B0D12",
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
  "pmgc-sapphire": PMGC_SAPPHIRE,
  "pmwi-violet": PMWI_VIOLET,
  "grunge-red": GRUNGE_RED,
  "esports-clash": ESPORTS_CLASH,
  "rundown-orange": RUNDOWN_ORANGE,
  "royal-blue": ROYAL_BLUE,
  "varsity-yellow": VARSITY_YELLOW,
  "court-orange": COURT_ORANGE,
  "dusk-amber": DUSK_AMBER,
  "cardinal-gold": CARDINAL_GOLD,
  "apex-blaze": APEX_BLAZE,
  "urban-slate": URBAN_SLATE,
  "varsity-purple": VARSITY_PURPLE,
  "varsity-orange": VARSITY_ORANGE,
  "pmsl-cobalt": PMSL_COBALT,
  "ewc-teal": EWC_TEAL,
  "pmgc-league-blue": PMGC_LEAGUE_BLUE,
  "pmgo-brazil-green": PMGO_BRAZIL_GREEN,
  "pmgo-teal": PMGO_TEAL,
  "pmhi-crimson": PMHI_CRIMSON,
  "pmnc-pakistan-lime": PMNC_PAKISTAN_LIME,
  "pmpl-sea-purple": PMPL_SEA_PURPLE,
  "pmrc-lime": PMRC_LIME,
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
