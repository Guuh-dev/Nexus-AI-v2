import type { AppData } from "@/types";
import { dayReviewSchema, evidenceSchema, tomorrowSchema, type Evidence } from "@/schemas/lock-in.schema";
import { addDays, localDateKey } from "@/utils/dates";
export function addEvidence(data: AppData, input: Evidence): AppData {
  const evidence = evidenceSchema.parse(input);
  if (data.lockIn.evidence?.some((e) => e.id === evidence.id)) return data;
  if ((data.lockIn.evidence?.length ?? 0) >= 10000) throw new Error("Limite de evidências atingido. Exporte e revise seus dados.");
  if (evidence.kind === "link") { const url = new URL(evidence.text); if (!["https:", "http:"].includes(url.protocol)) throw new Error("Use um link HTTP ou HTTPS."); }
  const taskIds = new Set([...data.activePlan?.tasks ?? [], ...data.recurringTasks, ...data.history.flatMap((d) => d.plan.tasks), ...data.planSnapshots.flatMap((p) => p.tasks)].map((t) => t.id));
  if (evidence.taskId && !taskIds.has(evidence.taskId)) throw new Error("A tarefa vinculada não está no histórico.");
  return { ...data, lockIn: { ...data.lockIn, evidence: [...(data.lockIn.evidence ?? []), evidence] } };
}
export function reviewDay(data: AppData, input: { outcome: "completed" | "partial" | "not_completed" | "unknown"; reason: string; nextAction: string }, baseRevision: number, now = new Date()): AppData {
  if (data.lockIn.revision !== baseRevision) throw new Error("O plano mudou. Revise os fatos antes de salvar.");
  const date = localDateKey(now, data.profile?.timezone);
  const plan = data.activePlan?.date === date ? data.activePlan : data.history.find((d) => d.date === date)?.plan;
  const reviews = data.lockIn.reviews ?? [];
  if (reviews.length >= 3660 && !reviews.some((r) => r.date === date)) throw new Error("Exporte e revise seu histórico antes de continuar.");
  const taskIds = plan?.tasks.map((t) => t.id) ?? [];
  const evidenceIds = (data.lockIn.evidence ?? []).filter((e) => Boolean(e.taskId && taskIds.includes(e.taskId))).map((e) => e.id).slice(-100);
  const review = dayReviewSchema.parse({ id: `${data.installationId.slice(0, 75)}:review:${date}`, date, goalId: plan?.execution?.goalId,
    ...input, createdAt: now.toISOString(), source: "user_reported", observedTaskIds: plan?.tasks.filter((t) => t.completed).map((t) => t.id) ?? [], plannedTaskIds: taskIds, evidenceIds });
  return { ...data, lockIn: { ...data.lockIn, reviews: [...reviews.filter((r) => r.date !== date), review], tomorrow: undefined } };
}
export function draftTomorrow(data: AppData, now = new Date()): AppData {
  const date = localDateKey(now, data.profile?.timezone);
  const review = data.lockIn.reviews?.find((r) => r.date === date);
  const pending = [...data.activePlan?.tasks.filter((t) => !t.completed) ?? [], ...data.recurringTasks].filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i);
  const primary = data.lockIn.goals.find((g) => g.state === "primary");
  const first = pending[0];
  const tomorrow = tomorrowSchema.parse({ date: addDays(date, 1), baseRevision: data.lockIn.revision, goalId: primary?.id,
    mission: first?.title ?? "", firstAction: review?.nextAction || first?.firstStep || "", acceptance: first?.doneWhen ?? "",
    estimatedMinutes: Math.max(5, Math.min(240, first?.estimatedMinutes ?? 25)), pendingTaskIds: pending.map((t) => t.id).slice(0, 100),
    explanation: review ? "Rascunho local baseado na revisão e nas pendências registradas. Confirme relevância, escopo e janelas amanhã." : "Sem revisão: resultados permanecem desconhecidos. Este rascunho usa somente pendências registradas, sem concluir fracasso.",
    source: "offline", createdAt: now.toISOString() });
  return { ...data, lockIn: { ...data.lockIn, tomorrow } };
}
export function executionSummary(data: AppData) {
  const reviews = data.lockIn.reviews ?? [];
  const counts = { completed: 0, partial: 0, not_completed: 0, unknown: 0 };
  reviews.forEach((r) => counts[r.outcome]++);
  const sessions = data.progress.focusSessions;
  const observedMinutes = Math.floor(sessions.reduce((s, x) => s + x.elapsedSeconds, 0) / 60);
  return { counts, reviewedDays: reviews.length, observedMinutes, evidenceCount: data.lockIn.evidence?.length ?? 0 };
}

export function removeEvidence(data: AppData, id: string): AppData {
  const removed = data.lockIn.evidence?.find((e) => e.id === id);
  if (!removed) return data;
  const ownsReflection = removed.sessionId && removed.id === `${removed.sessionId}:evidence`;
  return { ...data, progress: ownsReflection ? { ...data.progress, focusSessions: data.progress.focusSessions.map((s) => s.id === removed.sessionId ? { ...s, reflection: undefined } : s) } : data.progress,
    lockIn: { ...data.lockIn, evidence: data.lockIn.evidence?.filter((e) => e.id !== id), reviews: data.lockIn.reviews?.map((r) => ({ ...r, evidenceIds: r.evidenceIds.filter((e) => e !== id) })) } };
}
