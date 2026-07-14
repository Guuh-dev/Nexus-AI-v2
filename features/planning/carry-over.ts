import type { DailyPlan, PlanRequest } from "@/types";

function taskKey(title: string): string {
  return title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9áàâãéêíóôõúç]/gi, "");
}

/**
 * Carry-over is product state, not a suggestion for the model. Reinsert it
 * deterministically after remote generation so a scheduled or explicitly
 * preserved task cannot disappear from an otherwise valid AI response.
 */
export function mergeRequiredCarryOver(
  plan: DailyPlan,
  request: PlanRequest,
): DailyPlan {
  const limit = Math.min(5, Math.max(2, request.profile.maxDailyTasks));
  const required = (request.carryOver ?? [])
    .filter((task) => !task.completed)
    .slice(0, limit)
    .map((task) => {
      const { completedAt: _completedAt, ...rest } = task;
      return { ...rest, completed: false };
    });
  if (!required.length) return plan;

  const requiredKeys = new Set(required.map((task) => taskKey(task.title)));
  const tasks = [
    ...required,
    ...plan.tasks.filter((task) => !requiredKeys.has(taskKey(task.title))),
  ].slice(0, limit);
  return {
    ...plan,
    tasks,
    totalEstimatedMinutes:
      plan.mainMission.estimatedMinutes +
      tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
  };
}
