import { PRIORITY_XP } from "@/constants/defaults";
import type { AppData, Category, Priority, Task } from "@/types";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";

function withPlan(data: AppData, update: (tasks: Task[]) => Task[]): AppData {
  if (!data.activePlan) return data;
  const tasks = update(data.activePlan.tasks);
  return {
    ...data,
    activePlan: {
      ...data.activePlan,
      tasks,
      totalEstimatedMinutes:
        data.activePlan.mainMission.estimatedMinutes + tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    },
  };
}

export function toggleTaskCompletion(data: AppData, taskId: string): AppData {
  const task = data.activePlan?.tasks.find((item) => item.id === taskId);
  if (!task) return data;
  const nextCompleted = !task.completed;
  const xpDelta = nextCompleted ? task.xp : -task.xp;
  const next = withPlan(data, (tasks) =>
    tasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            completed: nextCompleted,
            ...(nextCompleted ? { completedAt: new Date().toISOString() } : { completedAt: undefined }),
          }
        : item,
    ),
  );
  return {
    ...next,
    progress: {
      ...next.progress,
      totalXp: Math.max(0, next.progress.totalXp + xpDelta),
      attributes: {
        ...next.progress.attributes,
        execucao: Math.max(0, next.progress.attributes.execucao + (nextCompleted ? 1 : -1)),
        disciplina: Math.max(0, next.progress.attributes.disciplina + (task.priority === "alta" ? (nextCompleted ? 1 : -1) : 0)),
      },
    },
  };
}

export function toggleMainMission(data: AppData): AppData {
  if (!data.activePlan) return data;
  const completed = !data.activePlan.mainMission.completed;
  const xpDelta = completed ? data.activePlan.mainMission.xp : -data.activePlan.mainMission.xp;
  return {
    ...data,
    activePlan: {
      ...data.activePlan,
      mainMission: {
        ...data.activePlan.mainMission,
        completed,
        ...(completed ? { completedAt: new Date().toISOString() } : { completedAt: undefined }),
      },
    },
    progress: {
      ...data.progress,
      totalXp: Math.max(0, data.progress.totalXp + xpDelta),
      attributes: {
        ...data.progress.attributes,
        execucao: Math.max(0, data.progress.attributes.execucao + (completed ? 2 : -2)),
        disciplina: Math.max(0, data.progress.attributes.disciplina + (completed ? 2 : -2)),
      },
    },
  };
}

export function addTask(
  data: AppData,
  input: { title: string; description?: string; category: Category; priority: Priority; estimatedMinutes: number; recurring: boolean },
): AppData {
  if (!data.activePlan || data.activePlan.tasks.length >= 5) return data;
  const title = sanitizeText(input.title, 120);
  if (!title) return data;
  const task: Task = {
    id: createId("task"),
    title,
    ...(input.description ? { description: sanitizeText(input.description, 300) } : {}),
    category: input.category,
    priority: input.priority,
    estimatedMinutes: Math.max(5, Math.min(240, Math.round(input.estimatedMinutes))),
    xp: PRIORITY_XP[input.priority],
    recurring: input.recurring,
    completed: false,
  };
  const next = withPlan(data, (tasks) => [...tasks, task]);
  return task.recurring ? { ...next, recurringTasks: [...next.recurringTasks, task] } : next;
}

export function updateTask(data: AppData, taskId: string, patch: Partial<Pick<Task, "title" | "description" | "category" | "priority" | "estimatedMinutes" | "recurring">>): AppData {
  const before = data.activePlan?.tasks.find((task) => task.id === taskId);
  if (!before) return data;
  const updated = withPlan(data, (tasks) =>
    tasks.map((task) => {
      if (task.id !== taskId) return task;
      const priority = patch.priority ?? task.priority;
      return {
        ...task,
        ...patch,
        title: sanitizeText(patch.title ?? task.title, 120) || task.title,
        ...(patch.description !== undefined ? { description: sanitizeText(patch.description, 300) } : {}),
        estimatedMinutes: Math.max(5, Math.min(240, Math.round(patch.estimatedMinutes ?? task.estimatedMinutes))),
        priority,
        xp: PRIORITY_XP[priority],
      };
    }),
  );
  const after = updated.activePlan?.tasks.find((task) => task.id === taskId);
  if (!after) return updated;
  const xpDelta = before.completed ? after.xp - before.xp : 0;
  return {
    ...updated,
    recurringTasks: [
      ...updated.recurringTasks.filter((task) => task.id !== taskId),
      ...(after.recurring ? [after] : []),
    ],
    progress: {
      ...updated.progress,
      totalXp: Math.max(0, updated.progress.totalXp + xpDelta),
    },
  };
}

export function deleteTask(data: AppData, taskId: string): AppData {
  const task = data.activePlan?.tasks.find((item) => item.id === taskId);
  if (!task) return data;
  const next = withPlan(data, (tasks) => tasks.filter((item) => item.id !== taskId));
  return {
    ...next,
    recurringTasks: next.recurringTasks.filter((item) => item.id !== taskId),
    progress: {
      ...next.progress,
      totalXp: Math.max(0, next.progress.totalXp - (task.completed ? task.xp : 0)),
    },
  };
}

export function postponeTask(data: AppData, taskId: string): AppData {
  const task = data.activePlan?.tasks.find((item) => item.id === taskId);
  if (!task || !data.activePlan) return data;
  const postponed: Task = {
    ...task,
    id: createId("postponed"),
    completed: false,
    completedAt: undefined,
    postponedFrom: data.activePlan.date,
  };
  const next = deleteTask(data, taskId);
  return { ...next, recurringTasks: [...next.recurringTasks, postponed] };
}
