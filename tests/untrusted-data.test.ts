import { describe, expect, it } from "vitest";
import { validateUntrustedJson } from "@/utils/untrusted-data";

describe("validateUntrustedJson", () => {
  it("accepts compact assistant context", () => {
    expect(validateUntrustedJson({ today: { tasks: [{ title: "Estudar" }] }, memories: ["x"] })).toEqual({ valid: true });
  });

  it("blocks prototype-related keys", () => {
    const value = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}') as unknown;
    expect(validateUntrustedJson(value)).toEqual({ valid: false, reason: "forbidden_key" });
  });

  it("blocks deeply nested payloads", () => {
    let value: unknown = "end";
    for (let index = 0; index < 12; index += 1) value = { next: value };
    expect(validateUntrustedJson(value, { maxDepth: 6 })).toEqual({ valid: false, reason: "depth" });
  });
});
