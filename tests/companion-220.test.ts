import { describe, expect, it } from "vitest";
import { DEFAULT_APP_DATA } from "@/constants/defaults";
import { companionLines, companionStatus, getCompanionLine } from "@/features/companion/companion";
import type { AppData } from "@/types";

function dataWithProgress(completed: number): AppData {
  const data = JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData;
  data.activePlan = {
    requestId: "request-companion-220",
    date: "2026-07-12",
    mainMission: { title: "Ship Nexus", description: "", priority: "alta", estimatedMinutes: 30, xp: 75, completed: completed > 2 },
    tasks: [0, 1, 2].map((index) => ({ id: `task-${index}`, title: `Task ${index}`, category: "desenvolvimento", priority: "media", estimatedMinutes: 25, xp: 30, recurring: false, completed: index < completed })),
    focusMessage: "Execute.", avoidToday: [], totalEstimatedMinutes: 105, source: "ai", createdAt: "2026-07-12T10:00:00.000Z",
  };
  data.progress.totalXp = 420;
  return data;
}

describe("Nexus Companion 2.2", () => {
  it("reacts deterministically to progress while keeping personalities distinct", () => {
    const data = dataWithProgress(1);
    expect(companionStatus(data)).toBe("progress");
    expect(getCompanionLine(data, "happy", "widget")).toBe(getCompanionLine(data, "happy", "widget"));
    const lines = Object.values(companionLines(data));
    expect(new Set(lines).size).toBeGreaterThanOrEqual(5);
  });

  it("ships Orbit and Ember as selectable companions", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("components/CompanionMascot.tsx", "utf8");
    expect(source).toContain('orbit: "Orbit"');
    expect(source).toContain('ember: "Ember"');
    expect(DEFAULT_APP_DATA.preferences.mascot.unlocked).toEqual(expect.arrayContaining(["orbit", "ember"]));
  });

  it("recognizes a fully completed day", () => {
    expect(companionStatus(dataWithProgress(3))).toBe("done");
  });
});
