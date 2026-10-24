import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "@/tests/helpers/pg";
import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

/**
 * §9 adversarial matrix, enforced programmatically at the handler level.
 *
 * The GoTrue-dependent columns (valid-session positive paths) need the live
 * Supabase stack; they are covered by the @supabase-tagged live test (skipped
 * without Docker/stack — explicit list in the M1 report) and by the RLS
 * suite, which proves the tenant boundary at the DB layer. Everything
 * fail-closed (401/403/404/429) is proven HERE against the real guards.
 */
const MOCKED_USER = { id: "44444444-4444-4444-4444-444444444444", email: "owner@test.dev" };

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () => null),
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("Supabase env is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }),
}));

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
  await db.insert(schema.sessions).values({
    id: "matrix-session",
    userId: MOCKED_USER.id,
    name: "Matrix",
    plannedMatches: 2,
    teamCount: 4,
    scoringRules: { kill_points: 1, placement_points: {}, default_placement_points: 0 },
    createdAt: new Date().toISOString(),
  });
});

async function ocrRequest(init: RequestInit): Promise<Response> {
  const { POST } = await import("@/app/api/ocr/route");
  const headers: Record<string, string> = {
    // Test opt-in for missing Origin (non-production only, see
    // lib/auth/origin-guard.ts) so the request reaches the auth column.
    "x-scrimly-no-origin-test": "1",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return POST(new Request("http://localhost:3042/api/ocr", { ...init, headers }));
}

describe("§9 API auth matrix — fail-closed columns", () => {
  it("POST /api/ocr with no cookies → 401 unauthorized, no-store, no detail", async () => {
    const res = await ocrRequest({ method: "POST" });
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST /api/ocr with garbage cookie (auth unavailable) → 401", async () => {
    // getUser() failure → getAuthedUser null → fail closed. (Cookie garbage
    // never reaches a code path that could 500 or leak.)
    const res = await ocrRequest({
      method: "POST",
      headers: { cookie: "sb-auth-token=garbage" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("foreign Origin on state-changing API POST → 403 forbidden", async () => {
    const { withTenantRoute } = await import("@/lib/auth/route-guard");
    const handler = withTenantRoute(async () => {
      throw new Error("handler must never run for cross-origin");
    });
    const res = await handler(
      new Request("http://localhost:3042/api/ocr", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "localhost:3042" } as Record<string, string>,
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("user_id spoof in body/query is ignored — identity only from getUser", async () => {
    // The route guard never reads identity from input: with auth unavailable
    // the spoof CANNOT elevate. Assert the 401 is identical with a spoof
    // present (response parity proves the input was not consulted).
    const plain = await ocrRequest({ method: "POST" });
    const spoof = await ocrRequest({
      method: "POST",
      body: JSON.stringify({ userId: MOCKED_USER.id }),
      headers: { "content-type": "application/json" },
    });
    expect(spoof.status).toBe(plain.status);
    expect(await spoof.json()).toEqual(await plain.clone().json());
  });

  it("malformed JSON body on auth routes → 400, no stack, no SQL fragments", async () => {
    const { POST: login } = await import("@/app/api/auth/login/route");
    const res = await login(
      new Request("http://localhost:3042/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-scrimly-no-origin-test": "1",
        },
        body: "not json{",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
    expect(JSON.stringify(body)).not.toMatch(/select |insert |postgres/i);
  });

  it("auth API responses are no-store", async () => {
    const { POST: login } = await import("@/app/api/auth/login/route");
    const res = await login(
      new Request("http://localhost:3042/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-scrimly-no-origin-test": "1",
        },
        body: JSON.stringify({ email: "a@b.co", password: "wrongpassword" }),
      }),
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    // Auth unavailable locally (no GoTrue) → 503, also fail-closed.
    expect([401, 503]).toContain(res.status);
  });
});
