import { GoogleGenAI, type Part } from "@google/genai";

import type { RawSquad } from "@/lib/db/schema";
import type { ValidationFailure } from "@/lib/gemini/validate";

export type ImageInput = {
  mimeType: "image/jpeg" | "image/png";
  dataBase64: string;
};

/** Injectable transport — tests pass fakes; default uses @google/genai. */
export type CallModel = (
  model: string,
  parts: Array<Record<string, unknown>>,
) => Promise<string>; // resolves to the model's text output

export type GeminiErrorCode =
  | "GEMINI_NO_KEY"
  | "MODEL_FAILED"
  | "PARSE_FAILED"
  | "VALIDATION_FAILED";

export class GeminiError extends Error {
  code: GeminiErrorCode;
  detail?: string;
  failure?: ValidationFailure;

  constructor(code: GeminiErrorCode, detail?: string, failure?: ValidationFailure) {
    super(`${code}${detail ? ": " + detail : ""}`);
    this.name = "GeminiError";
    this.code = code;
    this.detail = detail;
    this.failure = failure;
  }
}

export const OCR_PROMPT_TEMPLATE = `You are parsing PUBG Mobile custom-room match results.
You will receive several sequential screenshots of ONE end-of-match results screen, captured by scrolling. Consecutive screenshots OVERLAP — the same squad may appear in multiple screenshots.

Extract every squad in the lobby:
- placement: the rank number PRINTED ON SCREEN (1 = the winner / Winner Winner Chicken Dinner squad), never the order rows appear in.
- players: every player in that squad with their exact in-game name and elimination count ("X eliminations").
- squadTag: shared prefix/tag across the squad's names, else "".

Rules:
- Copy names CHARACTER-FOR-CHARACTER — symbols, ×, ·, |, _, emojis, stylized capitals. Never normalize, translate, or "fix" spelling.
- Kills = the number beside each name. Unreadable → 0 and confidence "low".
- Deduplicate squads/players appearing in multiple screenshots.
- Order squads by placement ascending, 1..N, no gaps, no duplicates.
- The lobby has {TEAM_COUNT} squads. If you extract fewer, re-scan every screenshot before answering. NEVER invent squads, players, or numbers to reach the expected count.
- Anything ambiguous → confidence "low".`;

export const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      placement: { type: "INTEGER" },
      squadTag: { type: "STRING" },
      confidence: { type: "STRING", enum: ["high", "low"] },
      players: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            kills: { type: "INTEGER" },
            confidence: { type: "STRING", enum: ["high", "low"] },
          },
          required: ["name", "kills"],
        },
      },
    },
    required: ["placement", "players"],
  },
} as const;

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_FALLBACKS = "gemini-2.5-flash-lite,gemini-2.0-flash-lite";
const TIMEOUT_MS = 60_000;

function modelChain(): string[] {
  const fallbacks = (process.env.GEMINI_MODEL_FALLBACKS ?? DEFAULT_FALLBACKS)
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
  return [process.env.GEMINI_MODEL ?? DEFAULT_MODEL, ...fallbacks];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isModelMissing(err: unknown): boolean {
  return /404|not\s*found|NOT_FOUND/i.test(errorMessage(err));
}

async function defaultCallModel(
  model: string,
  parts: Array<Record<string, unknown>>,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_NO_KEY");
  // 60s timeout via the SDK's httpOptions (supported in @google/genai 2.21).
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: parts as unknown as Part[] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  return response.text ?? "";
}

export async function generateSquads(
  images: ImageInput[],
  teamCount: number,
  opts?: {
    callModel?: CallModel;
    extraInstructions?: string; // appended by the retry orchestrator
  },
): Promise<{ squads: RawSquad[]; model: string }> {
  const callModel = opts?.callModel ?? defaultCallModel;
  const prompt =
    OCR_PROMPT_TEMPLATE.replace("{TEAM_COUNT}", String(teamCount)) +
    (opts?.extraInstructions ? `\n\n${opts.extraInstructions}` : "");
  const parts: Array<Record<string, unknown>> = [
    ...images.map((image) => ({
      inlineData: { mimeType: image.mimeType, data: image.dataBase64 },
    })),
    { text: prompt },
  ];

  const chain = modelChain();
  for (const model of chain) {
    let text: string;
    try {
      text = await callModel(model, parts);
    } catch (err) {
      if (err instanceof GeminiError) throw err;
      if (isModelMissing(err)) continue;
      throw new GeminiError("MODEL_FAILED", errorMessage(err));
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new GeminiError(
        "PARSE_FAILED",
        `model ${model}: response was not valid JSON (${errorMessage(err)})`,
      );
    }
    if (!Array.isArray(parsed)) {
      throw new GeminiError(
        "PARSE_FAILED",
        `model ${model}: response was not a JSON array`,
      );
    }
    return { squads: parsed as RawSquad[], model };
  }
  throw new GeminiError(
    "MODEL_FAILED",
    `all models unavailable (last tried: ${chain[chain.length - 1]})`,
  );
}
