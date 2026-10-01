import { describe, expect, it } from "vitest";
import { allocate, capacity, confirmExecution, confirmSecondaryGoal, draftFor, executionFromDraft, orderTasks, reconcileExecution, seedLockIn } from "@/features/lock-in/planning";
import { lockInStateSchema } from "@/schemas/lock-in.schema";
import { toggleMainMission, toggleTaskCompletion, addTask } from "@/features/tasks/task.logic";
import { rolloverIfNeeded } from "@/features/planning/rollover";
import { DEFAULT_APP_DATA } from "@/constants/defaults";
import { makeAppData } from "@/tests/fixtures";
import type { LockInDraft } from "@/schemas/lock-in.schema";
const now = new Date("2026-10-01T12:00:00Z");
function draft(): LockInDraft { return { ...draftFor(makeAppData(), now), name: "Gustavo", result: "Entregar e utilizar o ciclo Lock-In no Nexus", why: "Ter um produto utilizável", doneWhen: "Ciclo demonstrado e testado", date: "2026-10-01", timezone: "UTC", windows: "12:00-14:00", reservations: "", buffer: "15", mission: "Validar a migração v7", firstAction: "Abrir os testes de storage", acceptance: "Migração e falha de gravação testadas", estimate: "25", step: 2 }; }
function confirmed() { return confirmExecution(makeAppData(), draft(), 0, now); }

