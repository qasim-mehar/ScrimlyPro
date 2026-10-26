import { describe, expect, it } from "vitest";

import { isValidReason } from "@/components/admin/shell/ImpersonateDialog";

/**
 * M6 WP11 — impersonation dialog contract (UI half). The server half
 * (reason required ≤500, start/stop audited, admin targets refused) is the
 * existing tests/api/impersonation.test.ts suite, unchanged and green.
 */
describe("isValidReason (dialog UI gate)", () => {
  it("requires a support sentence: trimmed 10–500 chars", () => {
    expect(isValidReason("short")).toBe(false);
    expect(isValidReason("   too short   ")).toBe(false);
    expect(isValidReason("")).toBe(false);
    expect(isValidReason("User cannot see their sessions — ticket #4821")).toBe(true);
    expect(isValidReason("a".repeat(500))).toBe(true);
    expect(isValidReason("a".repeat(501))).toBe(false);
    expect(isValidReason("   padded but long enough reason   ")).toBe(true);
  });
});
