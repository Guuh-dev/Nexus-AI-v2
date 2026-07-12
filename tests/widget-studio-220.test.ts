import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { applyWidgetPreset, WIDGET_PRESETS } from "@/features/widget/presets";
import { appDataSchema } from "@/schemas/storage.schema";
import { DEFAULT_APP_DATA } from "@/constants/defaults";

describe("Widget Studio 2.2", () => {
  it("ships a balanced catalog with unique presets", () => {
    expect(WIDGET_PRESETS.length).toBeGreaterThanOrEqual(16);
    expect(new Set(WIDGET_PRESETS.map((item) => item.id)).size).toBe(WIDGET_PRESETS.length);
    const categories = new Set(WIDGET_PRESETS.map((item) => item.category));
    expect(categories).toEqual(new Set(["execução", "foco", "atlas", "companion", "progresso", "freelance"]));
  });

  it("supports independent Companion and finance widget instances", () => {
    const companion = applyWidgetPreset(DEFAULT_PREFERENCES.widget, "companion");
    const finance = applyWidgetPreset(DEFAULT_PREFERENCES.widget, "finance");
    expect(companion.contentMode).toBe("companion");
    expect(companion.showQuote).toBe(true);
    expect(finance.contentMode).toBe("finance");
    expect(finance.showFinance).toBe(true);
    expect(companion).not.toEqual(finance);
  });

  it("keeps the complete v5 default state schema-valid", () => {
    const result = appDataSchema.safeParse({ ...DEFAULT_APP_DATA, installationId: "install-default-220" });
    expect(result.success).toBe(true);
  });
});
