"use client";

import { useRef, useState } from "react";
import { AESTHETICS, getTemplate, type AestheticId } from "@/lib/graphics";
import { resolveStandingsFilename } from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";
import { OverallStandingsGraphic } from "./OverallStandingsGraphic";

type StandingsPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  standings: StandingRow[];
  /** Match-number-mode templates (pmpl-light) bake "MATCH #" into the art, so
   * the subtitle carries no parseable number — pass the count directly and the
   * filename stays correct. Absent → legacy subtitle parsing (gradients). */
  matchCount?: number;
  isFinal?: boolean;
};

export function StandingsPreview({ title, subtitle, organizer, standings, matchCount, isFinal }: StandingsPreviewProps) {
  const [aestheticId, setAestheticId] = useState<AestheticId>("dark-gold");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const filename = resolveStandingsFilename(subtitle, matchCount, isFinal);

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
      <GraphicCanvas config={getTemplate(aestheticId)} variant="standings" stageRef={stageRef}>
        <OverallStandingsGraphic
          aestheticId={aestheticId}
          title={title}
          subtitle={subtitle}
          organizer={organizer}
          standings={standings}
          matchCount={matchCount}
        />
      </GraphicCanvas>
      <DownloadPngButton stageRef={stageRef} filename={filename} onExported={setSize} />
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
    </section>
  );
}
