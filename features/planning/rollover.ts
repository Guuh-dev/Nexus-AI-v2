import type { AppData, DailyPlan, DayHistory, Task } from "@/types";
import { addDays, daysBetween, localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
import { generateLocalPlan } from "@/services/planning.service";
import { PRIORITY_XP } from "@/constants/defaults";

export function planCompletion(plan: DailyPlan): { completed: number; total: number; percentage: number; qualifies: boolean } {
  const completed = plan.tasks.filter((task) => task.completed).length;
  const total = plan.tasks.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percentage, qualifies: plan.mainMission.completed || percentage >= 70 };
}

export function archivePlan(data: AppData, plan: DailyPlan): DayHistory {
  const completion = planCompletion(plan);
  const planStartedAt = new Date(plan.createdAt).getTime();
  const sessionsForPlan = data.progress.focusSessions.filter((session) =>
    localDateKey(new Date(session.completedAt), data.profile?.timezone) === plan.date &&
    new Date(session.completedAt).getTime() >= planStartedAt,
  );
  const focusMinutes = Math.floor(
    sessionsForPlan.reduce((total, session) => total + session.elapsedSeconds, 0) / 60,
  );
  const xpEarned =
    plan.tasks.filter((task) => task.completed).reduce((total, task) => total + task.xp, 0) +
    (plan.mainMission.completed ? plan.mainMission.xp : 0) +
    sessionsForPlan.reduce((total, session) => total + session.xp, 0);

  return {
    date: plan.date,
    plan,
    completedTasks: completion.completed,
    totalTasks: completion.total,
    completionPercentage: completion.percentage,
    xpEarned,
    focusMinutes,
    countedForStreak: completion.qualifies,
  };
}

export function calculateStreak(history: DayHistory[]): { current: number; best: number } {
  const grouped = new Map<string, boolean>();
  for (const day of history) grouped.set(day.date, (grouped.get(day.date) ?? false) || day.countedForStreak);
  const unique = Array.from(grouped.entries())
    .map(([date, countedForStreak]) => ({ date, countedForStreak }))
    .sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let best = 0;
  let running = 0;

  for (const day of unique) {
    if (day.countedForStreak) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }
  current = running;
  return { current, best };
}

