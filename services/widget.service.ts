import { Platform } from "react-native";
import type { AppData, WidgetPayload } from "@/types";
import { nextRoadmapLesson, roadmapProgress } from "@/features/learning/roadmap";
import { getColors } from "@/theme/theme";
import { calculateLevel } from "@/utils/levels";
import { localDateKey } from "@/utils/dates";

export type WidgetPendingAction = { type: "toggle_task"; taskId: string; completed: boolean; createdAt: string };

function createPayload(data: AppData): WidgetPayload | null {
  if (!data.activePlan) return null;
  const preferences = data.preferences.widget;
  const visibleTasks = data.activePlan.tasks.slice(0, preferences.taskCount);
  const focusMinutes = Math.floor(data.progress.focusSessions
    .filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === data.activePlan?.date)
    .reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const nextLesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  return {
    date: data.activePlan.date,
    mainMission: preferences.privacyMode ? "Missão protegida" : data.activePlan.mainMission.title,
    tasks: visibleTasks.map((task) => ({ id: task.id, title: preferences.privacyMode ? "Tarefa privada" : task.title, completed: task.completed })),
    completedCount: data.activePlan.tasks.filter((task) => task.completed).length,
    totalCount: data.activePlan.tasks.length,
    streak: data.progress.currentStreak,
    totalXp: data.progress.totalXp,
    level: calculateLevel(data.progress.totalXp).level,
    focusMinutes,
    ...(preferences.showLearning && activeRoadmap && nextLesson ? {
      learning: {
        topic: preferences.privacyMode ? "Aprendizado protegido" : activeRoadmap.topic,
        nextLesson: preferences.privacyMode ? "Próxima evolução" : nextLesson.title,
        estimatedMinutes: nextLesson.estimatedMinutes,
        progress: roadmapProgress(activeRoadmap).percentage,
      },
    } : {}),
    appearance: {
      background: preferences.background,
      style: preferences.style,
      preferredSize: preferences.preferredSize,
      showMascot: preferences.showMascot,
      mascot: preferences.mascot,
      showProfessor: preferences.showProfessor,
      showLearning: preferences.showLearning,
      professorVariant: data.preferences.mascot.professorVariant,
      skin: data.preferences.mascot.skin,
      ...(data.preferences.mascot.equippedAccessory ? { accessory: data.preferences.mascot.equippedAccessory } : {}),
      showMission: preferences.showMission,
      showTasks: preferences.showTasks,
      showXp: preferences.showXp,
      showLevel: preferences.showLevel,
      showStreak: preferences.showStreak,
      showFocus: preferences.showFocus,
      showProgress: preferences.showProgress,
      showCapture: preferences.showCapture,
      compactTasks: preferences.compactTasks,
      progressStyle: preferences.progressStyle,
      fontScale: preferences.fontScale,
      opacity: preferences.opacity,
      cornerStyle: preferences.cornerStyle,
      borderStyle: preferences.borderStyle,
      glow: preferences.glow,
      textAlign: preferences.textAlign,
      tapAction: preferences.tapAction,
      ...(preferences.customLabel ? { customLabel: preferences.customLabel } : {}),
      accentColor: preferences.accentColor ?? getColors(data.preferences).primary,
    },
  };
}

export async function updateAndroidWidget(data: AppData): Promise<void> {
  if (Platform.OS !== "android") return;
  const payload = createPayload(data);
  if (!payload) return;
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    await nativeModule.default.updateWidget(JSON.stringify(payload));
  } catch {
    // Widget failures must never affect the main application.
  }
}

export async function consumeAndroidWidgetActions(): Promise<WidgetPendingAction[]> {
  if (Platform.OS !== "android") return [];
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    const raw = await nativeModule.default.consumePendingActions();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WidgetPendingAction => Boolean(
      item && typeof item === "object" && (item as WidgetPendingAction).type === "toggle_task" &&
      typeof (item as WidgetPendingAction).taskId === "string" && typeof (item as WidgetPendingAction).completed === "boolean",
    )).slice(-50);
  } catch {
    return [];
  }
}

export { createPayload as createWidgetPayload };
