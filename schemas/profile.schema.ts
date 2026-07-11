import { z } from "zod";
import { CATEGORIES, EVOLUTION_AREAS } from "@/types";

const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    nickname: z.string().trim().min(1).max(40),
    timezone: z.string().trim().min(1).max(80),
    mainGoal: z.string().trim().min(10).max(600),
    goalReason: z.string().trim().min(3).max(600),
    deadline: z.string().date().optional(),
    availableMinutes: z.number().int().min(15).max(720),
    activeDays: z.array(weekdaySchema).min(1).max(7),
    schedule: z.string().trim().max(600),
    focusPeriod: z.enum(["manha", "tarde", "noite", "flexivel"]),
    skillLevel: z.enum(["iniciante", "intermediario", "avancado"]),
    energyLevel: z.enum(["baixa", "media", "alta"]),
    priorities: z.array(z.enum(CATEGORIES)).min(1).max(CATEGORIES.length),
    maxDailyTasks: z.number().int().min(2).max(5),
    intensity: z.enum(["leve", "equilibrado", "intenso"]),
    assistantTone: z.enum(["direto", "parceiro", "treinador"]),
    evolution: z
      .object({
        primaryAreas: z.array(z.enum(EVOLUTION_AREAS)).min(1).max(EVOLUTION_AREAS.length),
        secondaryAreas: z.array(z.enum(EVOLUTION_AREAS)).max(EVOLUTION_AREAS.length),
        customAreas: z.array(z.string().trim().min(2).max(60)).max(8),
        currentSituation: z.string().trim().max(800),
        desiredIdentity: z.string().trim().max(500),
        biggestObstacles: z.array(z.string().trim().min(2).max(120)).max(10),
        procrastinationTriggers: z.array(z.string().trim().min(2).max(120)).max(10),
        strengths: z.array(z.string().trim().min(2).max(120)).max(10),
        learningStyle: z.enum(["visual", "pratica", "leitura", "explicacao", "mista"]),
        accountabilityStyle: z.enum(["gentil", "direta", "competitiva", "analitica"]),
        sessionLength: z.union([z.literal(15), z.literal(25), z.literal(45), z.literal(60), z.literal(90)]),
        weeklyLearningMinutes: z.number().int().min(30).max(3000),
        challengeMode: z.enum(["desativado", "sutil", "equilibrado", "gamer", "operacao", "boss"]),
        wantsBossChallenges: z.boolean(),
        professorScope: z.enum(["especifico", "variedade", "depois"]),
        professorTopics: z.array(z.string().trim().min(2).max(120)).max(12),
        professorOutcome: z.string().trim().max(600),
      })
      .strict()
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const onboardingDraftSchema = profileSchema.partial();
