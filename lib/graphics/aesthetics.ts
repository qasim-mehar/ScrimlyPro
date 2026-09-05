import type { AestheticId, TemplateConfig } from "./types";

/** Font stack appended to EVERY font string in every config. "Noto Sans Symbols 2"
 * covers the C1.1 glyph set (× · | _ ₛ ≌) that Rajdhani lacks. */
const FONTS = '"Rajdhani", "Noto Sans Symbols 2", sans-serif';

/** Geometry shared by all three aesthetics — identical until real PNG templates
 * (P4) need per-template geometry. */
const GEOMETRY: Omit<TemplateConfig, "id" | "name" | "background" | "palette"> = {
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
        statsX: { wwcd: 265, pp: 330, kp: 395, total: 455 },
        stripX: 58,
        stripW: 462,
      },
      {
        rankX: 602,
        teamX: 656,
        teamW: 158,
        statsX: { wwcd: 805, pp: 870, kp: 935, total: 995 },
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

const DARK_GOLD: TemplateConfig = {
  ...GEOMETRY,
  id: "dark-gold",
  name: "Dark Gold",
  background: {
    type: "gradient",
    css: "linear-gradient(165deg, #0b0d12 0%, #12151c 55%, #1a1e28 100%)",
    decor: [
      { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#f5c542", opacity: 0.9 },
      { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#f5c542", opacity: 0.35 },
      { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#f5c542", opacity: 0.25 },
      { kind: "circle", x: 890, y: 90, w: 270, color: "#f5c542", opacity: 0.07 },
      { kind: "circle", x: -70, y: 1490, w: 230, color: "#f5c542", opacity: 0.06 },
    ],
  },
  palette: {
    accent: "#f5c542",
    text: "#e8eaf0",
    textMuted: "#8b93a7",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(245,197,66,.16)",
    wwcdText: "#f5c542",
  },
};

const PURPLE_BUTTERFLY: TemplateConfig = {
  ...GEOMETRY,
  id: "purple-butterfly",
  name: "Purple Butterfly",
  background: {
    type: "gradient",
    css: "linear-gradient(165deg, #150e2a 0%, #241640 55%, #2d1b4e 100%)",
    decor: [
      { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#c084fc", opacity: 0.9 },
      { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#c084fc", opacity: 0.35 },
      { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#c084fc", opacity: 0.25 },
      { kind: "circle", x: -90, y: 70, w: 280, color: "#c084fc", opacity: 0.08 },
      { kind: "circle", x: 910, y: 1490, w: 240, color: "#c084fc", opacity: 0.06 },
    ],
  },
  palette: {
    accent: "#c084fc",
    text: "#ece9f7",
    textMuted: "#9a92b8",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.04,
    wwcdBg: "rgba(192,132,252,.15)",
    wwcdText: "#c084fc",
  },
};

const PINK_BLOSSOM: TemplateConfig = {
  ...GEOMETRY,
  id: "pink-blossom",
  name: "Pink Blossom",
  background: {
    type: "gradient",
    css: "linear-gradient(165deg, #251119 0%, #3d1c2b 55%, #522537 100%)",
    decor: [
      { kind: "bar", x: 0, y: 0, w: 1080, h: 8, color: "#ff9ec7", opacity: 0.9 },
      { kind: "bar", x: 0, y: 1500, w: 1080, h: 2, color: "#ff9ec7", opacity: 0.35 },
      { kind: "bar", x: 556, y: 368, w: 2, h: 1080, color: "#ff9ec7", opacity: 0.25 },
      { kind: "circle", x: 860, y: 110, w: 260, color: "#ff9ec7", opacity: 0.07 },
      { kind: "circle", x: -60, y: 1500, w: 220, color: "#ff9ec7", opacity: 0.07 },
    ],
  },
  palette: {
    accent: "#ff9ec7",
    text: "#f7ecef",
    textMuted: "#b89aa6",
    rowAlt: "#ffffff",
    rowAltOpacity: 0.05,
    wwcdBg: "rgba(255,158,199,.14)",
    wwcdText: "#ff9ec7",
  },
};

export const AESTHETICS: Record<AestheticId, TemplateConfig> = {
  "dark-gold": DARK_GOLD,
  "purple-butterfly": PURPLE_BUTTERFLY,
  "pink-blossom": PINK_BLOSSOM,
};

/** Look up a template config by aesthetic id. */
export function getTemplate(id: AestheticId): TemplateConfig {
  return AESTHETICS[id];
}
