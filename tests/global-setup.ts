// Worker-owned test-infra teardown (wave1(10), Lane AB review I-2):
// registered as vitest globalSetup. On setup it records nothing; on
// teardown (which runs even when the run fails) it sweeps every leftover
// m*test_* throwaway DB with retry — the on-demand net for DBs whose
// per-test cleanup could not run (crashed worker, aborted run).
import { execFileSync } from "node:child_process";

export function setup() {
  // Nothing to prepare — per-test testDb() owns its own lifecycle.
}

export function teardown() {
  try {
    execFileSync(process.execPath, ["scripts/sweep-test-db.mjs"], {
      stdio: "inherit",
      // Tests run with vitest's env; SUPABASE_DB_URL may be pointed at a
      // per-test DB mid-run — force the base project DB for the sweep.
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "test" },
      timeout: 120_000,
    });
  } catch (err) {
    // Teardown must never mask the real test result: warn and move on.
    console.warn("[global-teardown] sweep failed:", String(err));
  }
}
