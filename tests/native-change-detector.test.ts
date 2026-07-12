import { describe, expect, it } from "vitest";
import { classifyNativeChanges } from "../scripts/native-change-classifier.mjs";

const basePackage = {
  version: "2.1.1",
  dependencies: { expo: "~57.0.4" },
  devDependencies: { typescript: "~6.0.3" },
  scripts: { test: "vitest run" },
};

describe("native change detector", () => {
  it("allows normal TypeScript UI fixes through OTA", () => {
    const result = classifyNativeChanges({
      files: ["app/(tabs)/today.tsx", "components/MissionCard.tsx"],
      basePackage,
      headPackage: basePackage,
    });
    expect(result.nativeChanged).toBe(false);
    expect(result.otaChanged).toBe(true);
  });

  it("requires an APK for app config, plugins and local native modules", () => {
    for (const file of ["app.json", "plugins/withNexusWidget.js", "modules/nexus-widget/android/Widget.kt"]) {
      const result = classifyNativeChanges({ files: [file], basePackage, headPackage: basePackage });
      expect(result.nativeChanged).toBe(true);
    }
  });

  it("allows package script-only changes but blocks dependency changes", () => {
    const scriptOnly = classifyNativeChanges({
      files: ["package.json"],
      basePackage,
      headPackage: { ...basePackage, scripts: { test: "vitest run --coverage" } },
    });
    expect(scriptOnly.nativeChanged).toBe(false);
    expect(scriptOnly.otaChanged).toBe(true);

    const dependency = classifyNativeChanges({
      files: ["package.json"],
      basePackage,
      headPackage: { ...basePackage, dependencies: { ...basePackage.dependencies, "expo-updates": "~57.0.6" } },
    });
    expect(dependency.nativeChanged).toBe(true);
  });

  it("requires an APK when the lockfile or package manager changes", () => {
    const lockfile = classifyNativeChanges({ files: ["pnpm-lock.yaml"], basePackage, headPackage: basePackage });
    expect(lockfile.nativeChanged).toBe(true);

    const manager = classifyNativeChanges({
      files: ["package.json"],
      basePackage,
      headPackage: { ...basePackage, packageManager: "pnpm@10.1.0" },
    });
    expect(manager.nativeChanged).toBe(true);
  });

  it("does not publish OTA bundles for docs-only changes", () => {
    const result = classifyNativeChanges({ files: ["README.md", "docs/UPDATES.md"], basePackage, headPackage: basePackage });
    expect(result.nativeChanged).toBe(false);
    expect(result.otaChanged).toBe(false);
  });
});
