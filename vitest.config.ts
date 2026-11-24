import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Wave-1 (WP10, I-2): worker-owned teardown sweeps leftover m*test_*
    // throwaway DBs (crashed workers / aborted runs) with retry. The
    // per-test cleanup in tests/helpers/pg.ts stays the primary owner.
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Windows: DROP DATABASE ... WITH (FORCE) in tests/helpers/pg cleanup can
    // exceed the 10s default hook timeout under parallel load (WP6 observed).
    // M5 (G9 finding): at the full 616-test suite the 60s budget still timed
    // out 2–13 hooks per run on Windows — always in cleanup, never an
    // assertion (the flaked files pass 30/30 in isolation). The settings
    // below are the proven-green combination (full pass, exit 0); same lever
    // as the maxWorkers cap — reliability, not correctness.
    hookTimeout: 180_000,
    // 2026-11-24: at full-suite scale one impersonation test (which dynamically
    // imports a route plus its DB helpers) exceeded the 5s default under load
    // while 1225 others passed; it passes 18/18 in isolation. Raise the per-test
    // budget so CI load cannot produce false reds. Same rationale as the hook
    // timeout above — reliability, not correctness.
    testTimeout: 30_000,
    // M2 (Lane B): every DB-backed test file applies the full migration set
    // (0010's policy suite roughly doubles the per-file statement count), so
    // the default worker count saturated the portable cluster's I/O and made
    // cleanup hooks flaky. Capped for reliability, not correctness.
    // M5: 4 → 2 — parallel DROP contention was the timeout source at suite
    // scale; 2 workers trades ~2x wall time for a deterministic full pass.
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
