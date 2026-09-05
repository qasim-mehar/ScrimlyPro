"use client";

import type { CSSProperties } from "react";
import {
  getTemplate,
  slotToStyle,
  splitRows,
  type AestheticId,
  type StandingsColumnSpec,
  type StatColumnKey,
  type TemplateConfig,
} from "@/lib/graphics";
import { STANDINGS_LABELS, withRanks } from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";

// Box widths prescribed by the master prompt + types.ts comments, not yet
// TemplateConfig fields (flagged in README Assumptions for a template phase).
const RANK_BOX_W = 48; // StandingsColumnSpec.rankX: "48 wide, centered text"
const STAT_BOX_W = 58; // StandingsColumnSpec.statsX: "58 wide, centered"
const LOGO_SIZE = 44; // PRD F6: "optional 44px logos"
const LOGO_NAME_GAP = 52; // StandingsColumnSpec.teamX: "name shifts +52"

type RankedRow = StandingRow & { rank: number };

function StandingsHeader({
  config,
  title,
  subtitle,
  organizer,
}: {
  config: TemplateConfig;
  title: string;
  subtitle: string;
  organizer?: string | null;
}) {
  const { header, palette } = config;
  return (
    <>
      <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>{title}</div>
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
        {subtitle}
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
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  row: RankedRow;
  rowIdx: number;
}) {
  const st = config.standings;
  const { palette } = config;
  const y = st.rowY0 + rowIdx * st.rowPitch;
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
        // eslint-disable-next-line @next/next/no-img-element -- data URLs: raw <img> required for html-to-image capture
        <img
          src={row.logoUrl}
          alt=""
          style={{
            position: "absolute",
            left: col.teamX,
            top: y + (st.rowHeight - LOGO_SIZE) / 2,
            width: LOGO_SIZE,
            height: LOGO_SIZE,
          }}
        />
      ) : null}
      {row.logoUrl ? (
        <div style={{ ...teamStyle, left: col.teamX + LOGO_NAME_GAP, width: col.teamW - LOGO_NAME_GAP }}>
          {row.teamName}
        </div>
      ) : (
        <div style={{ ...teamStyle, left: col.teamX, width: col.teamW }}>{row.teamName}</div>
      )}
      {(Object.keys(col.statsX) as StatColumnKey[]).map((key) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: col.statsX[key],
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
    letterSpacing: "0.08em",
  } as const;
  return (
    <>
      <div style={{ position: "absolute", left: col.rankX, width: RANK_BOX_W, textAlign: "center", ...labelStyle }}>
        {STANDINGS_LABELS.rank}
      </div>
      <div style={{ position: "absolute", left: col.teamX, ...labelStyle }}>{STANDINGS_LABELS.team}</div>
      {(Object.keys(col.statsX) as StatColumnKey[]).map((key) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: col.statsX[key],
            width: STAT_BOX_W,
            textAlign: "center",
            ...labelStyle,
          }}
        >
          {STANDINGS_LABELS[key]}
        </div>
      ))}
      {rows.map((row, i) => (
        <StandingsRow key={row.teamId} config={config} col={col} row={row} rowIdx={i} />
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
};

export function OverallStandingsGraphic({
  aestheticId,
  title,
  subtitle,
  organizer,
  standings,
}: OverallStandingsGraphicProps) {
  const config = getTemplate(aestheticId);
  const [leftCount] = splitRows(standings.length);
  const ranked = withRanks(standings);
  return (
    <>
      <StandingsHeader config={config} title={title} subtitle={subtitle} organizer={organizer} />
      {config.standings.columns.map((col, colIdx) => (
        <StandingsColumn
          key={col.stripX}
          config={config}
          col={col}
          rows={colIdx === 0 ? ranked.slice(0, leftCount) : ranked.slice(leftCount)}
        />
      ))}
    </>
  );
}
