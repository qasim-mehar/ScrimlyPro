"use client";

import { useRef, useState } from "react";

import {
  defaultAestheticId,
  getTemplate,
  selectableAestheticIds,
  type AestheticId,
} from "@/lib/graphics";
import type { TeamRow } from "@/lib/scoring";

import { AestheticChips } from "./AestheticChips";
import { AnnouncementGraphic } from "./AnnouncementGraphic";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";

type AnnouncementPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">>;
  /** Dev-fixture preset: boot the picker on a specific art-backed template. */
  initialAestheticId?: AestheticId;
};

export function AnnouncementPreview({
  title,
  subtitle,
  organizer,
  teams,
  initialAestheticId,
}: AnnouncementPreviewProps) {
  const variant = "announcement" as const;
  const [aestheticId, setAestheticId] = useState<AestheticId>(() =>
    initialAestheticId ?? defaultAestheticId(variant),
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
          <AnnouncementGraphic
            aestheticId={effectiveId}
            title={title}
            subtitle={subtitle}
            organizer={organizer}
            teams={teams}
          />
        </GraphicCanvas>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DownloadPngButton
          stageRef={stageRef}
          filename="scrimlypro-participating-teams.png"
          onExported={setSize}
        />
        <p className="text-[12px] text-dash-ink3">
          {size ? `PNG · ${size.width} × ${size.height}` : "1080 × 1620 portrait"}
        </p>
      </div>
    </section>
  );
}
