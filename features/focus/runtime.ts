import { z } from "zod";
import { createId } from "@/utils/ids";
export const focusSegmentSchema = z.object({ start: z.string().datetime(), end: z.string().datetime() }).strict().refine((s) => Date.parse(s.end) >= Date.parse(s.start), "Segmento inválido.");
export const focusRuntimeSchema = z.object({
  epoch: z.number().int().min(0).optional(),
  version: z.literal(2).optional(), sessionId: z.string().min(1).max(120).optional(), taskId: z.string().max(120).optional(),
  taskTitle: z.string().min(1).max(120), duration: z.number().int().min(5).max(360),
  mode: z.enum(["pomodoro", "profundo", "fluxo", "sprint", "personalizado"]), intention: z.string().max(300),
  ambientSound: z.enum(["nenhum", "chuva", "floresta", "cafeteria", "ruido_marrom", "ruido_branco", "espaco"]),
  status: z.enum(["running", "paused", "completed"]), elapsedBase: z.number().int().min(0).max(86_400),
  runStartedAt: z.number().int().positive().nullable(), sessionStartedAt: z.string().datetime(), reflection: z.string().max(500).optional(),
  segments: z.array(focusSegmentSchema).max(1000).optional(), lastObservedAt: z.number().int().positive().optional(),
  nextAction: z.string().max(300).optional(), returnAt: z.string().datetime().optional(), recovery: z.boolean().optional(),
  targetAcknowledged: z.boolean().optional(),
  inbox: z.array(z.object({ id: z.string().min(1).max(120), text: z.string().trim().min(1).max(300), createdAt: z.string().datetime() }).strict()).max(100).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.status !== "running" && v.runStartedAt !== null) ctx.addIssue({ code: "custom", message: "Sessão parada não pode contar tempo." });
  for (let i = 1; i < (v.segments?.length ?? 0); i++) if (Date.parse(v.segments![i]!.start) < Date.parse(v.segments![i - 1]!.end)) ctx.addIssue({ code: "custom", message: "Segmentos sobrepostos." });
});
export type FocusRuntime = Omit<z.infer<typeof focusRuntimeSchema>, "sessionId"> & { sessionId: string };
export function scheduledPauseAt(runtime: FocusRuntime, now: number, windowEnd?: number): number | undefined {
  if (runtime.status !== "running" || runtime.runStartedAt === null) return undefined;
  const target = runtime.targetAcknowledged ? Infinity : runtime.runStartedAt + Math.max(0, runtime.duration * 60 - runtime.elapsedBase) * 1000;
  const boundary = Math.min(target, windowEnd ?? Infinity);
  return boundary <= now ? Math.max(runtime.runStartedAt, boundary) : undefined;
}
export function elapsedAt(runtime: FocusRuntime, now = Date.now()): number {
  return Math.min(86_400, runtime.elapsedBase + (runtime.status === "running" && runtime.runStartedAt !== null ? Math.max(0, Math.floor((now - runtime.runStartedAt) / 1000)) : 0));
}
export function stopRuntime(runtime: FocusRuntime, status: "paused" | "completed", now = Date.now()): FocusRuntime {
  const segments = [...(runtime.segments ?? [])];
  if (runtime.status === "running" && runtime.runStartedAt !== null && now >= runtime.runStartedAt) {
    if (segments.length >= 1000) throw new Error("Limite de segmentos atingido. Finalize esta sessão antes de continuar.");
    segments.push({ start: new Date(runtime.runStartedAt).toISOString(), end: new Date(now).toISOString() });
  }
  return { ...runtime, version: 2, elapsedBase: elapsedAt(runtime, now), segments, runStartedAt: null, status, lastObservedAt: now };
}
export function restoreRuntime(raw: unknown): FocusRuntime {
  const parsed = focusRuntimeSchema.parse(raw);
  const runtime: FocusRuntime = { ...parsed, sessionId: parsed.sessionId ?? createId("focus-session") };
  // Count only up to a persisted checkpoint. A closed app is not evidence of work.
  if (runtime.status === "running") return { ...stopRuntime(runtime, "paused", runtime.lastObservedAt ?? runtime.runStartedAt ?? Date.now()), recovery: true };
  return runtime;
}
export function resumeRuntime(runtime: FocusRuntime, now = Date.now()): FocusRuntime {
  if (runtime.status !== "paused") throw new Error("A sessão precisa estar pausada.");
  if (runtime.elapsedBase >= 86_400) throw new Error("Finalize esta sessão antes de iniciar outra.");
  return { ...runtime, status: "running", runStartedAt: now, lastObservedAt: now, recovery: false };
}
