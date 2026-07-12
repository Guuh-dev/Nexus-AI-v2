import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { OTA_RELEASE } from "@/constants/release";
import { getColors, getVisuals } from "@/theme/theme";
import type { ThemeId } from "@/types";

const themeIds: Exclude<ThemeId, "custom">[] = [
  "nexus",
  "amoled",
  "oneui",
  "hud",
  "aurora",
  "ocean",
  "ember",
  "rose",
  "monochrome",
];

describe("Nexus OTA 2.1.3 regressions", () => {
  it("keeps the installed runtime while exposing the OTA release label", () => {
    const app = JSON.parse(readFileSync("app.json", "utf8")) as {
      expo?: { version?: string };
    };
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      version?: string;
    };
    expect(app.expo?.version).toBe("2.1.1");
    expect(pkg.version).toBe("2.1.1");
    expect(OTA_RELEASE.label).toBe("2.1.3");
    expect(OTA_RELEASE.runtime).toBe("2.1.1");
  });

  it("does not replace the themed tab bar with the white default in Focus OS", () => {
    const focus = readFileSync("app/(tabs)/focus.tsx", "utf8");
    expect(focus).toContain(
      'tabBarStyle: active ? { display: "none" } : undefined',
    );
    expect(focus).not.toContain(
      'tabBarStyle: active ? { display: "none" } : {}',
    );
  });

  it("gives every built-in theme a distinct palette and visual identity", () => {
    const signatures = themeIds.map((theme) => {
      const preferences = { ...DEFAULT_PREFERENCES, theme };
      const colors = getColors(preferences);
      const visuals = getVisuals(preferences);
      return JSON.stringify({
        background: colors.background,
        surface: colors.surface,
        primary: colors.primary,
        radius: visuals.cardRadius,
        backdrop: visuals.backdrop,
        cardStyle: visuals.cardStyle,
      });
    });
    expect(new Set(signatures).size).toBe(themeIds.length);
  });

  it("keeps native widget files untouched by the OTA feature set", () => {
    const releaseNotes = readFileSync("constants/release.ts", "utf8");
    expect(releaseNotes).toContain("Widget Studio");
    expect(releaseNotes).not.toContain("modules/nexus-widget");
  });
});
