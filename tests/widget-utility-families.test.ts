import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { ACTIVITY_DAYS, activityLevel, activitySummary } from "@/features/widget/activity";
import {
  createWidgetRenderSpec,
  familyFromWidgetSize,
  isUtilityWidgetFamily,
  widgetConfigurationFromPreferences,
  widgetPreferencesPatchFromConfiguration,
} from "@/features/widget/render-spec";
import { createWidgetPayload } from "@/services/widget.service";
import { getColors } from "@/theme/theme";
import { makeAppData } from "@/tests/fixtures";
import type { FocusSession } from "@/types";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

const colors = getColors(DEFAULT_PREFERENCES);

function session(id: string, completedAt: string, minutes: number, status: FocusSession["status"] = "completed"): FocusSession {
  return { id, taskTitle: "Sessão", plannedMinutes: minutes, elapsedSeconds: minutes * 60, xp: 0, status, startedAt: completedAt, completedAt, mode: "profundo" } as FocusSession;
}

describe("utility widget families", () => {
  it("keeps Timer, Captura and Sequência out of the legacy size mapping", () => {
    for (const size of ["1x1", "2x1", "2x2", "4x2", "4x4"]) expect(isUtilityWidgetFamily(familyFromWidgetSize(size))).toBe(false);
    expect(createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, { family: "timer" }).content).toBe("timer");
    expect(createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, { family: "capture" }).fields.mascot).toBe(false);
    expect(createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, { family: "streak", scene: "night" }).scene).toBe("none");
  });

  it("saves only shared visuals when a utility family is stored as the default", () => {
    const base = widgetConfigurationFromPreferences(DEFAULT_PREFERENCES.widget, colors.primary);
    const patch = widgetPreferencesPatchFromConfiguration({ ...base, family: "streak", content: "heatmap", style: "amoled", accentColor: "#7FE0BC" });
    expect(patch).not.toHaveProperty("preferredSize");
    expect(patch).not.toHaveProperty("contentMode");
    expect(patch.style).toBe("amoled");
    expect(patch.accentColor).toBe("#7FE0BC");
  });

  it("derives activity levels only from recorded focus and completed tasks", () => {
    expect([activityLevel(0, 0), activityLevel(0, 1), activityLevel(15, 0), activityLevel(45, 0), activityLevel(90, 0)]).toEqual([0, 1, 2, 3, 4]);
    const data = makeAppData();
    data.progress.focusSessions = [
      session("a", "2026-10-04T13:00:00.000Z", 50),
      session("b", "2026-10-03T13:00:00.000Z", 20),
      session("c", "2026-10-02T13:00:00.000Z", 120, "cancelled"),
      session("d", "2026-01-01T13:00:00.000Z", 120),
    ];
    const summary = activitySummary(data, new Date("2026-10-04T15:00:00.000Z"));
    expect(summary.levels).toHaveLength(ACTIVITY_DAYS);
    expect(summary.levels.at(-1)).toBe(3);
    expect(summary.levels.at(-2)).toBe(2);
    expect(summary.levels.at(-3)).toBe(0);
    expect(summary.focusMinutes).toBe(70);
    expect(summary.activeDays).toBe(2);
  });

  it("omits activity history from the payload in private mode", () => {
    const visible = makeAppData();
    expect(createWidgetPayload(visible).activity).toHaveLength(ACTIVITY_DAYS);
    const hidden = makeAppData();
    hidden.preferences.widget.privacyMode = true;
    const payload = createWidgetPayload(hidden);
    expect(payload).not.toHaveProperty("activity");
    expect(payload).not.toHaveProperty("activityFocusMinutes");
    expect(JSON.stringify(payload).length).toBeLessThan(32_768);
  });
});
