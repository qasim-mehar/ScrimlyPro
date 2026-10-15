"use client";

import type { ReactNode } from "react";

import { getTemplate, headerFor, slotToStyle, type AestheticId } from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

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

export function MvpGraphic({ aestheticId, title, subtitle, organizer, entries }: MvpGraphicProps) {
  const config = getTemplate(aestheticId);
  const { mvp, palette } = config;
  const header = headerFor(config, "mvp");
  // P7: uniformMvpRows → every row renders identically (neutral plate, text
  // rank digits) with no rank-1 accent strip and no metal medallions.
  const uniform = config.uniformMvpRows === true;
  return (
    <>
      {config.hideScrimName ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
          {title}
        </div>
      )}
      {mvp.subtitleBakedIn ? null : (
        <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
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
