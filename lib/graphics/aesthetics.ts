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
    y0: 410,
    cellW: 180,
    cellH: 150,
    logoSize: 64,
    nameFont: `600 26px ${FONTS}`,
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
  },
};

const PMPL_LIGHT_FALLBACK_BG: TemplateConfig["backgrounds"]["mvp"] = {
  type: "gradient",
  css: "linear-gradient(170deg, #f4f6fb 0%, #e8ecf5 100%)",
  decor: [],
};

/** PMPL-light: first real art-backed template (P4). Standings renders over
 * the user's light-theme PNG; mvp/announcement are light gradient
 * placeholders until the sibling art lands. Standings geometry measured from
 * the art pixels (P4b: 1024×1536 art → ×1.0546875 to the 1080×1620 canvas;
 * label centers, ribbon, table rects all pixel-segmented). */
const PMPL_LIGHT: TemplateConfig = {
  ...GEOMETRY,
  id: "pmpl-light",
  name: "PMPL Light",
  backgrounds: {
    standings: { type: "image", src: "/templates/pmpl-light/overall.png" },
    mvp: PMPL_LIGHT_FALLBACK_BG,
    announcement: PMPL_LIGHT_FALLBACK_BG,
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
  palette: {
    accent: "#0e7ac4",
    text: "#1c2333",
    textMuted: "#5b6678",
    rowAlt: "#0b1526",
    rowAltOpacity: 0.045,
    wwcdBg: "rgba(230,160,20,0.16)",
    wwcdText: "#8a5a00",
    watermarkColor: "rgba(20,28,44,0.55)",
  },
};

export const AESTHETICS: Record<AestheticId, TemplateConfig> = {
  "dark-gold": DARK_GOLD,
  "purple-butterfly": PURPLE_BUTTERFLY,
  "pink-blossom": PINK_BLOSSOM,
  "pmpl-light": PMPL_LIGHT,
};

/** Look up a template config by aesthetic id. */
export function getTemplate(id: AestheticId): TemplateConfig {
  return AESTHETICS[id];
}
