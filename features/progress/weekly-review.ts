import type { AppData, DayHistory, WeeklyReview } from "@/types";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { addDays, localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";

export type WeeklyEvidence = {
  weekStart: string;
  weekEnd: string;
  daysRecorded: number;
  plannedTasks: number;
  completedTasks: number;
  completionPercentage: number;
  missionsCompleted: number;
  missionsPlanned: number;
  focusMinutes: number;
  xpEarned: number;
  activeDays: number;
  postponedOrCarryOver: number;
  roadmapLessonsCompleted: number;
  previousCompletionPercentage: number | null;
  completionDelta: number | null;
  categories: string[];
  confidence: "insufficient" | "low" | "medium" | "high";
  score: number | null;
  facts: string[];
};

function within(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function taskTotals(days: DayHistory[]): { planned: number; completed: number } {
  return {
    planned: days.reduce((sum, day) => sum + day.totalTasks, 0),
    completed: days.reduce((sum, day) => sum + day.completedTasks, 0),
  };
}

function oneFinalEntryPerDate(days: DayHistory[]): DayHistory[] {
  const byDate = new Map<string, DayHistory>();
  for (const day of days) byDate.set(day.date, day);
  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function percentage(completed: number, planned: number): number {
  return planned > 0 ? Math.round((completed / planned) * 100) : 0;
}

export function buildWeeklyEvidence(data: AppData, now = new Date()): WeeklyEvidence {
  const weekEnd = localDateKey(now, data.profile?.timezone);
  const weekStart = addDays(weekEnd, -6);
  const previousStart = addDays(weekStart, -7);
  const previousEnd = addDays(weekStart, -1);
  const canonicalHistory = oneFinalEntryPerDate(data.history);
  const history = canonicalHistory.filter((day) => within(day.date, weekStart, weekEnd));
  const previousHistory = canonicalHistory.filter((day) => within(day.date, previousStart, previousEnd));
  const historyDates = new Set(history.map((day) => day.date));
  const activePlanInWindow = data.activePlan &&
    within(data.activePlan.date, weekStart, weekEnd) &&
    !historyDates.has(data.activePlan.date)
    ? data.activePlan
    : undefined;

  const archivedTotals = taskTotals(history);
  const activePlanned = activePlanInWindow?.tasks.length ?? 0;
  const activeCompleted = activePlanInWindow?.tasks.filter((task) => task.completed).length ?? 0;
  const plannedTasks = archivedTotals.planned + activePlanned;
  const completedTasks = archivedTotals.completed + activeCompleted;
  const completionPercentage = percentage(completedTasks, plannedTasks);
  const missionsPlanned = history.length + (activePlanInWindow ? 1 : 0);
  const missionsCompleted = history.filter((day) => day.plan.mainMission.completed).length
    + (activePlanInWindow?.mainMission.completed ? 1 : 0);

  const activeFocusSessions = activePlanInWindow
    ? data.progress.focusSessions.filter((session) => {
        const sessionDate = localDateKey(new Date(session.completedAt), data.profile?.timezone);
        return sessionDate === activePlanInWindow.date
          && new Date(session.completedAt).getTime() >= new Date(activePlanInWindow.createdAt).getTime();
      })
    : [];
  const focusMinutes = history.reduce((sum, day) => sum + day.focusMinutes, 0)
    + Math.floor(activeFocusSessions.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const activeXp = (activePlanInWindow?.tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0) ?? 0)
    + (activePlanInWindow?.mainMission.completed ? activePlanInWindow.mainMission.xp : 0)
    + activeFocusSessions.reduce((sum, session) => sum + session.xp, 0);
  const xpEarned = history.reduce((sum, day) => sum + day.xpEarned, 0) + activeXp;
  const activeDates = new Set(history.filter((day) => day.completedTasks > 0 || day.focusMinutes > 0 || day.plan.mainMission.completed).map((day) => day.date));
  if (activePlanInWindow && (activeCompleted > 0 || activeFocusSessions.length > 0 || activePlanInWindow.mainMission.completed)) {
    activeDates.add(activePlanInWindow.date);
  }
  const recordedDates = new Set(historyDates);
  if (activePlanInWindow) recordedDates.add(activePlanInWindow.date);
  const postponedOrCarryOver = history.reduce((sum, day) => sum + day.plan.tasks.filter((task) => Boolean(task.postponedFrom)).length, 0)
    + (activePlanInWindow?.tasks.filter((task) => Boolean(task.postponedFrom)).length ?? 0);
  const categories = Array.from(new Set([
    ...history.flatMap((day) => day.plan.tasks.map((task) => task.category)),
    ...(activePlanInWindow?.tasks.map((task) => task.category) ?? []),
  ]));

  const roadmapLessonsCompleted = data.learning.roadmaps.flatMap((roadmap) => roadmap.phases).flatMap((phase) => phase.lessons)
    .filter((lesson) => Boolean(lesson.completedAt && within(lesson.completedAt.slice(0, 10), weekStart, weekEnd))).length;
  const previousTotals = taskTotals(previousHistory);
  const previousCompletionPercentage = previousTotals.planned > 0 ? percentage(previousTotals.completed, previousTotals.planned) : null;
  const completionDelta = previousCompletionPercentage === null ? null : completionPercentage - previousCompletionPercentage;
  const daysRecorded = recordedDates.size;
  const activeDays = activeDates.size;
  const confidence = daysRecorded < 2 || plannedTasks < 3
    ? "insufficient"
    : daysRecorded < 4
      ? "low"
      : daysRecorded < 7
        ? "medium"
        : "high";
  const score = confidence === "insufficient"
    ? null
    : Math.round(
        (completionPercentage * 0.55)
        + (Math.min(100, (activeDays / Math.max(1, daysRecorded)) * 100) * 0.25)
        + (Math.min(100, focusMinutes / 3) * 0.2),
      );
  const facts = confidence === "insufficient"
    ? ["Dados insuficientes para uma nota confiável."]
    : [
        `${completedTasks} de ${plannedTasks} tarefas concluídas (${completionPercentage}%).`,
        `${focusMinutes} min de foco e ${activeDays} de ${daysRecorded} dias registrados com atividade.`,
        `${missionsCompleted} de ${missionsPlanned} missões concluídas e ${postponedOrCarryOver} adiamentos registrados.`,
        ...(roadmapLessonsCompleted > 0 ? [`${roadmapLessonsCompleted} lições de roadmap concluídas na janela.`] : []),
        ...(completionDelta === null ? [] : [`A conclusão variou ${completionDelta >= 0 ? "+" : ""}${completionDelta} pontos em relação à janela anterior.`]),
      ];

  return {
    weekStart,
    weekEnd,
    daysRecorded,
    plannedTasks,
    completedTasks,
    completionPercentage,
    missionsCompleted,
    missionsPlanned,
    focusMinutes,
    xpEarned,
    activeDays,
    postponedOrCarryOver,
    roadmapLessonsCompleted,
    previousCompletionPercentage,
    completionDelta,
    categories,
    confidence,
    score,
    facts,
  };
}

export function createEvidenceBasedWeeklyReview(data: AppData, now = new Date()): WeeklyReview {
  const evidence = buildWeeklyEvidence(data, now);
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const lesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const nextTask = data.activePlan?.tasks.find((task) => !task.completed);
  const patterns = evidence.confidence === "insufficient"
    ? ["Dados insuficientes para afirmar um padrão."]
    : evidence.completionPercentage < 45
      ? [`Fato observável: ${evidence.completedTasks} de ${evidence.plannedTasks} tarefas foram concluídas na janela.`]
      : ["Os dados desta janela não sustentam um gargalo único; compare novamente na próxima revisão."];
  return {
    id: createId("review"),
    weekStart: evidence.weekStart,
    weekEnd: evidence.weekEnd,
    completionPercentage: evidence.completionPercentage,
    xpEarned: evidence.xpEarned,
    focusMinutes: evidence.focusMinutes,
    consistencyScore: evidence.score,
    confidence: evidence.confidence,
    statements: evidence.confidence === "insufficient"
      ? [{ kind: "insufficient", text: evidence.facts[0] ?? "Dados insuficientes.", evidenceKeys: ["daysRecorded", "plannedTasks"] }]
      : evidence.facts.map((text) => ({ kind: "fact" as const, text, evidenceKeys: ["weeklyEvidence"] })),
    highlights: evidence.facts,
    patterns,
    keep: evidence.confidence === "insufficient"
      ? ["Registrar conclusões e foco antes de interpretar padrões."]
      : ["Manter registros objetivos de conclusão, foco e adiamentos."],
    cut: evidence.plannedTasks > evidence.completedTasks + 3
      ? ["Reduzir o volume aberto para caber no tempo registrado."]
      : ["Evitar diagnósticos que não estejam ligados a um dado observado."],
    nextWeekFocus: lesson
      ? `Concluir ${lesson.title} com entrega observável.`
      : nextTask
        ? `Finalizar ${nextTask.title} e registrar o resultado.`
        : "Definir uma entrega pequena e registrável para a próxima semana.",
    challenge: evidence.confidence === "insufficient"
      ? "Registrar pelo menos 3 tarefas concluídas ou 2 sessões de foco."
      : "Escolher 3 ações menores e concluir pelo menos 2 com evidência registrada.",
    source: "local",
    createdAt: now.toISOString(),
  };
}

const PSYCHOLOGICAL_INVENTION_RE = /medo|perfeccionismo|ansiedade|trauma|pregui[cç]a|autoestima|depress|foco noturno|rotina imprevisível|falta de base/i;
const EVIDENCE_LANGUAGE_RE = /tarefas?|conclus|foco|minutos?|xp|miss[aã]o|adiamento|roadmap|dias? ativos?|dados/i;
const HYPOTHESIS_LABEL_RE = /^(?:hip[oó]tese|poss[ií]vel(?: hip[oó]tese| padr[aã]o| gargalo)?)[\s:,-]/i;

export function sanitizeAiWeeklyReview(review: WeeklyReview, data: AppData, now = new Date()): WeeklyReview {
  const evidence = buildWeeklyEvidence(data, now);
  const deterministic = createEvidenceBasedWeeklyReview(data, now);
  const hypotheses = evidence.confidence === "insufficient"
    ? []
    : review.patterns
        .map((item) => sanitizeText(item, 160))
        .filter((item) => HYPOTHESIS_LABEL_RE.test(item) && EVIDENCE_LANGUAGE_RE.test(item) && !PSYCHOLOGICAL_INVENTION_RE.test(item))
        .slice(0, 4);
  const patterns = evidence.confidence === "insufficient"
    ? ["Dados insuficientes para afirmar um padrão."]
    : hypotheses.length
      ? hypotheses
      : ["Nenhuma hipótese remota passou pela validação de evidências desta janela."];
  const statements = [
    ...(evidence.confidence === "insufficient"
      ? [{ kind: "insufficient" as const, text: evidence.facts[0] ?? "Dados insuficientes.", evidenceKeys: ["daysRecorded", "plannedTasks"] }]
      : evidence.facts.map((text) => ({ kind: "fact" as const, text, evidenceKeys: ["weeklyEvidence"] }))),
    ...hypotheses.map((text) => ({ kind: "hypothesis" as const, text, evidenceKeys: ["weeklyEvidence"] })),
  ];
  return {
    ...review,
    weekStart: evidence.weekStart,
    weekEnd: evidence.weekEnd,
    completionPercentage: evidence.completionPercentage,
    xpEarned: evidence.xpEarned,
    focusMinutes: evidence.focusMinutes,
    consistencyScore: evidence.score,
    confidence: evidence.confidence,
    statements,
    highlights: evidence.facts,
    patterns,
    // The current remote contract does not attach evidence keys to
    // recommendations. Keep the interpretive hypotheses that pass validation,
    // but derive every prescription from local, auditable evidence until the
    // contract can prove which observation supports each recommendation.
    keep: deterministic.keep,
    cut: deterministic.cut,
    nextWeekFocus: deterministic.nextWeekFocus,
    challenge: deterministic.challenge,
    source: "ai",
  };
}

export function weekFactsForAi(days: DayHistory[]): string[] {
  const canonical = oneFinalEntryPerDate(days);
  if (!canonical.length) return ["Nenhum dia histórico registrado na semana."];
  return canonical.slice(-7).map((day) => `${day.date}: ${day.completedTasks}/${day.totalTasks} tarefas, ${day.focusMinutes} min foco, missão ${day.plan.mainMission.completed ? "concluída" : "aberta"}.`);
}
