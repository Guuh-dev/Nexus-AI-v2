import { describe, expect, it } from "vitest";
import { calculateStreak, planCompletion, rolloverIfNeeded } from "@/features/planning/rollover";
import { generateLocalPlan } from "@/services/planning.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";

describe("daily rollover and streak", () => {
  it("creates exactly one new plan for a date", () => {
    const profile = makeProfile();
    const initial = {
      ...makeAppData(profile),
      activePlan: generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-old-123", clientId: "install-test-123" }),
    };
    const first = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));
    expect(first.rolledOver).toBe(true);
    expect(first.data.activePlan?.date).toBe("2026-07-10");
    expect(first.data.history).toHaveLength(1);
    const second = rolloverIfNeeded(first.data, new Date("2026-07-10T18:00:00Z"));
    expect(second.rolledOver).toBe(false);
    expect(second.data.history).toHaveLength(1);
    expect(second.data.activePlan?.requestId).toBe(first.data.activePlan?.requestId);
  });

  it("counts a day at 70 percent or a completed main mission", () => {
    const profile = makeProfile({ maxDailyTasks: 3 });
    const plan = generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-progress-123", clientId: "install-test-123" });
    plan.tasks.forEach((task) => { task.completed = true; });
    expect(planCompletion(plan).qualifies).toBe(true);
    plan.tasks.forEach((task) => { task.completed = false; });
    plan.mainMission.completed = true;
    expect(planCompletion(plan).qualifies).toBe(true);
  });

  it("does not break streaks merely because dates without history are absent", () => {
    const profile = makeProfile();
    const data = makeAppData(profile);
    const base = generateLocalPlan({ profile, date: "2026-07-01", requestId: "request-streak-123", clientId: "install-test-123" });
    const history = ["2026-07-01", "2026-07-03", "2026-07-10"].map((date) => ({
      date,
      plan: { ...base, date, requestId: `request-${date}` },
      completedTasks: 3,
      totalTasks: 4,
      completionPercentage: 75,
      xpEarned: 100,
      focusMinutes: 25,
      countedForStreak: true,
    }));
    expect(calculateStreak(history)).toEqual({ current: 3, best: 3 });
    expect(data.progress.currentStreak).toBe(0);
  });
});
