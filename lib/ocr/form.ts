import type { ImageInput } from "@/lib/gemini/client";

/**
 * Multipart payload limits for POST /api/ocr (PRD §F2 + R10).
 * The client downscales before upload; the route re-enforces the caps.
 */
export const MIN_IMAGES = 1;
export const MAX_IMAGES = 14;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export type OcrFormError = { code: "BAD_REQUEST"; message: string };

export type ParsedOcrForm = {
  sessionId: string;
  matchNo: number;
  images: ImageInput[];
};

type ParseResult =
  | { ok: true; sessionId: string; matchNo: number; images: ImageInput[] }
  | { ok: false; error: OcrFormError };

function fail(message: string): ParseResult {
  return { ok: false, error: { code: "BAD_REQUEST", message } };
}

/**
 * Parse + validate the multipart upload payload. Pure apart from reading
 * the File bytes (base64 for the Gemini inlineData parts).
 *
 * Raw image bytes are converted to base64 transiently for the model call —
 * they are never written to disk or the DB (see lib/ocr/ingest.ts).
 */
export async function parseOcrFormData(form: FormData): Promise<ParseResult> {
  const sessionRaw = form.get("sessionId");
  const sessionId =
    typeof sessionRaw === "string" ? sessionRaw.trim() : "";
  if (!sessionId) {
    return fail("sessionId is required (non-empty string).");
  }

  const matchRaw = form.get("matchNo");
  const matchText = typeof matchRaw === "string" ? matchRaw.trim() : "";
  if (!matchText || !/^-?\d+$/.test(matchText)) {
    return fail(
      `matchNo must be an integer string (got ${typeof matchRaw === "string" ? `"${matchText}"` : "no matchNo"}).`,
    );
  }
  const matchNo = Number(matchText);
  if (!Number.isSafeInteger(matchNo)) {
    return fail(`matchNo must be an integer string (got "${matchText}").`);
  }

  const entries = form.getAll("images");
  if (entries.length < MIN_IMAGES) {
    return fail("Upload at least 1 image (field name \"images\").");
  }
  if (entries.length > MAX_IMAGES) {
    return fail(
      `Too many images: got ${entries.length} (max ${MAX_IMAGES}).`,
    );
  }

  const images: ImageInput[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const label = `image ${i + 1}`;
    if (!(entry instanceof File)) {
      return fail(`${label}: expected a file upload, got text.`);
    }
    if (!ALLOWED_MIME_TYPES.includes(entry.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return fail(
        `${label}: unsupported type "${entry.type || "unknown"}" (expected image/jpeg or image/png).`,
      );
    }
    if (entry.size <= 0) {
      return fail(`${label} ("${entry.name}"): file is empty.`);
    }
    if (entry.size > MAX_IMAGE_BYTES) {
      return fail(
        `${label} ("${entry.name}"): file is ${(entry.size / 1024 / 1024).toFixed(1)}MB (max 5MB).`,
      );
    }
    const bytes = await entry.arrayBuffer();
    images.push({
      mimeType: entry.type as ImageInput["mimeType"],
      dataBase64: Buffer.from(bytes).toString("base64"),
    });
  }

  return { ok: true, sessionId, matchNo, images };
}
