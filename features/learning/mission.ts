import type { AppData } from "@/types";
import { draftFor } from "@/features/lock-in/planning";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { localDateKey } from "@/utils/dates";
import { lockInDraftSchema } from "@/schemas/lock-in.schema";
/** Prepares a proposal only. Confirming capacity remains the user's next step. */
export function lessonMissionDraft(data: AppData, roadmapId: string, lessonId: string, now = new Date()) {
  const roadmap = data.learning.roadmaps.find((r) => r.id === roadmapId && r.status !== "archived");
  const phase = roadmap?.phases.find((p) => p.lessons.some((l) => l.id === lessonId));
  const lesson = phase?.lessons.find((l) => l.id === lessonId);
  if (!roadmap || !phase || !lesson) throw new Error("A aula não está mais disponível. Revise sua trilha.");
  const guidance = getLessonGuidance(roadmap, phase, lesson);
  const base = draftFor({ ...data, lockIn: { ...data.lockIn, draft: undefined } }, now);
  const existing = [...(data.activePlan?.tasks ?? []), ...data.recurringTasks].find((t) => !t.completed && t.lesson?.roadmapId === roadmapId && t.lesson.lessonId === lessonId);
  const execution = data.lockIn.execution;
  const today = execution?.date === localDateKey(now, data.profile?.timezone);
  const format = (stamp: string) => new Date(stamp).toLocaleTimeString("pt-BR", { timeZone: execution!.timezone, hour: "2-digit", minute: "2-digit" });
  return lockInDraftSchema.parse({ ...base, goalKind: "primary", targetGoalId: data.lockIn.goals.find((g) => g.state === "primary")?.id,
    lesson: { roadmapId, lessonId }, mission: lesson.title.slice(0, 120), firstAction: (guidance.steps[0] || guidance.objective).slice(0, 240),
    acceptance: guidance.successCriteria.slice(0, 300), estimate: String(Math.min(240, lesson.estimatedMinutes)), taskIds: existing ? [existing.id] : undefined,
    windows: today ? execution!.windows.map((s) => `${format(s.start)}-${format(s.end)}`).join("\n") : "",
    reservations: today ? execution!.reservations.map((s) => `${format(s.start)}-${format(s.end)}`).join("\n") : "",
    buffer: today ? String(execution!.bufferMinutes) : base.buffer, step: today ? 2 : 1,
  });
}
