import { z } from "zod";
import { MAIN_MISSION_XP, PRIORITY_XP } from "@/constants/defaults";
import { CATEGORIES, type AiDailyPlan, type DailyPlan } from "@/types";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";

const prioritySchema = z.enum(["alta", "media", "baixa"]);
const categorySchema = z.enum(CATEGORIES);

const aiMissionSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(360),
    firstStep: z.string().trim().min(2).max(240).optional(),
    expectedResult: z.string().trim().min(2).max(300).optional(),
    doneWhen: z.string().trim().min(2).max(300).optional(),
    estimatedMinutes: z.number().int().min(5).max(360),
    priority: prioritySchema,
  })
  .strict();

const aiTaskSchema = z
  .object({
    id: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(300).optional(),
    context: z.string().trim().min(2).max(300).optional(),
    firstStep: z.string().trim().min(2).max(240).optional(),
    expectedResult: z.string().trim().min(2).max(300).optional(),
    doneWhen: z.string().trim().min(2).max(300).optional(),
    category: categorySchema,
    priority: prioritySchema,
    estimatedMinutes: z.number().int().min(5).max(240),
    xp: z.number().int().min(5).max(100),
    recurring: z.boolean(),
  })
  .strict();

export const aiDailyPlanSchema = z
  .object({
    date: z.string().date(),
    mainMission: aiMissionSchema,
    tasks: z.array(aiTaskSchema).min(1).max(5),
    focusMessage: z.string().trim().min(2).max(240),
    avoidToday: z.array(z.string().trim().min(1).max(140)).max(5),
    totalEstimatedMinutes: z.number().int().min(5).max(900),
  })
  .strict();

const storedMissionSchema = aiMissionSchema.extend({
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  xp: z.number().int().min(0).max(200),
});

export const storedTaskSchema = aiTaskSchema.extend({
  id: z.string().trim().min(1).max(100),
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  postponedFrom: z.string().date().optional(),
  scheduledDate: z.string().date().optional(),
  operationId: z.string().trim().min(1).max(120).optional(),
  habitId: z.string().trim().min(1).max(120).optional(),
});

export const dailyPlanSchema = z
  .object({
    date: z.string().date(),
    mainMission: storedMissionSchema,
    // AI generation must create at least one task, but the user may later
    // delete or postpone every task while keeping the day's main mission.
    tasks: z.array(storedTaskSchema).max(5),
    focusMessage: z.string().trim().min(1).max(240),
    avoidToday: z.array(z.string().trim().min(1).max(140)).max(5),
    totalEstimatedMinutes: z.number().int().min(0).max(1200),
    source: z.enum(["ai", "offline"]),
    warning: z.string().trim().max(300).optional(),
    createdAt: z.string().datetime(),
    requestId: z.string().trim().min(1).max(120),
  })
  .strict();

export const DAILY_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["date", "mainMission", "tasks", "focusMessage", "avoidToday", "totalEstimatedMinutes"],
  properties: {
    date: { type: "string", format: "date" },
    mainMission: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "estimatedMinutes", "priority"],
      properties: {
        title: { type: "string", maxLength: 120 },
        description: { type: "string", maxLength: 360 },
        firstStep: { type: "string", maxLength: 240 },
        expectedResult: { type: "string", maxLength: 300 },
        doneWhen: { type: "string", maxLength: 300 },
        estimatedMinutes: { type: "integer", minimum: 5, maximum: 360 },
        priority: { type: "string", enum: ["alta", "media", "baixa"] },
      },
    },
    tasks: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "context", "firstStep", "expectedResult", "doneWhen", "category", "priority", "estimatedMinutes", "xp", "recurring"],
        properties: {
          id: { type: "string", maxLength: 100 },
          title: { type: "string", maxLength: 120 },
          description: { type: "string", maxLength: 300 },
          context: { type: "string", maxLength: 300 },
          firstStep: { type: "string", maxLength: 240 },
          expectedResult: { type: "string", maxLength: 300 },
          doneWhen: { type: "string", maxLength: 300 },
          category: { type: "string", enum: [...CATEGORIES] },
          priority: { type: "string", enum: ["alta", "media", "baixa"] },
          estimatedMinutes: { type: "integer", minimum: 5, maximum: 240 },
          xp: { type: "integer", minimum: 5, maximum: 100 },
          recurring: { type: "boolean" },
        },
      },
    },
    focusMessage: { type: "string", maxLength: 240 },
    avoidToday: {
      type: "array",
      maxItems: 5,
      items: { type: "string", maxLength: 140 },
    },
    totalEstimatedMinutes: { type: "integer", minimum: 5, maximum: 900 },
  },
} as const;