function taskTitleKey(task: Pick<Task, "title">): string {
  return task.title.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

function carryOverTaskKey(task: Pick<Task, "title" | "category">): string {
  return `${task.category}:${taskTitleKey(task)}`;
}

function dedupeTasks(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = taskTitleKey(task);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function preserveCarryOverTaskIds(plan: DailyPlan, carryOver: Task[]): DailyPlan {
  const sourceIds = new Map(
    carryOver.map((task) => [carryOverTaskKey(task), task.id]),
  );

  return {
    ...plan,
    tasks: plan.tasks.map((task) => {
      if (!task.postponedFrom) return task;
      const sourceId = sourceIds.get(carryOverTaskKey(task));
      return sourceId ? { ...task, id: sourceId } : task;
    }),
  };
}

function retainRecurringBacklog(data: AppData, carryOver: Task[], admittedTaskIds: Set<string>): Task[] {
  const retained = new Map(
    data.recurringTasks
      .filter((task) => task.recurring || !admittedTaskIds.has(task.id))
      .map((task) => [task.id, task]),
  );

  for (const task of carryOver) {
    if (!task.recurring || retained.has(task.id) || retained.size >= 100) continue;
    retained.set(task.id, { ...task, completed: false, completedAt: undefined });
  }

  return Array.from(retained.values());
}

/**
 * Replanning must not erase work that already earned XP or make focus sessions
 * fall outside the day's accounting window. Keep completed evidence from the
 * current plan, then use the remaining slots for the replacement plan.
 */
export function mergeSameDayPlanEvidence(
  current: DailyPlan | undefined,
  replacement: DailyPlan,
): DailyPlan {
  if (!current || current.date !== replacement.date) return replacement;

  const completed = dedupeTasks([
    ...current.tasks.filter((task) => task.completed),
    ...replacement.tasks.filter((task) => task.completed),
  ]);
  const completedKeys = new Set(completed.map(taskTitleKey));
  const pending = replacement.tasks.filter((task) =>
    !task.completed &&
    !completedKeys.has(taskTitleKey(task)),
  );
  const tasks = [...completed, ...pending].slice(0, 5);
  const mainMission = current.mainMission.completed
    ? current.mainMission
    : replacement.mainMission;

  return {
    ...replacement,
    mainMission,
    tasks,
    totalEstimatedMinutes:
      mainMission.estimatedMinutes +
      tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    createdAt: current.createdAt < replacement.createdAt
      ? current.createdAt
      : replacement.createdAt,
  };
}

export function carryOverTasks(data: AppData): Task[] {
  const scheduled = data.activePlan?.tasks.filter((task) =>
    !task.completed && Boolean(task.scheduledDate),
  ).map((task) => ({
    ...task,
    postponedFrom: task.postponedFrom ?? data.activePlan?.date,
  })) ?? [];
  const fromPlan = data.activePlan?.tasks.filter((task) =>
    !task.completed && task.priority === "alta" && !task.scheduledDate,
  ) ?? [];
  const postponed = data.recurringTasks.filter((task) => Boolean(task.postponedFrom));
  const recurring = [
    ...data.recurringTasks.filter((task) => !task.postponedFrom),
    ...(data.activePlan?.tasks.filter((task) => task.recurring) ?? []),
  ].map((task) => ({ ...task, completed: false, completedAt: undefined }));
  return dedupeTasks([...scheduled, ...postponed, ...fromPlan.slice(0, 2), ...recurring]).slice(0, 6);
}

export function rolloverIfNeeded(data: AppData, now = new Date()): { data: AppData; rolledOver: boolean } {
  if (!data.profile || !data.onboardingCompleted) return { data, rolledOver: false };
  const today = localDateKey(now, data.profile.timezone);
  if (data.activePlan?.date === today) return { data, rolledOver: false };

  const dueItems = data.weeklyPlan.filter((item) => item.date <= today && !item.completed);
  const scheduled: Task[] = dueItems.map((item) => ({
    id: item.id,
    title: item.title,
    ...(item.description ? { description: item.description } : {}),
    ...(item.context ? { context: item.context } : {}),
    ...(item.firstStep ? { firstStep: item.firstStep } : {}),
    ...(item.expectedResult ? { expectedResult: item.expectedResult } : {}),
    ...(item.doneWhen ? { doneWhen: item.doneWhen } : {}),
    category: item.category,
    priority: item.priority,
    estimatedMinutes: item.estimatedMinutes,
    xp: PRIORITY_XP[item.priority],
    recurring: item.recurring ?? false,
    completed: false,
    scheduledDate: today,
  }));
  const previousCarryOver = carryOverTasks(data);
  const previousScheduledIds = new Set(
    data.activePlan?.tasks
      .filter((task) => !task.completed && Boolean(task.scheduledDate))
      .map((task) => task.id) ?? [],
  );
  const previousScheduled = previousCarryOver.filter((task) => previousScheduledIds.has(task.id));
  const otherCarryOver = previousCarryOver.filter((task) => !previousScheduledIds.has(task.id));
  const carryOver = dedupeTasks([...previousScheduled, ...scheduled, ...otherCarryOver]).slice(0, 6);
  const activePlan = preserveCarryOverTaskIds(generateLocalPlan({
    profile: data.profile,
    date: today,
    requestId: createId("rollover"),
    clientId: data.installationId,
    carryOver,
  }), carryOver);
  const dueItemIds = new Set(dueItems.map((item) => item.id));
  const admittedTaskIds = new Set(activePlan.tasks.map((task) => task.id));
  const consumedScheduledIds = new Set(
    carryOver.filter((task) => dueItemIds.has(task.id) && admittedTaskIds.has(task.id)).map((task) => task.id),
  );
  const recurringTasks = retainRecurringBacklog(data, carryOver, admittedTaskIds);

  if (!data.activePlan) {
    return {
      rolledOver: true,
      data: {
        ...data,
        activePlan,
        weeklyPlan: data.weeklyPlan.filter((item) => !consumedScheduledIds.has(item.id)),
        recurringTasks,
        lastGeneratedDate: today,
      },
    };
  }

  // History is a daily ledger, not a log of intermediate replans. The final
  // active plan always replaces any stale snapshot for the same date.
  const finalDay = archivePlan(data, data.activePlan);
  const history = [
    ...data.history.filter((entry) => entry.date !== finalDay.date),
    finalDay,
  ].slice(-3660);
  const streak = calculateStreak(history);

  return {
    rolledOver: true,
    data: {
      ...data,
      activePlan,
      history,
      weeklyPlan: data.weeklyPlan.filter((item) => !consumedScheduledIds.has(item.id)),
      recurringTasks,
      lastGeneratedDate: today,
      progress: {
        ...data.progress,
        currentStreak: streak.current,
        bestStreak: Math.max(data.progress.bestStreak, streak.best),
      },
    },
  };
}

export function hasMissedCalendarDays(lastDate: string, today: string): boolean {
  return daysBetween(lastDate, today) > 1 && addDays(lastDate, 1) !== today;
}
