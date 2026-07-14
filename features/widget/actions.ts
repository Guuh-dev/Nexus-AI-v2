import { toggleTaskCompletion } from "@/features/tasks/task.logic";
import type { AppData } from "@/types";

export type WidgetTaskAction = {
  type: "toggle_task";
  taskId: string;
  completed: boolean;
  createdAt?: string;
};

/**
 * Applies desired widget task states instead of blindly toggling them.
 * Replayed or duplicated actions therefore cannot award XP twice.
 */
export function applyWidgetTaskActions(
  data: AppData,
  actions: readonly WidgetTaskAction[],
): AppData {
  return actions.slice(-50).reduce((current, action) => {
    if (action.type !== "toggle_task") return current;
    const task = current.activePlan?.tasks.find((item) => item.id === action.taskId);
    if (!task || task.completed === action.completed) return current;
    return toggleTaskCompletion(current, task.id);
  }, data);
}

/** Unknown/removed task IDs are terminal; known tasks must match the desired
 * state before the native queue can be acknowledged. */
export function widgetTaskActionsSatisfied(
  data: AppData,
  actions: readonly WidgetTaskAction[],
): boolean {
  const finalDesiredState = new Map<string, boolean>();
  for (const action of actions.slice(-50)) {
    if (action.type === "toggle_task") {
      finalDesiredState.set(action.taskId, action.completed);
    }
  }
  return Array.from(finalDesiredState).every(([taskId, completed]) => {
    const task = data.activePlan?.tasks.find((item) => item.id === taskId);
    return !task || task.completed === completed;
  });
}
