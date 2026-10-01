import { z } from "zod";

export const intervalSchema = z.object({ start: z.string().datetime(), end: z.string().datetime() }).strict()
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), "O fim deve ocorrer depois do início.");
export const goalSchema = z.object({
  id: z.string().min(1).max(120), result: z.string().trim().min(10).max(600),
  why: z.string().trim().min(3).max(600), doneWhen: z.string().trim().max(600),
  state: z.enum(["candidate", "primary", "maintenance", "backlog", "archived"]),
  budgetMinutes: z.number().int().min(1).max(720).optional(),
  deadline: z.string().date().optional(), deadlineType: z.enum(["unknown", "target", "external"]),
}).strict();
export const executionProfileSchema = z.object({
  date: z.string().date(), timezone: z.string().min(1).max(80).refine((v) => {
    try { new Intl.DateTimeFormat("pt-BR", { timeZone: v }); return true; } catch { return false; }
  }, "Fuso horário inválido."),
  windows: z.array(intervalSchema).min(1).max(20),
  reservations: z.array(intervalSchema.safeExtend({ kind: z.enum(["commitment", "need", "transition"]) })).max(40),
  maintenanceMinutes: z.number().int().min(0).max(720).default(0),
  bufferMinutes: z.number().int().min(0).max(240),
}).strict();
export const lockInDraftSchema = z.object({
  goalKind: z.enum(["primary", "maintenance", "backlog"]).default("primary"), maintenanceBudget: z.string().max(4).default("15"),
  name: z.string().max(80), result: z.string().max(600), why: z.string().max(600),
  doneWhen: z.string().max(600), deadline: z.string().max(10), deadlineType: z.enum(["unknown", "target", "external"]),
  date: z.string().max(10), timezone: z.string().max(80), windows: z.string().max(1200),
  reservations: z.string().max(1600), buffer: z.string().max(4),
  mission: z.string().max(120), firstAction: z.string().max(240), acceptance: z.string().max(300),
  estimate: z.string().max(4), step: z.number().int().min(0).max(2),
}).strict();
export const lockInStateSchema = z.object({
  goals: z.array(goalSchema).max(100), execution: executionProfileSchema.optional(),
  draft: lockInDraftSchema.optional(), revision: z.number().int().min(0),
}).strict().superRefine((v, ctx) => {
  if (v.goals.some((g) => g.state === "maintenance" && !g.budgetMinutes)) ctx.addIssue({ code: "custom", message: "Meta de manutenção exige orçamento." });
  if (v.goals.filter((g) => g.state === "primary").length > 1 || new Set(v.goals.map((g) => g.id)).size !== v.goals.length)
    ctx.addIssue({ code: "custom", message: "Metas precisam de IDs únicos e uma única primary." });
});
export const planExecutionSchema = z.object({
  goalId: z.string().min(1).max(120), revision: z.number().int().min(1),
  status: z.enum(["confirmed", "needs_review"]),
  capacityMinutes: z.number().int().min(0).max(1440), bufferMinutes: z.number().int().min(0).max(240),
  blocks: z.array(intervalSchema.safeExtend({ taskId: z.string().min(1).max(120) })).max(5),
  confirmedAt: z.string().datetime(),
}).strict();
export type LockInState = z.infer<typeof lockInStateSchema>;
export type LockInDraft = z.infer<typeof lockInDraftSchema>;
export type ExecutionProfile = z.infer<typeof executionProfileSchema>;
