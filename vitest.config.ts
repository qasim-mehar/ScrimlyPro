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
    hookTimeout: 60_000,
    // M2 (Lane B): every DB-backed test file applies the full migration set
    // (0010's policy suite roughly doubles the per-file statement count), so
    // the default worker count saturated the portable cluster's I/O and made
    // cleanup hooks flaky. Capped for reliability, not correctness.
    maxWorkers: 4,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
