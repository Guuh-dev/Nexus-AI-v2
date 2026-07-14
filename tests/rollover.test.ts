import { describe, expect, it } from "vitest";
import { calculateStreak, mergeSameDayPlanEvidence, planCompletion, rolloverIfNeeded } from "@/features/planning/rollover";
import { deleteTask, updateTask } from "@/features/tasks/task.logic";
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

  it("keeps completed evidence and the original accounting window across replans", () => {
    const profile = makeProfile({ maxDailyTasks: 3 });
    const current = generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-before-replan", clientId: "install-test-123" });
    current.createdAt = "2026-07-10T08:00:00.000Z";
    const completed = current.tasks[0]!;
    completed.completed = true;
    completed.completedAt = "2026-07-10T09:00:00.000Z";
    const replacement = generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-after-replan", clientId: "install-test-123" });
    replacement.createdAt = "2026-07-10T13:00:00.000Z";

    const merged = mergeSameDayPlanEvidence(current, replacement);

    expect(merged.requestId).toBe("request-after-replan");
    expect(merged.createdAt).toBe("2026-07-10T08:00:00.000Z");
    expect(merged.tasks.find((task) => task.id === completed.id)?.completed).toBe(true);
    expect(merged.tasks).toHaveLength(3);
  });

  it("carries replan evidence into the next rollover history without losing focus", () => {
    const profile = makeProfile({ maxDailyTasks: 3 });
    const current = generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-ledger-before", clientId: "install-test-123" });
    current.createdAt = "2026-07-10T10:00:00.000Z";
    current.tasks[0]!.completed = true;
    current.tasks[0]!.completedAt = "2026-07-10T11:00:00.000Z";
    const replacement = generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-ledger-after", clientId: "install-test-123" });
    replacement.createdAt = "2026-07-10T16:00:00.000Z";
    const activePlan = mergeSameDayPlanEvidence(current, replacement);
    const data = {
      ...makeAppData(profile),
      activePlan,
      progress: {
        ...makeAppData(profile).progress,
        focusSessions: [{
          id: "focus-before-replan",
          taskTitle: current.tasks[0]!.title,
          plannedMinutes: 25,
          elapsedSeconds: 1500,
          xp: 25,
          status: "completed" as const,
          startedAt: "2026-07-10T11:15:00.000Z",
          completedAt: "2026-07-10T11:40:00.000Z",
        }],
      },
    };

    const rolled = rolloverIfNeeded(data, new Date("2026-07-11T15:00:00.000Z"));
    const archived = rolled.data.history.find((entry) => entry.date === "2026-07-10");

    expect(archived?.completedTasks).toBeGreaterThanOrEqual(1);
    expect(archived?.focusMinutes).toBe(25);
    expect(archived?.xpEarned).toBeGreaterThanOrEqual(current.tasks[0]!.xp + 25);
  });

  it("injects due scheduled captures once and keeps their full task context", () => {
    const profile = makeProfile({ maxDailyTasks: 3 });
    const initial = {
      ...makeAppData(profile),
      activePlan: generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-scheduled-old", clientId: "install-test-123" }),
      weeklyPlan: [{
        id: "scheduled-capture-1",
        date: "2026-07-10",
        title: "Enviar relatório",
        description: "Relatório revisado para a equipe.",
        context: "Compromisso registrado ontem.",
        firstStep: "Abrir o rascunho.",
        expectedResult: "Relatório enviado.",
        doneWhen: "Confirmação recebida.",
        category: "organizacao" as const,
        estimatedMinutes: 25,
        priority: "media" as const,
        recurring: false,
        completed: false,
      }],
    };

    const rolled = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));
    const scheduled = rolled.data.activePlan?.tasks.find((task) => task.title === "Enviar relatório");

    expect(scheduled).toMatchObject({
      description: "Relatório revisado para a equipe.",
      context: "Compromisso registrado ontem.",
      scheduledDate: "2026-07-10",
    });
    expect(rolled.data.weeklyPlan).toEqual([]);
    expect(rolloverIfNeeded(rolled.data, new Date("2026-07-10T18:00:00Z")).data.activePlan?.tasks.filter((task) => task.title === "Enviar relatório")).toHaveLength(1);
  });

  it("keeps scheduled overflow queued without dropping previously admitted captures", () => {
    const profile = makeProfile({ maxDailyTasks: 2 });
    const initial = {
      ...makeAppData(profile),
      activePlan: generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-overflow-old", clientId: "install-test-123" }),
      weeklyPlan: [
        { id: "scheduled-overflow-1", date: "2026-07-10", title: "Captura agendada 1", category: "organizacao" as const, estimatedMinutes: 10, priority: "baixa" as const, recurring: false, completed: false },
        { id: "scheduled-overflow-2", date: "2026-07-10", title: "Captura agendada 2", category: "organizacao" as const, estimatedMinutes: 20, priority: "alta" as const, recurring: false, completed: false },
        { id: "scheduled-overflow-3", date: "2026-07-10", title: "Captura agendada 3", category: "organizacao" as const, estimatedMinutes: 30, priority: "media" as const, recurring: false, completed: false },
        { id: "scheduled-overflow-4", date: "2026-07-10", title: "Captura agendada 4", category: "organizacao" as const, estimatedMinutes: 40, priority: "alta" as const, recurring: false, completed: false },
      ],
    };

    const first = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));

    expect(first.data.activePlan?.tasks.map((task) => [task.title, task.priority])).toEqual([
      ["Captura agendada 1", "baixa"],
      ["Captura agendada 2", "alta"],
    ]);
    expect(first.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "scheduled-overflow-1",
      "scheduled-overflow-2",
    ]);
    expect(first.data.weeklyPlan.map((item) => [item.id, item.priority])).toEqual([
      ["scheduled-overflow-3", "media"],
      ["scheduled-overflow-4", "alta"],
    ]);

    const resumed = rolloverIfNeeded(first.data, new Date("2026-07-10T18:00:00Z"));

    expect(resumed.rolledOver).toBe(false);
    expect(resumed.data.weeklyPlan).toEqual(first.data.weeklyPlan);
    expect(resumed.data.activePlan?.tasks.map((task) => task.title)).toEqual([
      "Captura agendada 1",
      "Captura agendada 2",
    ]);

    const second = rolloverIfNeeded(resumed.data, new Date("2026-07-11T15:00:00Z"));

    expect(second.data.activePlan?.tasks.map((task) => [task.title, task.priority])).toEqual([
      ["Captura agendada 1", "baixa"],
      ["Captura agendada 2", "alta"],
    ]);
    expect(second.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "scheduled-overflow-1",
      "scheduled-overflow-2",
    ]);
    expect(second.data.weeklyPlan.map((item) => item.id)).toEqual([
      "scheduled-overflow-3",
      "scheduled-overflow-4",
    ]);

    second.data.activePlan?.tasks.forEach((task) => {
      task.completed = true;
      task.completedAt = "2026-07-11T18:00:00.000Z";
    });
    const third = rolloverIfNeeded(second.data, new Date("2026-07-12T15:00:00Z"));

    expect(third.data.activePlan?.tasks.map((task) => [task.title, task.priority])).toEqual([
      ["Captura agendada 3", "media"],
      ["Captura agendada 4", "alta"],
    ]);
    expect(third.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "scheduled-overflow-3",
      "scheduled-overflow-4",
    ]);
    expect(third.data.weeklyPlan).toEqual([]);
  });

  it("recovers a missing active plan locally and keeps non-admitted work queued", () => {
    const profile = makeProfile({ maxDailyTasks: 2 });
    const recurring = {
      ...generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-recovery-seed", clientId: "install-test-123" }).tasks[0]!,
      id: "recovery-recurring",
      recurring: true,
      postponedFrom: "2026-07-09",
    };
    const initial = {
      ...makeAppData(profile),
      activePlan: undefined,
      weeklyPlan: [
        { id: "recovery-capture-1", date: "2026-07-10", title: "Recuperar captura 1", category: "organizacao" as const, estimatedMinutes: 10, priority: "media" as const, recurring: false, completed: false },
        { id: "recovery-capture-2", date: "2026-07-10", title: "Recuperar captura 2", category: "organizacao" as const, estimatedMinutes: 20, priority: "alta" as const, recurring: false, completed: false },
        { id: "recovery-capture-3", date: "2026-07-10", title: "Recuperar captura 3", category: "organizacao" as const, estimatedMinutes: 30, priority: "baixa" as const, recurring: false, completed: false },
      ],
      recurringTasks: [recurring],
    };

    const recovered = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));

    expect(recovered.rolledOver).toBe(true);
    expect(recovered.data.activePlan?.date).toBe("2026-07-10");
    expect(recovered.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "recovery-capture-1",
      "recovery-capture-2",
    ]);
    expect(recovered.data.weeklyPlan.map((item) => item.id)).toEqual(["recovery-capture-3"]);
    expect(recovered.data.recurringTasks.map((task) => task.id)).toContain("recovery-recurring");
    expect(recovered.data.history).toEqual(initial.history);

    const resumed = rolloverIfNeeded(recovered.data, new Date("2026-07-10T18:00:00Z"));
    expect(resumed.rolledOver).toBe(false);
    expect(resumed.data.activePlan?.requestId).toBe(recovered.data.activePlan?.requestId);
    expect(resumed.data.weeklyPlan.map((item) => item.id)).toEqual(["recovery-capture-3"]);
  });

  it("keeps recurring identity stable so disabling or deleting prevents recurrence", () => {
    const profile = makeProfile({ maxDailyTasks: 2 });
    const previousPlan = generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-recurring-old", clientId: "install-test-123" });
    previousPlan.tasks.forEach((task) => {
      task.completed = true;
      task.completedAt = "2026-07-09T18:00:00.000Z";
    });
    const [seedOne, seedTwo] = previousPlan.tasks;
    const recurringOne = {
      ...seedOne!,
      id: "recurring-stable-1",
      title: "Recorrência para desativar",
      priority: "baixa" as const,
      recurring: true,
      completed: false,
      completedAt: undefined,
    };
    const recurringTwo = {
      ...seedTwo!,
      id: "recurring-stable-2",
      title: "Recorrência para excluir",
      priority: "baixa" as const,
      recurring: true,
      completed: false,
      completedAt: undefined,
    };
    const initial = {
      ...makeAppData(profile),
      activePlan: previousPlan,
      recurringTasks: [recurringOne, recurringTwo],
    };

    const rolled = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));

    expect(rolled.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "recurring-stable-1",
      "recurring-stable-2",
    ]);
    const disabled = updateTask(rolled.data, "recurring-stable-1", { recurring: false });
    const removed = deleteTask(disabled, "recurring-stable-2");
    expect(removed.recurringTasks).toEqual([]);

    const next = rolloverIfNeeded(removed, new Date("2026-07-11T15:00:00Z"));

    expect(next.data.activePlan?.tasks.map((task) => task.id)).not.toContain("recurring-stable-1");
    expect(next.data.activePlan?.tasks.map((task) => task.id)).not.toContain("recurring-stable-2");
    expect(next.data.activePlan?.tasks.map((task) => task.title)).not.toContain("Recorrência para desativar");
    expect(next.data.activePlan?.tasks.map((task) => task.title)).not.toContain("Recorrência para excluir");
  });

  it("preserves the full recurring and postponed backlog until each one-shot is admitted", () => {
    const profile = makeProfile({ maxDailyTasks: 2 });
    const previousPlan = generateLocalPlan({ profile, date: "2026-07-09", requestId: "request-backlog-old", clientId: "install-test-123" });
    previousPlan.tasks = previousPlan.tasks.slice(0, 2).map((task, index) => ({
      ...task,
      id: `scheduled-saturation-${index + 1}`,
      title: `Agendada pendente ${index + 1}`,
      priority: "baixa" as const,
      completed: false,
      completedAt: undefined,
      scheduledDate: "2026-07-09",
    }));
    const seed = previousPlan.tasks[0]!;
    const recurringTasks = Array.from({ length: 6 }, (_, index) => ({
      ...seed,
      id: `backlog-recurring-${index + 1}`,
      title: `Recorrência preservada ${index + 1}`,
      scheduledDate: undefined,
      postponedFrom: undefined,
      recurring: true,
    }));
    const postponed = {
      ...seed,
      id: "backlog-postponed-once",
      title: "Postergada pontual preservada",
      scheduledDate: undefined,
      postponedFrom: "2026-07-09",
      recurring: false,
    };
    const initial = {
      ...makeAppData(profile),
      activePlan: previousPlan,
      recurringTasks: [...recurringTasks, postponed],
    };

    const saturated = rolloverIfNeeded(initial, new Date("2026-07-10T15:00:00Z"));

    expect(saturated.data.activePlan?.tasks.map((task) => task.id)).toEqual([
      "scheduled-saturation-1",
      "scheduled-saturation-2",
    ]);
    expect(saturated.data.recurringTasks.map((task) => task.id)).toEqual([
      ...recurringTasks.map((task) => task.id),
      "backlog-postponed-once",
    ]);

    saturated.data.activePlan?.tasks.forEach((task) => {
      task.completed = true;
      task.completedAt = "2026-07-10T18:00:00.000Z";
    });
    const admitted = rolloverIfNeeded(saturated.data, new Date("2026-07-11T15:00:00Z"));

    expect(admitted.data.activePlan?.tasks.map((task) => task.id)).toContain("backlog-postponed-once");
    expect(admitted.data.recurringTasks.map((task) => task.id)).toEqual(
      recurringTasks.map((task) => task.id),
    );
  });
});
