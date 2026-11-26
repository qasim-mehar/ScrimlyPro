"use client";

import { toPng } from "html-to-image";

const EXPORT_W = 1080;
const EXPORT_H = 1620;

/**
 * Export a graphic stage to a PNG data URL at EXACTLY 1080×1620.
 * - width/height passed EXPLICITLY: the stage's getBoundingClientRect is
 *   affected by the ancestor preview-scale transform, so html-to-image
 *   must never infer size from layout.
 * - pixelRatio 1: the stage is authored at final pixel size.
 * - Waits for document.fonts.ready, then a WARM-UP capture: the first
 *   capture on a fresh page can miss webfonts (fonts are inlined and
 *   cached only after the first pass). Warm-up is discarded.
 */
export async function exportPng(stage: HTMLElement): Promise<string> {
  await document.fonts.ready;

  // Belt and braces: html-to-image clones the DOM synchronously, so a race
  // with a slow art swap would otherwise bake a blank background into the PNG.
  // The background art is the stage's first <img> (ahead of any team logos).
  const art = stage.querySelector("img");
  if (art && !art.complete) {
    await new Promise<void>((resolve) => {
      art.addEventListener("load", () => resolve(), { once: true });
      art.addEventListener("error", () => resolve(), { once: true });
    });
  }
  if (art?.decode) {
    try {
      await art.decode();
    } catch {
      // A failed decode must not block an otherwise valid export.
    }
  }

  const options = {
    width: EXPORT_W,
    height: EXPORT_H,
    pixelRatio: 1,
    backgroundColor: "#0b0d12",
  } as const;

  await toPng(stage, options); // warm-up, discarded
  return toPng(stage, options);
}

/** Trigger a browser download of a PNG data URL. */
export function downloadPng(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
