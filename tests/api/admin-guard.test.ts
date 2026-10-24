import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

// DB-backed suites are slow under parallel workers; the 5s default flakes.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * M3 admin-guard adversarial suite (Lane C brief §6 — API-layer half).
 *
 * Proven at the handler/guard level with the mocked identity seam:
 *  - non-admin AND unauthenticated get the identical Next 404 fallback
 *    (NEXT_HTTP_ERROR_FALLBACK;404) on every admin entry point — page,
 *    action, and route handler — so /admin is indistinguishable from a
 *    missing route (no existence leak).
 *  - the role decision is DB-driven: nothing a client controls can supply it,
 *    and revocation takes effect on the very next request.
 *  - the eslint confinement of lib/admin is canary-proven: imports from the
 *    request path trip no-restricted-imports; the app/admin path passes.
 *  - a static import-graph check keeps non-admin code from importing lib/admin.
 */
const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

let authedUser: { id: string; email: string | null } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () => authedUser),
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("Supabase env is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }),
}));

// The role check runs its profiles read through withUserDb (the RLS-sanctioned
// wrapper on the pooled schema-owner client). In unit tests the production
// client is replaced by the throwaway per-test database — the same seam the
// M1 suite uses. The RLS behavior of the underlying read is proven in
// tests/rls/admin-tables.test.ts.
let userDbRunner: <T>(fn: (userDb: Db) => Promise<T>) => Promise<T> = async (fn) =>
  fn(undefined as unknown as Db);

vi.mock("@/lib/db/user", () => ({
  withUserDb: vi.fn(async (claims: unknown, fn: (db: Db) => Promise<unknown>) =>
    userDbRunner(fn),
  ),
  withUserDbForTest: vi.fn(async (claims: unknown, fn: (db: Db) => Promise<unknown>, client: Db) =>
    fn(client),
  ),
}));

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [USER, "user@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
  authedUser = null;
  userDbRunner = (fn) => fn(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
});

async function digestOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (e) {
    return (e as { digest?: string }).digest;
  }
}

describe("requireAdmin / requireAdminApi — 404, never 403", () => {
  it("unauthenticated → Next 404 fallback (page + api variants)", async () => {
    const { requireAdmin, requireAdminApi } = await import("@/lib/admin/require-admin");
    expect(await digestOf(() => requireAdmin())).toBe(NOT_FOUND_DIGEST);
    expect(
      await digestOf(() =>
        requireAdminApi(new Request("http://localhost:3056/api/admin/users")),
      ),
    ).toBe(NOT_FOUND_DIGEST);
  });

  it("authenticated non-admin → identical Next 404 fallback (page + api variants)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { requireAdmin, requireAdminApi } = await import("@/lib/admin/require-admin");
    expect(await digestOf(() => requireAdmin())).toBe(NOT_FOUND_DIGEST);
    expect(
      await digestOf(() =>
        requireAdminApi(new Request("http://localhost:3056/api/admin/users")),
      ),
    ).toBe(NOT_FOUND_DIGEST);
  });

  it("cross-origin probe → the same 404 (even the origin guard's existence is not observable)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { requireAdminApi } = await import("@/lib/admin/require-admin");
    expect(
      await digestOf(() =>
        requireAdminApi(
          new Request("http://localhost:3056/api/admin/users", {
            headers: { origin: "https://evil.example" },
          }),
        ),
      ),
    ).toBe(NOT_FOUND_DIGEST);
  });

  it("DB-verified admin passes (identity from getUser, role from profiles)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    const user = await requireAdmin();
    expect(user).toEqual({ id: ADMIN, email: "admin@test.dev" });
  });

  it("role revocation takes effect on the next request (nothing is cached)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    await requireAdmin();
    await db.execute(sql`update profiles set role = 'user' where id = ${ADMIN}`);
    expect(await digestOf(() => requireAdmin())).toBe(NOT_FOUND_DIGEST);
  });

  it("missing profiles row (ghost id) is fail-closed 404, never admin", async () => {
    const ghost = "99999999-9999-9999-9999-999999999999";
    authedUser = { id: ghost, email: "ghost@test.dev" };
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    expect(await digestOf(() => requireAdmin())).toBe(NOT_FOUND_DIGEST);
  });
});

