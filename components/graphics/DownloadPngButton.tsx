"use client";

import { useState, type RefObject } from "react";
import { downloadPng, exportPng } from "./export";

type DownloadPngButtonProps = {
  stageRef: RefObject<HTMLDivElement | null>;
  filename: string;
  onExported?: (size: { width: number; height: number }) => void;
};

export function DownloadPngButton({ stageRef, filename, onExported }: DownloadPngButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    const stage = stageRef.current;
    if (!stage) return;

    setBusy(true);
    setError(null);
    try {
      const dataUrl = await exportPng(stage);
      downloadPng(dataUrl, filename);

      const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Exported PNG could not be verified"));
        img.src = dataUrl;
      });
      onExported?.(size);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PNG export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={busy}
        className="min-h-[44px] w-full rounded-md border border-line bg-surface px-4 text-sm font-semibold text-gold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Rendering…" : "Download PNG"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
