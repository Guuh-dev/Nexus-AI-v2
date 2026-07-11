import { describe, expect, it } from "vitest";
import { addTask, deleteTask, postponeTask, toggleMainMission, toggleTaskCompletion, updateTask } from "@/features/tasks/task.logic";
import { generateLocalPlan } from "@/services/planning.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";
import type { AppData } from "@/types";

describe("task state and XP", () => {
  function stateWithPlan(): AppData {
    const profile = makeProfile();
    return {
      ...makeAppData(profile),
      activePlan: generateLocalPlan({ profile, date: "2026-07-10", requestId: "request-task-123", clientId: "install-test-123" }),
    };
  }

  it("awards and reverses task XP exactly once per state transition", () => {
    const initial = stateWithPlan();
    const task = initial.activePlan!.tasks[0]!;
    const completed = toggleTaskCompletion(initial, task.id);
    expect(completed.progress.totalXp).toBe(task.xp);
    expect(completed.activePlan?.tasks[0]?.completed).toBe(true);
    const unchecked = toggleTaskCompletion(completed, task.id);
    expect(unchecked.progress.totalXp).toBe(0);
    expect(unchecked.activePlan?.tasks[0]?.completed).toBe(false);
  });

  it("never makes total XP negative", () => {
    const initial = stateWithPlan();
    const completedMission = toggleMainMission(initial);
    const reopened = toggleMainMission(completedMission);
    expect(reopened.progress.totalXp).toBe(0);
  });

  it("removes awarded XP when deleting a completed task", () => {
    const initial = stateWithPlan();
    const task = initial.activePlan!.tasks[0]!;
    const completed = toggleTaskCompletion(initial, task.id);
    const deleted = deleteTask(completed, task.id);
    expect(deleted.progress.totalXp).toBe(0);
    expect(deleted.activePlan?.tasks.some((item) => item.id === task.id)).toBe(false);
  });

  it("adjusts XP when the priority of a completed task changes", () => {
    const initial = stateWithPlan();
    const task = initial.activePlan!.tasks.find((item) => item.priority === "media") ?? initial.activePlan!.tasks[0]!;
    const completed = toggleTaskCompletion(initial, task.id);
    const edited = updateTask(completed, task.id, { priority: "alta" });
    expect(edited.progress.totalXp).toBe(50);
    expect(edited.activePlan?.tasks.find((item) => item.id === task.id)?.xp).toBe(50);
  });

  it("postpones without keeping a duplicate today", () => {
    const initial = stateWithPlan();
    const task = initial.activePlan!.tasks[0]!;
    const postponed = postponeTask(initial, task.id);
    expect(postponed.activePlan?.tasks.some((item) => item.id === task.id)).toBe(false);
    expect(postponed.recurringTasks.some((item) => item.title === task.title)).toBe(true);
  });

  it("limits manually added tasks to five", () => {
    let current = stateWithPlan();
    for (let index = 0; index < 10; index += 1) {
      current = addTask(current, { title: `Tarefa ${index}`, category: "pessoal", priority: "baixa", estimatedMinutes: 10, recurring: false });
    }
    expect(current.activePlan?.tasks).toHaveLength(5);
  });
});
