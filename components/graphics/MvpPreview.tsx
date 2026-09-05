"use client";

import { useRef, useState } from "react";

import { getTemplate, type AestheticId } from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";

import { DownloadPngButton } from "./DownloadPngButton";
import { GraphicCanvas } from "./GraphicCanvas";
import { MvpGraphic } from "./MvpGraphic";

const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom"];

type MvpPreviewProps = {
  title: string;
  subtitle: string;
  organizer?: string | null;
  entries: MvpDisplayEntry[];
};

export function MvpPreview({ title, subtitle, organizer, entries }: MvpPreviewProps) {
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
        <MvpGraphic
          aestheticId={aestheticId}
          title={title}
          subtitle={subtitle}
          organizer={organizer}
          entries={entries}
        />
      </GraphicCanvas>
      <DownloadPngButton stageRef={stageRef} filename="scrimlypro-top-5-fraggers.png" onExported={setSize} />
      <p className="text-xs text-muted">{size ? `PNG: ${size.width}×${size.height}` : "PNG: —"}</p>
    </section>
  );
}
