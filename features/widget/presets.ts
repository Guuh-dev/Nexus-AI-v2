import type { WidgetPreferences, WidgetPreset } from "@/types";

export type WidgetPresetDefinition = {
  id: Exclude<WidgetPreset, "custom">;
  label: string;
  description: string;
  recommendedSize: WidgetPreferences["preferredSize"];
  patch: Partial<WidgetPreferences>;
};

export const WIDGET_PRESETS: WidgetPresetDefinition[] = [
  {
    id: "mission",
    label: "Missão primeiro",
    description: "Missão grande, progresso e uma ação rápida.",
    recommendedSize: "4x1",
    patch: {
      style: "nexus",
      preferredSize: "4x1",
      showMission: true,
      showTasks: false,
      showProgress: true,
      showCapture: true,
      showLearning: false,
      showFocus: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "left",
      tapAction: "today",
    },
  },
  {
    id: "balanced",
    label: "Command Center",
    description: "Missão, três tarefas, progresso e captura.",
    recommendedSize: "4x2",
    patch: {
      style: "nexus",
      preferredSize: "4x2",
      showMission: true,
      showTasks: true,
      showProgress: true,
      showCapture: true,
      showLearning: false,
      showFocus: false,
      taskCount: 3,
      compactTasks: false,
      textAlign: "left",
      tapAction: "today",
    },
  },
  {
    id: "tasks",
    label: "Lista executora",
    description: "Até cinco tarefas com toque direto para concluir.",
    recommendedSize: "4x4",
    patch: {
      style: "minimal",
      preferredSize: "4x4",
      showMission: false,
      showTasks: true,
      showProgress: true,
      showCapture: true,
      showLearning: false,
      showFocus: false,
      taskCount: 5,
      compactTasks: false,
      textAlign: "left",
      tapAction: "today",
    },
  },
  {
    id: "focus",
    label: "Focus Deck",
    description: "Foco, streak, XP e progresso com pouco ruído.",
    recommendedSize: "2x2",
    patch: {
      style: "amoled",
      background: "amoled",
      preferredSize: "2x2",
      showMission: true,
      showTasks: false,
      showProgress: true,
      showCapture: false,
      showLearning: false,
      showFocus: true,
      showXp: true,
      showLevel: false,
      showStreak: true,
      taskCount: 1,
      compactTasks: true,
      textAlign: "center",
      tapAction: "focus",
    },
  },
  {
    id: "learning",
    label: "Atlas Learning",
    description: "Próxima lição, professor e progresso do roadmap.",
    recommendedSize: "4x2",
    patch: {
      style: "glass",
      background: "translucent",
      preferredSize: "4x2",
      showMission: false,
      showTasks: false,
      showProgress: true,
      showCapture: false,
      showLearning: true,
      showProfessor: true,
      showFocus: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "left",
      tapAction: "brain",
    },
  },
  {
    id: "minimal",
    label: "Silêncio AMOLED",
    description: "Somente o essencial, sem enfeite nem exposição.",
    recommendedSize: "2x1",
    patch: {
      style: "amoled",
      background: "amoled",
      preferredSize: "2x1",
      showMascot: false,
      showProfessor: false,
      showMission: true,
      showTasks: false,
      showProgress: false,
      showCapture: false,
      showLearning: false,
      showFocus: false,
      showXp: false,
      showLevel: false,
      showStreak: false,
      taskCount: 1,
      compactTasks: true,
      textAlign: "center",
      borderStyle: "none",
      glow: 0,
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
