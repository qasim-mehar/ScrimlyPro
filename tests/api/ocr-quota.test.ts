import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import { POST } from "@/app/api/ocr/route";

import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";

/**
 * OCR quota enforcement (M2 §7): over the monthly limit → 409 with the OCR
 * envelope intact; under the limit → 200 (sample mode, no Gemini key) and
 * exactly one usage_events row per successful invocation. Identity is
 * mocked at getAuthedUser; the DB is wired at getDb.
 */

const OWNER = "11111111-1111-1111-1111-111111111111";
const MEMBER = "33333333-3333-3333-3333-333333333333";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: undefined as unknown as (() => Promise<void>) | undefined,
  currentUser: undefined as string | null | undefined,
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () =>
    state.currentUser
      ? { id: state.currentUser, email: `${state.currentUser}@test.dev` }
      : null,
  ),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

const SESSION = "aaaaa001-0000-4000-8000-000000000001";
// 1x1 transparent PNG.
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

beforeEach(async () => {
  const t = await testDb();
  state.db = t.db;
  state.cleanup = t.cleanup;
  state.currentUser = MEMBER;
  process.env.SAMPLE_OCR = "1"; // sample ingest — no Gemini key, no model call
  const db = t.db;
  for (const u of [OWNER, MEMBER]) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${u}, ${u + "@test.dev"}) on conflict (id) do nothing`,
    );
  }
  const orgId = await ensureOrg(db, OWNER, "Quota Org");
  await db
    .insert(schema.orgMembers)
    .values({ orgId, userId: MEMBER, role: "member" });
  await db.insert(schema.sessions).values({
    id: SESSION,
    userId: OWNER,
    orgId,
    name: "Quota Session",
    plannedMatches: 3,
    teamCount: 4,
    scoringRules: { kill_points: 1, placement_points: {}, default_placement_points: 0 },
  });
});

afterAll(async () => {
  await state.cleanup?.();
  delete process.env.SAMPLE_OCR;
});

function ocrRequest(matchNo = 1) {
  const form = new FormData();
  form.set("sessionId", SESSION);
  form.set("matchNo", String(matchNo));
  const bytes = Buffer.from(PNG_B64, "base64");
  form.append("images", new File([bytes], "shot.png", { type: "image/png" }));
  return POST(
    new Request("http://localhost:3054/api/ocr", {
      method: "POST",
      headers: { "x-scrimly-no-origin-test": "1" },
      body: form,
    }),
  );
}

async function setMonthlyOcrCalls(n: number) {
  await state.db!.execute(
    sql`update org_quotas set monthly_ocr_calls = ${n}`,
  );
}

describe("POST /api/ocr — monthly OCR quota", () => {
  it("under the limit → 200 sample ingest + exactly one usage row per success", async () => {
    await setMonthlyOcrCalls(2);
    const res1 = await ocrRequest(1);
    expect(res1.status).toBe(200);
    const res2 = await ocrRequest(2);
    expect(res2.status).toBe(200);

    const rows = await state.db!.select().from(schema.usageEvents);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "ocr")).toBe(true);
  });

  it("at the limit → 409 with the envelope intact + quota field; no usage row", async () => {
    await setMonthlyOcrCalls(1);
    // One successful call fills the month.
    const ok = await ocrRequest(1);
    expect(ok.status).toBe(200);

    const res = await ocrRequest(2);
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      ok: boolean;
      error: { code: string; message: string; quota: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("QUOTA_EXCEEDED");
    expect(body.error.quota).toBe("monthly_ocr_calls");
    expect(body.error.message).toMatch(/support/i);
    expect(res.headers.get("cache-control")).toBe("no-store");

    // The blocked request consumed nothing.
    expect(await state.db!.select().from(schema.usageEvents)).toHaveLength(1);
  });

  it("failed ingest attempts never consume quota (no usage row on 4xx)", async () => {
    await setMonthlyOcrCalls(5);
    // matchNo 4 is outside 1..3 planned → MATCH_NO_INVALID (400): the gate
    // passes (count 0 < 5) but the ingest fails — no usage row is recorded.
    const res = await ocrRequest(4);
    expect(res.status).toBe(400);
    expect(await state.db!.select().from(schema.usageEvents)).toHaveLength(0);
  });
});
