import type { AppData, DayHistory, WeeklyReview } from "@/types";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";

export type WeeklyEvidence = {
  weekStart: string;
  weekEnd: string;
  daysRecorded: number;
  plannedTasks: number;
  completedTasks: number;
  completionPercentage: number;
  missionsCompleted: number;
  focusMinutes: number;
  xpEarned: number;
  activeDays: number;
  postponedOrCarryOver: number;
  categories: string[];
  confidence: "insufficient" | "low" | "medium" | "high";
  score: number | null;
};

export function buildWeeklyEvidence(data: AppData): WeeklyEvidence {
  const days = data.history.slice(-7);
  const end = localDateKey(new Date(), data.profile?.timezone);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const weekStart = localDateKey(startDate, data.profile?.timezone);
  const plannedTasks = days.reduce((sum, day) => sum + day.totalTasks, 0);
  const completedTasks = days.reduce((sum, day) => sum + day.completedTasks, 0);
  const completionPercentage = plannedTasks ? Math.round((completedTasks / plannedTasks) * 100) : 0;
  const missionsCompleted = days.filter((day) => day.plan.mainMission.completed).length;
  const focusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const xpEarned = days.reduce((sum, day) => sum + day.xpEarned, 0);
  const activeDays = days.filter((day) => day.completedTasks > 0 || day.focusMinutes > 0 || day.plan.mainMission.completed).length;
  const postponedOrCarryOver = days.reduce((sum, day) => sum + day.plan.tasks.filter((task) => Boolean(task.postponedFrom)).length, 0);
  const categories = Array.from(new Set(days.flatMap((day) => day.plan.tasks.map((task) => task.category))));
  const confidence = days.length < 2 || plannedTasks < 3
    ? "insufficient"
    : days.length < 4
      ? "low"
      : days.length < 7
        ? "medium"
        : "high";
  const score = confidence === "insufficient"
    ? null
    : Math.round((completionPercentage * 0.55) + (Math.min(100, (activeDays / Math.max(1, days.length)) * 100) * 0.25) + (Math.min(100, focusMinutes / 3) * 0.2));
  return { weekStart, weekEnd: end, daysRecorded: days.length, plannedTasks, completedTasks, completionPercentage, missionsCompleted, focusMinutes, xpEarned, activeDays, postponedOrCarryOver, categories, confidence, score };
}

function evidenceLine(evidence: WeeklyEvidence): string {
  if (evidence.confidence === "insufficient") return "Não há dados suficientes para avaliar padrões com confiança.";
  return `Você concluiu ${evidence.completedTasks} de ${evidence.plannedTasks} tarefas, registrou ${evidence.focusMinutes} min de foco e teve ${evidence.activeDays} dias ativos.`;
}

export function createEvidenceBasedWeeklyReview(data: AppData): WeeklyReview {
  const evidence = buildWeeklyEvidence(data);
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const lesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const nextTask = data.activePlan?.tasks.find((task) => !task.completed);
  const volumePattern = evidence.plannedTasks > 0 && evidence.completionPercentage < 45
    ? `Possível gargalo: volume aberto alto para a execução registrada (${evidence.completedTasks}/${evidence.plannedTasks}).`
    : evidence.confidence === "insufficient"
      ? "Não há dados suficientes para afirmar um padrão."
      : "O padrão principal deve ser confirmado com mais uma semana de dados.";
  return {
    id: createId("review"),
    weekStart: evidence.weekStart,
    weekEnd: evidence.weekEnd,
    completionPercentage: evidence.completionPercentage,
    xpEarned: evidence.xpEarned,
    focusMinutes: evidence.focusMinutes,
    consistencyScore: evidence.score ?? 0,
    highlights: [evidenceLine(evidence)],
    patterns: [volumePattern],
    keep: evidence.confidence === "insufficient" ? ["Registrar tarefas concluídas e sessões de foco antes de tirar conclusões."] : ["Manter registros objetivos de conclusão, foco e adiamentos."],
    cut: evidence.plannedTasks > evidence.completedTasks + 3 ? ["Reduzir tarefas abertas para caber no tempo real disponível."] : ["Evitar transformar hipóteses em diagnóstico sem evidência."],
    nextWeekFocus: lesson
      ? `Concluir ${lesson.title} com entrega observável.`
      : nextTask
        ? `Finalizar ${nextTask.title} e registrar o resultado.`
        : "Definir uma entrega pequena e registrável para a próxima semana.",
    challenge: evidence.confidence === "insufficient"
      ? "Registrar pelo menos 3 tarefas concluídas ou 2 sessões de foco para gerar uma revisão confiável."
      : "Escolher 3 ações menores e concluir pelo menos 2 com evidência registrada.",
    source: "local",
    createdAt: new Date().toISOString(),
  };
}

export function sanitizeAiWeeklyReview(review: WeeklyReview, data: AppData): WeeklyReview {
  const evidence = buildWeeklyEvidence(data);
  const allowedPatterns = review.patterns.filter((item) => /observad|poss[ií]vel|hip[oó]tese|dados|tarefas?|foco|min|conclu/i.test(item));
  const allowedHighlights = review.highlights.filter((item) => /observad|dados|tarefas?|foco|min|conclu|xp|miss[aã]o/i.test(item));
  return {
    ...review,
    completionPercentage: evidence.completionPercentage,
    xpEarned: evidence.xpEarned,
    focusMinutes: evidence.focusMinutes,
    consistencyScore: evidence.score ?? 0,
    highlights: allowedHighlights.length ? allowedHighlights.slice(0, 6) : [evidenceLine(evidence)],
    patterns: allowedPatterns.length ? allowedPatterns.slice(0, 6) : [evidence.confidence === "insufficient" ? "Não há dados suficientes para afirmar padrões." : evidenceLine(evidence)],
  };
}

export function weekFactsForAi(days: DayHistory[]): string[] {
  if (!days.length) return ["Nenhum dia histórico registrado na semana." ];
  return days.slice(-7).map((day) => `${day.date}: ${day.completedTasks}/${day.totalTasks} tarefas, ${day.focusMinutes} min foco, missão ${day.plan.mainMission.completed ? "concluída" : "aberta"}.`);
}
