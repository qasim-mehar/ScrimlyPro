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
export async function ingestMatchOcr(
  db: Db,
  input: IngestInput,
  opts?: IngestOpts,
): Promise<IngestResult> {
  const { sessionId, matchNo, images } = input;

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

  let squads: RawSquad[];
  let model: string;
  let retried: boolean;
  let warnings: ValidationWarning[];

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
      squads = JSON.parse(JSON.stringify(fixture)) as RawSquad[];
      model = "sample";
      retried = false;
      warnings = [];
    } else {
      return {
        ok: false,
        error: {
          code: "GEMINI_NO_KEY",
          message:
            "GEMINI_API_KEY is not set. Set the key or run with SAMPLE_OCR=1 for fixture mode.",
        },
      };
    }
  } else {
    try {
      const parsed = await parseMatchSquads(images, session.teamCount, {
        callModel: opts?.callModel,
      });
      squads = parsed.squads;
      model = parsed.model;
      retried = parsed.retried;
      warnings = parsed.warnings;
    } catch (err) {
      if (err instanceof GeminiError) {
        const result: IngestResult = {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
          },
        };
        if (err.failure !== undefined && !result.ok) {
          result.error.failure = err.failure;
        }
        return result;
      }
      throw err;
    }
  }

  const now = new Date().toISOString();
  let matchId: string;
  if (existing) {
    // Draft re-parse: replace the OCR snapshot, keep the row identity.
    await db
      .update(matches)
      .set({ rawSquadData: squads, status: "draft" })
      .where(eq(matches.id, existing.id));
    matchId = existing.id;
  } else {
    matchId = crypto.randomUUID();
    await db.insert(matches).values({
      id: matchId,
      sessionId,
      matchNo,
      status: "draft",
      rawSquadData: squads,
      createdAt: now,
    });
  }

  return { ok: true, matchId, model, retried, warnings, squads };
}
