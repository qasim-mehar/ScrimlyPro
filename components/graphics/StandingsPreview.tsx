"use client";

import { useRef, useState } from "react";
import { AESTHETICS, getTemplate, type AestheticId } from "@/lib/graphics";
import type { StandingRow } from "@/lib/scoring";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";
import { OverallStandingsGraphic } from "./OverallStandingsGraphic";

/** Export filename: FINAL RESULTS variant, else AFTER-MATCH-N. Defensive
 * fallback for subtitles that are neither (simplest option; see Assumptions). */
function exportFilename(subtitle: string): string {
  if (subtitle === "FINAL RESULTS") return "scrimlypro-final-standings.png";
  const matchNo = /^AFTER MATCH (\d+)$/.exec(subtitle)?.[1];
  return matchNo ? `scrimlypro-standings-after-match-${matchNo}.png` : "scrimlypro-standings.png";
}

type StandingsPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  standings: StandingRow[];
};

export function StandingsPreview({ title, subtitle, organizer, standings }: StandingsPreviewProps) {
  const [aestheticId, setAestheticId] = useState<AestheticId>("dark-gold");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(AESTHETICS) as AestheticId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setAestheticId(id)}
            aria-pressed={aestheticId === id}
            className={`min-h-[44px] border border-line px-3 text-sm tracking-widest ${
              aestheticId === id ? "bg-surface-2 text-gold" : "bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {AESTHETICS[id].name}
          </button>
        ))}
      </div>
      <GraphicCanvas config={getTemplate(aestheticId)} stageRef={stageRef}>
        <OverallStandingsGraphic
          aestheticId={aestheticId}
          title={title}
          subtitle={subtitle}
          organizer={organizer}
          standings={standings}
        />
      </GraphicCanvas>
      <DownloadPngButton stageRef={stageRef} filename={exportFilename(subtitle)} onExported={setSize} />
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
    </section>
  );
}
