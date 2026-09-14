import type { RawSquad } from "@/lib/db/schema";
import { SAMPLE_MATCHES, SAMPLE_TEAM_NAMES } from "@/lib/fixtures/sampleMatches";
import {
  GeminiError,
  generateSquads,
  OCR_PROMPT_TEMPLATE,
  parseMatchSquads,
  validateSquads,
} from "@/lib/gemini";
import { afterEach, describe, expect, it, vi } from "vitest";

// Network guard: every SDK path below runs through an INJECTED fake CallModel.
// The only test that exercises the default transport omits the API key, so
// defaultCallModel throws GEMINI_NO_KEY before a GoogleGenAI client (or any
// network call) can ever be constructed.

type CallArgs = [string, Array<Record<string, unknown>>];

/** vi.fn with a parameterless impl infers `[]` for mock.calls; widen it. */
function mockCalls(fn: { mock: { calls: unknown[][] } }): CallArgs[] {
  return fn.mock.calls as CallArgs[];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Pin the model chain so fallback tests are deterministic. */
function stubModelEnv() {
  vi.stubEnv("GEMINI_MODEL", "model-a");
  vi.stubEnv("GEMINI_MODEL_FALLBACKS", "model-b,model-c");
  vi.stubEnv("GEMINI_API_KEY", "not-a-real-key");
}

function player(name: string, kills: number) {
  return { name, kills };
}

function makeSquad(placement: number, kills: number[]): RawSquad {
  return {
    placement,
    squadTag: "",
    confidence: "high",
    players: kills.map((k, i) => player(`P${placement}-${i}`, k)),
  };
}

/** 16 valid squads: placements 1..16, 1–4 players, lobby kills 38 (≤ 99). */
function makeValidSquads(): RawSquad[] {
  return [
    makeSquad(1, [3, 3, 3, 2]),
    makeSquad(2, [3, 3, 2]),
    makeSquad(3, [2, 2, 1]),
    makeSquad(4, [2, 2]),
    makeSquad(5, [2, 1]),
    makeSquad(6, [2]),
    makeSquad(7, [1, 1]),
    makeSquad(8, [1]),
    makeSquad(9, [1]),
    makeSquad(10, [1]),
    makeSquad(11, [0]),
    makeSquad(12, [0]),
    makeSquad(13, [0]),
    makeSquad(14, [0]),
    makeSquad(15, [0]),
    makeSquad(16, [0]),
  ];
}

const VALID_TEXT = JSON.stringify(makeValidSquads());
const IMAGES = [{ mimeType: "image/jpeg" as const, dataBase64: "ZmFrZQ==" }];

describe("validateSquads", () => {
  it("V-pass: valid 16-squad input is ok", () => {
    const result = validateSquads(makeValidSquads(), 16);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.squads).toHaveLength(16);
  });

  it("V1: 15 squads → MISSING_SQUADS {15, 16}", () => {
    const result = validateSquads(makeValidSquads().slice(0, 15), 16);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toEqual({
        code: "MISSING_SQUADS",
        extracted: 15,
        expected: 16,
      });
    }
  });

  it("V2: duplicate placement → BAD_PLACEMENTS", () => {
    const squads = makeValidSquads();
    squads[1].placement = 1; // duplicate 1, no 2
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("BAD_PLACEMENTS");
      if (result.failure.code === "BAD_PLACEMENTS") {
        expect(result.failure.detail).toContain("duplicate placement 1");
      }
    }
  });

  it("V2: gap (1..15 then 17) → BAD_PLACEMENTS", () => {
    const squads = makeValidSquads();
    squads[15].placement = 17;
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("BAD_PLACEMENTS");
      if (result.failure.code === "BAD_PLACEMENTS") {
        expect(result.failure.detail).toContain("missing placement 16");
      }
    }
  });

  it("V3: 5-player squad → BAD_KILLS", () => {
    const squads = makeValidSquads();
    squads[0].players.push(player("P1-extra", 0));
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("BAD_KILLS");
      if (result.failure.code === "BAD_KILLS") {
        expect(result.failure.detail).toContain("squad placement 1");
      }
    }
  });

  it("V3: 31-char name → BAD_KILLS", () => {
    const squads = makeValidSquads();
    squads[0].players[0] = player("A".repeat(31), 3);
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("BAD_KILLS");
      if (result.failure.code === "BAD_KILLS") {
        expect(result.failure.detail).toContain("31 characters");
      }
    }
  });

  it("V3: kills 16 → ok (Rondo-inflated 16–19 are legit, bound is 0–20)", () => {
    const squads = makeValidSquads();
    squads[0].players[0] = player("P1-0", 16);
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([]);
  });

  it("V3: kills 21 → BAD_KILLS", () => {
    const squads = makeValidSquads();
    squads[0].players[0] = player("P1-0", 21);
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("BAD_KILLS");
  });

  it("V3: kills −1 → BAD_KILLS", () => {
    const squads = makeValidSquads();
    squads[0].players[0] = player("P1-0", -1);
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("BAD_KILLS");
  });

  it("V4: lobby kills 100 → ok with LOBBY_KILLS_HIGH warning (never a failure)", () => {
    const squads = makeValidSquads();
    // base total is 38; squads 1–2 originally contribute 11 + 8 = 19,
    // remaining 14 squads contribute 19 → set squads 1–2 to 60 + 21 = 100 − 19
    squads[0].players = [player("a", 15), player("b", 15), player("c", 15), player("d", 15)];
    squads[1].players = [player("e", 15), player("f", 6)];
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toEqual([{ code: "LOBBY_KILLS_HIGH", total: 100 }]);
    }
  });

  it("V4: lobby kills exactly 99 → ok with no warnings", () => {
    const squads = makeValidSquads();
    // base total is 38; squad 1 originally contributes 11 → set it to
    // 72 (4 × 18) for a total of exactly 99
    squads[0].players = [player("a", 18), player("b", 18), player("c", 18), player("d", 18)];
    const result = validateSquads(squads, 16);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([]);
  });
});

