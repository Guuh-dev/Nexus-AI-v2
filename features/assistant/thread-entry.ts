import { nextRoadmapLesson } from "@/features/learning/roadmap";
import type { AppData, ChatKind, ChatThread } from "@/types";
/** Continuing an approved existing lesson is distinct from diagnosing a new goal. */
export function threadEntry(data: AppData, kind: ChatKind, continueLesson = false): Pick<ChatThread, "roadmapId" | "lessonId" | "consultation"> {
  const roadmap = kind === "professor" && continueLesson ? data.learning.roadmaps.find(r => r.id === data.learning.activeRoadmapId && r.status !== "archived") : undefined;
  const lesson = roadmap ? nextRoadmapLesson(roadmap) : undefined;
  if (roadmap && lesson) return { roadmapId: roadmap.id, lessonId: lesson.id };
  return { consultation: { stage: "understanding", revision: 0 } };
}
