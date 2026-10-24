import { and, eq } from "drizzle-orm";

import { withTenantRoute } from "@/lib/auth/route-guard";
import { withUserDb } from "@/lib/db/user";
import { sessions } from "@/lib/db/schema";
import { orgMemberPredicate } from "@/lib/orgs/orgs";
import {
  assertOcrQuota,
  QuotaExceededError,
  recordUsage,
} from "@/lib/orgs/quotas";
import { noStore } from "@/lib/http";
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
 * Guarded by withTenantRoute: same-origin (403) → verified user (401) →
 * per-user rate limit (429). FormData (images, sessionId, matchNo) →
 * ownership check + ONE Gemini call with all images → validated squads →
 * draft match row upsert → typed JSON.
 *
 * The whole tenant path (session lookup + Gemini call + draft upsert) runs
 * INSIDE the withUserDb transaction, so RLS scopes every read and write.
 * A foreign or missing sessionId is indistinguishable: 404 {"error":"not
 * found"} with zero existence leakage.
 *
 * Raw images are never persisted and never logged.
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
    const result = await withUserDb({ sub: user.id }, async (userDb) => {
      // Membership gate (belt, M2): select the session inside the RLS
      // transaction with the explicit org-membership predicate. RLS
      // (suspenders) already filters foreign rows to the same effect —
      // missing and foreign both land here as null.
      const session =
        (
          await userDb
            .select({ id: sessions.id, orgId: sessions.orgId })
            .from(sessions)
            .where(
              and(eq(sessions.id, parsed.sessionId), orgMemberPredicate(user.id)),
            )
            .limit(1)
        )[0] ?? null;
      if (!session) return { notFound: true as const };

      // Monthly OCR quota: a cheap COUNT inside this request tx (M1
      // lesson: nothing slow goes near the quota check) + one usage row
      // AFTER a successful ingest (failed attempts never consume quota).
      // Per-USER meter (0014): the count is this user's month-total across
      // all orgs — a fresh org cannot restart the meter.
      try {
        await assertOcrQuota(userDb, session.orgId, user.id);
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          return {
            notFound: false as const,
            quotaExceeded: err.quota,
          };
        }
        throw err;
      }

      // Gemini call + draft upsert run inside the same RLS-scoped
      // transaction: the ingest insert carries the authenticated role +
      // verified claims (WITH CHECK passes only for owned sessions).
      const ingest = await ingestMatchOcr(userDb, {
        sessionId: parsed.sessionId,
        matchNo: parsed.matchNo,
        images: parsed.images,
      });
      if (ingest.ok) {
        await recordUsage(userDb, session.orgId, user.id);
      }
      return { notFound: false as const, ingest };
    });

    if (result.notFound) {
      return noStore({ error: "not found" }, { status: 404 });
    }

    if ("quotaExceeded" in result) {
      // Envelope stays intact: ok/error.code/message + quota field.
      return noStore(
        {
          ok: false as const,
          error: {
            code: "QUOTA_EXCEEDED",
            message:
              "Monthly OCR limit reached for this organization. Contact support to raise limits.",
            quota: result.quotaExceeded,
          },
        },
        { status: 409 },
      );
    }

    const ingest = result.ingest;
    if (ingest.ok) {
      return noStore(ingest, { status: 200 });
    }
    const { error } = ingest;
    const body: Record<string, unknown> = {
      code: error.code,
      message: error.message,
    };
    if (error.matchId !== undefined) body.matchId = error.matchId;
    if (error.failure !== undefined) body.failure = error.failure;
    return noStore({ ok: false, error: body }, { status: STATUS_BY_CODE[error.code] });
  } catch (err) {
    // Catch-all: detail goes to the server log only, never the client.
    console.error("POST /api/ocr: unexpected failure", err);
    return noStore(
      { ok: false, error: { code: "UNKNOWN", message: "Unexpected OCR failure." } },
      { status: 500 },
    );
  }
});
