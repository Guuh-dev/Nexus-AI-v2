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
});
