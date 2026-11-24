"use client";

import { useState } from "react";
import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import {
  AESTHETICS,
  effectivePitch,
  getTemplate,
  headerFor,
  hideScrimNameFor,
  splitRows,
  splitRowsAt,
  type AestheticId,
} from "@/lib/graphics";
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
  const [variant, setVariant] = useState<"standings" | "announcement">("standings");
  const [id, setId] = useState<AestheticId>("pmpl-light");
  const config = getTemplate(id);
  const standingsHeader = headerFor(config, "standings");
  const rows = datasets[String(count)] ?? [];
  // Announcement fixture: seats 1–12 assigned, 13+ NULL so the slot fallback
  // labels are exercised alongside the baked pipe/row geometry.
  const announceTeams = rows.map((r, i) => ({
    id: r.teamId,
    name: r.teamName,
    logoUrl: r.logoUrl,
    slotNumber: i < 12 ? i + 1 : null,
  }));
  const singleColumn = config.standings.singleColumn === true;
  const splitAt = config.standings.columns[0].rowsPerColumn ?? config.standings.rowsPerColumn;
  const [leftCount, rightCount] =
    splitAt !== undefined ? splitRowsAt(rows.length, splitAt) : splitRows(rows.length);
  const columns = singleColumn ? [config.standings.columns[0]] : config.standings.columns;
  const pitches = columns.map((col, i) =>
    effectivePitch(
      config.standings.rowY0,
      config.standings.rowPitch,
      col.rowsBottom,
      singleColumn ? rows.length : i === 0 ? leftCount : rightCount,
      col.fixedRowPitch ?? config.standings.fixedRowPitch === true,
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(AESTHETICS) as AestheticId[]).map((aestheticId) => (
          <button
            key={aestheticId}
            type="button"
            onClick={() => setId(aestheticId)}
            aria-pressed={id === aestheticId}
            className={`min-h-[44px] border border-line px-3 text-xs tracking-widest ${
              id === aestheticId ? "bg-surface-2 text-gold" : "bg-surface text-muted"
            }`}
          >
            {AESTHETICS[aestheticId].name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["standings", "announcement"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            aria-pressed={variant === v}
            className={`min-h-[44px] border border-line px-4 text-sm tracking-widest ${
              variant === v ? "bg-surface-2 text-gold" : "bg-surface text-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
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
          <GraphicCanvas config={config} variant={variant}>
            {variant === "announcement" ? (
              <AnnouncementGraphic
                aestheticId={id}
                title="CALIBRATION SCRIM"
                subtitle="PARTICIPATING TEAMS"
                organizer={null}
                teams={announceTeams}
              />
            ) : (
              <OverallStandingsGraphic
                aestheticId={id}
                title="CALIBRATION SCRIM"
                subtitle="AFTER MATCH 6"
                organizer={null}
                standings={rows}
                matchCount={6}
              />
            )}
            {grid ? <GridOverlay /> : null}
          </GraphicCanvas>
        </div>
        <aside className="flex-1 rounded-lg border border-line bg-surface p-4 font-mono text-xs text-muted">
          <p className="font-semibold tracking-widest text-gold">{config.name.toUpperCase()} GEOMETRY</p>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(
              {
                // The effective header for standings (variantHeaders win) —
                // art-backed templates hide/bake their title and move the
                // match-number slot, so the raw fallback slots would mislead.
                title: standingsHeader.title,
                titleFont: standingsHeader.titleFont,
                subtitle: standingsHeader.subtitle,
                subtitleFont: standingsHeader.subtitleFont,
                hideScrimName: hideScrimNameFor(config, "standings"),
                rowY0: config.standings.rowY0,
                rowPitch: config.standings.rowPitch,
                rowHeight: config.standings.rowHeight,
                statBoxW: config.standings.statBoxW,
                labelsBakedIn: config.labelsBakedIn ?? false,
                ranksBakedIn: config.standings.ranksBakedIn ?? false,
                rowsPerColumn: splitAt ?? null,
                columns: config.standings.columns.map((col) => ({
                  rankX: col.rankX,
                  teamX: col.teamX,
                  teamW: col.teamW,
                  statColumns: col.statColumns,
                  stripX: col.stripX,
                  stripW: col.stripW,
                  rowsBottom: col.rowsBottom,
                  ranksBakedIn: col.ranksBakedIn ?? null,
                  fixedRowPitch: col.fixedRowPitch ?? null,
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
          {variant === "announcement" ? (
            <pre className="mt-3 whitespace-pre-wrap">
              {JSON.stringify(
                {
                  rowY0: config.announcement.rowY0,
                  rowPitch: config.announcement.rowPitch,
                  rowHeight: config.announcement.rowHeight,
                  rowsPerColumn: config.announcement.rowsPerColumn,
                  leftX: config.announcement.leftX,
                  rightX: config.announcement.rightX,
                  slotPosition: config.announcement.slotPosition ?? "left",
                  pipeGap: config.announcement.pipeGap ?? null,
                  teamX: config.announcement.teamX,
                  teamW: config.announcement.teamW,
                  slotX: config.announcement.slotX,
                  slotW: config.announcement.slotW,
                  split: { left: Math.min(count, 12), right: Math.max(0, count - 12) },
                },
                null,
                1,
              )}
            </pre>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