export function extractJson(raw: string): unknown {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("Resposta sem objeto JSON");
  return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
}

export function parseAiDailyPlan(raw: string): AiDailyPlan {
  const parsed = aiDailyPlanSchema.parse(extractJson(raw));
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const tasks: AiDailyPlan["tasks"] = [];
  for (const task of parsed.tasks) {
    const title = sanitizeText(task.title, 120);
    const titleKey = title.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    if (!title || seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    let id = sanitizeText(task.id, 100) || createId("task");
    if (seenIds.has(id)) id = createId("task");
    seenIds.add(id);
    tasks.push({
      id,
      title,
      description: sanitizeText(task.description ?? task.context, 300) || `Ação concreta para avançar em ${title}.`,
      context: sanitizeText(task.context ?? task.description, 300) || `Esta tarefa move a missão de hoje por meio de uma entrega observável.`,
      firstStep: sanitizeText(task.firstStep, 240) || `Abra o material necessário e execute a primeira parte de “${title}”.`,
      expectedResult: sanitizeText(task.expectedResult, 300) || `Uma entrega verificável ligada a “${title}”.`,
      doneWhen: sanitizeText(task.doneWhen, 300) || `A entrega foi finalizada, conferida e registrada.`,
      category: task.category,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      xp: task.xp,
      recurring: task.recurring,
    });
  }
  return {
    date: parsed.date,
    mainMission: {
      title: sanitizeText(parsed.mainMission.title, 120),
      description: sanitizeText(parsed.mainMission.description, 360),
      ...(parsed.mainMission.firstStep ? { firstStep: sanitizeText(parsed.mainMission.firstStep, 240) } : {}),
      ...(parsed.mainMission.expectedResult ? { expectedResult: sanitizeText(parsed.mainMission.expectedResult, 300) } : {}),
      ...(parsed.mainMission.doneWhen ? { doneWhen: sanitizeText(parsed.mainMission.doneWhen, 300) } : {}),
      estimatedMinutes: parsed.mainMission.estimatedMinutes,
      priority: parsed.mainMission.priority,
    },
    tasks,
    focusMessage: sanitizeText(parsed.focusMessage, 240),
    avoidToday: parsed.avoidToday.map((item) => sanitizeText(item, 140)).filter(Boolean),
    totalEstimatedMinutes: parsed.totalEstimatedMinutes,
  };
}

export function hydrateAiPlan(
  plan: AiDailyPlan,
  options: { date: string; requestId: string; warning?: string; source?: "ai" | "offline" },
): DailyPlan {
  const tasks = plan.tasks.map((task) => ({
    ...task,
    id: task.id || createId("task"),
    xp: PRIORITY_XP[task.priority],
    completed: false,
  }));
  const totalEstimatedMinutes =
    plan.mainMission.estimatedMinutes + tasks.reduce((total, task) => total + task.estimatedMinutes, 0);

  return {
    date: options.date,
    mainMission: {
      ...plan.mainMission,
      completed: false,
      xp: MAIN_MISSION_XP,
    },
    tasks,
    focusMessage: plan.focusMessage,
    avoidToday: plan.avoidToday,
    totalEstimatedMinutes,
    source: options.source ?? "ai",
    ...(options.warning ? { warning: options.warning } : {}),
    createdAt: new Date().toISOString(),
    requestId: options.requestId,
  };
}
