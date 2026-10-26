import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Self-test for G4: the bundle secret scanner must FAIL (exit 1) on a
 * planted secret and PASS (exit 0) on a clean tree.
 */
const SCRIPT = fileURLToPath(
  new URL("../../scripts/check-secrets-in-bundle.mjs", import.meta.url),
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "secrets-scan-"));
  for (const d of [".next/static/chunks", ".next/server/app"]) {
    mkdirSync(join(dir, d), { recursive: true });
  }
  writeFileSync(join(dir, ".env.local"), "SUPABASE_SERVICE_ROLE_KEY=canary-secret-abc123def\n");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: (err.stderr ?? "") + (err.stdout ?? "") };
  }
}

describe("check-secrets-in-bundle (G4 self-test)", () => {
  it("exits 0 on an empty (clean) build tree", () => {
    const { code, out } = run();
    expect(code).toBe(0);
    expect(out).toContain("OK");
  });

  it("exits 1 when a service-role key value appears in a client chunk", () => {
    writeFileSync(
      join(dir, ".next/static/chunks/app-abc.js"),
      "const k='canary-secret-abc123def';export default k;",
    );
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toContain("SUPABASE_SERVICE_ROLE_KEY");
    // The value itself must never be printed.
    expect(out).not.toContain("canary-secret-abc123def");
  });

  it("exits 1 when the variable NAME literal appears in a server chunk", () => {
    writeFileSync(
      join(dir, ".next/server/app/page.js"),
      "process.env.SUPABASE_SERVICE_ROLE_KEY;",
    );
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
