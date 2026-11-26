"use client";

import { useRef, useState } from "react";

import type { SharedStandingsRow } from "@/lib/share/public-reader";
import type { TemplateConfig } from "@/lib/graphics";

import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";
import { OverallStandingsGraphic } from "./OverallStandingsGraphic";

/**
 * Public share preview: the rendered graphic plus a download button. The
 * adjacent HTML table is the accessible reading of the same numbers.
 */
export function ShareStandingsPreview({
  config,
  title,
  subtitle,
  standings,
  confirmedCount,
}: {
  config: TemplateConfig;
  title: string;
  subtitle: string;
  standings: SharedStandingsRow[];
  confirmedCount: number;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [artLoading, setArtLoading] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  return (
    <section
      aria-labelledby="graphic-heading"
      className="min-w-0 rounded-dash-lg bg-dash-surface p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="graphic-heading"
          className="text-base font-bold text-dash-ink"
        >
          Standings graphic
        </h2>
        <p className="text-[12px] text-dash-ink3">1080 × 1620</p>
      </div>
      <div className="overflow-hidden rounded-dash bg-dash-bg p-2 sm:p-3">
        <GraphicCanvas
          config={config}
          variant="standings"
          stageRef={stageRef}
          onLoadingChange={setArtLoading}
        >
          <OverallStandingsGraphic
            aestheticId={config.id}
            title={title}
            subtitle={subtitle}
            standings={standings.map((row) => ({ ...row, logoUrl: null }))}
            matchCount={confirmedCount}
          />
        </GraphicCanvas>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DownloadPngButton
          stageRef={stageRef}
          filename="scrimlypro-standings.png"
          disabled={artLoading}
          onExported={setSize}
        />
        <p className="text-[12px] text-dash-ink3">
          {size
            ? `Downloaded PNG · ${size.width} × ${size.height}`
            : "Download the graphic or read the table."}
        </p>
      </div>
    </section>
  );
}
