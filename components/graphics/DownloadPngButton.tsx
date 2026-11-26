"use client";

import { useState, type RefObject } from "react";

import { DownloadIcon } from "@/components/app/icons";
import { downloadPng, exportPng } from "./export";

type DownloadPngButtonProps = {
  stageRef: RefObject<HTMLDivElement | null>;
  filename: string;
  /** True while the selected template art is still loading. */
  disabled?: boolean;
  onExported?: (size: { width: number; height: number }) => void;
};

export function DownloadPngButton({
  stageRef,
  filename,
  disabled = false,
  onExported,
}: DownloadPngButtonProps) {
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

      const size = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () =>
            reject(new Error("Exported PNG could not be verified"));
          img.src = dataUrl;
        },
      );
      onExported?.(size);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PNG export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={busy || disabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-dash-line bg-dash-surface px-5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <DownloadIcon width="16" height="16" />
        {disabled ? "Loading art…" : busy ? "Rendering…" : "Download PNG"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-[13px] font-medium text-dash-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
