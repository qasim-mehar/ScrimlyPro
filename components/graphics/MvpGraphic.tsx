"use client";

import type { ReactNode } from "react";

import {
  getTemplate,
  headerFor,
  hideScrimNameFor,
  labelsBakedInFor,
  slotToStyle,
  type AestheticId,
  type MvpBrushSpec,
  type MvpEsportsSpec,  type MvpSlatePillSpec,
  type MvpSupercrossSpec,
  type MvpStartingFiveSpec,
  type MvpParchmentSpec,

  type MvpPaperBannerSpec,
} from "@/lib/graphics";
import {
  esportsMvpRowSlots,
  fixedMvpRowTops,
  grungeMvpRowSlots,
  duskMvpRowSlots,
  startingFiveRowSlots,
  supercrossMvpRowSlots,
  supercrossMvpRowTops,
  fitSlateNameFontSize,
  mvpKillLabel,
  slateNameParts,
  type MvpDisplayEntry,
} from "@/lib/graphics/mvp";

type MvpGraphicProps = {
  aestheticId: AestheticId;
  title: string; // event/session name
  subtitle: string; // MVP_SUBTITLE
  organizer?: string | null;
  entries: MvpDisplayEntry[]; // toMvpDisplay output, order authoritative
};

// Medallion diameter: fits the 120px row height with breathing room on every
// aesthetic (pmpl-light reuses this geometry until its art lands).
const MEDAL_D = 88;

/** Rank medallion fill: gold/silver/bronze for 1/2/3, neutral plate after. */
function medalFill(rank: number, palette: { plateBg: string; medalGold: string; medalSilver: string; medalBronze: string }): string {
  if (rank === 1) return palette.medalGold;
  if (rank === 2) return palette.medalSilver;
  if (rank === 3) return palette.medalBronze;
  return palette.plateBg;
}

/** Absolutely-positioned, vertically-centered single-line text box
 * (ellipsis on overflow) — the flex-center pattern on height `h`. */
