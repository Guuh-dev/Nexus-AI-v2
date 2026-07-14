import { z } from "zod";
import { CATEGORIES, type AssistantRequest } from "@/types";
import { roadmapSchema, weeklyReviewSchema } from "@/schemas/expansion.schema";

const memoryDraftSchema = z.object({
  kind: z.enum(["goal", "preference", "decision", "pattern", "obstacle", "learning", "fact"]),
  content: z.string().trim().min(2).max(500),
  confidence: z.number().min(0).max(1),
}).strict();

const actionDraftFields = {
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(600),
};

const actionDraftSchema = z.discriminatedUnion("type", [
  z.object({
    ...actionDraftFields,
    type: z.literal("update_goal"),
    payload: z.object({
      mainGoal: z.string().trim().min(10).max(600),
    }).strict(),
  }).strict(),
  z.object({
    ...actionDraftFields,
    type: z.enum(["replan", "create_task", "create_roadmap"]),
    payload: z.record(z.string(), z.unknown()),
  }).strict(),
]);

const roadmapDraftSchema = z.object({
  topic: z.string().trim().min(2).max(160),
  outcome: z.string().trim().min(2).max(600),
  phases: z.array(z.object({
    title: z.string().trim().min(2).max(160),
    objective: z.string().trim().min(2).max(500),
    lessons: z.array(z.object({
      title: z.string().trim().min(2).max(160),
      description: z.string().trim().min(2).max(700),
      objective: z.string().trim().min(2).max(400),
      steps: z.array(z.string().trim().min(2).max(240)).min(2).max(5),
      deliverable: z.string().trim().min(2).max(400),
      successCriteria: z.string().trim().min(2).max(400),
      estimatedMinutes: z.number().int().min(5).max(180),
    }).strict()).min(1).max(12),
  }).strict()).min(1).max(10),
}).strict();

const captureDraftSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional(),
  context: z.string().trim().min(2).max(300),
  firstStep: z.string().trim().min(2).max(240),
  expectedResult: z.string().trim().min(2).max(300),
  doneWhen: z.string().trim().min(2).max(300),
  category: z.enum(CATEGORIES),
  priority: z.enum(["alta", "media", "baixa"]),
  estimatedMinutes: z.number().int().min(5).max(240),
  recurring: z.boolean(),
  scheduledDate: z.string().date().optional(),
}).strict();

const weeklyReviewDraftSchema = z.object({
  highlights: z.array(z.string().trim().min(2).max(160)).max(8),
  patterns: z.array(z.string().trim().min(2).max(160)).max(8),
  keep: z.array(z.string().trim().min(2).max(160)).max(8),
  cut: z.array(z.string().trim().min(2).max(160)).max(8),
  nextWeekFocus: z.string().trim().min(2).max(500),
  challenge: z.string().trim().min(2).max(500),
}).strict();

const lessonReviewDraftSchema = z.object({
  accepted: z.boolean(),
  feedback: z.string().trim().min(2).max(2000),
  nextAdjustment: z.string().trim().min(2).max(1000).optional(),
}).strict().superRefine((review, context) => {
  if (!review.accepted && !review.nextAdjustment) {
    context.addIssue({
      code: "custom",
      path: ["nextAdjustment"],
      message: "Uma entrega recusada precisa de um próximo ajuste executável.",
    });
  }
});

export const assistantAiResponseSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  title: z.string().trim().min(1).max(100).optional(),
  memories: z.array(memoryDraftSchema).max(8).optional(),
  actions: z.array(actionDraftSchema).max(5).optional(),
  roadmap: roadmapDraftSchema.optional(),
  capture: captureDraftSchema.optional(),
  weeklyReview: weeklyReviewDraftSchema.optional(),
  lessonReview: lessonReviewDraftSchema.optional(),
}).strict();

export const assistantClientResponseSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  title: z.string().trim().min(1).max(100).optional(),
  memories: z.array(memoryDraftSchema).max(8).optional(),
  actions: z.array(actionDraftSchema).max(5).optional(),
  roadmap: roadmapSchema.optional(),
  capture: captureDraftSchema.extend({ xp: z.number().int().min(0).max(200) }).optional(),
  weeklyReview: weeklyReviewSchema.optional(),
  lessonReview: lessonReviewDraftSchema.optional(),
  warning: z.string().trim().max(500).optional(),
  meta: z.object({
    source: z.enum(["remote", "local"]),
    model: z.string().trim().min(1).max(200).optional(),
    reasoningTokens: z.number().int().min(0).optional(),
    latencyMs: z.number().int().min(0).max(120_000),
    attempts: z.number().int().min(0).max(8),
    endpoint: z.string().trim().max(500).optional(),
    errorCode: z.string().trim().max(100).optional(),
    requestId: z.string().trim().max(160).optional(),
  }).strict().optional(),
}).strict();

