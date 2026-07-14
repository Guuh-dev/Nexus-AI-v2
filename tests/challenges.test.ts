import { describe, expect, it } from "vitest";
import {
  activeChallenges,
  refreshDailyChallenges,
  refreshDailyChallengesAt,
} from "@/features/progress/challenges";
import { rolloverIfNeeded } from "@/features/planning/rollover";
import { generateLocalPlan } from "@/services/planning.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";
import { localDateKey } from "@/utils/dates";

describe("daily challenge reward ledger", () => {
  it("never awards the same challenge twice after reopen and recomplete", () => {
    const profile = makeProfile();
    const plan = generateLocalPlan({
      profile,
      date: "2026-07-10",
      requestId: "challenge-plan-123",
      clientId: "challenge-install-123",
    });
    plan.tasks[0]!.completed = true;
    plan.tasks[1]!.completed = true;
    const completed = refreshDailyChallenges({ ...makeAppData(profile), activePlan: plan }, "2026-07-10");
    const afterFirstReward = completed.progress.totalXp;
    expect(completed.progress.challengeRewardLedger).toContain("daily-tasks-2026-07-10");
    expect(completed.progress.challenges.find((challenge) => challenge.id === "daily-tasks-2026-07-10")?.completed).toBe(true);

    const reopenedPlan = {
      ...completed.activePlan!,
      tasks: completed.activePlan!.tasks.map((task, index) =>
        index === 0 ? { ...task, completed: false, completedAt: undefined } : task,
      ),
    };
    const reopened = refreshDailyChallenges({ ...completed, activePlan: reopenedPlan }, "2026-07-10");
    expect(reopened.progress.totalXp).toBe(afterFirstReward);
    expect(reopened.progress.challenges.find((challenge) => challenge.id === "daily-tasks-2026-07-10")?.completed).toBe(true);

    const recompletedPlan = {
      ...reopened.activePlan!,
      tasks: reopened.activePlan!.tasks.map((task, index) =>
        index === 0 ? { ...task, completed: true, completedAt: "2026-07-10T15:00:00.000Z" } : task,
      ),
    };
    const recompleted = refreshDailyChallenges({ ...reopened, activePlan: recompletedPlan }, "2026-07-10");
    expect(recompleted.progress.totalXp).toBe(afterFirstReward);
  });

  it("removes today's generated challenges when gamification is disabled", () => {
    const profile = makeProfile();
    const data = refreshDailyChallenges(makeAppData(profile), "2026-07-10");
    const disabled = refreshDailyChallenges({
      ...data,
      preferences: { ...data.preferences, gamificationMode: "desativado" },
    }, "2026-07-10");

    expect(disabled.progress.challenges.some((challenge) => challenge.id.endsWith("2026-07-10"))).toBe(false);
  });

  it("keeps a rewarded challenge tombstoned after disable and enable on the same day", () => {
    const profile = makeProfile();
    const plan = generateLocalPlan({
      profile,
      date: "2026-07-10",
      requestId: "challenge-toggle-123",
      clientId: "challenge-install-123",
    });
    plan.tasks[0]!.completed = true;
    plan.tasks[1]!.completed = true;

    const rewarded = refreshDailyChallenges({ ...makeAppData(profile), activePlan: plan }, "2026-07-10");
    const rewardedXp = rewarded.progress.totalXp;
    const disabled = refreshDailyChallenges({
      ...rewarded,
      preferences: { ...rewarded.preferences, gamificationMode: "desativado" },
    }, "2026-07-10");
    const enabled = refreshDailyChallenges({
      ...disabled,
      preferences: { ...disabled.preferences, gamificationMode: "equilibrado" },
    }, "2026-07-10");

    expect(disabled.progress.challengeRewardLedger).toContain("daily-tasks-2026-07-10");
    expect(enabled.progress.totalXp).toBe(rewardedXp);
    expect(enabled.progress.challengeRewardLedger).toEqual(disabled.progress.challengeRewardLedger);
    expect(enabled.progress.challenges.some((challenge) => challenge.id === "daily-tasks-2026-07-10")).toBe(false);
  });

  it("refreshes the next day's challenges deterministically after a cold-start rollover", () => {
    const profile = makeProfile();
    const plan = generateLocalPlan({
      profile,
      date: "2026-07-10",
      requestId: "challenge-cold-start-123",
      clientId: "challenge-install-123",
    });
    const previousDay = refreshDailyChallenges({ ...makeAppData(profile), activePlan: plan }, "2026-07-10");
    const nextMorning = new Date("2026-07-11T12:00:00.000Z");

    const rollover = rolloverIfNeeded(previousDay, nextMorning);
    const hydrated = refreshDailyChallengesAt(rollover.data, nextMorning);

    expect(rollover.rolledOver).toBe(true);
    expect(hydrated.activePlan?.date).toBe("2026-07-11");
    expect(hydrated.progress.challenges.map((challenge) => challenge.id)).toEqual(
      expect.arrayContaining([
        "daily-tasks-2026-07-11",
        "daily-focus-2026-07-11",
      ]),
    );
  });

  it("uses the exact expiration instant and the user's civil-day boundary", () => {
    for (const [timezone, date] of [
      ["America/Sao_Paulo", "2026-07-10"],
      ["Asia/Kathmandu", "2026-07-10"],
      ["America/New_York", "2026-03-08"],
    ] as const) {
      const profile = makeProfile({ timezone });
      const data = refreshDailyChallenges(makeAppData(profile), date);
      const challenge = data.progress.challenges.find((item) => item.id === `daily-tasks-${date}`)!;
      const expiresAt = new Date(challenge.expiresAt);

      expect(localDateKey(expiresAt, profile.timezone)).toBe(date);
      expect(localDateKey(new Date(expiresAt.getTime() + 1), profile.timezone)).not.toBe(date);
      expect(activeChallenges(data, expiresAt)).toContainEqual(challenge);
      expect(activeChallenges(data, new Date(expiresAt.getTime() + 1))).not.toContainEqual(challenge);
    }
  });
});