describe("generateSquads", () => {
  it("parses valid JSON from the fake and returns the first model", async () => {
    stubModelEnv();
    const squads = makeValidSquads();
    const callModel = vi.fn(async () => JSON.stringify(squads));

    const result = await generateSquads(IMAGES, 16, { callModel });

    expect(result.model).toBe("model-a");
    expect(result.squads).toEqual(squads);
    expect(callModel).toHaveBeenCalledTimes(1);
    const [model, parts] = mockCalls(callModel)[0];
    expect(model).toBe("model-a");
    expect(parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "ZmFrZQ==" } });
    const prompt = String(parts[parts.length - 1].text);
    expect(prompt).toContain(OCR_PROMPT_TEMPLATE.replace("{TEAM_COUNT}", "16"));
  });

  it("non-JSON garbage → PARSE_FAILED", async () => {
    stubModelEnv();
    const callModel = vi.fn(async () => "I could not read the screenshot");

    await expect(generateSquads(IMAGES, 16, { callModel })).rejects.toMatchObject({
      name: "GeminiError",
      code: "PARSE_FAILED",
    });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("JSON that is not an array → PARSE_FAILED", async () => {
    stubModelEnv();
    const callModel = vi.fn(async () => JSON.stringify({ squads: [] }));
    await expect(generateSquads(IMAGES, 16, { callModel })).rejects.toMatchObject({
      code: "PARSE_FAILED",
    });
  });

  it("404 on models 1 and 2 → falls back to model 3, called 3×", async () => {
    stubModelEnv();
    const callModel = vi.fn(async (model: string) => {
      if (model !== "model-c") throw new Error("404 model not found");
      return VALID_TEXT;
    });

    const result = await generateSquads(IMAGES, 16, { callModel });

    expect(result.model).toBe("model-c");
    expect(callModel).toHaveBeenCalledTimes(3);
  });

  it("all models 404 → MODEL_FAILED after exactly chain-length calls", async () => {
    stubModelEnv();
    const callModel = vi.fn(async () => {
      throw new Error("404 NOT_FOUND");
    });

    await expect(generateSquads(IMAGES, 16, { callModel })).rejects.toMatchObject({
      code: "MODEL_FAILED",
      detail: expect.stringContaining("model-c"),
    });
    expect(callModel).toHaveBeenCalledTimes(3);
  });

  it("non-404 error (quota) → MODEL_FAILED immediately, called once", async () => {
    stubModelEnv();
    const callModel = vi.fn(async () => {
      throw new Error("429 quota exceeded");
    });

    await expect(generateSquads(IMAGES, 16, { callModel })).rejects.toMatchObject({
      code: "MODEL_FAILED",
    });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("no API key and no injected callModel → GEMINI_NO_KEY (no network possible)", async () => {
    vi.stubEnv("GEMINI_MODEL", "model-a");
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "model-b");
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(generateSquads(IMAGES, 16)).rejects.toMatchObject({
      code: "GEMINI_NO_KEY",
    });
  });
});

describe("parseMatchSquads", () => {
  it("valid on first call → retried false, ONE call, prompt carries team count", async () => {
    stubModelEnv();
    const callModel = vi.fn(async () => VALID_TEXT);

    const result = await parseMatchSquads(IMAGES, 16, { callModel });

    expect(result.retried).toBe(false);
    expect(result.squads).toEqual(makeValidSquads());
    expect(callModel).toHaveBeenCalledTimes(1);
    const [, parts] = mockCalls(callModel)[0];
    expect(String(parts[parts.length - 1].text)).toContain("The lobby has 16 squads");
  });

  it("invalid (15 squads) then valid → retried true, corrective note on 2nd call", async () => {
    stubModelEnv();
    const invalidText = JSON.stringify(makeValidSquads().slice(0, 15));
    // sequence: 1st call → 15 squads, 2nd call → full valid set
    const callModel = vi.fn(async () => VALID_TEXT);
    callModel.mockImplementationOnce(async () => invalidText);

    const result = await parseMatchSquads(IMAGES, 16, { callModel });

    expect(result.retried).toBe(true);
    expect(result.squads).toHaveLength(16);
    expect(validateSquads(result.squads, 16).ok).toBe(true);
    expect(callModel).toHaveBeenCalledTimes(2);
    const [, parts] = mockCalls(callModel)[1];
    const prompt = String(parts[parts.length - 1].text);
    expect(prompt).toContain("Previous extraction failed: MISSING_SQUADS: extracted 15, expected 16");
  });

  it("invalid twice → VALIDATION_FAILED carrying the failure, called exactly 2×", async () => {
    stubModelEnv();
    const invalidText = JSON.stringify(makeValidSquads().slice(0, 15));
    const callModel = vi.fn(async () => invalidText);

    const error = await parseMatchSquads(IMAGES, 16, { callModel }).catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(GeminiError);
    const geminiError = error as GeminiError;
    expect(geminiError.code).toBe("VALIDATION_FAILED");
    expect(geminiError.failure).toEqual({
      code: "MISSING_SQUADS",
      extracted: 15,
      expected: 16,
    });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("warning (lobby kills > 99) → NO retry: retried false, called EXACTLY once, warnings present", async () => {
    stubModelEnv();
    // base total 38; squad 1 contributes 11 → 4 × 20 = 80 gives 107 total
    const squads = makeValidSquads();
    squads[0].players = [player("a", 20), player("b", 20), player("c", 20), player("d", 20)];
    const callModel = vi.fn(async () => JSON.stringify(squads));

    const result = await parseMatchSquads(IMAGES, 16, { callModel });

    expect(result.retried).toBe(false);
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual([{ code: "LOBBY_KILLS_HIGH", total: 107 }]);
    expect(result.squads).toHaveLength(16);
  });

  it("warnings pass through to the caller", async () => {
    stubModelEnv();
    const squads = makeValidSquads();
    squads[0].players = [player("a", 20), player("b", 20), player("c", 20), player("d", 20)];
    const direct = validateSquads(squads, 16);
    if (!direct.ok) throw new Error("fixture should validate with a warning");
    const callModel = vi.fn(async () => JSON.stringify(squads));

    const result = await parseMatchSquads(IMAGES, 16, { callModel });

    expect(result.warnings).toEqual(direct.warnings);
    expect(result.warnings).toEqual([{ code: "LOBBY_KILLS_HIGH", total: 107 }]);
  });
});

describe("sample fixtures", () => {
  it("SAMPLE_TEAM_NAMES has the 16 seed teams", () => {
    expect(SAMPLE_TEAM_NAMES).toHaveLength(16);
    expect(SAMPLE_TEAM_NAMES).toContain("Straight Forward");
    expect(SAMPLE_TEAM_NAMES).toContain("TF Squad");
    expect(SAMPLE_TEAM_NAMES).toContain("TRB Gaming");
  });

  it.each([0, 1, 2])("match %i: 16 squads, passes V1–V4, lobby kills ≤ 99", (i) => {
    const match = SAMPLE_MATCHES[i];
    expect(match).toHaveLength(16);
    const result = validateSquads(match, 16);
    expect(result.ok).toBe(true);
    const lobbyKills = match.reduce(
      (sum, squad) => sum + squad.players.reduce((s, p) => s + p.kills, 0),
      0,
    );
    expect(lobbyKills).toBeLessThanOrEqual(99);
    expect(lobbyKills).toBeGreaterThanOrEqual(60);
  });

  it("mandated drift strings exist exactly where they should", () => {
    const names = (match: RawSquad[]) =>
      match.flatMap((squad) => squad.players.map((p) => p.name));

    expect(names(SAMPLE_MATCHES[0])).toContain("TF×MAₛOOR");
    expect(names(SAMPLE_MATCHES[1])).toContain("TFxMA_SODOR");
    expect(names(SAMPLE_MATCHES[0])).toContain("Bawa·Qadra");
    expect(names(SAMPLE_MATCHES[1])).toContain("Bawa Qadra");
    expect(names(SAMPLE_MATCHES[2])).toContain("Bawa Qadra");

    expect(names(SAMPLE_MATCHES[0])).not.toContain("FAHEEM");
    expect(names(SAMPLE_MATCHES[1])).not.toContain("FAHEEM");
    expect(names(SAMPLE_MATCHES[2])).toContain("FAHEEM");
    expect(names(SAMPLE_MATCHES[2])).not.toContain("KALEEM");
  });
});
