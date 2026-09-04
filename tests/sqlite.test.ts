import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

describe("better-sqlite3 native module", () => {
  it("loads and queries an in-memory database", () => {
    const db = new Database(":memory:");
    const row = db.prepare("select 1 as one").get() as { one: number };
    expect(row.one).toBe(1);
    db.close();
  });
});
