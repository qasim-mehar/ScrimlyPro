import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Windows: DROP DATABASE ... WITH (FORCE) in tests/helpers/pg cleanup can
    // exceed the 10s default hook timeout under parallel load (WP6 observed).
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
