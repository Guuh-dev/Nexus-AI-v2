import { EVOLUTION_AREA_LABELS } from "@/features/learning/roadmap";
import { refreshDailyChallengesAt } from "@/features/progress/challenges";
import type { AppData, ChatThread, Profile } from "@/types";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";

// Pure state transitions used by NexusProvider. None of them persist; the
// Provider commits their results through the serialized repository queue.

export function unlockAchievements(data: AppData): AppData {
  let next = refreshDailyChallengesAt(data);
  const existing = new Set(next.progress.achievements.map((item) => item.id));
  const completedTasks = next.history.reduce((total, day) => total + day.completedTasks, 0) + (next.activePlan?.tasks.filter((task) => task.completed).length ?? 0);
  const focusMinutes = Math.floor(next.progress.focusSessions.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const completedLessons = next.learning.roadmaps.flatMap((roadmap) => roadmap.phases).flatMap((phase) => phase.lessons).filter((lesson) => lesson.completed).length;
  const candidates = [
    completedTasks >= 1 ? { id: "first-task", title: "Primeiro movimento", description: "Concluiu a primeira tarefa.", icon: "◆" } : null,
    completedTasks >= 10 ? { id: "ten-tasks", title: "Executor em formação", description: "Concluiu 10 tarefas.", icon: "⚡" } : null,
    focusMinutes >= 25 ? { id: "focus-25", title: "Foco travado", description: "Completou 25 minutos de foco.", icon: "◉" } : null,
    focusMinutes >= 500 ? { id: "focus-500", title: "Mente de aço", description: "Acumulou 500 minutos de foco.", icon: "◎" } : null,
    next.progress.currentStreak >= 3 ? { id: "streak-3", title: "Sequência iniciada", description: "Manteve três dias produtivos.", icon: "♨" } : null,
    completedLessons >= 5 ? { id: "student-5", title: "Aprendiz deliberado", description: "Concluiu cinco lições do Professor Atlas.", icon: "◇" } : null,
  ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const additions = candidates.filter((candidate) => !existing.has(candidate.id)).map((candidate) => ({ ...candidate, unlockedAt: new Date().toISOString() }));
  if (!additions.length) return next;
  next = { ...next, progress: { ...next.progress, achievements: [...next.progress.achievements, ...additions] } };
  return next;
}

export function initializeProfessor(data: AppData, profile: Profile): AppData {
  const evolution = profile.evolution;
  if (!evolution || evolution.professorScope === "depois") return data;
  const areaTopics = evolution.primaryAreas.map((area) => EVOLUTION_AREA_LABELS[area]);
  const topics = (evolution.professorTopics.length ? evolution.professorTopics : areaTopics).slice(0, evolution.professorScope === "especifico" ? 1 : 4);
  const existing = new Set(data.learning.roadmaps.map((roadmap) => roadmap.topic.toLocaleLowerCase("pt-BR")));
  const pendingTopics = [...data.learning.pendingTopics, ...topics]
    .map((topic) => sanitizeText(topic, 160))
    .filter((topic) => topic.length >= 2 && !existing.has(topic.toLocaleLowerCase("pt-BR")))
    .filter((topic, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase("pt-BR") === topic.toLocaleLowerCase("pt-BR")) === index)
    .slice(0, 24);
  if (!pendingTopics.length && data.learning.professorEnabled) return data;
  const now = new Date().toISOString();
  const professorThread = data.brain.threads.find((thread) => thread.kind === "professor" && !thread.archived);
  const thread: ChatThread = professorThread ?? {
    id: createId("professor-chat"), kind: "professor", title: "Professor Atlas", summary: "", createdAt: now, updatedAt: now, archived: false,
    messages: [{ id: createId("message"), role: "assistant", content: `Eu sou o Professor Atlas, parceiro do Nexus. Antes de montar seu roadmap${topics.length ? ` de ${topics.join(", ")}` : ""}, vou descobrir o que você já sabe, o que tentou e qual resultado provará seu domínio. Depois ajustarei a trilha conforme você aprende — sem pular fundamentos.`, createdAt: now }],
  };
  return {
    ...data,
    brain: {
      ...data.brain,
      threads: professorThread ? data.brain.threads : [thread, ...data.brain.threads],
      activeProfessorThreadId: thread.id,
    },
    learning: { ...data.learning, professorEnabled: true, pendingTopics },
  };
}

export function threadTitle(content: string): string {
  const cleaned = sanitizeText(content, 80);
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}...` : cleaned || "Nova conversa";
}

export function compactThreadSummary(thread: ChatThread, nextContent: string): string {
  if (thread.messages.length < 36) return thread.summary;
  const older = thread.messages.slice(0, Math.max(0, thread.messages.length - 30));
  const additions = older.slice(-12).map((message) => `${message.role === "user" ? "Usuário" : "Nexus"}: ${sanitizeText(message.content, 240)}`).join("\n");
  return sanitizeText(`${thread.summary}\n${additions}\nÚltima continuidade: ${sanitizeText(nextContent, 240)}`, 6000);
}

export function setAssistantActionStatus(
  data: AppData,
  threadId: string,
  actionId: string,
  status: "accepted" | "rejected",
): AppData {
  return {
    ...data,
    brain: {
      ...data.brain,
      threads: data.brain.threads.map((thread) => thread.id === threadId
        ? {
            ...thread,
            messages: thread.messages.map((message) => ({
              ...message,
              actions: message.actions?.map((action) => action.id === actionId
                ? { ...action, status }
                : action),
            })),
          }
        : thread),
    },
  };
}
