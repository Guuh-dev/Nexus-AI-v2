import { describe, expect, it } from "vitest";
import { dateFromKey, endOfLocalDayIso, isValidDateKey } from "@/utils/dates";

describe("civil date validation", () => {
  it("accepts only calendar dates without JavaScript rollover", () => {
    expect(isValidDateKey("2024-02-29")).toBe(true);
    expect(isValidDateKey("2025-02-29")).toBe(false);
    expect(isValidDateKey("2026-02-31")).toBe(false);
    expect(isValidDateKey("2026-04-31")).toBe(false);
    expect(Number.isNaN(dateFromKey("2026-02-31").getTime())).toBe(true);
  });

  it("rejects impossible dates before computing a local-day boundary", () => {
    expect(() => endOfLocalDayIso("2026-02-31", "America/Sao_Paulo"))
      .toThrow(/Data civil inválida/);
    expect(endOfLocalDayIso("2024-02-29", "America/Sao_Paulo"))
      .toMatch(/^2024-03-01T02:59:59\.999Z$/);
  });
});