function EllipsisText({
  x,
  y,
  w,
  h,
  font,
  color,
  align = "left",
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  font: string;
  color: string;
  align?: "left" | "center";
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        font,
        color,
      }}
    >
      <div
        style={{
          width: "100%",
          textAlign: align,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Starting-five brush lockup (grunge-red). DUMB renderer: every coordinate,
 * font size and label comes from `lib/graphics/mvp.ts` slots computed from the
 * template's measured config. Team names/logos are never painted — the PUBGM
 * characters are baked into the art.
 */
function BrushRows({
  entries,
  spec,
  rowTops,
}: {
  entries: MvpDisplayEntry[];
  spec: MvpBrushSpec;
  rowTops: number[];
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const y = rowTops[i] ?? 0;
        const slots = grungeMvpRowSlots(entry, y, spec);
        const nameFont = `${spec.name.fontWeight} ${slots.name.fontSize}px ${spec.name.fontFamily}`;
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: 0,
              top: y,
              width: 1080,
              height: spec.rowHeight,
              overflow: "hidden", // clips the giant ghost numeral to the painted bar
            }}
          >
            {/* 4. Giant background kill numeral — behind every foreground slot. */}
            <div
              style={{
                position: "absolute",
                left: slots.watermark.x,
                top: slots.watermark.y - y,
                width: slots.watermark.w,
                height: slots.watermark.h,
                font: `${spec.watermark.fontWeight} ${spec.watermark.fontSize}px ${spec.watermark.fontFamily}`,
                lineHeight: 0.82,
                color: spec.watermark.color,
                textAlign: "right",
                overflow: "hidden",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              {slots.watermark.text}
            </div>
            {/* 1. Framed rank badge between two hairline white rules. */}
            <div
              style={{
                position: "absolute",
                left: slots.badge.x,
                top: slots.badge.y - y,
                width: slots.badge.w,
                height: slots.badge.h,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "center",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "100%",
                  borderTop: `1.5px solid ${spec.badge.rule}`,
                  borderBottom: `1.5px solid ${spec.badge.rule}`,
                  font: `${spec.badge.fontWeight} ${spec.badge.fontSize}px ${spec.badge.fontFamily}`,
                  color: spec.badge.color,
                  fontStyle: "italic",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                  lineHeight: 1.5,
                  whiteSpace: "nowrap", // "#N FRAGGER" stays one line inside the frame
                }}
              >
                {slots.badge.text}
              </div>
            </div>
            {/* 2. Block-white uppercase player name (glyph-safe stack). */}
            <div
              style={{
                position: "absolute",
                left: slots.name.x,
                top: slots.name.y - y,
                width: slots.name.w,
                height: slots.name.h,
                font: nameFont,
                color: spec.name.color,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                zIndex: 2,
              }}
            >
              {slots.name.text}
            </div>
            {/* 3. Crimson brush kills, rotated, cutting across the name's foot. */}
            <div
              style={{
                position: "absolute",
                left: slots.kills.x,
                top: slots.kills.y - y,
                width: slots.kills.w,
                height: slots.kills.h,
                font: `${spec.kills.fontWeight} ${spec.kills.fontSize}px ${spec.kills.fontFamily}`,
                color: spec.kills.color,
                transform: "rotate(-2deg)",
                textShadow: "0 2px 6px rgba(0,0,0,0.85)",
                whiteSpace: "nowrap",
                zIndex: 3,
              }}
            >
              {slots.kills.text}
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * English-only esports card lockup (esports-clash). DUMB renderer: all five
 * card slots, the auto-fitted name size and the red/blue kill glow come from
 * `lib/graphics/mvp.ts` + the measured config. Only the player's IGN, the rank
 * label and the kills value are painted — no team names, logos or avatars.
 */
function EsportsRows({
  entries,
  spec,
  rowTops,
}: {
  entries: MvpDisplayEntry[];
  spec: MvpEsportsSpec;
  rowTops: number[];
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const y = rowTops[i] ?? 0;
        const s = esportsMvpRowSlots(entry, y, spec, i);
        const nameFont = `${spec.name.fontWeight} ${s.name.fontSize}px ${spec.name.fontFamily}`;
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: 0,
              top: y,
              width: 1080,
              height: spec.rowHeight,
              overflow: "hidden",
            }}
          >
            {/* 1. RANK #01..#05 — small italic, letter-spaced, 85% white. */}
            <div
              style={{
                position: "absolute",
                left: s.rank.x,
                top: s.rank.y - y,
                width: s.rank.w,
                height: s.rank.h,
                font: `${spec.rank.fontWeight} ${s.rank.fontSize}px ${spec.rank.fontFamily}`,
                fontStyle: "italic",
                letterSpacing: "0.12em",
                color: spec.rank.color,
                whiteSpace: "nowrap",
                textShadow: "0 1px 6px rgba(0,0,0,0.85)",
              }}
            >
              {s.rank.text}
            </div>
            {/* 2. Hero IGN — heavy italic skew, pure white, crisp dark shadow. */}
            <div
              style={{
                position: "absolute",
                left: s.name.x,
                top: s.name.y - y,
                width: s.name.w,
                height: s.name.h,
                font: nameFont,
                fontStyle: "italic",
                transform: "skewX(-10deg)",
                transformOrigin: "left center",
                textTransform: "uppercase",
                letterSpacing: "0.01em",
                color: spec.name.color,
                textShadow: "0 2px 10px rgba(0,0,0,0.85)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {s.name.text}
            </div>
            {/* 3. English stat label. */}
            <div
              style={{
                position: "absolute",
                left: s.statLabel.x,
                top: s.statLabel.y - y,
                width: s.statLabel.w,
                height: s.statLabel.h,
                font: `${spec.statLabel.fontWeight} ${s.statLabel.fontSize}px ${spec.statLabel.fontFamily}`,
                letterSpacing: "0.1em",
                color: spec.statLabel.color,
                whiteSpace: "nowrap",
                textShadow: "0 1px 6px rgba(0,0,0,0.85)",
              }}
            >
              {s.statLabel.text}
            </div>
            {/* 4. Kills value — black weight with the card's red/blue glow. */}
            <div
              style={{
                position: "absolute",
                left: s.kills.x,
                top: s.kills.y - y,
                width: s.kills.w,
                height: s.kills.h,
                font: `${spec.kills.fontWeight} ${s.kills.fontSize}px ${spec.kills.fontFamily}`,
                color: spec.kills.color,
                fontVariantNumeric: "tabular-nums",
                textShadow: `${s.kills.glow}, 0 2px 10px rgba(0,0,0,0.85)`,
                whiteSpace: "nowrap",
              }}
            >
              {s.kills.text}
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Paper-cutout banner lockup (court-orange). The art bakes five cream /
 * marigold strips, their burnt-orange rank squares, the header and the footer.
 * DUMB renderer: every coordinate, ink and font comes from `lib/graphics`;
 * each box is a flex row of height `rowHeight` whose centre is pinned to the
 * painted banner's measured midline. No team data, logos or avatars render.
 * `lineHeight: 1` is ALWAYS declared after the `font` shorthand — otherwise
 * `font` resets line-height to `normal` and shifts text off the Y-axis.
 */
function PaperBannerRows({ entries, spec }: { entries: MvpDisplayEntry[]; spec: MvpPaperBannerSpec }) {
  return (
    <>
      {entries.slice(0, 5).map((entry, i) => {
        const y = (spec.bannerCenterYs[i] ?? 0) - spec.rowHeight / 2;
        const nameFont = `${spec.name.fontWeight} ${spec.name.maxFontSize}px ${spec.name.fontFamily}`;
        const killsFont = `${spec.kills.fontWeight} ${spec.kills.fontSize}px ${spec.kills.fontFamily}`;
        const labelFont = `${spec.kills.labelFontWeight} ${spec.kills.labelFontSize}px ${spec.kills.labelFontFamily}`;
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: 0,
              top: y,
              width: 1080,
              height: spec.rowHeight,
            }}
          >
            {/* 1. Rank 01..05 — crisp white, centred in the burnt-orange square. */}
            <div
              style={{
                position: "absolute",
                left: spec.badge.x,
                top: 0,
                width: spec.badge.w,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: `${spec.badge.fontWeight} ${spec.badge.fontSize}px ${spec.badge.fontFamily}`,
                lineHeight: 1,
                color: spec.badge.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(entry.rank).padStart(2, "0")}
            </div>
            {/* 2. Paper strip: crimson IGN left, charcoal kills + crimson label right. */}
            <div
              style={{
                position: "absolute",
                left: spec.name.x,
                top: 0,
                width: spec.name.w,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: spec.paddingX,
                paddingRight: spec.paddingX,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  font: nameFont,
                  lineHeight: 1,
                  color: spec.name.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entry.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spec.killsGap,
                  height: "100%",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    font: killsFont,
                    lineHeight: 1,
                    color: spec.kills.color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {entry.kills}
                </div>
                <div
                  style={{
                    font: labelFont,
                    lineHeight: 1,
                    color: spec.kills.labelColor,
                    letterSpacing: "0.05em",
                  }}
                >
                  {spec.kills.labelText}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Draft-parchment bars (dusk-amber). DUMB renderer: the tan bars, PUBG MOBILE
 * branding, poster frame and character portraits are baked into the art — only
 * the five locked entries paint. The two-line group is flex-centred in a box
 * whose height equals the group's own computed height, so the group midpoint
 * is exactly the measured painted bar centre for every rank. No team names,
 * logos or synthetic header titles are ever rendered.
 */
function ParchmentRows({
  entries,
  spec,
}: {
  entries: MvpDisplayEntry[];
  spec: MvpParchmentSpec;
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const s = duskMvpRowSlots(entry, i, spec);
        // CSS font-shorthand law: `lineHeight` is declared AFTER `font` on both
        // lines (React serializes style keys in insertion order), otherwise
        // the shorthand resets line-height to `normal` and kills centring.
        const nameFont = `${spec.name.fontWeight} ${s.fontSize}px ${spec.name.fontFamily}`;
        const subFont = `${spec.subline.fontWeight} ${s.subline.fontSize}px ${spec.subline.fontFamily}`;
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: 0,
              top: s.barTop,
              width: 1080,
              height: spec.rowHeight,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: spec.textLeft,
                top: s.blockTop - s.barTop,
                width: spec.textWidth,
                height: s.blockBottom - s.blockTop,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-end",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "100%",
                  textAlign: "right",
                  textTransform: "uppercase",
                  font: nameFont,
                  lineHeight: spec.name.lineHeight,
                  letterSpacing: spec.name.letterSpacing,
                  color: spec.name.color,
                  textShadow: spec.name.textShadow,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.name.text}
              </div>
              <div
                style={{
                  width: "100%",
                  textAlign: "right",
                  textTransform: "uppercase",
                  font: subFont,
                  lineHeight: spec.subline.lineHeight,
                  letterSpacing: spec.subline.letterSpacing,
                  color: spec.subline.color,
                  marginTop: spec.subline.gap,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.subline.text}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}


/**
 * Cardinal-gold "STARTING FIVE" lockup. DUMB renderer: the five painted bar
 * boxes, the open right-hand text zone, both font sizes and both label strings
 * come from `lib/graphics/mvp.ts` + the measured config. The stacked text group
 * is flex-centred on each bar's Y axis, so its midpoint equals the bar's exact
 * measured centre. Team names/logos are never painted — the PUBGM characters
 * (including bar 5's sniper barrel) are baked into the art.
 */
function StartingFiveRows({
  entries,
  spec,
}: {
  entries: MvpDisplayEntry[];
  spec: MvpStartingFiveSpec;
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const s = startingFiveRowSlots(entry, i, spec);
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: s.textLeft,
              top: s.top,
              width: s.textWidth,
              height: s.height,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-end",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* 1. Crisp white kills/rank line. `lineHeight` is declared AFTER
                `font` — the shorthand would otherwise reset it to normal. */}
            <div
              style={{
                width: "100%",
                textAlign: "right",
                font: `${spec.kills.fontWeight} ${spec.kills.fontSize}px ${spec.kills.fontFamily}`,
                lineHeight: spec.kills.lineHeight,
                color: spec.kills.color,
                textTransform: "uppercase",
                letterSpacing: spec.kills.letterSpacing,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.killsText}
            </div>
            {/* 2. Warm varsity-gold IGN, auto-fitted, right-aligned, clipped. */}
            <div
              style={{
                width: "100%",
                textAlign: "right",
                font: `${spec.name.fontWeight} ${s.nameFontSize}px ${spec.name.fontFamily}`,
                lineHeight: spec.name.lineHeight,
                color: spec.name.color,
                textTransform: "uppercase",
                letterSpacing: spec.name.letterSpacing,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.nameText}
            </div>
          </div>
        );
      })}
    </>
  );
}


/**
 * Apex Blaze single-line motorsport lockup. DUMB renderer: every coordinate,
 * exact row centre, fitted font size and label comes from `lib/graphics/mvp.ts`
 * + the measured config. The art bakes "PUBG MOBILE", "TOP 5 /// FINISHES" and
 * the orange P1/..P5/ prefixes + divider rules — so no header, rank, team or
 * logo is painted. Each row is a fixed-height flex band whose vertical centre
 * lands on the baked glyph midpoint; `font` is always declared BEFORE
 * `lineHeight` (the shorthand otherwise resets line-height and drifts Y).
 */
function SupercrossRows({
  entries,
  spec,
  rowTops,
}: {
  entries: MvpDisplayEntry[];
  spec: MvpSupercrossSpec;
  rowTops: number[];
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const y = rowTops[i] ?? 0;
        const slots = supercrossMvpRowSlots(entry, y, spec);
        const nameFont = `${spec.name.fontWeight} ${slots.name.fontSize}px ${spec.name.fontFamily}`;
        const softFont = `${spec.name.softWeight} ${slots.name.fontSize}px ${spec.name.fontFamily}`;
        const killsFont = `${spec.kills.numberFontWeight} ${spec.kills.numberFontSize}px ${spec.kills.fontFamily}`;
        const unitFont = `${spec.kills.unitFontWeight} ${spec.kills.unitFontSize}px ${spec.kills.fontFamily}`;
        // Reference poster's dual-weight pairing: medium first name, heavy
        // surname. Single-token names stay fully heavy (no phantom space).
        const words = entry.name.trim().split(/\s+/u).filter(Boolean);
        const first = words[0] ?? "";
        const rest = words.slice(1).join(" ");
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: slots.name.x,
              top: y,
              width: spec.textWidth,
              height: spec.rowHeight,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                font: nameFont,
                lineHeight: "1",
                textTransform: "uppercase",
                letterSpacing: spec.name.tracking,
                color: spec.name.color,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {rest ? (
                <>
                  <span style={{ font: softFont, lineHeight: "1" }}>{first}</span>{" "}
                  <span style={{ font: nameFont, lineHeight: "1" }}>{rest}</span>
                </>
              ) : (
                first
              )}
            </span>
            <span
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "0.28em",
                font: killsFont,
                lineHeight: "1",
                color: spec.kills.color,
                textTransform: "uppercase",
                letterSpacing: spec.kills.tracking,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ font: killsFont, lineHeight: "1", color: spec.kills.color }}>
                {entry.kills}
              </span>
              <span style={{ font: unitFont, lineHeight: "1", color: spec.kills.color }}>
                {entry.kills === 1 ? spec.kills.singular : spec.kills.plural}
              </span>
            </span>
          </div>
        );
      })}
    </>
  );
}


/**
 * Rounded off-white bar lockup (urban-slate). The art bakes the five bars, the
 * monochrome PUBGM characters, the STARTING Five headline and the KRAFTON
 * footer. DUMB renderer: the exact painted bar boxes, font sizes and inks all
 * come from `lib/graphics` measurement data. Each row is an absolutely
 * positioned flex column locked to [barTop, barHeight] and [textLeft,
 * textWidth]; `justifyContent: center` pins the two-line stack's midpoint to
 * the bar's measured centre with zero Y drift. `line-height` is ALWAYS declared
 * AFTER the `font` shorthand on both lines — otherwise `font` resets it to
 * `normal` and the text drifts off the Y-axis. No team data, logos or avatars.
 */
function SlatePillRows({ entries, spec }: { entries: MvpDisplayEntry[]; spec: MvpSlatePillSpec }) {
  return (
    <>
      {entries.slice(0, 5).map((entry, i) => {
        const bar = spec.bars[i];
        if (!bar) return null;
        const parts = slateNameParts(entry.name);
        const fontSize = fitSlateNameFontSize(entry.name, spec);
        const nameFont = `${spec.name.boldWeight} ${fontSize}px ${spec.name.fontFamily}`;
        const killsFont = `${spec.kills.fontWeight} ${spec.kills.fontSize}px ${spec.kills.fontFamily}`;
        return (
          <div
            key={`${entry.rank}-${entry.name}`}
            style={{
              position: "absolute",
              left: spec.textLeft,
              top: bar.top,
              width: spec.textWidth,
              height: bar.height,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {/* 1. Tall condensed athletic IGN — dual-weight split for two-part
                    names (light leading token + ultra-bold primary token). */}
            <div
              style={{
                font: nameFont,
                lineHeight: 0.94,
                color: spec.name.color,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {parts.hasSplit ? (
                <>
                  <span style={{ fontWeight: spec.name.lightWeight }}>{parts.lead}</span>
                  <span style={{ fontWeight: spec.name.boldWeight }}>{parts.main}</span>
                </>
              ) : (
                entry.name
              )}
            </div>
            {/* 2. Wide-tracked extra-bold KILLS subline, modelled on the
                    reference poster's GUARD / FORWARD line. */}
            <div
              style={{
                font: killsFont,
                lineHeight: 1.05,
                color: spec.kills.color,
                textTransform: "uppercase",
                letterSpacing: spec.kills.letterSpacing,
                marginTop: 2,
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {mvpKillLabel(entry.kills)}
            </div>
          </div>
        );
      })}
    </>
  );
}


export function MvpGraphic({ aestheticId, title, subtitle, organizer, entries }: MvpGraphicProps) {
  const config = getTemplate(aestheticId);
  const { mvp, palette } = config;
  // court-orange: the art bakes the PUBG MOBILE / TOP MVP LIST header, the
  // KRAFTON footer and all five paper banners. Only rank + IGN + kills render.
  if (config.mvpLayoutStyle === "paper-banner" && mvp.paperBanner) {
    return <PaperBannerRows entries={entries} spec={mvp.paperBanner} />;
  }
  // dusk-amber: the art bakes the PUBG MOBILE logo, poster frame and all five
  // portraits — the entire header is suppressed; only the two-line bar lockups
  // render (no title, subtitle, organizer, team name or synthetic header).
  if (config.mvpLayoutStyle === "draft-parchment-bars" && mvp.parchment) {
    return <ParchmentRows entries={entries} spec={mvp.parchment} />;
  }
  // cardinal-gold: the art bakes STARTING / FIVE | SC / PUBG MOBILE | KRAFTON
  // and the painted crimson bars, so no synthetic header paints over them.
  if (config.mvpLayoutStyle === "starting-five-crimson" && mvp.startingFive) {
    return <StartingFiveRows entries={entries} spec={mvp.startingFive} />;
  }
  // apex-blaze: the art bakes the header, the P# / prefixes and the divider
  // rules. Only one uppercase, dual-weight IGN + kills line per row is painted.
  if (config.mvpLayoutStyle === "supercross-row-list" && mvp.supercross) {
    return (
      <SupercrossRows
        entries={entries}
        spec={mvp.supercross}
        rowTops={supercrossMvpRowTops(entries.length, mvp.supercross)}
      />
    );
  }
  // urban-slate: the art bakes the STARTING Five headline, the hardwood frame
  // and the PUBG MOBILE | KRAFTON footer. No synthetic header paints over them;
  // only the two-line IGN + KILLS stack is rendered in each open white zone.
  if (config.mvpLayoutStyle === "starting-five-slate-pills" && mvp.slatePills) {
    return <SlatePillRows entries={entries} spec={mvp.slatePills} />;
  }
  // esports-clash: the art bakes "TOP MVP LIST", so no title, subtitle or
  // organizer text renders. Only the five English card lockups are painted.
  if (config.mvpLayoutStyle === "esports-card" && mvp.esports) {
    return <EsportsRows entries={entries} spec={mvp.esports} rowTops={fixedMvpRowTops(entries.length, mvp)} />;
  }
  // grunge-red: a completely different, measured typography lockup. The
  // header is baked into the art, so no title/subtitle/organizer text renders.
  if (config.mvpLayoutStyle === "starting-five-brush" && mvp.brush) {
    const baked = labelsBakedInFor(config, "mvp") && hideScrimNameFor(config, "mvp");
    return (
      <>
        {baked ? null : (
          <div style={{ ...slotToStyle(headerFor(config, "mvp").title), font: headerFor(config, "mvp").titleFont, color: palette.text }}>
            {title}
          </div>
        )}
        <BrushRows entries={entries} spec={mvp.brush} rowTops={fixedMvpRowTops(entries.length, mvp)} />
      </>
    );
  }
  const header = headerFor(config, "mvp");
  // P7: uniformMvpRows → every row renders identically (neutral plate, text
  // rank digits) with no rank-1 accent strip and no metal medallions.
  const uniform = config.uniformMvpRows === true;
  return (
    <>
      {hideScrimNameFor(config, "mvp") ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
          {title}
        </div>
      )}
      {mvp.subtitleBakedIn ? null : (
        <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: header.subtitleColor ?? palette.accent }}>
          {subtitle}
        </div>
      )}
      {organizer ? (
        <div style={{ ...slotToStyle(header.organizer), font: header.organizerFont, color: palette.textMuted }}>
          {organizer}
        </div>
      ) : null}
      {entries.map((entry, i) => {
        const y = mvp.rowY0 + i * mvp.rowPitch;
        const isRankOne = entry.rank === 1;
        const isMedal = !uniform && entry.rank >= 1 && entry.rank <= 3;
        const rankBoxW = mvp.playerX - mvp.rankX;
        return (
          <div key={`${entry.rank}-${entry.name}`}>
            {isRankOne && !uniform ? (
              // Rank-1 highlight strip spans rank→kills (width DERIVED from
              // spec fields, never hardcoded).
              <div
                style={{
                  position: "absolute",
                  left: mvp.rankX,
                  top: y,
                  width: mvp.killsX + mvp.killsW - mvp.rankX,
                  height: mvp.rowHeight,
                  background: palette.wwcdBg,
                }}
              />
            ) : null}
            {/* Rank medallion: 1/2/3 metal circle with medal ink; 4/5 a
                neutral plate circle with the muted digit. uniformMvpRows →
                neutral plate + text ink for every rank (all rows identical). */}
            <div
              style={{
                position: "absolute",
                left: mvp.rankX + (rankBoxW - MEDAL_D) / 2,
                top: y + (mvp.rowHeight - MEDAL_D) / 2,
                width: MEDAL_D,
                height: MEDAL_D,
                borderRadius: "50%",
                background: uniform ? palette.plateBg : medalFill(entry.rank, palette),
                border: uniform || !isMedal ? `1px solid ${palette.plateRing}` : undefined,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: mvp.rankFont,
                color: uniform ? palette.text : isMedal ? palette.medalText : palette.textMuted,
              }}
            >
              {entry.rank}
            </div>
            <EllipsisText
              x={mvp.playerX}
              y={y}
              w={mvp.playerW}
              h={mvp.rowHeight}
              font={mvp.playerFont}
              color={isRankOne && !uniform ? palette.wwcdText : palette.text}
            >
              {entry.name}
            </EllipsisText>
            {/* Known shared-GEOMETRY overlap: the team box right edge
                (teamX + teamW) overlaps the kills box left edge (killsX) by
                ~10px — accepted; text collision is impossible (team
                ellipsizes before the kills digits' centered start). */}
            {/* Law: art-backed templates whose PUBGM characters are baked in
                (grunge-red, esports-clash) set mvpShowTeam:false — never render
                a team name, even if a specialized branch were bypassed. */}
            {config.mvpShowTeam === false ? null : (
              <EllipsisText
                x={mvp.teamX}
                y={y}
                w={mvp.teamW}
                h={mvp.rowHeight}
                font={mvp.statFont}
                color={palette.textMuted}
              >
                {entry.teamName}
              </EllipsisText>
            )}
            <EllipsisText
              x={mvp.killsX}
              y={y}
              w={mvp.killsW}
              h={mvp.rowHeight}
              font={mvp.statFont}
              color={isRankOne && !uniform ? palette.accent : palette.text}
              align="center"
            >
              {entry.kills}
            </EllipsisText>
          </div>
        );
      })}
    </>
  );
}
