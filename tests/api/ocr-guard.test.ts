import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import { POST } from "@/app/api/ocr/route";

import { testDb } from "../helpers/pg";

/**
 * WP6 guard suite for POST /api/ocr. The auth layer is mocked at its ONLY
 * seam (getAuthedUser — the single identity source); the DB is a real
 * throwaway Postgres wired in by mocking getDb (withUserDb's pooled-client
 * seam). No Gemini call can happen: the GEMINI_NO_KEY branch returns before
 * any model call, and the SAMPLE_OCR branch uses local fixtures.
 */

const OWNER = "11111111-1111-1111-1111-111111111111";
const ATTACKER = "22222222-2222-2222-2222-222222222222";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: (undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["cleanup"]
    | undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

import { getAuthedUser } from "@/lib/supabase/server";

const mockedGetAuthedUser = vi.mocked(getAuthedUser);

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10 },
  default_placement_points: 0,
};

const OWNED_SESSION = "ocr-owned-1";
const FOREIGN_SESSION = "ocr-foreign-1";

async function seedSessions() {
  const db = state.db!;
  await db.insert(schema.sessions).values([
    {
      id: OWNED_SESSION,
      userId: OWNER,
      name: "Owned Session",
      plannedMatches: 3,
      teamCount: 16,
      scoringRules: RULES,
      createdAt: new Date().toISOString(),
    },
    {
      id: FOREIGN_SESSION,
      userId: ATTACKER,
      name: "Foreign Session",
      plannedMatches: 3,
      teamCount: 16,
      scoringRules: RULES,
      createdAt: new Date().toISOString(),
    },
  ]);
}

function pngFile(): File {
  return new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])], "shot.png", {
    type: "image/png",
  });
}

function buildForm(opts: {
  sessionId?: string;
  matchNo?: string;
  userId?: string;
  images?: number;
}): FormData {
  const form = new FormData();
  form.set("sessionId", opts.sessionId ?? OWNED_SESSION);
  if (opts.matchNo !== undefined) form.set("matchNo", opts.matchNo);
  if (opts.userId !== undefined) form.set("userId", opts.userId);
  const images = opts.images ?? 1;
  for (let i = 0; i < images; i++) form.append("images", pngFile());
  return form;
}

function post(form: FormData): Request {
  // Non-production missing-Origin bypass (same as the curl suites use).
  return new Request("http://localhost:3000/api/ocr", {
    method: "POST",
    headers: { "x-scrimly-no-origin-test": "1" },
    body: form,
  });
}

async function expectNoStore(res: Response) {
  expect(res.headers.get("cache-control")).toBe("no-store");
}

beforeEach(async () => {
  const { db, cleanup: c } = await testDb();
  state.cleanup = c;
  state.db = db;
  mockedGetAuthedUser.mockReset();
});

afterAll(() => state.cleanup?.());

afterEach(async () => {
  vi.unstubAllEnvs();
  state.db = undefined;
  state.cleanup = undefined;
});

describe("POST /api/ocr guard stack", () => {
  it("unauthenticated → 401 {error:unauthorized} with no-store", async () => {
    mockedGetAuthedUser.mockResolvedValue(null);
    const res = await POST(post(buildForm({})));
    expect(res.status).toBe(401);
    await expectNoStore(res);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("missing Origin (and no test header) → 403 {error:forbidden}", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    const req = new Request("http://localhost:3000/api/ocr", {
      method: "POST",
      body: buildForm({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    await expectNoStore(res);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("foreign sessionId → 404 {error:not found}; missing sessionId → identical 404", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    await seedSessions();

    const foreign = await POST(
      post(buildForm({ sessionId: FOREIGN_SESSION, matchNo: "1" })),
    );
    expect(foreign.status).toBe(404);
    await expectNoStore(foreign);
    expect(await foreign.json()).toEqual({ error: "not found" });

    const missing = await POST(
      post(buildForm({ sessionId: "nope", matchNo: "1" })),
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not found" });

    // Nothing was written for either attempt.
    expect(await state.db!.select().from(schema.matches)).toHaveLength(0);
  });

  it("owner + invalid form → existing BAD_REQUEST envelope, before any DB/Gemini work", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    await seedSessions();

    const res = await POST(post(buildForm({ matchNo: "nope" })));
    expect(res.status).toBe(400);
    await expectNoStore(res);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(typeof body.error.message).toBe("string");

    expect(await state.db!.select().from(schema.matches)).toHaveLength(0);
  });

  it("spoofed userId in the form is ignored — identity comes only from getAuthedUser", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    await seedSessions();
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SAMPLE_OCR", "");

    // Attacker's id smuggled in the form; the owned session is still accepted
    // and the pipeline proceeds to the (key-less) Gemini branch.
    const res = await POST(
      post(buildForm({ userId: ATTACKER, matchNo: "1" })),
    );
    expect(res.status).toBe(500); // GEMINI_NO_KEY — NOT 401/404
    await expectNoStore(res);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("GEMINI_NO_KEY");
  });

  it("owner + SAMPLE_OCR fixture mode → 200 and the draft match row is inserted under RLS", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    await seedSessions();
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SAMPLE_OCR", "1");

    const res = await POST(post(buildForm({ matchNo: "1" })));
    expect(res.status).toBe(200);
    await expectNoStore(res);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.model).toBe("sample");

    const rows = await state
      .db!.select()
      .from(schema.matches)
      .where(eq(schema.matches.sessionId, OWNED_SESSION));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.matchNo).toBe(1);
    expect(rows[0]!.status).toBe("draft");
  });
});
