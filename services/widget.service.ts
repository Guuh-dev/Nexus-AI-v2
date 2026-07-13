import { Platform } from "react-native";
import type { AppData, WidgetPayload } from "@/types";
import { nextRoadmapLesson, roadmapProgress } from "@/features/learning/roadmap";
import { getColors } from "@/theme/theme";
import { calculateLevel } from "@/utils/levels";
import { localDateKey } from "@/utils/dates";
import { companionLines, nexusQuote } from "@/features/companion/companion";
import { profileMission } from "@/features/context/synthesis";

export type WidgetPendingAction = { type: "toggle_task"; taskId: string; completed: boolean; createdAt: string };

function createPayload(data: AppData): WidgetPayload | null {
  const preferences = data.preferences.widget;
  const missionFallback = data.profile ? profileMission(data.profile) : undefined;
  if (!data.activePlan) {
    const privateWidget = preferences.privacyMode;
    return {
      date: localDateKey(new Date(), data.profile?.timezone),
      mainMission: privateWidget ? "Missão protegida" : missionFallback?.title ?? "Abra o Nexus para preparar sua missão",
      tasks: [],
      completedCount: 0,
      totalCount: 0,
      streak: data.progress.currentStreak,
      totalXp: data.progress.totalXp,
      level: calculateLevel(data.progress.totalXp).level,
      focusMinutes: 0,
      nextAction: privateWidget ? "Próxima ação protegida" : missionFallback?.nextAction ?? "Abra o app para gerar o plano de hoje.",
      quote: privateWidget ? "Direção protegida." : "Abra o Nexus para sincronizar seu plano.",
      companionLines: privateWidget ? { quiet: "Nexus ativo." } : companionLines(data),
      appearance: widgetAppearance(data),
    };
  }
  const visibleTasks = data.activePlan.tasks.slice(0, preferences.taskCount);
  const focusMinutes = Math.floor(data.progress.focusSessions
    .filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === data.activePlan?.date)
    .reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const nextLesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const today = data.activePlan.date;
  const activeHabits = data.habits.filter((habit) => !habit.pausedUntil || habit.pausedUntil < today);
  const completedHabits = activeHabits.filter((habit) => habit.completedDates.includes(today)).length;
  const boss = data.progress.challenges.find((challenge) => challenge.type === "boss" && !challenge.completed);
  const nextTask = data.activePlan.tasks.find((task) => !task.completed);
  const privateWidget = preferences.privacyMode;
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
    ...(nextTask ? { nextAction: privateWidget ? "Próxima ação protegida" : nextTask.title } : {}),
    quote: privateWidget ? "Direção protegida." : nexusQuote(data),
    companionLines: privateWidget ? { quiet: "Nexus ativo." } : companionLines(data),
    ...(!privateWidget ? { finance: data.finance } : {}),
    ...(!privateWidget ? { habits: { completed: completedHabits, total: activeHabits.length, ...(activeHabits.find((habit) => !habit.completedDates.includes(today)) ? { next: activeHabits.find((habit) => !habit.completedDates.includes(today))!.title } : {}) } } : {}),
    ...(!privateWidget && boss ? { boss: { title: boss.title, progress: boss.progress, target: boss.target } } : {}),
    ...(preferences.showLearning && activeRoadmap && nextLesson ? {
      learning: {
        topic: preferences.privacyMode ? "Aprendizado protegido" : activeRoadmap.topic,
        nextLesson: preferences.privacyMode ? "Próxima evolução" : nextLesson.title,
        estimatedMinutes: nextLesson.estimatedMinutes,
        progress: roadmapProgress(activeRoadmap).percentage,
      },
    } : {}),
    appearance: widgetAppearance(data),  };
}

function widgetAppearance(data: AppData): NonNullable<WidgetPayload["appearance"]> {
  const preferences = data.preferences.widget;
  return {
    contentMode: preferences.contentMode,
    privacyMode: preferences.privacyMode,
    background: preferences.background,
    style: preferences.style,
    preferredSize: preferences.preferredSize,
    showMascot: preferences.showMascot,
    mascot: preferences.mascot,
    companionMood: preferences.companionMood,
    companionSpeech: preferences.companionSpeech,
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
    showFinance: preferences.showFinance,
    showQuote: preferences.showQuote,
    showNextAction: preferences.showNextAction,
    showHabits: preferences.showHabits,
    showBoss: preferences.showBoss,
    allowPageCycle: preferences.allowPageCycle,
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
