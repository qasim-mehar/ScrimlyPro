"use client";

import type { CSSProperties } from "react";
import {
  effectivePitch,
  getTemplate,
  headerFor,
  slotToStyle,
  splitRows,
  type AestheticId,
  type StandingsColumnSpec,
  type TemplateConfig,
} from "@/lib/graphics";
import { STANDINGS_LABELS, subtitleMatchNumber, withRanks } from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";

// Box widths prescribed by the master prompt + types.ts comments, not yet
// TemplateConfig fields (flagged in README Assumptions for a template phase).
const RANK_BOX_W = 48; // StandingsColumnSpec.rankX: "48 wide, centered text"
const STAT_BOX_W = 58; // StandingsColumnSpec.statColumns: "58 wide, centered"
const LOGO_PLATE = 44; // PRD F6: "optional 44px logos" — the plate is the 44px circle
const LOGO_IMG = 34; // logo ink inside the plate (plate ring stays visible)
const LOGO_NAME_GAP = 52; // StandingsColumnSpec.teamX: "name shifts +52"

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
      {config.hideScrimName ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>{title}</div>
      )}
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
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
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  row: RankedRow;
  rowIdx: number;
  pitch: number;
}) {
  const st = config.standings;
  const { palette } = config;
  const y = st.rowY0 + rowIdx * pitch;
  const isRankOne = row.rank === 1;
  const teamStyle: CSSProperties = {
    position: "absolute",
    top: y,
    height: st.rowHeight,
    lineHeight: `${st.rowHeight}px`,
    font: st.nameFont,
    color: isRankOne ? palette.wwcdText : palette.text,
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
      <div
        style={{
          position: "absolute",
          left: col.rankX,
          top: y,
          width: RANK_BOX_W,
          height: st.rowHeight,
          lineHeight: `${st.rowHeight}px`,
          textAlign: "center",
          font: st.statFont,
          color: isRankOne ? palette.accent : palette.textMuted,
        }}
      >
        {row.rank}
      </div>
      {row.logoUrl ? (
        <>
          {/* Logo plate: palette circle behind the logo ink; rank-1 ring
              uses accent (emphasis), all others the theme plate ring. */}
          <div
            style={{
              position: "absolute",
              left: col.teamX,
              top: y + (st.rowHeight - LOGO_PLATE) / 2,
              width: LOGO_PLATE,
              height: LOGO_PLATE,
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
              left: col.teamX + (LOGO_PLATE - LOGO_IMG) / 2,
              top: y + (st.rowHeight - LOGO_IMG) / 2,
              width: LOGO_IMG,
              height: LOGO_IMG,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </>
      ) : null}
      {row.logoUrl ? (
        <div style={{ ...teamStyle, left: col.teamX + LOGO_NAME_GAP, width: col.teamW - LOGO_NAME_GAP }}>
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
            width: STAT_BOX_W,
            height: st.rowHeight,
            lineHeight: `${st.rowHeight}px`,
            textAlign: "center",
            font: st.statFont,
            color: key === "total" && isRankOne ? palette.accent : palette.text,
          }}
        >
          {row[key]}
        </div>
      ))}
    </>
  );
}

function StandingsColumn({
  config,
  col,
  rows,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  rows: RankedRow[];
}) {
  const st = config.standings;
  const labelStyle = {
    top: st.headerLabelsY,
    font: st.labelFont,
    color: config.palette.textMuted,
    letterSpacing: "0.05em",
  } as const;
  // Art-backed templates carry their own baked label row — code draws none.
  const showLabels = !config.labelsBakedIn;
  const pitch = effectivePitch(st.rowY0, st.rowPitch, col.rowsBottom, rows.length);
  return (
    <>
      {showLabels ? (
        <>
          {/* Nudge RANK left so it clears the TEAM header at col.teamX. */}
          <div style={{ position: "absolute", left: col.rankX - 5, width: RANK_BOX_W, textAlign: "center", ...labelStyle }}>
            {STANDINGS_LABELS.rank}
          </div>
          <div style={{ position: "absolute", left: col.teamX, ...labelStyle }}>{STANDINGS_LABELS.team}</div>
          {col.statColumns.map(({ key, x }) => (
            <div
              key={key}
              style={{
                position: "absolute",
                left: x,
                width: STAT_BOX_W,
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
        <StandingsRow key={row.teamId} config={config} col={col} row={row} rowIdx={i} pitch={pitch} />
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
  const [leftCount] = splitRows(standings.length);
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
