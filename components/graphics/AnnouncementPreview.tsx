"use client";

import { useRef, useState } from "react";

import { getTemplate, type AestheticId } from "@/lib/graphics";
import type { TeamRow } from "@/lib/scoring";

import { AnnouncementGraphic } from "./AnnouncementGraphic";
import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";

const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom"];

type AnnouncementPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name" | "logoUrl">>;
};

export function AnnouncementPreview({ title, subtitle, organizer, teams }: AnnouncementPreviewProps) {
  const [aestheticId, setAestheticId] = useState<AestheticId>("dark-gold");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setAestheticId(id)}
            aria-pressed={id === aestheticId}
            className={
              id === aestheticId
                ? "min-h-[44px] rounded-md border border-gold bg-surface px-4 text-sm font-semibold text-gold"
                : "min-h-[44px] rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface-2"
            }
          >
            {getTemplate(id).name}
          </button>
        ))}
      </div>
      <GraphicCanvas config={getTemplate(aestheticId)} stageRef={stageRef}>
        <AnnouncementGraphic
          aestheticId={aestheticId}
          title={title}
          subtitle={subtitle}
          organizer={organizer}
          teams={teams}
        />
      </GraphicCanvas>
      <DownloadPngButton
        stageRef={stageRef}
        filename="scrimlypro-participating-teams.png"
        onExported={setSize}
      />
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
    </section>
  );
}
