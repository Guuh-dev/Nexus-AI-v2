import { describe, expect, it } from "vitest";
import { applyWidgetTaskActions, widgetTaskActionsSatisfied } from "@/features/widget/actions";
import { generateLocalPlan } from "@/services/planning.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";

function stateWithPlan() {
  const profile = makeProfile();
  return {
    ...makeAppData(profile),
    activePlan: generateLocalPlan({
      profile,
      date: "2026-07-10",
      requestId: "widget-action-request",
      clientId: "install-test-123",
    }),
  };
}

describe("widget action synchronization", () => {
  it("applies the desired completion state only once when an action is replayed", () => {
    const data = stateWithPlan();
    const task = data.activePlan.tasks[0];
    expect(task).toBeDefined();
    if (!task) return;

    const action = {
      type: "toggle_task" as const,
      taskId: task.id,
      completed: true,
      createdAt: new Date().toISOString(),
    };

    const once = applyWidgetTaskActions(data, [action]);
    const twice = applyWidgetTaskActions(once, [action, action]);

    expect(once.activePlan?.tasks[0]?.completed).toBe(true);
    expect(twice.activePlan?.tasks[0]?.completed).toBe(true);
    expect(twice.progress.totalXp).toBe(once.progress.totalXp);
    expect(widgetTaskActionsSatisfied(once, [action])).toBe(true);
    expect(widgetTaskActionsSatisfied(data, [action])).toBe(false);
  });

  it("ignores unknown task ids without changing the state", () => {
    const data = stateWithPlan();
    const result = applyWidgetTaskActions(data, [{
      type: "toggle_task",
      taskId: "missing-task",
      completed: true,
    }]);
    expect(result).toBe(data);
  });

  it("acknowledges a double offline tap by the final desired state", () => {
    const data = stateWithPlan();
    const task = data.activePlan.tasks[0]!;
    const actions = [
      { type: "toggle_task" as const, taskId: task.id, completed: true, createdAt: "2026-07-13T12:00:00.000Z" },
      { type: "toggle_task" as const, taskId: task.id, completed: false, createdAt: "2026-07-13T12:00:01.000Z" },
    ];

    const applied = applyWidgetTaskActions(data, actions);
    const replayed = applyWidgetTaskActions(applied, actions);

    expect(applied.activePlan?.tasks[0]?.completed).toBe(false);
    expect(applied.progress.totalXp).toBe(data.progress.totalXp);
    expect(widgetTaskActionsSatisfied(applied, actions)).toBe(true);
    expect(replayed.progress.totalXp).toBe(applied.progress.totalXp);
  });
});
