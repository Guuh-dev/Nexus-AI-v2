import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("global keyboard handling", () => {
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
