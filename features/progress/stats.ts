import type { AppData, Category, DayHistory } from "@/types";
import { CATEGORIES } from "@/types";
import { addDays, localDateKey } from "@/utils/dates";

export function lastSevenDays(data: AppData, today = localDateKey(new Date(), data.profile?.timezone)) {
  const historyMap = new Map<string, { completed: number; total: number; qualifies: boolean }>();
  for (const entry of data.history) {
    const current = historyMap.get(entry.date) ?? { completed: 0, total: 0, qualifies: false };
    historyMap.set(entry.date, {
      completed: current.completed + entry.completedTasks,
      total: current.total + entry.totalTasks,
      qualifies: current.qualifies || entry.countedForStreak,
    });
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const history = historyMap.get(date);
    if (data.activePlan?.date === date) {
      const completed = data.activePlan.tasks.filter((task) => task.completed).length;
      const taskPercentage = data.activePlan.tasks.length === 0 ? 0 : Math.round((completed / data.activePlan.tasks.length) * 100);
      const percentage = data.activePlan.mainMission.completed ? Math.max(70, taskPercentage) : taskPercentage;
      return { date, percentage };
    }
    return {
      date,
      percentage: history
        ? Math.max(history.qualifies ? 70 : 0, history.total > 0 ? Math.round((history.completed / history.total) * 100) : 0)
        : 0,
    };
  });
}

export function weeklyStats(data: AppData) {
  const days = lastSevenDays(data);
  const relevantHistory: DayHistory[] = data.history.filter((entry) => days.some((day) => day.date === entry.date));
  const currentCompleted =
    (data.activePlan?.tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0) ?? 0) +
    (data.activePlan?.mainMission.completed ? data.activePlan.mainMission.xp : 0);
  const currentPlanStartedAt = data.activePlan ? new Date(data.activePlan.createdAt).getTime() : Number.POSITIVE_INFINITY;
  const currentFocusXp = data.progress.focusSessions
    .filter((session) => new Date(session.completedAt).getTime() >= currentPlanStartedAt)
    .reduce((sum, session) => sum + session.xp, 0);
  const historyXp = relevantHistory.reduce((sum, day) => sum + day.xpEarned, 0);
  const focusSeconds = data.progress.focusSessions
    .filter((session) => days.some((day) => day.date === localDateKey(new Date(session.completedAt), data.profile?.timezone)))
    .reduce((sum, session) => sum + session.elapsedSeconds, 0);
  const completion = Math.round(days.reduce((sum, day) => sum + day.percentage, 0) / 7);
  return {
    completion,
    xp: historyXp + currentCompleted + currentFocusXp,
    focusMinutes: Math.floor(focusSeconds / 60),
    daysCompleted: days.filter((day) => day.percentage >= 70).length,
    days,
  };
}

export function categoryDistribution(data: AppData): { category: Category; count: number; percentage: number }[] {
  const allTasks = [
    ...(data.activePlan?.tasks ?? []),
    ...data.history.flatMap((entry) => entry.plan.tasks),
  ].filter((task) => task.completed);
  const total = Math.max(1, allTasks.length);
  return CATEGORIES.map((category) => {
    const count = allTasks.filter((task) => task.category === category).length;
    return { category, count, percentage: Math.round((count / total) * 100) };
  }).filter((item) => item.count > 0);
}
