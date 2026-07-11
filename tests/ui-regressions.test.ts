import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile UI regressions", () => {
  it("keeps Android forms visible above the keyboard", () => {
    const appConfig = JSON.parse(readFileSync("app.json", "utf8")) as { expo?: { android?: { softwareKeyboardLayoutMode?: string } } };
    const screen = readFileSync("components/ui/Screen.tsx", "utf8");
    expect(appConfig.expo?.android?.softwareKeyboardLayoutMode).toBe("resize");
    expect(screen).toContain('Platform.OS === "ios" ? "padding" : "height"');
    expect(screen).toContain('keyboardShouldPersistTaps="always"');
  });

  it("uses field-aware Professor Atlas validation", () => {
    const intake = readFileSync("app/professor-intake.tsx", "utf8");
    expect(intake).toContain("validateProfessorIntakeStep");
    expect(intake).toContain("ProfessorIntakeErrors");
  });
});
