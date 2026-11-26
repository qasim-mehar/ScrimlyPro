"use client";

import { useRef, useState } from "react";

import {
  defaultAestheticId,
  getTemplate,
  selectableAestheticIds,
  type AestheticId,
} from "@/lib/graphics";
import { resolveStandingsFilename } from "@/lib/graphics/standings";
import type { StandingRow } from "@/lib/scoring";

import { AestheticChips } from "./AestheticChips";
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

export function StandingsPreview({
  title,
  subtitle,
  organizer,
  standings,
  matchCount,
  isFinal,
}: StandingsPreviewProps) {
  const variant = "standings" as const;
  const [aestheticId, setAestheticId] = useState<AestheticId>(() =>
    defaultAestheticId(variant),
  );
  const available = selectableAestheticIds(variant);
  const effectiveId = available.includes(aestheticId)
    ? aestheticId
    : available[0]!;
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Start disabled when the first paint already needs art: GraphicCanvas only
  // reports loading from an effect, which would leave one enabled window.
  const [artLoading, setArtLoading] = useState(
    () => getTemplate(effectiveId).backgrounds[variant].type === "image",
  );
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const filename = resolveStandingsFilename(subtitle, matchCount, isFinal);

  return (
    <section className="flex flex-col gap-3">
      <AestheticChips
        variant={variant}
        activeId={effectiveId}
        onSelect={setAestheticId}
      />
      <div className="overflow-hidden rounded-dash bg-dash-bg p-2 sm:p-3">
        <GraphicCanvas
          config={getTemplate(effectiveId)}
          variant={variant}
          stageRef={stageRef}
          onLoadingChange={setArtLoading}
        >
          <OverallStandingsGraphic
            aestheticId={effectiveId}
            title={title}
            subtitle={subtitle}
            organizer={organizer}
            standings={standings}
            matchCount={matchCount}
          />
        </GraphicCanvas>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DownloadPngButton
          stageRef={stageRef}
          filename={filename}
          disabled={artLoading}
          onExported={setSize}
        />
        <p className="text-[12px] text-dash-ink3">
          {size ? `PNG · ${size.width} × ${size.height}` : "1080 × 1620 portrait"}
        </p>
      </div>
    </section>
  );
}
