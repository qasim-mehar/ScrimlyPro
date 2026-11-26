"use client";

import { toPng } from "html-to-image";

const EXPORT_W = 1080;
const EXPORT_H = 1620;
const ART_TIMEOUT_MS = 15_000;

/** Internal cancellation sentinel — never shown to the user. */
export const EXPORT_SUPERSEDED = "EXPORT_SUPERSEDED";

/**
 * Export a graphic stage to a PNG data URL at EXACTLY 1080×1620.
 * - width/height passed EXPLICITLY: the stage's getBoundingClientRect is
 *   affected by the ancestor preview-scale transform, so html-to-image
 *   must never infer size from layout.
 * - pixelRatio 1: the stage is authored at final pixel size.
 * - Waits for document.fonts.ready, then a WARM-UP capture: the first
 *   capture on a fresh page can miss webfonts (fonts are inlined and
 *   cached only after the first pass). Warm-up is discarded.
 * - Waits for the background art to actually decode. Aesthetic switches
 *   mid-export are aborted via `isSuperseded` so no PNG mixes new text with
 *   old/blank art.
 */
export async function exportPng(
  stage: HTMLElement,
  isSuperseded?: () => boolean,
): Promise<string> {
  const assertCurrent = (): void => {
    if (isSuperseded?.()) throw new Error(EXPORT_SUPERSEDED);
  };

  await document.fonts.ready;
  assertCurrent();

  // html-to-image clones the DOM synchronously: the background art is the
  // stage's first <img> (ahead of any team logos) and must be settled first.
  const art = stage.querySelector("img");
  if (art && !art.complete) {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        art.removeEventListener("load", done);
        art.removeEventListener("error", done);
        resolve();
      };
      // A detached image can fire neither event — never hang the button.
      const timer = setTimeout(done, ART_TIMEOUT_MS);
      art.addEventListener("load", done, { once: true });
      art.addEventListener("error", done, { once: true });
    });
  }
  assertCurrent();

  if (art && art.naturalWidth === 0) {
    throw new Error("Template art failed to load — retry the download.");
  }
  if (art?.decode) {
    try {
      await art.decode();
    } catch {
      // A failed decode must not block an otherwise valid export.
    }
  }
  assertCurrent();

  const options = {
    width: EXPORT_W,
    height: EXPORT_H,
    pixelRatio: 1,
    backgroundColor: "#0b0d12",
  } as const;

  await toPng(stage, options); // warm-up, discarded
  assertCurrent();
  return toPng(stage, options);
}

/** Trigger a browser download of a PNG data URL. */
export function downloadPng(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
