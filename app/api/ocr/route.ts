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
import {
  persistDraftMatch,
  resolveIngestTarget,
  runSquadsExtraction,
  type IngestError,
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
 * membership check + quota gate + ONE Gemini call with all images →
 * validated squads → draft match row upsert → typed JSON.
 *
 * Transaction shape (M1 review C1 re-applied around the M2 quota gate at
 * wave1(5) — the Gemini round trip takes ~15s and must never pin a pooled
 * connection inside a transaction):
 *   tx 1 (short): membership pre-select (belt, org predicate), the per-USER
 *                 OCR quota gate (B-1b — checked BEFORE the model call), and
 *                 the ingest state guards, all inside the RLS-scoped
 *                 withUserDb transaction.
 *   no-tx:        the model call / sample fixtures (no DB access at all).
 *   tx 2 (short): tenant context re-derived inside its own tx, then the
 *                 draft row upsert and — only on success — the usage row.
 *                 Failed attempts never consume quota; the guard→write race
 *                 (another tab confirming the match between tx1 and tx2)
 *                 degrades to a benign extra draft upsert; the confirm
 *                 endpoint re-checks state. RLS WITH CHECK scopes every
 *                 write even if membership drifted since tx 1.
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
    // tx 1 — short: membership (belt) + quota gate + ingest state guards
    // (RLS is the suspenders).
    const target = await withUserDb({ sub: user.id }, async (userDb) => {
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

      // Monthly OCR quota BEFORE the model call: a cheap COUNT inside this
      // request tx (M1 lesson: nothing slow goes near the quota check) +
      // one usage row AFTER a successful ingest (failed attempts never
      // consume quota). Per-USER meter (0014): the count is this user's
      // month-total across ALL orgs — a fresh org cannot restart the meter.
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

      const resolved = await resolveIngestTarget(
        userDb,
        parsed.sessionId,
        parsed.matchNo,
      );
      return { notFound: false as const, resolved };
    });

    if (target.notFound) {
      return noStore({ error: "not found" }, { status: 404 });
    }

    if ("quotaExceeded" in target) {
      // Envelope stays intact: ok/error.code/message + quota field.
      return noStore(
        {
          ok: false as const,
          error: {
            code: "QUOTA_EXCEEDED",
            message:
              "Monthly OCR limit reached for this organization. Contact support to raise limits.",
            quota: target.quotaExceeded,
          },
        },
        { status: 409 },
      );
    }

    const resolved = target.resolved;
    if (!resolved.ok) {
      return noStore(
        { ok: false, error: resolved.error },
        { status: STATUS_BY_CODE[resolved.error.code] },
      );
    }
    const targetOk = resolved;

    // NO transaction here: the model call touches no DB and takes ~15s
    // (M1 review C1).
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

    // tx 2 — short: re-derive tenant context inside its OWN transaction,
    // then draft upsert + usage row, RLS-scoped (WITH CHECK passes only for
    // member-visible sessions even if guard state drifted since tx 1).
    const ingest = await withUserDb({ sub: user.id }, async (userDb) => {
      const stillMember =
        (
          await userDb
            .select({ id: sessions.id, orgId: sessions.orgId })
            .from(sessions)
            .where(
              and(eq(sessions.id, parsed.sessionId), orgMemberPredicate(user.id)),
            )
            .limit(1)
        )[0] ?? null;
      if (!stillMember) {
        const gone: IngestError = {
          code: "SESSION_NOT_FOUND",
          message: "No session with this id.",
        };
        return { ok: false as const, error: gone };
      }
      const done = await persistDraftMatch(userDb, targetOk, extraction);
      // Usage is recorded only after a successful ingest.
      if (done.ok) {
        await recordUsage(userDb, stillMember.orgId, user.id);
      }
      return done;
    });

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
