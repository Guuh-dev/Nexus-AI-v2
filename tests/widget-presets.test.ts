import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { applyWidgetPreset, WIDGET_PRESETS } from "@/features/widget/presets";
import { preferencesSchema } from "@/schemas/storage.schema";

describe("Widget Studio presets", () => {
  it("todos os presets geram preferências válidas", () => {
    for (const preset of WIDGET_PRESETS) {
      const widget = applyWidgetPreset(DEFAULT_PREFERENCES.widget, preset.id);
      const parsed = preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, widget });
      expect(parsed.success, preset.id).toBe(true);
    }
  });

  it("o modo de aprendizado abre o Brain", () => {
    const widget = applyWidgetPreset(DEFAULT_PREFERENCES.widget, "learning");
    expect(widget.showLearning).toBe(true);
    expect(widget.showProfessor).toBe(true);
    expect(widget.tapAction).toBe("brain");
  });
});
