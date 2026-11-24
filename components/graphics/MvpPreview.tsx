"use client";

import { useRef, useState } from "react";

import {
  defaultAestheticId,
  getTemplate,
  selectableAestheticIds,
  type AestheticId,
} from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

import { AestheticChips } from "./AestheticChips";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";
import { MvpGraphic } from "./MvpGraphic";

type MvpPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  entries: MvpDisplayEntry[];
};

export function MvpPreview({
  title,
  subtitle,
  organizer,
  entries,
}: MvpPreviewProps) {
  const variant = "mvp" as const;
  const [aestheticId, setAestheticId] = useState<AestheticId>(() =>
    defaultAestheticId(variant),
  );
  const available = selectableAestheticIds(variant);
  const effectiveId = available.includes(aestheticId)
    ? aestheticId
    : available[0]!;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

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
        >
          <MvpGraphic
            aestheticId={effectiveId}
            title={title}
            subtitle={subtitle}
            organizer={organizer}
            entries={entries}
          />
        </GraphicCanvas>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DownloadPngButton
          stageRef={stageRef}
          filename="scrimlypro-top-5-fraggers.png"
          onExported={setSize}
        />
        <p className="text-[12px] text-dash-ink3">
          {size ? `PNG · ${size.width} × ${size.height}` : "1080 × 1620 portrait"}
        </p>
      </div>
    </section>
  );
}
