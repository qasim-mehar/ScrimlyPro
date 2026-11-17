"use client";

import type { CSSProperties } from "react";
import {
  effectivePitch,
  getTemplate,
  headerFor,
  hideScrimNameFor,
  slotToStyle,
  splitRows,
  splitRowsAt,
  type AestheticId,
  type StandingsColumnSpec,
  type TemplateConfig,
} from "@/lib/graphics";
import { STANDINGS_LABELS, statColumnValue, subtitleMatchNumber, withRanks } from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";

// Box widths default to the master prompt values; art-backed templates may
// override them per table (ewc-yellow's five baked header slots are 46 wide).
const DEFAULT_RANK_BOX_W = 48; // StandingsColumnSpec.rankX: "48 wide, centered text"
const DEFAULT_STAT_BOX_W = 58; // StandingsColumnSpec.statColumns: "58 wide, centered"
const DEFAULT_LOGO_PLATE = 44; // PRD F6: "optional 44px logos" — the plate is the 44px circle
const LOGO_INSET = 10; // logo ink sits 10px inside the plate ring
const DEFAULT_LOGO_NAME_GAP = 52; // StandingsColumnSpec.teamX: "name shifts +52"

type RankedRow = StandingRow & { rank: number };

function StandingsHeader({
  config,
  title,
  subtitle,
  organizer,
  matchCount,
}: {
  config: TemplateConfig;
  title: string;
  subtitle: string;
  organizer?: string | null;
  matchCount?: number;
}) {
  const { palette } = config;
  const header = headerFor(config, "standings");
  // matchNumber art bakes "MATCH #" in: the slot renders ONLY digits. An
  // explicit matchCount (threaded from the session page) wins — including the
  // final state, which reads "MATCH 6", never an empty slot. Digit-parsing is
  // the fallback only (dev routes, gradient callers that omit the prop).
  const subtitleText =
    config.subtitleMode === "matchNumber"
      ? (matchCount !== undefined ? String(matchCount) : subtitleMatchNumber(subtitle))
      : subtitle;
  return (
    <>
      {hideScrimNameFor(config, "standings") ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>{title}</div>
      )}
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: header.subtitleColor ?? palette.accent }}>
        {subtitleText}
      </div>
      {organizer ? (
        <div style={{ ...slotToStyle(header.organizer), font: header.organizerFont, color: palette.textMuted }}>
          {organizer}
        </div>
      ) : null}
    </>
  );
}

