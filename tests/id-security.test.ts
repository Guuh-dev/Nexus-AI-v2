import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createId } from "@/utils/ids";

describe("secure identifiers", () => {
  it("creates prefixed UUIDs without an insecure random fallback", () => {
    const ids = Array.from({ length: 20 }, () => createId("focus-session"));
    const source = readFileSync(new URL("../utils/ids.ts", import.meta.url), "utf8");

    expect(new Set(ids)).toHaveLength(ids.length);
    expect(ids.every((id) => /^focus-session-[0-9a-f-]{36}$/.test(id))).toBe(true);
    expect(source).not.toContain("Math.random");
  });
});
