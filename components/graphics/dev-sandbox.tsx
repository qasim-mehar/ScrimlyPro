"use client";

import { useRef, useState } from "react";
import {
  AESTHETICS,
  slotToStyle,
  splitRows,
  type AestheticId,
  type StatColumnKey,
  type StandingsColumnSpec,
  type TemplateConfig,
} from "@/lib/graphics";
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
  return { wwcd, pp: total - kp - wwcd * 15, kp, total };
}

function GraphicHeader({ config }: { config: TemplateConfig }) {
  const { header, palette, name } = config;
  return (
    <>
      <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
        {name.toUpperCase()}
      </div>
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
        AFTER MATCH 2
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
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  rank: number;
  rowIdx: number;
}) {
  const st = config.standings;
  const y = st.rowY0 + rowIdx * st.rowPitch;
  const isRankOne = rank === 1;
  const stats = dummyStats(rank);
  return (
    <>
      {rowIdx % 2 === 1 ? (
        <div
          style={{
            position: "absolute",
            left: col.stripX,
            top: y,
            width: col.stripW,
            height: st.rowHeight,
            background: config.palette.rowAlt,
            opacity: config.palette.rowAltOpacity,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: col.rankX,
          top: y,
          width: 48,
          height: st.rowHeight,
          lineHeight: `${st.rowHeight}px`,
          textAlign: "center",
          font: st.statFont,
          ...(isRankOne
            ? { background: config.palette.wwcdBg, color: config.palette.wwcdText, borderRadius: 10 }
            : { color: config.palette.text }),
        }}
      >
        {rank}
      </div>
      <div
        style={{
          position: "absolute",
          left: col.teamX,
          top: y,
          width: col.teamW,
          height: st.rowHeight,
          lineHeight: `${st.rowHeight}px`,
          font: st.nameFont,
          color: config.palette.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {DUMMY_NAMES[rank - 1]}
      </div>
      {(Object.keys(col.statsX) as StatColumnKey[]).map((key) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: col.statsX[key],
            top: y,
            width: 58,
            height: st.rowHeight,
            lineHeight: `${st.rowHeight}px`,
            textAlign: "center",
            font: st.statFont,
            color: key === "total" ? config.palette.accent : config.palette.text,
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
  colIdx,
  leftRows,
}: {
  config: TemplateConfig;
  col: StandingsColumnSpec;
  colIdx: 0 | 1;
  leftRows: number;
}) {
  const st = config.standings;
  const firstRank = colIdx === 0 ? 1 : leftRows + 1;
  const rows = colIdx === 0 ? leftRows : 16 - leftRows;
  const labelStyle = {
    top: st.headerLabelsY,
    font: st.labelFont,
    color: config.palette.textMuted,
  } as const;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: col.rankX,
          width: 48,
          textAlign: "center",
          ...labelStyle,
        }}
      >
        RANK
      </div>
      <div style={{ position: "absolute", left: col.teamX, ...labelStyle }}>TEAM</div>
      {(Object.keys(col.statsX) as StatColumnKey[]).map((key) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: col.statsX[key],
            width: 58,
            textAlign: "center",
            ...labelStyle,
          }}
        >
          {key.toUpperCase()}
        </div>
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <DummyRow key={firstRank + i} config={config} col={col} rank={firstRank + i} rowIdx={i} />
      ))}
    </>
  );
}

function SandboxSection({ id }: { id: AestheticId }) {
  const config = AESTHETICS[id];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [leftRows] = splitRows(16);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold tracking-widest text-gold">{config.name}</h2>
      <GraphicCanvas config={config} stageRef={stageRef}>
        <GraphicHeader config={config} />
        {config.standings.columns.map((col, colIdx) => (
          <StandingsColumn
            key={col.stripX}
            config={config}
            col={col}
            colIdx={colIdx as 0 | 1}
            leftRows={leftRows}
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
