import { NextResponse } from "next/server";

import { getDb } from "@/lib/db/client";
import { parseOcrFormData } from "@/lib/ocr/form";
import { ingestMatchOcr, type IngestErrorCode } from "@/lib/ocr/ingest";

const STATUS_BY_CODE: Record<IngestErrorCode | "BAD_REQUEST", number> = {
  BAD_REQUEST: 400,
  SAMPLE_UNAVAILABLE: 400,
  MATCH_NO_INVALID: 400,
  SESSION_NOT_FOUND: 404,
  SESSION_COMPLETED: 409,
  MATCH_CONFIRMED: 409,
  GEMINI_NO_KEY: 500,
  MODEL_FAILED: 502,
  PARSE_FAILED: 502,
  VALIDATION_FAILED: 502,
};

/**
 * POST /api/ocr — the match pipeline's front door (C5.2).
 * FormData (images, sessionId, matchNo) → ONE Gemini call with all images →
 * validated squads → draft match row upsert → typed JSON.
 *
 * Raw images are never persisted and never logged.
 */
export async function POST(request: Request) {
  let parsed: Awaited<ReturnType<typeof parseOcrFormData>>;
  try {
    parsed = await parseOcrFormData(await request.formData());
  } catch (err) {
    console.error("POST /api/ocr: failed to read multipart body", err);
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Could not read the upload." } },
      { status: 400 },
    );
  }
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 },
    );
  }

  try {
    const result = await ingestMatchOcr(getDb(), {
      sessionId: parsed.sessionId,
      matchNo: parsed.matchNo,
      images: parsed.images,
    });
    if (result.ok) {
      return NextResponse.json(result, { status: 200 });
    }
    const { error } = result;
    const body: Record<string, unknown> = {
      code: error.code,
      message: error.message,
    };
    if (error.matchId !== undefined) body.matchId = error.matchId;
    if (error.failure !== undefined) body.failure = error.failure;
    return NextResponse.json(
      { ok: false, error: body },
      { status: STATUS_BY_CODE[error.code] },
    );
  } catch (err) {
    // Catch-all: detail goes to the server log only, never the client.
    console.error("POST /api/ocr: unexpected failure", err);
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN", message: "Unexpected OCR failure." } },
      { status: 500 },
    );
  }
}
