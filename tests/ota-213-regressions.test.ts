import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { OTA_RELEASE } from "@/constants/release";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import { getTaskGuidance } from "@/features/planning/task-guidance";
import { getWidgetStyleTokens, type WidgetVisualStyle } from "@/features/widgets/widget-style";
import { getColors } from "@/theme/theme";
import { makeProfile } from "@/tests/fixtures";
import type { Task } from "@/types";

const widgetStyles: WidgetVisualStyle[] = [
  "nexus",
  "amoled",
  "transparent",
  "pixel",
  "minimal",
];

describe("Nexus OTA 2.1.3 Clarity", () => {
  it("moves the native runtime to 3.0.0 for Core Reborn", () => {
    expect(OTA_RELEASE.label).toBe("3.0.0");
    expect(OTA_RELEASE.runtime).toBe("3.0.0");
    expect(JSON.parse(readFileSync("package.json", "utf8")).version).toBe("3.0.0");
    expect(JSON.parse(readFileSync("app.json", "utf8")).expo.version).toBe("3.0.0");
  });

  it("gives legacy roadmap lessons concrete instructions", () => {
    const roadmap = createStarterRoadmap("Programação com IA", makeProfile());
    const phase = roadmap.phases[0]!;
    const lesson = phase.lessons[0]!;
    const guidance = getLessonGuidance(roadmap, phase, lesson);
    expect(guidance.steps.length).toBeGreaterThanOrEqual(3);
    expect(guidance.deliverable.length).toBeGreaterThan(20);
    expect(guidance.successCriteria.length).toBeGreaterThan(20);
  });

  it("turns vague tasks into observable execution", () => {
    const task: Task = {
      id: "task-clarity",
      title: "Desmontar Código com IA",
      category: "desenvolvimento",
      priority: "media",
      estimatedMinutes: 25,
      xp: 30,
      recurring: false,
      completed: false,
    };
    const guidance = getTaskGuidance(task);
    expect(guidance.steps.join(" ")).toMatch(/arquivo|fluxo|altere/i);
    expect(guidance.deliverable).toMatch(/resumo|alteração/i);
  });

  it("makes the five reproducible Widget Studio styles visibly distinct", () => {
    const colors = getColors(DEFAULT_PREFERENCES);
    const signatures = widgetStyles.map((style) =>
      JSON.stringify(getWidgetStyleTokens(style, colors, "#8B5CF6")),
    );
    expect(new Set(signatures).size).toBe(widgetStyles.length);
  });

  it("keeps bounded timeouts and capability-aware retries", () => {
    const client = readFileSync("services/assistant.service.ts", "utf8");
    const api = readFileSync("app/api/assistant+api.ts", "utf8");
    const server = readFileSync("services/assistant.server.ts", "utf8");
    expect(client).toContain("ASSISTANT_TIMEOUT_MS = 45_000");
    expect(api).toContain("controller.abort(), 32_000");
    expect(server).toContain("CONVERSATION_PROVIDER_TIMEOUT_MS = 12_000");
    expect(server).toContain("const models = assistantModelOrder(request.mode)");
    expect(server).not.toContain("[...modelOrder(request), FREE_ROUTER]");
  });

  it("classifies this release as native because the Android widget changed", () => {
    const provider = readFileSync("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt", "utf8");
    expect(provider).toContain("ACTION_NEXT_PAGE");
    expect(provider).toContain("companionMood");
    expect(readFileSync("app.json", "utf8")).toContain('"version": "3.0.0"');
  });
});
