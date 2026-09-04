import type { RawSquad } from "@/lib/db/schema";
import {
  generateSquads,
  GeminiError,
  type CallModel,
  type ImageInput,
} from "@/lib/gemini/client";
import {
  validateSquads,
  type ValidationFailure,
} from "@/lib/gemini/validate";

function failureReason(failure: ValidationFailure): string {
  switch (failure.code) {
    case "MISSING_SQUADS":
      return `${failure.code}: extracted ${failure.extracted}, expected ${failure.expected}`;
    case "BAD_PLACEMENTS":
      return `${failure.code}: ${failure.detail}`;
    case "BAD_KILLS":
      return `${failure.code}: ${failure.detail}`;
  }
}

/**
 * generateSquads → validateSquads, with ONE corrective retry: the second call
 * appends "Previous extraction failed: {reason}. Fix this." to the prompt.
 * Still failing → GeminiError("VALIDATION_FAILED") carrying the failure.
 */
export async function parseMatchSquads(
  images: ImageInput[],
  teamCount: number,
  opts?: { callModel?: CallModel },
): Promise<{ squads: RawSquad[]; model: string; retried: boolean }> {
  const first = await generateSquads(images, teamCount, {
    callModel: opts?.callModel,
  });
  const firstResult = validateSquads(first.squads, teamCount);
  if (firstResult.ok) {
    return { squads: firstResult.squads, model: first.model, retried: false };
  }

  const second = await generateSquads(images, teamCount, {
    callModel: opts?.callModel,
    extraInstructions: `Previous extraction failed: ${failureReason(firstResult.failure)}. Fix this.`,
  });
  const secondResult = validateSquads(second.squads, teamCount);
  if (secondResult.ok) {
    return { squads: secondResult.squads, model: second.model, retried: true };
  }

  throw new GeminiError(
    "VALIDATION_FAILED",
    failureReason(secondResult.failure),
    secondResult.failure,
  );
}
