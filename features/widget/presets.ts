import type { WidgetPreferences, WidgetPreset } from "@/types";

export type WidgetPresetDefinition = {
  id: Exclude<WidgetPreset, "custom">;
  label: string;
  description: string;
  category: "ritmo" | "ação" | "companion" | "missão" | "comando";
  icon: string;
  recommendedSize: WidgetPreferences["preferredSize"];
  patch: Partial<WidgetPreferences>;
};

const quietBase: Partial<WidgetPreferences> = {
  // Persisted for legacy backup compatibility only. No v3 family renders
  // a second professor or a roadmap lesson inside RemoteViews.
  showProfessor: false,
  showLearning: false,
  showFinance: false,
  showHabits: false,
  showBoss: false,
  showCapture: false,
  allowPageCycle: false,
  progressStyle: "bar",
  glow: 0,
};

/**
 * Five presets, one for each native family. Every flag below is represented by
 * WidgetRenderSpec and by the Android renderer; none is preview-only.
 */
export const WIDGET_PRESETS: WidgetPresetDefinition[] = [
  {
    id: "streak",
    label: "Mini",
    icon: "♨",
    category: "ritmo",
    description: "Mascote e streak em 1×1.",
    recommendedSize: "1x1",
    patch: {
      ...quietBase,
      contentMode: "progress",
      preferredSize: "1x1",
      style: "nexus",
      showMascot: true,
      showMission: false,
      showTasks: false,
      showProgress: false,
      showQuote: false,
      showNextAction: false,
      showFocus: false,
      showStreak: true,
      showXp: false,
      showLevel: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "center",
      tapAction: "progress",
    },
  },
  {
    id: "next_action",
    label: "Strip",
    icon: "→",
    category: "ação",
    description: "Próxima ação e progresso em 2×1.",
    recommendedSize: "2x1",
    patch: {
      ...quietBase,
      contentMode: "mission",
      preferredSize: "2x1",
      style: "amoled",
      background: "amoled",
      showMascot: false,
      showMission: false,
      showTasks: false,
      showProgress: true,
      showQuote: false,
      showNextAction: true,
      showFocus: false,
      showStreak: false,
      showXp: false,
      showLevel: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "left",
      tapAction: "today",
    },
  },
  {
    id: "companion",
    label: "Companion",
    icon: "◈",
    category: "companion",
    description: "Mascote e fala contextual em 2×2.",
    recommendedSize: "2x2",
    patch: {
      ...quietBase,
      contentMode: "companion",
      preferredSize: "2x2",
      style: "transparent",
      background: "translucent",
      // Storage v5 accepts 0.2 minimum; WidgetRenderSpec translates the
      // transparent style to a truly transparent native background.
      opacity: 0.2,
      showMascot: true,
      showMission: false,
      showTasks: false,
      showProgress: false,
      showQuote: true,
      showNextAction: false,
      showFocus: false,
      showStreak: false,
      showXp: false,
      showLevel: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "center",
      tapAction: "brain",
    },
  },
  {
    id: "mission",
    label: "Mission",
    icon: "◆",
    category: "missão",
    description: "Missão, duas tarefas e progresso em 4×2.",
    recommendedSize: "4x2",
    patch: {
      ...quietBase,
      contentMode: "mission",
      preferredSize: "4x2",
      style: "nexus",
      background: "solid",
      opacity: 0.96,
      showMascot: false,
      showMission: true,
      showTasks: true,
      showProgress: true,
      showQuote: false,
      showNextAction: false,
      showFocus: false,
      showStreak: false,
      showXp: false,
      showLevel: false,
      taskCount: 2,
      compactTasks: true,
      textAlign: "left",
      tapAction: "today",
    },
  },
  {
    id: "tasks",
    label: "Command",
    icon: "⌘",
    category: "comando",
    description: "Missão, quatro tarefas, foco e Companion em 4×4.",
    recommendedSize: "4x4",
    patch: {
      ...quietBase,
      contentMode: "smart",
      preferredSize: "4x4",
      style: "pixel",
      background: "solid",
      opacity: 0.96,
      showMascot: true,
      showMission: true,
      showTasks: true,
      showProgress: true,
      showQuote: true,
      showNextAction: false,
      showFocus: true,
      showStreak: false,
      showXp: false,
      showLevel: false,
      taskCount: 4,
      compactTasks: false,
      textAlign: "left",
      tapAction: "today",
    },
  },
];

export function applyWidgetPreset(
  current: WidgetPreferences,
  presetId: Exclude<WidgetPreset, "custom">,
): WidgetPreferences {
  const preset = WIDGET_PRESETS.find((item) => item.id === presetId);
  if (!preset) return current;
  return { ...current, ...preset.patch, preset: preset.id };
}
