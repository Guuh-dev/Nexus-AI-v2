import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("EAS Update configuration", () => {
  const app = JSON.parse(readFileSync("app.json", "utf8"));
  const eas = JSON.parse(readFileSync("eas.json", "utf8"));

  it("uses app-version runtime isolation and the linked Expo update URL", () => {
    expect(app.expo.runtimeVersion).toEqual({ policy: "appVersion" });
    expect(app.expo.updates).toMatchObject({
      url: "https://u.expo.dev/3d477828-f7f9-407d-ab4c-868df567dff0",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    });
    expect(app.expo.updates.disableAntiBrickingMeasures).not.toBe(true);
  });

  it("separates preview and production channels", () => {
    expect(eas.build.preview.channel).toBe("preview");
    expect(eas.build.production.channel).toBe("production");
    expect(eas.build.release.channel).toBe("production");
    expect(eas.build.release.android.buildType).toBe("apk");
  });

  it("exposes update controls without exposing a secret", () => {
    const service = readFileSync("services/update.service.ts", "utf8");
    const profile = readFileSync("app/(tabs)/profile.tsx", "utf8");
    expect(service).toContain("checkForUpdateAsync");
    expect(service).toContain("fetchUpdateAsync");
    expect(service).toContain("reloadAsync");
    expect(profile).toContain("Verificar atualização");
    expect(service).not.toMatch(/OPENROUTER_API_KEY|EXPO_TOKEN/);
  });
});
