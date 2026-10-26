"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import clsx from "clsx";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ImageIcon,
  XIcon,
} from "@/components/app/icons";
import { buttonStyles, StatusChip } from "@/components/app/ui";
import { CameraIcon } from "@/components/dashboard/icons";
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
      return `"${file.name}" is ${formatMB(file.size)} (max ${formatMB(MAX_IMAGE_BYTES)} each).`;
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > TOTAL_PAYLOAD_BYTES) {
    return `Total upload ${formatMB(total)} exceeds ${formatMB(TOTAL_PAYLOAD_BYTES)} — remove some screenshots.`;
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
  const [dragging, setDragging] = useState(false);

  function addFiles(files: File[]): void {
    if (files.length === 0) return;
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

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    addFiles(Array.from(event.dataTransfer.files));
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
        const mime = dataUrl.startsWith("data:image/png")
          ? "image/png"
          : "image/jpeg";
        const name =
          queued.file.name.replace(/\.[^.]*$/, "") +
          (mime === "image/png" ? ".png" : ".jpg");
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
        message:
          err instanceof Error
            ? err.message
            : "Upload failed. Check your connection and retry.",
      });
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <div
          role="alert"
          className="rounded-dash border border-dash-danger-bg bg-dash-surface p-5"
        >
          <StatusChip tone="danger">Read failed · {error.code}</StatusChip>
          <p className="mt-3 text-lg font-bold text-dash-ink">
            Couldn&apos;t read these screenshots
          </p>
          <p className="mt-1 text-sm leading-6 text-dash-ink2">
            {error.message}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-dash-ink3">
            Your files are still queued. Check the screenshots are the full
            result screen, then retry.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleParse();
            }}
            className={buttonStyles.primary}
          >
            {busy && busyLabel ? busyLabel : "Retry with the same files"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setError(null)}
            className={buttonStyles.secondary}
          >
            Back to the queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          "rounded-dash border-2 border-dashed p-1.5 transition-colors",
          dragging
            ? "border-dash-ink bg-dash-lime/25"
            : "border-dash-line bg-dash-surface",
        )}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-[16px] px-4 py-8 text-center transition-colors hover:bg-dash-bg/70 disabled:opacity-50"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
            <CameraIcon width="22" height="22" />
          </span>
          <span className="text-base font-bold text-dash-ink">
            {queue.length === 0
              ? "Select result screenshots"
              : `Add more screenshots (${queue.length}/${MAX_IMAGES})`}
          </span>
          <span className="max-w-[42ch] text-[13px] leading-5 text-dash-ink3">
            JPEG or PNG · up to {MAX_IMAGES} shots ·{" "}
            {formatMB(MAX_IMAGE_BYTES)} each. Drag and drop works too.
          </span>
        </button>
      </div>
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
        <p
          role="alert"
          className="rounded-[12px] border border-dash-amber-bg bg-dash-amber-bg/40 p-3 text-[13px] leading-5 font-medium text-dash-amber-ink"
        >
          {notice}
        </p>
      ) : null}

      {queue.length > 0 ? (
        <section aria-labelledby="upload-queue-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="upload-queue-heading"
              className="text-sm font-bold text-dash-ink"
            >
              Upload queue
            </h2>
            <p className="text-[12px] text-dash-ink3">
              Order is the order you added them. Reorder with the arrows.
            </p>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {queue.map((queued, index) => (
              <li
                key={queued.id}
                className="overflow-hidden rounded-dash border border-dash-line bg-dash-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={queued.previewUrl}
                  alt={`Screenshot ${index + 1}`}
                  className="aspect-[4/3] w-full bg-dash-bg object-cover"
                />
                <div className="p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-dash-ink text-[11px] font-bold tabular-nums text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-dash-ink2">
                      {queued.file.name}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-7 text-[11px] text-dash-ink3">
                    {formatMB(queued.file.size)}
                  </p>
                  <div className="mt-1.5 flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      aria-label={`Move screenshot ${index + 1} up`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                      className="flex size-11 items-center justify-center rounded-full text-dash-ink2 transition-colors hover:bg-dash-bg hover:text-dash-ink disabled:opacity-25"
                    >
                      <ArrowUpIcon width="17" height="17" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move screenshot ${index + 1} down`}
                      disabled={busy || index === queue.length - 1}
                      onClick={() => move(index, 1)}
                      className="flex size-11 items-center justify-center rounded-full text-dash-ink2 transition-colors hover:bg-dash-bg hover:text-dash-ink disabled:opacity-25"
                    >
                      <ArrowDownIcon width="17" height="17" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove screenshot ${index + 1}`}
                      disabled={busy}
                      onClick={() => removeAt(index)}
                      className="flex size-11 items-center justify-center rounded-full text-dash-ink3 transition-colors hover:bg-dash-danger-bg hover:text-dash-danger-ink disabled:opacity-25"
                    >
                      <XIcon width="18" height="18" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="flex items-start gap-3 rounded-dash bg-dash-surface p-4 text-[13px] leading-5 text-dash-ink3">
          <ImageIcon
            width="18"
            height="18"
            className="mt-0.5 shrink-0 text-dash-ink4"
          />
          <p>
            One screenshot per squad results page works best. If the result
            scrolls, upload the whole set in order.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={busy || queue.length === 0}
        onClick={() => {
          void handleParse();
        }}
        className={`${buttonStyles.primary} w-full`}
      >
        {busy && busyLabel
          ? busyLabel
          : `Read ${queue.length || ""} screenshot${queue.length === 1 ? "" : "s"} with AI`}
      </button>
      {busy ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[12px] bg-dash-lime/30 p-3"
        >
          <p className="text-[13px] font-semibold text-dash-lime-ink">
            {busyLabel || "Reading screenshots…"}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-dash-ink" />
          </div>
        </div>
      ) : null}
      <Link
        href={`/sessions/${sessionId}`}
        className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-dash-ink3 transition-colors hover:bg-dash-surface hover:text-dash-ink"
      >
        Back to the session
      </Link>
    </div>
  );
}
