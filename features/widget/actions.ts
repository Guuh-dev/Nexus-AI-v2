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