describe("Lock-In: capacidade e confirmação", () => {
  it("subtracts overlapping reservations once and never adds buffer", () => {
    const d = { ...draft(), windows: "12:00-14:00\n13:00-15:00", reservations: "12:30-13:30\n13:00-14:00", buffer: "15" };
    const c = capacity(executionFromDraft(d), now);
    expect(c.grossMinutes).toBe(90); expect(c.minutes).toBe(75);
  });
  it("removes past time and accepts an explicit late window instead of a 22h cutoff", () => {
    const d = { ...draft(), windows: "11:00-13:00\n23:00-23:45", buffer: "0" };
    expect(capacity(executionFromDraft(d), now).minutes).toBe(105);
  });
  it("rejects workload that exceeds a continuous window even if total minutes fit", () => {
    const d = { ...draft(), windows: "12:00-12:20\n13:00-13:20", buffer: "0", estimate: "25" };
    expect(() => confirmExecution(makeAppData(), d, 0, now)).toThrow(/contínuos/);
  });
  it("rejects reverse intervals, bad timezone, dates and ambiguous DST times", () => {
    expect(() => executionFromDraft({ ...draft(), windows: "14:00-12:00" })).toThrow();
    expect(() => executionFromDraft({ ...draft(), timezone: "Invented/Zone" })).toThrow();
    expect(() => executionFromDraft({ ...draft(), date: "2026-02-30" })).toThrow();
    expect(() => executionFromDraft({ ...draft(), date: "2026-11-01", timezone: "America/New_York", windows: "01:15-02:30" })).toThrow(/ambíguo/);
  });
  it("uses the user's timezone rather than the process timezone", () => {
    const d = { ...draft(), timezone: "America/Sao_Paulo", windows: "09:00-11:00" };
    expect(executionFromDraft(d).windows[0]?.start).toBe("2026-10-01T12:00:00.000Z");
    expect(confirmExecution(makeAppData(), d, 0, now).activePlan?.execution?.blocks[0]?.start).toBe(now.toISOString());
  });
  it("counts the aggregate mission effort once and links it to a single primary goal", () => {
    const data = confirmed();
    expect(data.activePlan?.totalEstimatedMinutes).toBe(25);
    expect(data.activePlan?.mainMission.taskIds).toEqual([data.activePlan?.tasks[0]?.id]);
    expect(data.lockIn.goals.filter((g) => g.state === "primary")).toHaveLength(1);
    expect(data.activePlan?.execution?.capacityMinutes).toBe(105);
  });
  it("rejects a stale proposal before any state mutation", () => {
    const data = confirmed(), before = JSON.stringify(data);
    expect(() => confirmExecution(data, draft(), 0, now)).toThrow(/mudou/);
    expect(JSON.stringify(data)).toBe(before);
  });
  it("does not fabricate availability when migrating a legacy free-text schedule", () => {
    const data = makeAppData();
    const state = seedLockIn(data.installationId, data.profile);
    expect(state.goals[0]?.state).toBe("candidate"); expect(state.goals[0]?.doneWhen).toBe("");
    expect(state.execution).toBeUndefined(); expect(state.goals[0]?.deadlineType).toBe("unknown");
    expect(seedLockIn(data.installationId, data.profile)).toEqual(state);
  });
  it("rejects cycles/missing dependencies and orders predecessors first", () => {
    const task = confirmed().activePlan!.tasks[0]!;
    expect(() => orderTasks([{ ...task, dependsOn: [task.id] }])).toThrow(/ciclo/);
    expect(() => orderTasks([{ ...task, dependsOn: ["missing"] }])).toThrow(/dependência/);
    expect(orderTasks([{ ...task, id: "b", dependsOn: ["a"] }, { ...task, id: "a" }]).map((t) => t.id)).toEqual(["a", "b"]);
  });
  it("derives mission completion from tasks without a second XP reward", () => {
    const data = confirmed();
    const done = reconcileExecution(toggleMainMission(data));
    expect(done.activePlan?.mainMission.completed).toBe(true);
    expect(done.progress.totalXp).toBe(data.progress.totalXp + 50);
    const reopened = reconcileExecution(toggleMainMission(done));
    expect(reopened.activePlan?.mainMission.completed).toBe(false);
    expect(reopened.progress.totalXp).toBe(data.progress.totalXp);
  });
  it("preserves completed tasks, XP and original snapshot when confirming a replacement", () => {
    const data = confirmed();
    const done = reconcileExecution(toggleTaskCompletion(data, data.activePlan!.tasks[0]!.id));
    const replaced = confirmExecution(done, { ...draft(), mission: "Testar restauração" }, 1, now);
    expect(replaced.activePlan?.tasks.filter((t) => t.completed)).toEqual(done.activePlan?.tasks);
    expect(replaced.progress).toEqual(done.progress);
    expect(replaced.planSnapshots[0]).toEqual(done.activePlan);
    expect(replaced.activePlan?.mainMission.completed).toBe(false);
    expect(replaced.activePlan?.totalEstimatedMinutes).toBe(50);
  });
  it("keeps displaced pending work in backlog without allocating its time twice", () => {
    const data = confirmed();
    const next = confirmExecution(data, { ...draft(), mission: "Testar o plano" }, 1, now);
    expect(next.recurringTasks[0]?.id).toBe(data.activePlan?.tasks[0]?.id);
    expect(next.activePlan?.totalEstimatedMinutes).toBe(25);
  });
  it("rejects oversubscribed task additions and uses remaining time for planning changes", () => {
    const data = confirmed();
    const added = addTask(data, { title: "Outra entrega", category: "pessoal", priority: "baixa", estimatedMinutes: 120, recurring: false });
    expect(() => reconcileExecution(added)).toThrow(/contínuos/);
    expect(() => reconcileExecution(data, new Date("2026-10-01T13:50:00Z"))).toThrow();
  });
  it("allows late completion to persist even when its original window has elapsed", () => {
    const data = confirmed();
    const done = reconcileExecution(toggleTaskCompletion(data, data.activePlan!.tasks[0]!.id));
    expect(done.activePlan?.mainMission.completed).toBe(true);
    expect(allocate(done.activePlan!.tasks, done.lockIn.execution!, new Date("2026-10-01T23:00:00Z")).blocks).toEqual([]);
  });
  it("rejects missing linked tasks and multiple primary goals", () => {
    const data = confirmed();
    expect(() => reconcileExecution({ ...data, activePlan: { ...data.activePlan!, tasks: [] } })).toThrow(/vinculada/);
    expect(() => reconcileExecution({ ...data, activePlan: { ...data.activePlan!, mainMission: { ...data.activePlan!.mainMission, taskIds: [] } } })).toThrow(/vinculadas/);
    expect(() => reconcileExecution({ ...data, activePlan: { ...data.activePlan!, mainMission: { ...data.activePlan!.mainMission, taskIds: [data.activePlan!.tasks[0]!.id, data.activePlan!.tasks[0]!.id] } } })).toThrow(/únicas/);
    expect(lockInStateSchema.safeParse({ ...data.lockIn, goals: [...data.lockIn.goals, { ...data.lockIn.goals[0]!, id: "second" }] }).success).toBe(false);
  });
  it("archives a partial day once and waits for authorized windows instead of creating debt", () => {
    const data = confirmed();
    const next = rolloverIfNeeded(data, new Date("2026-10-02T12:00:00Z")).data;
    expect(next.activePlan).toBeUndefined(); expect(next.history).toHaveLength(1);
    expect(next.recurringTasks).toHaveLength(1); expect(next.progress.totalXp).toBe(data.progress.totalXp);
    expect(rolloverIfNeeded(next, new Date("2026-10-02T12:05:00Z")).data).toBe(next);
  });
  it("keeps backlog unallocated and reserves maintenance within the same capacity", () => {
    const data = confirmed();
    const backlog = confirmSecondaryGoal(data, { ...draft(), goalKind: "backlog", result: "Aprender uma habilidade futura" }, 1, now);
    expect(backlog.activePlan).toEqual(data.activePlan);
    expect(backlog.lockIn.goals.filter((g) => g.state === "primary")).toHaveLength(1);
    const maintenance = confirmSecondaryGoal(backlog, { ...draft(), goalKind: "maintenance", maintenanceBudget: "15", result: "Manter meu projeto atualizado" }, 2, now);
    expect(maintenance.activePlan?.execution?.capacityMinutes).toBe(90);
    expect(() => confirmSecondaryGoal(maintenance, { ...draft(), goalKind: "maintenance", maintenanceBudget: "100", result: "Manutenção que não cabe hoje" }, 3, now)).toThrow();
  });

  it("keeps the previous day accessible when the pending-work limit blocks rollover", () => {
    const data = confirmed();
    data.recurringTasks = Array.from({ length: 100 }, (_, i) => ({ ...data.activePlan!.tasks[0]!, id: `pending-${i}` }));
    const result = rolloverIfNeeded(data, new Date("2026-10-02T12:00:00Z"));
    expect(result.rolledOver).toBe(false);
    expect(result.data.activePlan).toEqual(data.activePlan);
    expect(result.data.recurringTasks).toHaveLength(100);
    expect(result.data.corruptionWarnings).toContain("Revise as pendências antes de preparar outro dia.");
  });

  it("creates a first useful mission without a legacy profile", () => {
    const empty = { ...structuredClone(DEFAULT_APP_DATA), installationId: "install-first-user" };
    const first = confirmSecondaryGoal(empty, draft(), 0, now);
    expect(first.onboardingCompleted).toBe(true);
    expect(first.discoveryCompleted).toBe(true);
    expect(first.profile?.name).toBe("Gustavo");
    expect(first.activePlan?.tasks[0]?.firstStep).toBe(draft().firstAction);
  });

  it("reuses known fields from a partial legacy onboarding without inventing windows", () => {
    const empty = { ...structuredClone(DEFAULT_APP_DATA), onboardingDraft: { name: "Gustavo", mainGoal: "Entregar o Nexus Lock-In", goalReason: "Usar diariamente", timezone: "UTC" } };
    const restored = draftFor(empty, now);
    expect(restored.name).toBe("Gustavo");
    expect(restored.result).toBe("Entregar o Nexus Lock-In");
    expect(restored.windows).toBe("");
  });

});