export const ASSISTANT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message"],
  properties: {
    message: { type: "string", maxLength: 6000 },
    title: { type: "string", maxLength: 100 },
    memories: {
      type: "array", maxItems: 8,
      items: {
        type: "object", additionalProperties: false, required: ["kind", "content", "confidence"],
        properties: {
          kind: { type: "string", enum: ["goal", "preference", "decision", "pattern", "obstacle", "learning", "fact"] },
          content: { type: "string", maxLength: 500 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    actions: {
      type: "array", maxItems: 5,
      items: {
        oneOf: [
          {
            type: "object", additionalProperties: false, required: ["type", "title", "description", "payload"],
            properties: {
              type: { type: "string", enum: ["replan", "create_task", "create_roadmap"] },
              title: { type: "string", minLength: 2, maxLength: 160 },
              description: { type: "string", minLength: 2, maxLength: 600 },
              payload: { type: "object" },
            },
          },
          {
            type: "object", additionalProperties: false, required: ["type", "title", "description", "payload"],
            properties: {
              type: { type: "string", const: "update_goal" },
              title: { type: "string", minLength: 2, maxLength: 160 },
              description: { type: "string", minLength: 2, maxLength: 600 },
              payload: {
                type: "object", additionalProperties: false, required: ["mainGoal"],
                properties: { mainGoal: { type: "string", minLength: 10, maxLength: 600 } },
              },
            },
          },
        ],
      },
    },
    roadmap: {
      type: "object", additionalProperties: false, required: ["topic", "outcome", "phases"],
      properties: {
        topic: { type: "string", maxLength: 160 }, outcome: { type: "string", maxLength: 600 },
        phases: { type: "array", minItems: 1, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["title", "objective", "lessons"], properties: {
          title: { type: "string", maxLength: 160 }, objective: { type: "string", maxLength: 500 },
          lessons: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", additionalProperties: false, required: ["title", "description", "objective", "steps", "deliverable", "successCriteria", "estimatedMinutes"], properties: {
            title: { type: "string", maxLength: 160 },
            description: { type: "string", maxLength: 700 },
            objective: { type: "string", maxLength: 400 },
            steps: { type: "array", minItems: 2, maxItems: 5, items: { type: "string", maxLength: 240 } },
            deliverable: { type: "string", maxLength: 400 },
            successCriteria: { type: "string", maxLength: 400 },
            estimatedMinutes: { type: "integer", minimum: 5, maximum: 180 },
          } } },
        } } },
      },
    },
    capture: {
      type: "object", additionalProperties: false, required: ["title", "context", "firstStep", "expectedResult", "doneWhen", "category", "priority", "estimatedMinutes", "recurring"],
      properties: {
        title: { type: "string", minLength: 2, maxLength: 120 },
        description: { type: "string", maxLength: 300 },
        context: { type: "string", minLength: 2, maxLength: 300 },
        firstStep: { type: "string", minLength: 2, maxLength: 240 },
        expectedResult: { type: "string", minLength: 2, maxLength: 300 },
        doneWhen: { type: "string", minLength: 2, maxLength: 300 },
        category: { type: "string", enum: [...CATEGORIES] },
        priority: { type: "string", enum: ["alta", "media", "baixa"] }, estimatedMinutes: { type: "integer", minimum: 5, maximum: 240 }, recurring: { type: "boolean" }, scheduledDate: { type: "string", format: "date" },
      },
    },
    weeklyReview: {
      type: "object", additionalProperties: false, required: ["highlights", "patterns", "keep", "cut", "nextWeekFocus", "challenge"],
      properties: {
        highlights: { type: "array", maxItems: 8, items: { type: "string", maxLength: 160 } },
        patterns: { type: "array", maxItems: 8, items: { type: "string", maxLength: 160 } }, keep: { type: "array", maxItems: 8, items: { type: "string", maxLength: 160 } },
        cut: { type: "array", maxItems: 8, items: { type: "string", maxLength: 160 } }, nextWeekFocus: { type: "string", maxLength: 500 }, challenge: { type: "string", maxLength: 500 },
      },
    },
    lessonReview: {
      type: "object",
      additionalProperties: false,
      required: ["accepted", "feedback"],
      properties: {
        accepted: { type: "boolean" },
        feedback: { type: "string", minLength: 2, maxLength: 2000 },
        nextAdjustment: { type: "string", minLength: 2, maxLength: 1000 },
      },
    },
  },
} as const;

const REQUIRED_OUTPUT_BY_MODE: Partial<
  Record<AssistantRequest["mode"], "roadmap" | "capture" | "weeklyReview" | "lessonReview">
> = {
  roadmap: "roadmap",
  capture: "capture",
  weekly_review: "weeklyReview",
  evidence_review: "lessonReview",
};

export function assistantJsonSchemaForMode(mode: AssistantRequest["mode"]) {
  const requiredOutput = REQUIRED_OUTPUT_BY_MODE[mode];
  return {
    ...ASSISTANT_JSON_SCHEMA,
    required: requiredOutput ? ["message", requiredOutput] : ["message"],
  };
}