function StandingsRow({
  config,
  col,
  row,
  rowIdx,
  pitch,
  matchCount,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  row: RankedRow;
  rowIdx: number;
  pitch: number;
  matchCount?: number;
}) {
  const st = config.standings;
  const { palette } = config;
  const rankBoxW = st.rankBoxW ?? DEFAULT_RANK_BOX_W;
  const statBoxW = st.statBoxW ?? DEFAULT_STAT_BOX_W;
  const logoPlate = st.logoPlate ?? DEFAULT_LOGO_PLATE;
  const logoImg = Math.max(16, logoPlate - LOGO_INSET);
  const logoNameGap = st.logoNameGap ?? DEFAULT_LOGO_NAME_GAP;
  const y = st.rowY0 + rowIdx * pitch;
  const isRankOne = row.rank === 1;
  const teamStyle: CSSProperties = {
    position: "absolute",
    top: y,
    height: st.rowHeight,
    lineHeight: `${st.rowHeight}px`,
    font: st.nameFont,
    color: isRankOne ? palette.wwcdText : palette.text,
    letterSpacing: "-0.01em",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return (
    <>
      {isRankOne ? (
        <div
          style={{
            position: "absolute",
            left: col.stripX,
            top: y,
            width: col.stripW,
            height: st.rowHeight,
            background: palette.wwcdBg,
          }}
        />
      ) : rowIdx % 2 === 1 ? (
        <div
          style={{
            position: "absolute",
            left: col.stripX,
            top: y,
            width: col.stripW,
            height: st.rowHeight,
            background: palette.rowAlt,
            opacity: palette.rowAltOpacity,
          }}
        />
      ) : null}
      {(col.ranksBakedIn ?? st.ranksBakedIn) ? null : (
        <div
          style={{
            position: "absolute",
            left: col.rankX,
            top: y,
            width: rankBoxW,
            height: st.rowHeight,
            lineHeight: `${st.rowHeight}px`,
            textAlign: "center",
            font: st.statFont,
            fontVariantNumeric: "tabular-nums",
            color: isRankOne ? palette.accent : palette.textMuted,
          }}
        >
          {row.rank}
        </div>
      )}
      {row.logoUrl ? (
        <>
          {/* Logo plate: palette circle behind the logo ink; rank-1 ring
              uses accent (emphasis), all others the theme plate ring. */}
          <div
            style={{
              position: "absolute",
              left: col.teamX,
              top: y + (st.rowHeight - logoPlate) / 2,
              width: logoPlate,
              height: logoPlate,
              borderRadius: "50%",
              background: palette.plateBg,
              border: isRankOne ? `2px solid ${palette.accent}` : `1px solid ${palette.plateRing}`,
              boxSizing: "border-box",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- data URLs: raw <img> required for html-to-image capture */}
          <img
            src={row.logoUrl}
            alt=""
            style={{
              position: "absolute",
              left: col.teamX + (logoPlate - logoImg) / 2,
              top: y + (st.rowHeight - logoImg) / 2,
              width: logoImg,
              height: logoImg,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </>
      ) : null}
      {row.logoUrl ? (
        <div style={{ ...teamStyle, left: col.teamX + logoNameGap, width: col.teamW - logoNameGap }}>
          {row.teamName}
        </div>
      ) : (
        <div style={{ ...teamStyle, left: col.teamX, width: col.teamW }}>{row.teamName}</div>
      )}
      {col.statColumns.map(({ key, x }) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: statBoxW,
            height: st.rowHeight,
            lineHeight: `${st.rowHeight}px`,
            textAlign: "center",
            font: st.statFont,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            color: key === "total" && isRankOne ? palette.accent : palette.text,
          }}
        >
          {statColumnValue(row, key, matchCount)}
        </div>
      ))}
    </>
  );
}

function StandingsColumn({
  config,
  col,
  rows,
  matchCount,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  rows: RankedRow[];
  matchCount?: number;
}) {
  const st = config.standings;
  const rankBoxW = st.rankBoxW ?? DEFAULT_RANK_BOX_W;
  const statBoxW = st.statBoxW ?? DEFAULT_STAT_BOX_W;
  const labelStyle = {
    top: st.headerLabelsY,
    font: st.labelFont,
    color: config.palette.textMuted,
    letterSpacing: "0.05em",
  } as const;
  // Art-backed templates carry their own baked label row — code draws none.
  const showLabels = !config.labelsBakedIn;
  // fixedRowPitch: the art's bars are already drawn at an exact pitch — never
  // stretch rows to fill an area (that would drift off the painted bars).
  const pitch = effectivePitch(
    st.rowY0,
    st.rowPitch,
    col.rowsBottom,
    rows.length,
    col.fixedRowPitch ?? st.fixedRowPitch === true,
  );
  return (
    <>
      {showLabels ? (
        <>
          {/* Nudge RANK left so it clears the TEAM header at col.teamX. */}
          <div style={{ position: "absolute", left: col.rankX - 5, width: rankBoxW, textAlign: "center", ...labelStyle }}>
            {STANDINGS_LABELS.rank}
          </div>
          <div style={{ position: "absolute", left: col.teamX, ...labelStyle }}>{STANDINGS_LABELS.team}</div>
          {col.statColumns.map(({ key, x }) => (
            <div
              key={key}
              style={{
                position: "absolute",
                left: x,
                width: statBoxW,
                textAlign: "center",
                ...labelStyle,
              }}
            >
              {STANDINGS_LABELS[key]}
            </div>
          ))}
        </>
      ) : null}
      {rows.map((row, i) => (
        <StandingsRow
          key={row.teamId}
          config={config}
          col={col}
          row={row}
          rowIdx={i}
          pitch={pitch}
          matchCount={matchCount}
        />
      ))}
    </>
  );
}

type OverallStandingsGraphicProps = {
  aestheticId: AestheticId;
  title: string;
  subtitle: string;
  organizer?: string | null;
  standings: StandingRow[];
  /** Confirmed match count for matchNumber-mode templates (pmpl-light).
   * Rendered verbatim in the number slot — including finals. Absent →
   * legacy digit-parsing fallback (gradient templates unaffected). */
  matchCount?: number;
};

export function OverallStandingsGraphic({
  aestheticId,
  title,
  subtitle,
  organizer,
  standings,
  matchCount,
}: OverallStandingsGraphicProps) {
  const config = getTemplate(aestheticId);
  const singleColumn = config.standings.singleColumn === true;
  // rowsPerColumn lets an art-backed table wrap at its painted bar count
  // (ewc-yellow: 12 per side, so team #13 starts the right column).
  const splitAt = config.standings.columns[0].rowsPerColumn ?? config.standings.rowsPerColumn;
  const [leftCount] =
    splitAt !== undefined ? splitRowsAt(standings.length, splitAt) : splitRows(standings.length);
  const ranked = withRanks(standings);
  // singleColumn (neon-green): ONE full-width table renders every row and the
  // second column spec is skipped entirely.
  const columns = singleColumn ? [config.standings.columns[0]] : config.standings.columns;
  return (
    <>
      <StandingsHeader config={config} title={title} subtitle={subtitle} organizer={organizer} matchCount={matchCount} />
      {columns.map((col, colIdx) => (
        <StandingsColumn
          key={col.stripX}
          config={config}
          col={col}
          matchCount={matchCount}
          rows={
            singleColumn
              ? ranked
              : colIdx === 0
                ? ranked.slice(0, leftCount)
                : ranked.slice(leftCount)
          }
        />
      ))}
    </>
  );
}
