import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { applyWidgetPreset, WIDGET_PRESETS } from "@/features/widget/presets";
import { WIDGET_FAMILIES } from "@/features/widget/render-spec";
import { preferencesSchema } from "@/schemas/storage.schema";

describe("Widget Studio v3 presets", () => {
  it("offers exactly one schema-valid preset for each useful family", () => {
    expect(WIDGET_PRESETS).toHaveLength(5);
    expect(WIDGET_PRESETS.map((preset) => preset.recommendedSize)).toEqual(
      WIDGET_FAMILIES.map((family) => family.size),
    );

    for (const preset of WIDGET_PRESETS) {
      const widget = applyWidgetPreset(DEFAULT_PREFERENCES.widget, preset.id);
      const parsed = preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, widget });
      expect(parsed.success, preset.id).toBe(true);
    }
  });

  it("does not advertise legacy sizes or styles that RemoteViews cannot reproduce", () => {
    const legacySizes = new Set(["3x2", "4x1", "4x3", "5x2"]);
    for (const preset of WIDGET_PRESETS) {
      expect(legacySizes.has(preset.recommendedSize)).toBe(false);
      expect(["nexus", "amoled", "transparent", "pixel", "minimal"]).toContain(preset.patch.style);
      expect(preset.patch.progressStyle).toBe("bar");
    }
  });

  it("caps Mission at two tasks and Command at four", () => {
    expect(applyWidgetPreset(DEFAULT_PREFERENCES.widget, "mission").taskCount).toBe(2);
    expect(applyWidgetPreset(DEFAULT_PREFERENCES.widget, "tasks").taskCount).toBe(4);
  });
});
