import type { AppData, FocusSession } from "@/types";
import { focusSessionSchema } from "@/schemas/storage.schema";
import { toggleTaskCompletion } from "@/features/tasks/task.logic";
import { focusXpForSeconds } from "@/utils/levels";
export function applyFocusCompletion(current: AppData, input: FocusSession, markTaskComplete: boolean): AppData {
  const session = focusSessionSchema.parse(input);
  if (current.progress.focusSessions.some((item) => item.id === session.id)) return current;
  if (current.progress.focusSessions.length >= 10000) throw new Error("Exporte e revise seu histórico de foco antes de continuar.");
  if (session.segments) {
    for (let i = 1; i < session.segments.length; i++) if (Date.parse(session.segments[i]!.start) < Date.parse(session.segments[i - 1]!.end)) throw new Error("Segmentos sobrepostos não podem ser contados duas vezes.");
    const recorded = Math.floor(session.segments.reduce((s, p) => s + Date.parse(p.end) - Date.parse(p.start), 0) / 1000);
    if (recorded > session.elapsedSeconds + session.segments.length) throw new Error("O tempo e os segmentos não são coerentes.");
  }
  session.xp = session.status === "cancelled" ? 0 : focusXpForSeconds(session.elapsedSeconds);
  let next: AppData = { ...current, progress: { ...current.progress, totalXp: current.progress.totalXp + session.xp,
    focusSessions: [...current.progress.focusSessions, session], attributes: { ...current.progress.attributes, foco: current.progress.attributes.foco + Math.floor(session.elapsedSeconds / 60) } } };
  const evidence = session.reflection?.trim() ? { id: `${session.id}:evidence`, taskId: session.taskId, sessionId: session.id, text: session.reflection.trim(), kind: "text" as const, origin: "user_reported" as const, createdAt: session.completedAt } : undefined;
  if (evidence) {
    if ((current.lockIn.evidence?.length ?? 0) >= 10000) throw new Error("Exporte e revise suas evidências antes de continuar.");
    next = { ...next, lockIn: { ...next.lockIn, evidence: [...(next.lockIn.evidence ?? []), evidence] } };
  }
  const task = session.taskId ? next.activePlan?.tasks.find((item) => item.id === session.taskId) : undefined;
  if (markTaskComplete && task && !task.completed) next = toggleTaskCompletion(next, task.id);
  return next;
}
