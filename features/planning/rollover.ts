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

function dedupeTasks(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = task.title.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function carryOverTasks(data: AppData): Task[] {
  const fromPlan = data.activePlan?.tasks.filter((task) => !task.completed && task.priority === "alta") ?? [];
  const postponed = data.recurringTasks.filter((task) => Boolean(task.postponedFrom));
  const recurring = [
    ...data.recurringTasks.filter((task) => !task.postponedFrom),
    ...(data.activePlan?.tasks.filter((task) => task.recurring) ?? []),
  ].map((task) => ({ ...task, completed: false, completedAt: undefined }));
  return dedupeTasks([...postponed, ...fromPlan.slice(0, 2), ...recurring]).slice(0, 6);
}

export function rolloverIfNeeded(data: AppData, now = new Date()): { data: AppData; rolledOver: boolean } {
  if (!data.profile || !data.onboardingCompleted) return { data, rolledOver: false };
  const today = localDateKey(now, data.profile.timezone);
  if (!data.activePlan || data.activePlan.date === today) return { data, rolledOver: false };

  let history = data.history;
  if (!history.some((entry) => entry.date === data.activePlan?.date)) {
    history = [...history, archivePlan(data, data.activePlan)].slice(-3660);
  }
  const streak = calculateStreak(history);
  const scheduled: Task[] = data.weeklyPlan.filter((item) => item.date === today && !item.completed).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    priority: item.priority,
    estimatedMinutes: item.estimatedMinutes,
    xp: PRIORITY_XP[item.priority],
    recurring: false,
    completed: false,
    scheduledDate: today,
  }));
  const carryOver = dedupeTasks([...scheduled, ...carryOverTasks(data)]).slice(0, 6);
  const activePlan = generateLocalPlan({
    profile: data.profile,
    date: today,
    requestId: createId("rollover"),
    clientId: data.installationId,
    carryOver,
  });

  return {
    rolledOver: true,
    data: {
      ...data,
      activePlan,
      history,
      recurringTasks: carryOver.filter((task) => task.recurring),
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
