import type { AppData } from "@/types";
import { addDays, localDateKey } from "@/utils/dates";

export const ACTIVITY_WEEKS = 12;
export const ACTIVITY_DAYS = ACTIVITY_WEEKS * 7;

export type ActivitySummary = {
  /** Oldest to newest, one entry per local day, ending today. 0 = nothing recorded, 4 = 90+ focus minutes. */
  levels: number[];
  focusMinutes: number;
  activeDays: number;
};

/** Level thresholds use only recorded evidence: focus minutes and completed tasks. */
export function activityLevel(focusMinutes: number, completedTasks: number): number {
  if (focusMinutes >= 90) return 4;
  if (focusMinutes >= 45) return 3;
  if (focusMinutes >= 15) return 2;
  return focusMinutes > 0 || completedTasks > 0 ? 1 : 0;
}

export function activitySummary(data: AppData, now = new Date()): ActivitySummary {
  const timezone = data.profile?.timezone;
  const today = localDateKey(now, timezone);
  const first = addDays(today, -(ACTIVITY_DAYS - 1));
  const minutes = new Map<string, number>();
  const tasks = new Map<string, number>();
  for (const session of data.progress.focusSessions) {
    if (session.status === "cancelled") continue;
    const key = localDateKey(new Date(session.completedAt), timezone);
    if (key < first || key > today) continue;
    minutes.set(key, (minutes.get(key) ?? 0) + session.elapsedSeconds / 60);
  }
  for (const day of data.history) {
    if (day.date < first || day.date > today) continue;
    tasks.set(day.date, Math.max(tasks.get(day.date) ?? 0, day.completedTasks));
  }
  if (data.activePlan && data.activePlan.date >= first && data.activePlan.date <= today) {
    const done = data.activePlan.tasks.filter((task) => task.completed).length;
    tasks.set(data.activePlan.date, Math.max(tasks.get(data.activePlan.date) ?? 0, done));
  }
  const levels: number[] = [];
  let focusMinutes = 0;
  let activeDays = 0;
  for (let index = 0; index < ACTIVITY_DAYS; index += 1) {
    const key = addDays(first, index);
    const dayMinutes = Math.floor(minutes.get(key) ?? 0);
    const level = activityLevel(dayMinutes, tasks.get(key) ?? 0);
    focusMinutes += dayMinutes;
    if (level > 0) activeDays += 1;
    levels.push(level);
  }
  return { levels, focusMinutes, activeDays };
}