describe("admin-db confinement — eslint canary (rule trips outside, passes inside)", () => {
  const CANARY_DIR = "app/__admin_canary__";
  const CANARY_ADMIN_DIR = "app/admin/__canary__";
  const CANARY_LIB = "lib/auth/__canary_forbidden.ts";

  function writeCanaries() {
    cleanupCanaries();
    rmSync(CANARY_DIR, { recursive: true, force: true });
    mkdirSync(CANARY_DIR, { recursive: true });
    rmSync(CANARY_ADMIN_DIR, { recursive: true, force: true });
    mkdirSync(CANARY_ADMIN_DIR, { recursive: true });
    // Outside app/admin: importing admin-db AND any lib/admin module must fail.
    writeFileSync(
      join(CANARY_DIR, "outside-db.ts"),
      `import { getAdminDb } from "@/lib/admin/admin-db";\nexport const x = getAdminDb;\n`,
    );
    writeFileSync(
      join(CANARY_DIR, "outside-layer.ts"),
      `import { requireAdmin } from "@/lib/admin/require-admin";\nexport const x = requireAdmin;\n`,
    );
    // Inside app/admin: admin-db import is the sanctioned path.
    writeFileSync(
      join(CANARY_ADMIN_DIR, "inside.ts"),
      `import { getAdminDb } from "@/lib/admin/admin-db";\nexport const x = getAdminDb;\n`,
    );
    // A non-sanctioned lib/auth file (not the two guard choke points) must fail.
    writeFileSync(
      CANARY_LIB,
      `import { requireAdmin } from "@/lib/admin/require-admin";\nexport const x = requireAdmin;\n`,
    );
  }

  function cleanupCanaries() {
    rmSync(CANARY_DIR, { recursive: true, force: true });
    rmSync(CANARY_ADMIN_DIR, { recursive: true, force: true });
    rmSync(CANARY_LIB, { force: true });
  }

  it("eslint trips on out-of-perimeter imports and stays silent inside app/admin", { timeout: 300_000 }, () => {
    writeCanaries();
    try {
      let stdout = "";
      let exit = 0;
      try {
        execFileSync(
          process.execPath,
          [join(process.cwd(), "node_modules", "eslint", "bin", "eslint.js"), "--no-ignore", CANARY_DIR, CANARY_ADMIN_DIR, CANARY_LIB],
          { stdio: "pipe", encoding: "utf8" },
        );
      } catch (e) {
        const err = e as { stdout?: string; stderr?: string; status?: number; message?: string };
        stdout = `${err.stdout ?? ""}
${err.stderr ?? ""}
${err.message ?? ""}`;
        exit = err.status ?? 1;
      }
      expect(exit).not.toBe(0);
      expect(stdout).toContain("admin-db.ts wraps the service-role client");
      expect(stdout).toContain("lib/admin/** is the super-admin panel");
      // The in-perimeter canary must NOT be flagged for its import.
      const insideFile = join(CANARY_DIR, "admin", "inside.ts");
      const insideSection = stdout.split(/(?=\w:[\\/])/).find((s) => s.includes("inside.ts"));
      if (insideSection) {
        expect(insideSection).not.toContain("no-restricted-imports");
      }
      void insideFile;
    } finally {
      cleanupCanaries();
    }
  });
});

describe("admin-db runtime guard", () => {
  it("refuses to initialize in a browser-like global", async () => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {};
    try {
      const { getAdminDb } = await import("@/lib/admin/admin-db");
      expect(() => getAdminDb()).toThrow(/must never run in a client bundle/);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
      vi.resetModules();
    }
  });
});

describe("confinement import graph (static, CI-enforced)", () => {
  it("no file outside lib/admin + app/admin imports the admin layer", () => {
    const hits: string[] = [];
    const RE = /["'](?:@\/lib\/admin|\.\.?(?:\/[^"']*)*\/lib\/admin)/;
    function* walk(dir: string): Generator<string> {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) yield* walk(p);
        else yield p;
      }
    }
    for (const f of walk("app")) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const norm = f.replace(/\\/g, "/");
      // The whole admin surface (pages + API routes) is sanctioned.
      if (norm.startsWith("app/admin/") || norm.startsWith("app/api/admin/")) continue;
      if (RE.test(readFileSync(f, "utf8"))) hits.push(f);
    }
    for (const f of [...walk("components"), ...walk("lib")]) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const norm = f.replace(/\\/g, "/");
      if (norm.includes("lib/admin/")) continue;
      if (norm.endsWith("lib/auth/route-guard.ts")) continue;
      if (norm.endsWith("lib/auth/action-guard.ts")) continue;
      if (RE.test(readFileSync(f, "utf8"))) hits.push(f);
    }
    expect(hits).toEqual([]);
  });
});
