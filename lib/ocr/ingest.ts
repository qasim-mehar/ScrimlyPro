import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { matches, sessions, type RawSquad } from "@/lib/db/schema";
import { SAMPLE_MATCHES } from "@/lib/fixtures/sampleMatches";
import {
  GeminiError,
  parseMatchSquads,
  type CallModel,
  type ImageInput,
  type ValidationWarning,
} from "@/lib/gemini";
import type { ValidationFailure } from "@/lib/gemini/validate";

export type IngestInput = {
  sessionId: string;
  matchNo: number;
  images: ImageInput[];
};

export type IngestErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_COMPLETED"
  | "MATCH_NO_INVALID"
  | "MATCH_CONFIRMED"
  | "SAMPLE_UNAVAILABLE"
  | "GEMINI_NO_KEY"
  | "MODEL_FAILED"
  | "PARSE_FAILED"
  | "VALIDATION_FAILED";

export type IngestError = {
  code: IngestErrorCode;
  message: string;
  matchId?: string;
  failure?: ValidationFailure;
};

export type IngestResult =
  | {
      ok: true;
      matchId: string;
      model: string;
      retried: boolean;
      warnings: ValidationWarning[];
      squads: RawSquad[];
    }
  | { ok: false; error: IngestError };

export type IngestOpts = { callModel?: CallModel };

/**
 * Core OCR ingest: validate → model (or fixtures) → upsert draft match row.
 *
 * INVARIANTS (PRD R1/R6/R10):
 * - Raw images are never persisted: only the parsed `squads` JSON lands on
 *   the match row (`rawSquadData`). The base64 payloads die with the request.
 * - Base64 is never logged: any logging must record counts/sizes only.
 * - Re-parsing an existing draft REPLACES its `rawSquadData` (new OCR cost);
 *   reopening a draft in C5.3 must NOT call this again.
 */
export type IngestTarget = {
  ok: true;
  matchNo: number;
  session: typeof sessions.$inferSelect;
  existing: typeof matches.$inferSelect | null;
};

/**
 * Short-transaction piece 1: all state guards (session exists + active,
 * matchNo in range, match not confirmed). Runs inside a withUserDb
 * transaction in the request path — NO model call may follow in the same
 * transaction (the Gemini call takes ~15s and would pin a pooled connection;
 * M1 review C1).
 */
export async function resolveIngestTarget(
  db: Db,
  sessionId: string,
  matchNo: number,
): Promise<IngestTarget | { ok: false; error: IngestError }> {
  const session =
    (
      await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
    )[0] ?? null;
  if (!session) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: `No session with id "${sessionId}".`,
      },
    };
  }
  if (session.status === "completed") {
    return {
      ok: false,
      error: {
        code: "SESSION_COMPLETED",
        message: "Session is completed. Reopen the session first.",
      },
    };
  }

  if (
    !Number.isInteger(matchNo) ||
    matchNo < 1 ||
    matchNo > session.plannedMatches
  ) {
    return {
      ok: false,
      error: {
        code: "MATCH_NO_INVALID",
        message: `matchNo must be an integer 1..${session.plannedMatches} (planned matches).`,
      },
    };
  }

  const existing =
    (
      await db
        .select()
        .from(matches)
        .where(
          and(eq(matches.sessionId, sessionId), eq(matches.matchNo, matchNo)),
        )
        .limit(1)
    )[0] ?? null;
  if (existing && existing.status === "confirmed") {
    return {
      ok: false,
      error: {
        code: "MATCH_CONFIRMED",
        message: "Match is already confirmed. Unlock the match first.",
        matchId: existing.id,
      },
    };
  }
  return { ok: true, matchNo, session, existing };
}

/**
 * Transaction-FREE piece 2: the model call (or sample fixtures). Runs
 * OUTSIDE any DB transaction so the Gemini round trip (~15s on a real match)
 * never pins a pooled connection (M1 review C1). Pure input→output: no DB.
 */
export async function runSquadsExtraction(
  session: { teamCount: number },
  matchNo: number,
  images: ImageInput[],
  opts?: IngestOpts,
): Promise<
  | { ok: true; squads: RawSquad[]; model: string; retried: boolean; warnings: ValidationWarning[] }
  | { ok: false; error: IngestError }
> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.SAMPLE_OCR === "1") {
      const fixture = SAMPLE_MATCHES[matchNo - 1];
      if (!fixture) {
        return {
          ok: false,
          error: {
            code: "SAMPLE_UNAVAILABLE",
            message: `Fixtures exist for matches 1–3 (requested match ${matchNo}).`,
          },
        };
      }
      // Deep copy so callers can never mutate the module-level fixture.
      const squads = JSON.parse(JSON.stringify(fixture)) as RawSquad[];
      return { ok: true, squads, model: "sample", retried: false, warnings: [] };
    }
    return {
      ok: false,
      error: {
        code: "GEMINI_NO_KEY",
        message:
          "GEMINI_API_KEY is not set. Set the key or run with SAMPLE_OCR=1 for fixture mode.",
      },
    };
  }
  try {
    const parsed = await parseMatchSquads(images, session.teamCount, {
      callModel: opts?.callModel,
    });
    return {
      ok: true,
      squads: parsed.squads,
      model: parsed.model,
      retried: parsed.retried,
      warnings: parsed.warnings,
    };
  } catch (err) {
    if (err instanceof GeminiError) {
      const error: IngestError = { code: err.code, message: err.message };
      if (err.failure !== undefined) error.failure = err.failure;
      return { ok: false, error };
    }
    throw err;
  }
}

/**
 * Short-transaction piece 3: upsert the draft match row. Callers must pass a
 * target resolved in the SAME RLS scope and re-resolve it if time has passed —
 * the route re-checks MATCH_CONFIRMED via the earlier target under withUserDb.
 */
export async function persistDraftMatch(
  db: Db,
  target: IngestTarget,
  extraction: { squads: RawSquad[]; model: string; retried: boolean; warnings: ValidationWarning[] },
): Promise<Extract<IngestResult, { ok: true }>> {
  const sessionId = target.session.id;
  const existing = target.existing;
  const resolvedMatchNo = existing?.matchNo ?? target.matchNo;
  const now = new Date().toISOString();
  let matchId: string;
  if (existing) {
    // Draft re-parse: replace the OCR snapshot, keep the row identity.
    await db
      .update(matches)
      .set({ rawSquadData: extraction.squads, status: "draft" })
      .where(eq(matches.id, existing.id));
    matchId = existing.id;
  } else {
    matchId = crypto.randomUUID();
    await db.insert(matches).values({
      id: matchId,
      sessionId,
      matchNo: resolvedMatchNo,
      status: "draft",
      rawSquadData: extraction.squads,
      createdAt: now,
    });
  }
  return {
    ok: true,
    matchId,
    model: extraction.model,
    retried: extraction.retried,
    warnings: extraction.warnings,
    squads: extraction.squads,
  };
}

/**
 * Core OCR ingest: validate → model (or fixtures) → upsert draft match row.
 * Sequential composition of the three pieces on ONE db handle — kept for the
 * lib test suite (tests/ocr-ingest.test.ts) which passes a plain handle. The
 * REQUEST PATH must NOT use this: use the split pieces (see app/api/ocr/route.ts)
 * so the model call never runs inside a transaction (M1 review C1).
 *
 * INVARIANTS (PRD R1/R6/R10):
 * - Raw images are never persisted: only the parsed `squads` JSON lands on
 *   the match row (`rawSquadData`). The base64 payloads die with the request.
 * - Base64 is never logged: any logging must record counts/sizes only.
 * - Re-parsing an existing draft REPLACES its `rawSquadData` (new OCR cost);
 *   reopening a draft in C5.3 must NOT call this again.
 */
export async function ingestMatchOcr(
  db: Db,
  input: IngestInput,
  opts?: IngestOpts,
): Promise<IngestResult> {
  const target = await resolveIngestTarget(db, input.sessionId, input.matchNo);
  if (!target.ok) return target;
  const extraction = await runSquadsExtraction(
    target.session,
    input.matchNo,
    input.images,
    opts,
  );
  if (!extraction.ok) return extraction;
  return persistDraftMatch(db, target, extraction);
}
