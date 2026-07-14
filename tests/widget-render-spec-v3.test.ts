import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import {
  WIDGET_FAMILIES,
  createWidgetRenderSpec,
  familyFromWidgetSize,
  normalizeWidgetSpeech,
  normalizeWidgetTapAction,
  normalizeOpacityPercent,
  widgetPreferencesPatchFromConfiguration,
} from "@/features/widget/render-spec";
import { normalizeWidgetStyle } from "@/features/widgets/widget-style";
import { createWidgetPayload } from "@/services/widget.service";
import { getColors } from "@/theme/theme";
import { makeAppData } from "@/tests/fixtures";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

describe("WidgetRenderSpec v3", () => {
  const colors = getColors(DEFAULT_PREFERENCES);

  it("defines one deterministic contract per useful family", () => {
    const expected = {
      mini: { size: "1x1", taskLimit: 0, mascotVisible: true },
      strip: { size: "2x1", taskLimit: 0, mascotVisible: false },
      companion: { size: "2x2", taskLimit: 0, mascotVisible: true },
      mission: { size: "4x2", taskLimit: 2, mascotVisible: false },
      command: { size: "4x4", taskLimit: 4, mascotVisible: true },
    } as const;
    for (const family of WIDGET_FAMILIES) {
      const spec = createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, { family: family.family });
      expect(spec.schemaVersion).toBe(3);
      expect(spec.size).toBe(expected[family.family].size);
      expect(spec.taskLimit).toBe(expected[family.family].taskLimit);
      expect(spec.fields.mascot).toBe(expected[family.family].mascotVisible);
      expect(spec.emptyState.title.length).toBeGreaterThan(5);
      expect(spec.actions.tap.length).toBeGreaterThan(0);
    }
  });

  it("migrates legacy sizes and unsupported styles without losing the widget", () => {
    expect(familyFromWidgetSize("4x1")).toBe("strip");
    expect(familyFromWidgetSize("3x2")).toBe("mission");
    expect(familyFromWidgetSize("4x3")).toBe("command");
    expect(familyFromWidgetSize("5x2")).toBe("mission");
    expect(normalizeWidgetStyle("glass")).toBe("nexus");
    expect(normalizeWidgetStyle("gamer")).toBe("pixel");
    expect(normalizeWidgetStyle("privacy")).toBe("minimal");
  });

  it("normalizes both old floats and native percentages", () => {
    expect(normalizeOpacityPercent(0.5)).toBe(50);
    expect(normalizeOpacityPercent(0.96)).toBe(96);
    expect(normalizeOpacityPercent(85)).toBe(85);
    expect(normalizeOpacityPercent(120)).toBe(100);
  });

  it("normalizes legacy speech/actions and serializes privacy", () => {
    expect(normalizeWidgetSpeech("motivational")).toBe("contextual");
    expect(normalizeWidgetSpeech("silent")).toBe("silent");
    expect(normalizeWidgetTapAction("finance")).toBe("today");
    expect(normalizeWidgetTapAction("brain")).toBe("brain");
    const spec = createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, {
      family: "command",
      privateMode: true,
      speech: "silent",
    });
    expect(spec.privateMode).toBe(true);
    expect(spec.mascot.speech).toBe("silent");
  });

  it("keeps Mission content variants mutually exclusive and previewable", () => {
    const mission = createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, {
      family: "mission",
      content: "mission",
    });
    const tasks = createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, colors, {
      family: "mission",
      content: "tasks",
    });
    expect(mission.fields).toMatchObject({ mission: true, tasks: false, progress: true });
    expect(mission.actions.taskToggle).toBe(false);
    expect(tasks.fields).toMatchObject({ mission: false, tasks: true, progress: true });
    expect(tasks.actions.taskToggle).toBe(true);
  });

  it("treats global privacy as a floor and redacts the shared payload", () => {
    const privatePreferences = {
      ...DEFAULT_PREFERENCES,
      widget: { ...DEFAULT_PREFERENCES.widget, privacyMode: true },
    };
    const spec = createWidgetRenderSpec(privatePreferences.widget, getColors(privatePreferences), {
      family: "mission",
      content: "tasks",
      privateMode: false,
    });
    const data = makeAppData();
    data.preferences = privatePreferences;
    const payload = createWidgetPayload(data);
    expect(spec.privateMode).toBe(true);
    expect(spec.actions.taskToggle).toBe(false);
    expect(payload.tasks).toEqual([]);
    expect(payload).toMatchObject({ completedCount: 0, totalCount: 0, streak: 0, totalXp: 0, focusMinutes: 0 });
  });

  it("maps a saved configuration back to real persisted defaults", () => {
    const patch = widgetPreferencesPatchFromConfiguration({
      family: "mission",
      style: "amoled",
      accentColor: "#10B981",
      opacityPercent: 85,
      content: "tasks",
      mascot: "nexus",
      personality: "serious",
      speech: "contextual",
      tapAction: "today",
      privateMode: false,
    });
    expect(patch).toMatchObject({
      preferredSize: "4x2",
      taskCount: 2,
      progressStyle: "bar",
      opacity: 0.85,
      style: "amoled",
      accentColor: "#10B981",
    });
  });

  it("serializes all family specs into the payload consumed by Kotlin", () => {
    const data = makeAppData();
    const payload = createWidgetPayload(data);
    expect(payload.schemaVersion).toBe(3);
    expect(Object.keys(payload.renderSpecs)).toEqual(["mini", "strip", "companion", "mission", "command"]);
    expect(payload.renderSpecs.mission.taskLimit).toBe(2);
    expect(payload.renderSpecs.command.taskLimit).toBe(4);
    expect(payload.tasks.length).toBeLessThanOrEqual(4);
    expect(payload).not.toHaveProperty("finance");
    expect(payload).not.toHaveProperty("habits");
    expect(payload).not.toHaveProperty("boss");
    expect(payload).not.toHaveProperty("learning");
    expect(payload.appearance).not.toHaveProperty("showProfessor");
    expect(payload.appearance).not.toHaveProperty("showLearning");
  });
});
