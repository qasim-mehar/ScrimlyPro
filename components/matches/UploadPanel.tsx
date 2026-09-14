"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { MAX_IMAGES, MAX_IMAGE_BYTES, TOTAL_PAYLOAD_BYTES } from "@/lib/ocr/form";

import { resizeImageFile } from "./resize-images";

type QueuedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type OcrError = { code: string; message: string };

const ACCEPT = "image/jpeg,image/png";

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function validateQueue(files: File[]): string | null {
  if (files.length < 1) return "Select at least 1 screenshot.";
  if (files.length > MAX_IMAGES) {
    return `Too many screenshots: ${files.length} (max ${MAX_IMAGES}). Remove some.`;
  }
  for (const file of files) {
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      return `"${file.name}" isn't a JPEG or PNG — pick screenshots only.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `"${file.name}" is ${formatMB(file.size)} (max 5MB each).`;
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > TOTAL_PAYLOAD_BYTES) {
    return `Total upload ${formatMB(total)} exceeds 20MB — remove some screenshots.`;
  }
  return null;
}

export function UploadPanel({
  sessionId,
  matchNo,
}: {
  sessionId: string;
  matchNo: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<OcrError | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");

  function addFiles(files: File[]): void {
    setError(null);
    const merged = [...queue.map((q) => q.file), ...files];
    const problem = validateQueue(merged);
    if (problem) {
      setNotice(problem);
      return;
    }
    setNotice(null);
    setQueue(
      merged.map((file, i) => {
        const existing = queue[i];
        if (existing && existing.file === file) return existing;
        return {
          id: `${file.name}-${file.size}-${i}`,
          file,
          previewUrl: URL.createObjectURL(file),
        };
      }),
    );
  }

  function removeAt(index: number): void {
    setQueue((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
    setNotice(null);
  }

  function move(index: number, delta: -1 | 1): void {
    setQueue((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  async function handleParse(): Promise<void> {
    const problem = validateQueue(queue.map((q) => q.file));
    if (problem) {
      setNotice(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("sessionId", sessionId);
      form.set("matchNo", String(matchNo));
      for (let i = 0; i < queue.length; i++) {
        const queued = queue[i];
        if (!queued) continue;
        setBusyLabel(`Reading screenshots… ${i + 1}/${queue.length}`);
        // Client downscale (R10); WhatsApp-small shots pass through untouched.
        const dataUrl = await resizeImageFile(queued.file);
        const blob = await (await fetch(dataUrl)).blob();
        const mime = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        const name = queued.file.name.replace(/\.[^.]*$/, "") + (mime === "image/png" ? ".png" : ".jpg");
        form.append("images", new File([blob], name, { type: mime }));
      }
      setBusyLabel(`Reading ${queue.length} screenshots…`);
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: OcrError };
      if (json.ok) {
        // The draft row now exists — refresh renders the review form.
        // LOBBY_KILLS_HIGH re-derives from the squads, so it survives refresh.
        router.refresh();
        return;
      }
      setError(json.error);
    } catch (err) {
      setError({
        code: "NETWORK",
        message: err instanceof Error ? err.message : "Upload failed. Check your connection and retry.",
      });
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <div role="alert" className="rounded-lg border border-red-500/60 bg-surface p-4">
          <p className="font-display text-lg font-semibold text-red-300">
            Couldn&apos;t read these screenshots ({error.code})
          </p>
          <p className="mt-1 text-sm text-muted">{error.message}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleParse();
            }}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-gold px-4 font-display text-lg font-semibold text-bg disabled:opacity-50"
          >
            {busy && busyLabel ? busyLabel : "Retry (keep files)"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setError(null)}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-muted disabled:opacity-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[44px] items-center justify-center rounded-lg border border-dashed border-line bg-surface px-4 text-sm font-semibold text-muted disabled:opacity-50"
      >
        {queue.length === 0
          ? "Select screenshots (1–14)"
          : `Add more (${queue.length}/14)`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {notice ? (
        <p role="alert" className="rounded-lg border border-line bg-surface p-3 text-sm text-muted">
          {notice}
        </p>
      ) : null}

      {queue.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {queue.map((queued, index) => (
            <li
              key={queued.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={queued.previewUrl}
                alt={`Screenshot ${index + 1}`}
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {index + 1}. {queued.file.name} ({formatMB(queued.file.size)})
              </span>
              <button
                type="button"
                aria-label={`Move screenshot ${index + 1} up`}
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-lg text-muted disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move screenshot ${index + 1} down`}
                disabled={busy || index === queue.length - 1}
                onClick={() => move(index, 1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-lg text-muted disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove screenshot ${index + 1}`}
                disabled={busy}
                onClick={() => removeAt(index)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-lg text-red-300 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        disabled={busy || queue.length === 0}
        onClick={() => {
          void handleParse();
        }}
        className="flex min-h-[44px] items-center justify-center rounded-lg bg-gold px-4 font-display text-lg font-semibold text-bg disabled:opacity-50"
      >
        {busy && busyLabel ? busyLabel : `Parse with Gemini (${queue.length})`}
      </button>
      <Link
        href={`/sessions/${sessionId}`}
        className="flex min-h-[44px] items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-muted"
      >
        Back to session
      </Link>
    </div>
  );
}
