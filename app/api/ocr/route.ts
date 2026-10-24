import { and, eq } from "drizzle-orm";

import { withTenantRoute } from "@/lib/auth/route-guard";
import { withUserDb } from "@/lib/db/user";
import { sessions } from "@/lib/db/schema";
import { noStore } from "@/lib/http";
import { parseOcrFormData } from "@/lib/ocr/form";
import {
  persistDraftMatch,
  resolveIngestTarget,
  runSquadsExtraction,
  type IngestErrorCode,
} from "@/lib/ocr/ingest";

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
 * Guarded by withTenantRoute: same-origin (403) → verified user (401) →
 * per-user rate limit (429). FormData (images, sessionId, matchNo) →
 * ownership check → ONE Gemini call with all images → validated squads →
 * draft match row upsert → typed JSON.
 *
 * Transaction shape (M1 review C1 — the Gemini round trip takes ~15s and must
 * never pin a pooled connection inside a transaction):
 *   tx 1 (short): ownership pre-select (belt) + ingest state guards, all
 *                 inside the RLS-scoped withUserDb transaction.
 *   no-tx:        the model call / sample fixtures (no DB access at all).
 *   tx 2 (short): draft row upsert, RLS-scoped. The guard→write race (another
 *                 tab confirming the match between tx1 and tx2) degrades to a
 *                 benign extra draft upsert, same as the single-user tool
 *                 always allowed; the confirm endpoint re-checks state.
 *
 * A foreign or missing sessionId is indistinguishable: 404 {"error":"not
 * found"} with zero existence leakage. Raw images are never persisted and
 * never logged.
 */
export const POST = withTenantRoute(async (request, { user }) => {
  let parsed: Awaited<ReturnType<typeof parseOcrFormData>>;
  try {
    parsed = await parseOcrFormData(await request.formData());
  } catch (err) {
    console.error("POST /api/ocr: failed to read multipart body", err);
    return noStore(
      { ok: false, error: { code: "BAD_REQUEST", message: "Could not read the upload." } },
      { status: 400 },
    );
  }
  if (!parsed.ok) {
    return noStore({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    // tx 1 — short: ownership (belt) + guards (RLS is the suspenders).
    const target = await withUserDb({ sub: user.id }, async (userDb) => {
      const owned =
        (
          await userDb
            .select({ id: sessions.id })
            .from(sessions)
            .where(
              and(eq(sessions.id, parsed.sessionId), eq(sessions.userId, user.id)),
            )
            .limit(1)
        )[0] ?? null;
      if (!owned) return { notFound: true as const };
      const resolved = await resolveIngestTarget(userDb, parsed.sessionId, parsed.matchNo);
      return { notFound: false as const, resolved };
    });

    const resolved = target.notFound ? null : target.resolved;
    if (resolved === null || !resolved.ok) {
      if (resolved === null) {
        return noStore({ error: "not found" }, { status: 404 });
      }
      return noStore(
        { ok: false, error: resolved.error },
        { status: STATUS_BY_CODE[resolved.error.code] },
      );
    }
    const targetOk = resolved;

    // NO transaction here: the model call touches no DB and takes ~15s.
    const extraction = await runSquadsExtraction(
      targetOk.session,
      parsed.matchNo,
      parsed.images,
    );
    if (!extraction.ok) {
      return noStore(
        { ok: false, error: extraction.error },
        { status: STATUS_BY_CODE[extraction.error.code] },
      );
    }

    // tx 2 — short: draft upsert, RLS-scoped (WITH CHECK passes only for
    // owned sessions even if the guard state drifted since tx 1).
    const ingest = await withUserDb({ sub: user.id }, async (userDb) => {
      return persistDraftMatch(userDb, targetOk, extraction);
    });

    return noStore(ingest, { status: 200 });
  } catch (err) {
    // Catch-all: detail goes to the server log only, never the client.
    console.error("POST /api/ocr: unexpected failure", err);
    return noStore(
      { ok: false, error: { code: "UNKNOWN", message: "Unexpected OCR failure." } },
      { status: 500 },
    );
  }
});
