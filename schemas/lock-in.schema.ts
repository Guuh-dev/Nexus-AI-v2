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
  lesson: z.object({ roadmapId: z.string().min(1).max(120), lessonId: z.string().min(1).max(120) }).strict().optional(),
  targetGoalId: z.string().max(120).optional(),
  taskIds: z.array(z.string().min(1).max(100)).max(5).optional(),
  goalKind: z.enum(["primary", "maintenance", "backlog"]).default("primary"), maintenanceBudget: z.string().max(4).default("15"),
  name: z.string().max(80), result: z.string().max(600), why: z.string().max(600),
  doneWhen: z.string().max(600), deadline: z.string().max(10), deadlineType: z.enum(["unknown", "target", "external"]),
  date: z.string().max(10), timezone: z.string().max(80), windows: z.string().max(1200),
  reservations: z.string().max(1600), buffer: z.string().max(4),
  mission: z.string().max(120), firstAction: z.string().max(240), acceptance: z.string().max(300),
  estimate: z.string().max(4), step: z.number().int().min(0).max(2),
}).strict();
export const evidenceSchema = z.object({
  id: z.string().min(1).max(120), taskId: z.string().max(120).optional(), sessionId: z.string().max(120).optional(),
  text: z.string().trim().min(1).max(1000), kind: z.enum(["text", "link"]),
  origin: z.enum(["user_reported", "system_observed"]), createdAt: z.string().datetime(),
}).strict();
export const dayReviewSchema = z.object({
  id: z.string().min(1).max(120), date: z.string().date(), goalId: z.string().max(120).optional(),
  outcome: z.enum(["completed", "partial", "not_completed", "unknown"]), reason: z.string().max(500),
  nextAction: z.string().max(300), createdAt: z.string().datetime(),
  observedTaskIds: z.array(z.string().max(120)).max(5), evidenceIds: z.array(z.string().max(120)).max(100),
  plannedTaskIds: z.array(z.string().max(120)).max(5), source: z.literal("user_reported"),
}).strict();
export const tomorrowSchema = z.object({
  date: z.string().date(), baseRevision: z.number().int().min(0), goalId: z.string().max(120).optional(),
  mission: z.string().max(120), firstAction: z.string().max(300), acceptance: z.string().max(300),
  estimatedMinutes: z.number().int().min(5).max(240), pendingTaskIds: z.array(z.string().max(120)).max(100),
  explanation: z.string().max(600), source: z.literal("offline"), createdAt: z.string().datetime(),
}).strict();
export const lockInStateSchema = z.object({
  journal: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), createdAt: z.string().datetime(), updatedAt: z.string().datetime() }).strict()).max(3660).optional(),
  evidence: z.array(evidenceSchema).max(10000).optional(), reviews: z.array(dayReviewSchema).max(3660).optional(), tomorrow: tomorrowSchema.optional(),
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

export type Evidence = z.infer<typeof evidenceSchema>;
export type DayReview = z.infer<typeof dayReviewSchema>;
