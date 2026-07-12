import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile UI regressions", () => {
  it("uses one Android keyboard-resize strategy and preserves the bottom safe area", () => {
    const appConfig = JSON.parse(readFileSync("app.json", "utf8")) as { expo?: { android?: { softwareKeyboardLayoutMode?: string }; backgroundColor?: string } };
    const screen = readFileSync("components/ui/Screen.tsx", "utf8");
    expect(appConfig.expo?.android?.softwareKeyboardLayoutMode).toBe("resize");
    expect(appConfig.expo?.backgroundColor).toBe("#050505");
    expect(screen).toContain('enabled={keyboardAware && Platform.OS === "ios"}');
    expect(screen).toContain('edges={["top", "bottom", "left", "right"]}');
    expect(screen).toContain('keyboardShouldPersistTaps="handled"');
    expect(screen).not.toContain('Platform.OS === "ios" ? "padding" : "height"');
  });

  it("keeps the Android system navigation area dark", () => {
    const layout = readFileSync("app/_layout.tsx", "utf8");
    const appConfig = JSON.parse(readFileSync("app.json", "utf8")) as { expo?: { plugins?: unknown[] } };
    expect(layout).toContain('NavigationBar.setStyle("dark")');
    expect(layout).toContain('NavigationBar.setHidden(false)');
    expect(JSON.stringify(appConfig.expo?.plugins)).toContain("expo-navigation-bar");
  });

  it("uses field-aware Professor Atlas validation", () => {
    const intake = readFileSync("app/professor-intake.tsx", "utf8");
    expect(intake).toContain("validateProfessorIntakeStep");
    expect(intake).toContain("ProfessorIntakeErrors");
  });
});
