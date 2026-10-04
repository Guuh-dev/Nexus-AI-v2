import { describe, expect, it } from "vitest";
import { focusedFieldScrollDelta } from "@/components/brain/keyboard-occlusion";
import { readFileSync } from "node:fs";

describe("global keyboard handling", () => {
  it("reveals a nested field above an overlay keyboard and never double-compensates resize", () => {
    const bounds = { fieldTop: 650, fieldHeight: 130, viewportTop: 40, viewportHeight: 800, keyboardTop: 500 };
    expect(focusedFieldScrollDelta(bounds)).toBe(304);
    expect(focusedFieldScrollDelta({ ...bounds, viewportHeight: 460 })).toBe(304);
    expect(focusedFieldScrollDelta({ ...bounds, fieldTop: 300 })).toBe(0);
    expect(focusedFieldScrollDelta({ ...bounds, fieldTop: 30 })).toBe(-26);
  });
  it("uses a shared Screen/Field keyboard-aware contract instead of fixed per-screen padding", () => {
    const screen = readFileSync("components/ui/Screen.tsx", "utf8");
    const field = readFileSync("components/ui/Field.tsx", "utf8");
    const professor = readFileSync("app/professor-intake.tsx", "utf8");
    expect(screen).toContain("KeyboardAwareFormContext.Provider");
    expect(screen).toContain("resolveKeyboardOcclusion");
    expect(screen).not.toContain("keyboardOpen");
    expect(field).toContain("registerFocusedField");
    expect(professor).toContain("<Screen footer={footer}");
  });
});
