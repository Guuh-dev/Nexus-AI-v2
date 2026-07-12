import { describe, expect, it } from "vitest";
import { recoverAppData } from "@/services/storage.service";
import { makeProfile } from "@/tests/fixtures";

describe("storage recovery", () => {
  it("recovers an unreadable root without losing app usability", () => {
    const recovered = recoverAppData("not-an-object");
    expect(recovered.onboardingCompleted).toBe(false);
    expect(recovered.installationId).toMatch(/^install-/);
    expect(recovered.corruptionWarnings.length).toBeGreaterThan(0);
  });

  it("preserves a valid profile while resetting only corrupted sections", () => {
    const recovered = recoverAppData({
      storageVersion: 1,
      installationId: "install-existing-123",
      profile: makeProfile(),
      onboardingCompleted: true,
      onboardingDraft: {},
      history: "broken",
      recurringTasks: [],
      preferences: { theme: "invented" },
      progress: { totalXp: -100 },
      corruptionWarnings: [],
    });
    expect(recovered.profile?.nickname).toBe("Gusta");
    expect(recovered.onboardingCompleted).toBe(true);
    expect(recovered.history).toEqual([]);
    expect(recovered.preferences.theme).toBe("nexus");
    expect(recovered.progress.totalXp).toBe(0);
    expect(recovered.corruptionWarnings.length).toBeGreaterThanOrEqual(3);
  });

  it("migrates v3 widget preferences to v5 without losing existing choices", () => {
    const base = recoverAppData({
      storageVersion: 3,
      installationId: "install-existing-456",
      profile: makeProfile(),
      onboardingCompleted: true,
      discoveryCompleted: true,
      onboardingDraft: {},
      history: [],
      recurringTasks: [],
      preferences: {
        theme: "amoled",
        customAccent: "#8B5CF6",
        haptics: true,
        sound: false,
        reducedMotion: false,
        notificationEnabled: false,
        notificationTime: "18:00",
        gamificationMode: "equilibrado",
        dashboard: { preset: "original", density: "confortavel", glow: "sutil", backgroundEffect: "grade", sections: ["mission", "tasks"], hiddenSections: [] },
        mascot: { primary: "nexus", companion: "atlas", showCompanion: true, speechEnabled: true, unlocked: ["nexus", "atlas"], skin: "classic", unlockedSkins: ["classic"], accessories: [], professorVariant: "classic" },
        widget: { background: "amoled", style: "amoled", preferredSize: "4x2", showMascot: true, mascot: "nexus", showProfessor: false, showLearning: false, showMission: true, showTasks: true, showXp: false, showLevel: false, taskCount: 2, showStreak: true, progressStyle: "bar", privacyMode: false, fontScale: "normal", opacity: 0.9 },
      },
      progress: { totalXp: 42, currentStreak: 2, bestStreak: 2, focusSessions: [], achievements: [], attributes: { foco: 1, execucao: 1, consistencia: 1, disciplina: 1 }, challenges: [] },
      brain: { threads: [], memories: [] },
      learning: { professorEnabled: false, roadmaps: [], pendingTopics: [] },
      weeklyReviews: [],
      operations: [],
      habits: [],
      weeklyPlan: [],
      corruptionWarnings: [],
    });
    expect(base.storageVersion).toBe(5);
    expect(base.preferences.theme).toBe("amoled");
    expect(base.preferences.widget.taskCount).toBe(2);
    expect(base.preferences.widget.preset).toBe("balanced");
    expect(base.preferences.widget.tapAction).toBe("today");
    expect(base.preferences.widget.contentMode).toBe("smart");
    expect(base.preferences.mascot.companionMood).toBe("happy");
    expect(base.finance.monthlyGoal).toBe(3000);
    expect(base.progress.totalXp).toBe(42);
  });
});
