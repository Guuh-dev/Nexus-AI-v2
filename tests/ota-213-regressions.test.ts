import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { OTA_RELEASE } from "@/constants/release";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import { getTaskGuidance } from "@/features/planning/task-guidance";
import { getWidgetStyleTokens } from "@/features/widgets/widget-style";
import { getColors } from "@/theme/theme";
import { makeProfile } from "@/tests/fixtures";
import type { Task, WidgetStyle } from "@/types";

const widgetStyles: WidgetStyle[] = [
  "nexus",
  "amoled",
  "transparent",
  "glass",
  "pixel",
  "minimal",
  "gamer",
  "neon",
  "mascot",
  "privacy",
];

describe("Nexus OTA 2.1.3 Clarity", () => {
  it("keeps runtime 2.1.1 while publishing OTA metadata 2.1.3", () => {
    expect(OTA_RELEASE.label).toBe("2.1.3");
    expect(OTA_RELEASE.runtime).toBe("2.1.1");
    expect(JSON.parse(readFileSync("package.json", "utf8")).version).toBe(
      "2.1.1",
    );
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

  it("makes every Widget Studio style visibly distinct", () => {
    const colors = getColors(DEFAULT_PREFERENCES);
    const signatures = widgetStyles.map((style) =>
      JSON.stringify(getWidgetStyleTokens(style, colors, "#8B5CF6")),
    );
    expect(new Set(signatures).size).toBe(widgetStyles.length);
  });

  it("keeps the client timeout above the server and conversational provider limits", () => {
    const client = readFileSync("services/assistant.service.ts", "utf8");
    const api = readFileSync("app/api/assistant+api.ts", "utf8");
    const server = readFileSync("services/assistant.server.ts", "utf8");
    expect(client).toContain("ASSISTANT_TIMEOUT_MS = 35_000");
    expect(api).toContain("controller.abort(), 32_000");
    expect(server).toContain("CONVERSATION_PROVIDER_TIMEOUT_MS = 12_000");
    expect(server).toContain("[...modelOrder(request), FREE_ROUTER]");
  });

  it("keeps this release OTA-only", () => {
    const changedNativeFiles = [
      "app.json",
      "package.json",
      "pnpm-lock.yaml",
    ].filter((path) =>
      readFileSync(path, "utf8").includes('"version": "2.1.3"'),
    );
    expect(changedNativeFiles).toEqual([]);
  });
});
