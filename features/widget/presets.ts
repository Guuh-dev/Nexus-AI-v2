import type { WidgetPreferences, WidgetPreset } from "@/types";

export type WidgetPresetDefinition = {
  id: Exclude<WidgetPreset, "custom">;
  label: string;
  description: string;
  category: "execução" | "foco" | "atlas" | "companion" | "progresso" | "freelance";
  icon: string;
  recommendedSize: WidgetPreferences["preferredSize"];
  patch: Partial<WidgetPreferences>;
};

const base: Partial<WidgetPreferences> = {
  showProfessor: false,
  showLearning: false,
  showFinance: false,
  showQuote: false,
  showNextAction: false,
  showHabits: false,
  showBoss: false,
};

export const WIDGET_PRESETS: WidgetPresetDefinition[] = [
  {
    id: "mission", label: "Mission Card", icon: "◆", category: "execução",
    description: "Missão principal, progresso e ação imediata.", recommendedSize: "4x1",
    patch: { ...base, contentMode: "mission", style: "nexus", preferredSize: "4x1", showMission: true, showTasks: false, showProgress: true, showCapture: false, showNextAction: true, showMascot: true, taskCount: 1, compactTasks: true, textAlign: "left", tapAction: "today" },
  },
  {
    id: "balanced", label: "Smart Plan", icon: "✦", category: "execução",
    description: "Prioridade, tarefas, tempo ideal e progresso.", recommendedSize: "4x2",
    patch: { ...base, contentMode: "smart", style: "nexus", preferredSize: "4x2", showMission: true, showTasks: true, showProgress: true, showCapture: true, showNextAction: true, showMascot: true, taskCount: 3, compactTasks: false, textAlign: "left", tapAction: "today" },
  },
  {
    id: "tasks", label: "Daily Command", icon: "☑", category: "execução",
    description: "Até cinco tarefas concluíveis direto da tela inicial.", recommendedSize: "4x4",
    patch: { ...base, contentMode: "tasks", style: "minimal", preferredSize: "4x4", showMission: false, showTasks: true, showProgress: true, showCapture: true, showMascot: false, taskCount: 5, compactTasks: false, textAlign: "left", tapAction: "today" },
  },
  {
    id: "next_action", label: "Faça Agora", icon: "→", category: "execução",
    description: "Uma única ação clara para cortar a indecisão.", recommendedSize: "2x1",
    patch: { ...base, contentMode: "mission", style: "amoled", background: "amoled", preferredSize: "2x1", showMission: false, showTasks: false, showProgress: false, showCapture: false, showNextAction: true, showMascot: false, textAlign: "left", borderStyle: "none", glow: 0, tapAction: "today" },
  },
  {
    id: "focus", label: "Focus Card", icon: "◎", category: "foco",
    description: "Meta, minutos focados, streak e atalho para sprint.", recommendedSize: "2x2",
    patch: { ...base, contentMode: "focus", style: "amoled", background: "amoled", preferredSize: "2x2", showMission: true, showTasks: false, showProgress: true, showCapture: false, showFocus: true, showXp: true, showLevel: false, showStreak: true, showMascot: true, taskCount: 1, compactTasks: true, textAlign: "center", tapAction: "focus" },
  },
  {
    id: "learning", label: "Atlas Lesson", icon: "◇", category: "atlas",
    description: "Próxima aula, duração e progresso do roadmap.", recommendedSize: "4x2",
    patch: { ...base, contentMode: "learning", style: "glass", background: "translucent", preferredSize: "4x2", showMission: false, showTasks: false, showProgress: true, showCapture: false, showLearning: true, showProfessor: true, showMascot: false, taskCount: 1, compactTasks: true, textAlign: "left", tapAction: "brain" },
  },
  {
    id: "roadmap", label: "Roadmap Pulse", icon: "▤", category: "atlas",
    description: "Tema ativo, próxima lição e porcentagem dominada.", recommendedSize: "3x2",
    patch: { ...base, contentMode: "learning", style: "pixel", preferredSize: "3x2", showMission: false, showTasks: false, showProgress: true, showCapture: false, showLearning: true, showProfessor: true, showMascot: true, mascot: "atlas", taskCount: 1, textAlign: "left", tapAction: "brain" },
  },
  {
    id: "companion", label: "Nexus Companion", icon: "◈", category: "companion",
    description: "Mascote grande, humor independente e fala contextual.", recommendedSize: "2x2",
    patch: { ...base, contentMode: "companion", style: "mascot", preferredSize: "2x2", showMission: false, showTasks: false, showProgress: false, showCapture: false, showMascot: true, showQuote: true, companionSpeech: "contextual", textAlign: "center", tapAction: "brain" },
  },
  {
    id: "quote", label: "Nexus Quote", icon: "❝", category: "companion",
    description: "Frase curta que reage ao andamento do dia.", recommendedSize: "4x1",
    patch: { ...base, contentMode: "quote", style: "transparent", background: "translucent", preferredSize: "4x1", showMission: false, showTasks: false, showProgress: false, showCapture: false, showMascot: true, showQuote: true, textAlign: "left", borderStyle: "subtle", glow: 0, tapAction: "today" },
  },
  {
    id: "minimal", label: "Quiet Status", icon: "·", category: "companion",
    description: "Status silencioso, limpo e integrado ao wallpaper.", recommendedSize: "2x1",
    patch: { ...base, contentMode: "quote", style: "minimal", preferredSize: "2x1", showMascot: false, showMission: false, showTasks: false, showProgress: false, showCapture: false, showQuote: true, companionMood: "quiet", companionSpeech: "silent", textAlign: "center", borderStyle: "none", glow: 0, tapAction: "today" },
  },
  {
    id: "xp", label: "XP Core", icon: "⬡", category: "progresso",
    description: "Nível, XP e distância até a próxima evolução.", recommendedSize: "2x1",
    patch: { ...base, contentMode: "progress", style: "neon", preferredSize: "2x1", showMission: false, showTasks: false, showProgress: true, showCapture: false, showXp: true, showLevel: true, showStreak: false, showMascot: false, textAlign: "center", tapAction: "progress" },
  },
  {
    id: "streak", label: "Streak Flame", icon: "♨", category: "progresso",
    description: "Sequência atual com mascote reagindo ao ritmo.", recommendedSize: "1x1",
    patch: { ...base, contentMode: "progress", style: "pixel", preferredSize: "1x1", showMission: false, showTasks: false, showProgress: false, showCapture: false, showXp: false, showLevel: false, showStreak: true, showMascot: true, textAlign: "center", tapAction: "progress" },
  },
  {
    id: "boss", label: "Boss Battle", icon: "♛", category: "progresso",
    description: "Desafio ativo, barra de dano e recompensa.", recommendedSize: "3x2",
    patch: { ...base, contentMode: "boss", style: "gamer", preferredSize: "3x2", showMission: false, showTasks: false, showProgress: true, showCapture: false, showBoss: true, showMascot: true, companionMood: "strict", textAlign: "left", tapAction: "progress" },
  },
  {
    id: "habits", label: "Habit Grid", icon: "▦", category: "progresso",
    description: "Hábitos de hoje, sequência e próximo check-in.", recommendedSize: "4x2",
    patch: { ...base, contentMode: "habits", style: "minimal", preferredSize: "4x2", showMission: false, showTasks: false, showProgress: true, showCapture: false, showHabits: true, showMascot: false, textAlign: "left", tapAction: "habits" },
  },
  {
    id: "finance", label: "Money Mission", icon: "R$", category: "freelance",
    description: "Receita, meta mensal, clientes e follow-ups.", recommendedSize: "4x2",
    patch: { ...base, contentMode: "finance", style: "glass", preferredSize: "4x2", showMission: false, showTasks: false, showProgress: true, showCapture: false, showFinance: true, showMascot: true, mascot: "byte", textAlign: "left", tapAction: "finance" },
  },
  {
    id: "freelance", label: "Freelance Radar", icon: "⌁", category: "freelance",
    description: "Prospecções, follow-ups, clientes e próxima abordagem.", recommendedSize: "4x3",
    patch: { ...base, contentMode: "finance", style: "gamer", preferredSize: "4x3", showMission: false, showTasks: false, showProgress: true, showCapture: true, showFinance: true, showNextAction: true, showMascot: true, mascot: "nexus", companionMood: "motivational", textAlign: "left", tapAction: "finance" },
  },
];

export function applyWidgetPreset(current: WidgetPreferences, presetId: Exclude<WidgetPreset, "custom">): WidgetPreferences {
  const preset = WIDGET_PRESETS.find((item) => item.id === presetId);
  if (!preset) return current;
  return { ...current, ...preset.patch, preset: preset.id };
}
