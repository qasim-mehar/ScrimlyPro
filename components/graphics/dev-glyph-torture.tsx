"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";

import { getTemplate } from "@/lib/graphics";
import { PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { MVP_SUBTITLE, type MvpDisplayEntry } from "@/lib/graphics/mvp";
import type { StandingRow } from "@/lib/scoring";
import {
  GLYPH_MVP_PLAYERS,
  GLYPH_REFERENCE,
  GLYPH_TEAM_NAMES,
} from "@/lib/fixtures/glyphNames";

import { AnnouncementGraphic } from "./AnnouncementGraphic";
import { DownloadPngButton } from "./DownloadPngButton";
import { exportPng } from "./export";
import { GraphicCanvas } from "./GraphicCanvas";
import { MvpGraphic } from "./MvpGraphic";
import { OverallStandingsGraphic } from "./OverallStandingsGraphic";

const DEV_TITLE = "GLYPH TORTURE SCRIM";

function dummyStandings(): StandingRow[] {
  return GLYPH_TEAM_NAMES.map((name, i) => {
    const total = 120 - i * 5;
    const wwcd = i === 0 ? 3 : i < 5 ? 1 : 0;
    const kp = 20 - Math.floor(i / 3);
    return {
      teamId: `glyph-team-${i}`,
      teamName: name,
      logoUrl: null,
      wwcd,
      kp,
      pp: total - kp,
      total,
    };
  });
}

function mvpEntries(): MvpDisplayEntry[] {
  return GLYPH_MVP_PLAYERS.map((player, i) => ({
    rank: i + 1,
    name: player.name,
    teamName: GLYPH_TEAM_NAMES[player.teamIdx] ?? "",
    kills: player.kills,
  }));
}

function announcementTeams() {
  return GLYPH_TEAM_NAMES.map((name, i) => ({
    id: `glyph-team-${i}`,
    name,
    logoUrl: null,
  }));
}

/** Calls exportPng and renders the resulting data URL inline so the audit is
 * screenshottable without touching the downloads folder. */
function ExportedPreview({ stageRef }: { stageRef: RefObject<HTMLDivElement | null> }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function showExported() {
    const stage = stageRef.current;
    if (!stage) return;
    setBusy(true);
    setError(null);
    try {
      const url = await exportPng(stage);
      const measured = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Exported PNG could not be measured"));
        img.src = url;
      });
      setDataUrl(url);
      setSize(measured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          void showExported();
        }}
        disabled={busy}
        className="min-h-[44px] w-full rounded-md border border-line bg-surface px-4 text-sm font-semibold text-gold disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Show exported"}
      </button>
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- audit artifact: raw <img> shows the exported bytes
        <img
          src={dataUrl}
          alt="Exported PNG under audit"
          className="w-full rounded-md border border-line"
        />
      ) : null}
    </div>
  );
}

function TortureSection({
  heading,
  filename,
  variant,
  children,
}: {
  heading: string;
  filename: string;
  variant: "standings" | "mvp" | "announcement";
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold tracking-widest text-gold">{heading}</h2>
      <GraphicCanvas config={getTemplate("dark-gold")} variant={variant} stageRef={stageRef}>
        {children}
      </GraphicCanvas>
      <DownloadPngButton stageRef={stageRef} filename={filename} />
      <ExportedPreview stageRef={stageRef} />
    </section>
  );
}

export function DevGlyphTorture() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-widest text-gold">GLYPH TORTURE AUDIT</h1>
        <p className="text-sm text-muted">
          C7.1a — dev route. The graphics font stack (Exo 2, then Rajdhani and
          Noto Sans Symbols 2) does not cover these strings; they render via
          system-font fallback. Compare the on-screen lines below against each
          exported PNG.
        </p>
        <div className="rounded-md border border-line bg-surface p-3">
          <p className="text-xs font-semibold tracking-widest text-muted">
            ON-SCREEN BASELINE (every reference string once)
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {GLYPH_REFERENCE.map((line) => (
              <li key={line} className="text-base text-white">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <TortureSection heading="STANDINGS (16 teams)" filename="glyph-audit-standings.png" variant="standings">
        <OverallStandingsGraphic
          aestheticId="dark-gold"
          title={DEV_TITLE}
          subtitle="FINAL RESULTS"
          organizer="DEV GLYPH AUDIT"
          standings={dummyStandings()}
        />
      </TortureSection>

      <TortureSection heading="MVP (7 wild rows)" filename="glyph-audit-mvp.png" variant="mvp">
        <MvpGraphic
          aestheticId="dark-gold"
          title={DEV_TITLE}
          subtitle={MVP_SUBTITLE}
          organizer="DEV GLYPH AUDIT"
          entries={mvpEntries()}
        />
      </TortureSection>

      <TortureSection heading="ANNOUNCEMENT (16 teams)" filename="glyph-audit-announcement.png" variant="announcement">
        <AnnouncementGraphic
          aestheticId="dark-gold"
          title={DEV_TITLE}
          subtitle={PARTICIPATING_TEAMS}
          organizer="DEV GLYPH AUDIT"
          teams={announcementTeams()}
        />
      </TortureSection>
    </div>
  );
}
