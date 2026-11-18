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
  type MvpEsportsSpec,
  type MvpPaperBannerSpec,
} from "@/lib/graphics";
import {
  esportsMvpRowSlots,
  fixedMvpRowTops,
  grungeMvpRowSlots,
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

export function MvpGraphic({ aestheticId, title, subtitle, organizer, entries }: MvpGraphicProps) {
  const config = getTemplate(aestheticId);
  const { mvp, palette } = config;
  // court-orange: the art bakes the PUBG MOBILE / TOP MVP LIST header, the
  // KRAFTON footer and all five paper banners. Only rank + IGN + kills render.
  if (config.mvpLayoutStyle === "paper-banner" && mvp.paperBanner) {
    return <PaperBannerRows entries={entries} spec={mvp.paperBanner} />;
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
