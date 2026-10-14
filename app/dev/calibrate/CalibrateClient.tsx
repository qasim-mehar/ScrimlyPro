"use client";

import { useState } from "react";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { effectivePitch, getTemplate, splitRows } from "@/lib/graphics";
import type { StandingRow } from "@/lib/scoring";

const GRID_STEP = 100;

function GridOverlay() {
  const verticals: number[] = [];
  for (let x = 0; x <= 1080; x += GRID_STEP) verticals.push(x);
  const horizontals: number[] = [];
  for (let y = 0; y <= 1620; y += GRID_STEP) horizontals.push(y);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {verticals.map((x) => (
        <div key={`v${x}`}>
          <div
            style={{
              position: "absolute",
              left: x,
              top: 0,
              width: 1,
              height: 1620,
              background: "rgba(255,0,80,0.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: x + 3,
              top: 2,
              font: "600 20px monospace",
              color: "rgba(255,0,80,0.9)",
            }}
          >
            {x}
          </div>
        </div>
      ))}
      {horizontals.map((y) => (
        <div key={`h${y}`}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: y,
              width: 1080,
              height: 1,
              background: "rgba(0,150,255,0.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 2,
              top: y + 3,
              font: "600 20px monospace",
              color: "rgba(0,150,255,0.9)",
            }}
          >
            {y}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalibrateClient({ datasets }: { datasets: Record<string, StandingRow[]> }) {
  const counts = Object.keys(datasets).map(Number).sort((a, b) => a - b);
  const [count, setCount] = useState<number>(counts.includes(19) ? 19 : counts[0]);
  const [grid, setGrid] = useState(true);
  const config = getTemplate("pmpl-light");
  const rows = datasets[String(count)] ?? [];
  const [leftCount, rightCount] = splitRows(rows.length);
  const pitches = config.standings.columns.map((col, i) =>
    effectivePitch(
      config.standings.rowY0,
      config.standings.rowPitch,
      col.rowsBottom,
      i === 0 ? leftCount : rightCount,
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {counts.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            aria-pressed={count === n}
            className={`min-h-[44px] border border-line px-4 text-sm tracking-widest ${
              count === n ? "bg-surface-2 text-gold" : "bg-surface text-muted"
            }`}
          >
            {n} teams
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGrid((g) => !g)}
          aria-pressed={grid}
          className="min-h-[44px] border border-line bg-surface px-4 text-sm tracking-widest text-muted"
        >
          grid {grid ? "on" : "off"}
        </button>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full max-w-xl flex-1">
          <GraphicCanvas config={config} variant="standings">
            <OverallStandingsGraphic
              aestheticId="pmpl-light"
              title="CALIBRATION SCRIM"
              subtitle="AFTER MATCH 6"
              organizer={null}
              standings={rows}
              matchCount={6}
            />
            {grid ? <GridOverlay /> : null}
          </GraphicCanvas>
        </div>
        <aside className="flex-1 rounded-lg border border-line bg-surface p-4 font-mono text-xs text-muted">
          <p className="font-semibold tracking-widest text-gold">PMPL-LIGHT GEOMETRY</p>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(
              {
                title: config.header.title,
                titleFont: config.header.titleFont,
                subtitle: config.header.subtitle,
                subtitleFont: config.header.subtitleFont,
                rowY0: config.standings.rowY0,
                rowHeight: config.standings.rowHeight,
                columns: config.standings.columns.map((col) => ({
                  rankX: col.rankX,
                  teamX: col.teamX,
                  teamW: col.teamW,
                  statColumns: col.statColumns,
                  stripX: col.stripX,
                  stripW: col.stripW,
                  rowsBottom: col.rowsBottom,
                })),
                split: { left: leftCount, right: rightCount },
                pitch: pitches,
                watermark: config.palette.watermarkColor,
                plates: {
                  plateBg: config.palette.plateBg,
                  plateRing: config.palette.plateRing,
                  medals: [config.palette.medalGold, config.palette.medalSilver, config.palette.medalBronze],
                  medalText: config.palette.medalText,
                },
              },
              null,
              1,
            )}
          </pre>
        </aside>
      </div>
    </div>
  );
}
