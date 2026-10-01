import { describe, expect, it, vi } from "vitest";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import { lessonMissionDraft } from "@/features/learning/mission";
import { makeAppData } from "@/tests/fixtures";
import { buildAssistantContext, compactAssistantContext } from "@/services/assistant.service";
import { confirmExecution } from "@/features/lock-in/planning";
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
describe("Atlas practical continuity", () => {
 it("keeps an actual nextLesson under compaction instead of silently discarding the roadmap", () => {
   const data = makeAppData(), roadmap = createStarterRoadmap("React aplicado ao Nexus", data.profile!);
   data.learning.roadmaps = [roadmap];data.learning.activeRoadmapId = roadmap.id;
   const built = buildAssistantContext(data, "professor");
   const compact = compactAssistantContext({ ...built, today: { title: "x".repeat(24000) } }, "professor");
   const result = (compact.roadmaps as { id: string; nextLesson: { id: string; title: string } }[])[0]!;
   expect(result.id).toBe(roadmap.id);expect(result.nextLesson.id).toBe(roadmap.phases[0]!.lessons[0]!.id);expect(result.nextLesson.title).toBeTruthy();
 });
 it("keeps a bound lesson instead of switching context when the roadmap advances", () => {
   const data = makeAppData(), roadmap = createStarterRoadmap("React", data.profile!);
   roadmap.phases[0]!.lessons[0]!.completed = true;
   data.learning.roadmaps = [roadmap];data.learning.activeRoadmapId = roadmap.id;
   const result = buildAssistantContext(data, "professor", undefined, roadmap.phases[0]!.lessons[0]!.id);
   expect(JSON.stringify(result.roadmaps)).toContain(roadmap.phases[0]!.lessons[0]!.id);
 });
 it("prepares the learning delivery as a proposal and allocates it only after confirmation", () => {
   const data = makeAppData();data.profile!.timezone="UTC";
   const roadmap = createStarterRoadmap("React no Nexus", data.profile!); data.learning.roadmaps=[roadmap];data.learning.activeRoadmapId=roadmap.id;
   const lesson=roadmap.phases[0]!.lessons[0]!; const now = new Date("2026-10-01T12:00:00Z");
   const draft = lessonMissionDraft(data, roadmap.id, lesson.id, now);
   expect(data.activePlan).toBeUndefined();expect(draft.lesson).toEqual({ roadmapId: roadmap.id, lessonId: lesson.id });expect(draft.windows).toBe("");
   const next = confirmExecution(data, { ...draft, name: "Gustavo", result: "Entregar o Nexus Lock-In", why: "Usar o produto", doneWhen: "Ciclo completo executado", windows: "12:00-14:00", acceptance: "Entrega demonstrada", step: 2 }, 0, now);
   expect(next.activePlan!.tasks[0]!.lesson).toEqual(draft.lesson);expect(next.activePlan!.totalEstimatedMinutes).toBe(lesson.estimatedMinutes);
   const repeated=lessonMissionDraft(next,roadmap.id,lesson.id,now);expect(repeated.taskIds).toEqual([next.activePlan!.tasks[0]!.id]);
 });
});
