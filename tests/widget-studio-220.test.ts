import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WIDGET_PRESETS } from "@/features/widget/presets";

describe("Widget Studio 3.0", () => {
  const studio = readFileSync("app/widget-studio.tsx", "utf8");

  it("keeps the editor intentionally small", () => {
    expect(WIDGET_PRESETS).toHaveLength(5);
    expect(studio).toContain("WIDGET STUDIO 3.0");
    expect(studio).toContain("Salvar e sincronizar");
    expect(studio).not.toContain("Glass");
    expect(studio).not.toContain("Gamer");
    expect(studio).not.toContain("Neon");
    expect(studio).not.toContain('["motivational", "Motivacional"]');
  });

  it("loads native instances and persists the selected appWidgetId", () => {
    expect(studio).toContain("listAndroidWidgetInstances");
    expect(studio).toContain("saveAndroidWidgetInstance(target, configuration)");
    expect(studio).toContain("updateAndroidWidget");
    expect(studio).toContain("appWidgetId");
    expect(studio).toContain("if (!result.updated)");
    expect(studio).toContain("Modo privado");
  });

  it("persists before confirming and avoids duplicate redraws", () => {
    expect(studio).toContain("await updatePreferences({ widget: widgetPatch })");
    expect(studio.match(/updateAndroidWidget\(/g)).toHaveLength(1);
    expect(studio).not.toContain("saved ? await updateAndroidWidget");
    expect(studio).not.toContain("}, [data]);");
  });

  it("explains when changing family requires remove and re-add", () => {
    expect(studio).toContain("Remova este widget e adicione a família desejada");
    expect(studio).toContain("novo APK");
    expect(studio).toContain("não chegam apenas por OTA");
  });
});
