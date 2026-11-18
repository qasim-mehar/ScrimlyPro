"use client";

import { useRef, useState } from "react";
import {
  AESTHETICS,
  effectivePitch,
  headerFor,
  hideScrimNameFor,
  slotToStyle,
  splitRowsAt,
  splitRows,
  type AestheticId,
  type StandingsColumnSpec,
  type StatColumnKey,
  type TemplateConfig,
} from "@/lib/graphics";
import { STANDINGS_LABELS, subtitleMatchNumber } from "@/lib/graphics/standings";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";

// One row proves the Noto Sans Symbols 2 fallback survives export (PLAN C3.1
// ACCEPT re-checks the glyph set); the second covers the remaining | _ glyphs.
const DUMMY_NAMES = [
  "TF×MAₛOOR · AKM≌Dasim",
  "4NM | BROKEN_X",
  "TEAM_SANSATIONAL",
  "HANAN OP · SQUAD",
  "OFFICIAL AGENT 47",
  "KARACHI KINGS_ES",
  "THE LAST RIDERZ",
  "GODLIKE | PAK",
  "NX_GAMING",
  "SCARYMONSTA XR",
  "AKM≌DASIM_X",
  "VORTEX ESPORTS",
  "RAWALPINDI RHINOS",
  "SRT | SHADOW",
  "DRAGO KNIGHTS",
  "HYDRA OPS PAK",
];

function dummyStats(rank: number): Record<StatColumnKey, number> {
  const total = 100 - rank * 3;
  const wwcd = rank === 1 ? 3 : rank <= 5 ? 1 : 0;
  const kp = 21 - Math.floor(rank / 4);
  return { wwcd, matches: 6, pp: total - kp - wwcd * 15, kp, total };
}

function GraphicHeader({ config }: { config: TemplateConfig }) {
  const { palette, name } = config;
  const header = headerFor(config, "standings");
  const subtitle = config.subtitleMode === "matchNumber" ? subtitleMatchNumber("AFTER MATCH 2") : "AFTER MATCH 2";
  return (
    <>
      {hideScrimNameFor(config, "standings") ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
          {name.toUpperCase()}
        </div>
      )}
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: header.subtitleColor ?? palette.accent }}>
        {subtitle}
      </div>
      <div style={{ ...slotToStyle(header.organizer), font: header.organizerFont, color: palette.textMuted }}>
        DEV SANDBOX
      </div>
    </>
  );
}

function DummyRow({
  config,
  col,
  rank,
  rowIdx,
  pitch,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  rank: number;
  rowIdx: number;
  pitch: number;
}) {
  const st = config.standings;
  const y = st.rowY0 + rowIdx * pitch;
  const isRankOne = rank === 1;
  const stats = dummyStats(rank);
  const rankBoxW = st.rankBoxW ?? 48;
  const statBoxW = st.statBoxW ?? 58;
  const ranksBakedIn = col.ranksBakedIn ?? st.ranksBakedIn;
  return (
    <>
      {isRankOne || rowIdx % 2 === 1 ? (
        <div
          style={{
            position: "absolute",
            left: col.stripX,
            top: y,
            width: col.stripW,
            height: st.rowHeight,
            background: isRankOne ? config.palette.wwcdBg : config.palette.rowAlt,
            opacity: isRankOne ? 1 : config.palette.rowAltOpacity,
          }}
        />
      ) : null}
      {ranksBakedIn ? null : (
        <div
          style={{
            position: "absolute",
            left: col.rankX,
            top: y,
            width: rankBoxW,
            height: st.rowHeight,
            textAlign: "center",
            font: st.statFont,
            lineHeight: `${st.rowHeight}px`,
            color: isRankOne ? config.palette.wwcdText : config.palette.text,
          }}
        >
          {rank}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: col.teamX,
          top: y,
          width: col.teamW,
          height: st.rowHeight,
          font: st.nameFont,
          lineHeight: `${st.rowHeight}px`,
          color: isRankOne ? config.palette.wwcdText : config.palette.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {DUMMY_NAMES[(rank - 1) % DUMMY_NAMES.length]}
      </div>
      {col.statColumns.map(({ key, x }) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: statBoxW,
            height: st.rowHeight,
            textAlign: "center",
            font: st.statFont,
            lineHeight: `${st.rowHeight}px`,
            fontVariantNumeric: "tabular-nums",
            color: key === "total" && isRankOne ? config.palette.accent : config.palette.text,
          }}
        >
          {stats[key]}
        </div>
      ))}
    </>
  );
}

function StandingsColumn({
  config,
  col,
  firstRank,
  rowCount,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  firstRank: number;
  rowCount: number;
}) {
  const st = config.standings;
  const rankBoxW = st.rankBoxW ?? 48;
  const statBoxW = st.statBoxW ?? 58;
  const pitch = effectivePitch(
    st.rowY0,
    st.rowPitch,
    col.rowsBottom,
    rowCount,
    col.fixedRowPitch ?? st.fixedRowPitch === true,
  );
  const labelStyle = {
    top: st.headerLabelsY,
    font: st.labelFont,
    color: config.palette.textMuted,
  } as const;
  return (
    <>
      {config.labelsBakedIn ? null : (
        <>
          <div
            style={{
              position: "absolute",
              left: col.rankX,
              width: rankBoxW,
              textAlign: "center",
              ...labelStyle,
            }}
          >
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
      )}
      {Array.from({ length: rowCount }, (_, i) => (
        <DummyRow
          key={firstRank + i}
          config={config}
          col={col}
          rank={firstRank + i}
          rowIdx={i}
          pitch={pitch}
        />
      ))}
    </>
  );
}

function SandboxSection({ id }: { id: AestheticId }) {
  const config = AESTHETICS[id];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // Generalised row split: honour the art's painted bars-per-side when set
  // (ewc-yellow / challengers-red: 12), otherwise the default two-column split.
  const totalTeams = 16;
  const singleColumn = config.standings.singleColumn === true;
  const splitAt = config.standings.columns[0].rowsPerColumn ?? config.standings.rowsPerColumn;
  const [leftRows, rightRows] =
    splitAt !== undefined ? splitRowsAt(totalTeams, splitAt) : splitRows(totalTeams);
  const columns = singleColumn ? [config.standings.columns[0]] : config.standings.columns;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold tracking-widest text-gold">{config.name}</h2>
      <GraphicCanvas config={config} variant="standings" stageRef={stageRef}>
        <GraphicHeader config={config} />
        {columns.map((col, colIdx) => (
          <StandingsColumn
            key={col.stripX}
            config={config}
            col={col}
            firstRank={colIdx === 0 ? 1 : leftRows + 1}
            rowCount={singleColumn ? totalTeams : colIdx === 0 ? leftRows : rightRows}
          />
        ))}
      </GraphicCanvas>
      <DownloadPngButton stageRef={stageRef} filename={`dev-sandbox-${id}.png`} onExported={setSize} />
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
    </section>
  );
}

export function DevSandbox() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-xl font-bold tracking-widest text-gold">GRAPHICS DEV SANDBOX</h1>
        <p className="text-sm text-muted">C3.1 pipeline check — dev route, not part of the product UI.</p>
      </header>
      {(Object.keys(AESTHETICS) as AestheticId[]).map((id) => (
        <SandboxSection key={id} id={id} />
      ))}
    </div>
  );
}
