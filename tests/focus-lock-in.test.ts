import { describe, expect, it } from "vitest";
import { elapsedAt, restoreRuntime, stopRuntime, resumeRuntime, scheduledPauseAt, type FocusRuntime } from "@/features/focus/runtime";
import { applyFocusCompletion } from "@/features/focus/completion";
import { reviewDay, draftTomorrow, addEvidence, removeEvidence } from "@/features/lock-in/review";
import { makeAppData } from "@/tests/fixtures";
import { generateLocalPlan } from "@/services/planning.service";
const start = Date.parse("2026-10-01T12:00:00Z");
function runtime(): FocusRuntime { return { version: 2, sessionId: "session-stable", taskTitle: "Validar a retomada", duration: 5, mode: "profundo", intention: "Demonstrar a retomada", ambientSound: "nenhum", status: "running", elapsedBase: 0, runStartedAt: start, sessionStartedAt: new Date(start).toISOString(), segments: [], inbox: [], lastObservedAt: start }; }
describe("Lock-In focus and review", () => {
  it("pauses at the target until continuation is chosen, and always protects the window boundary", () => {
    const r = runtime();
    expect(scheduledPauseAt(r, start + 299000)).toBeUndefined();
    expect(scheduledPauseAt(r, start + 301000)).toBe(start + 300000);
    const resumed = resumeRuntime({ ...stopRuntime(r, "paused", start + 300000), targetAcknowledged: true }, start + 400000);
    expect(scheduledPauseAt(resumed, start + 900000)).toBeUndefined();
    expect(scheduledPauseAt(resumed, start + 900000, start + 850000)).toBe(start + 850000);
    expect(scheduledPauseAt(r, start + 301000, start + 240000)).toBe(start + 240000);
  });
  it("preserves actual work beyond the target and excludes pauses", () => {
    const paused = stopRuntime(runtime(), "paused", start + 600000);
    expect(paused.elapsedBase).toBe(600);
    expect(elapsedAt(paused, start + 3600000)).toBe(600);
    const resumed = resumeRuntime(paused, start + 3600000);
    const completed = stopRuntime(resumed, "completed", start + 3900000);
    expect(completed.elapsedBase).toBe(900);
    expect(completed.segments).toHaveLength(2);
  });
  it("restores only the checkpoint and asks for recovery instead of counting a gap", () => {
    const restored = restoreRuntime({ ...runtime(), lastObservedAt: start + 60000 });
    expect(restored.sessionId).toBe("session-stable");
    expect(restored.status).toBe("paused"); expect(restored.recovery).toBe(true);
    expect(elapsedAt(restored, start + 86400000)).toBe(60);
  });
  it("preserves a legacy known elapsed base without fabricating past segments", () => {
    const old = { ...runtime(), version: undefined, segments: undefined, lastObservedAt: undefined, elapsedBase: 123 };
    const restored = restoreRuntime(old);
    expect(restored.elapsedBase).toBe(123);
    expect(restored.segments?.every((s) => s.start === s.end)).toBe(true);
  });
  it("does not reward or record a completion twice, and preserves inbox and user evidence", () => {
    const current = makeAppData();
    const session = { id: "session-complete", taskTitle: "Retomar", plannedMinutes: 5, elapsedSeconds: 600, xp: 500, status: "completed" as const, startedAt: new Date(start).toISOString(), completedAt: new Date(start + 600000).toISOString(), reflection: "Teste executado após reiniciar", captures: [{ id: "idea", text: "Revisar depois", createdAt: new Date(start).toISOString() }] };
    const saved = applyFocusCompletion(current, session, false);
    expect(saved.progress.focusSessions).toHaveLength(1);
    expect(saved.progress.focusSessions[0]?.xp).toBeLessThan(500);
    expect(saved.lockIn.evidence?.[0]?.origin).toBe("user_reported");
    expect(applyFocusCompletion(saved, session, true)).toBe(saved);
    expect(saved.progress.focusSessions[0]?.captures).toEqual(session.captures);
  });
  it("keeps review unknown distinct from failure and makes a draft without authorizing tomorrow", () => {
    const current = makeAppData(); current.profile!.timezone = "UTC";
    current.activePlan = generateLocalPlan({ profile: current.profile!, date: "2026-10-01", requestId: "review", clientId: current.installationId });
    const reviewed = reviewDay(current, { outcome: "unknown", reason: "Não sei", nextAction: "Executar o teste" }, 0, new Date(start));
    expect(reviewed.activePlan).toBe(current.activePlan);
    expect(reviewed.lockIn.reviews?.[0]?.outcome).toBe("unknown");
    const tomorrow = draftTomorrow(reviewed, new Date(start));
    expect(tomorrow.activePlan).toBe(current.activePlan);
    expect(tomorrow.lockIn.tomorrow?.date).toBe("2026-10-02");
    expect(tomorrow.lockIn.tomorrow?.firstAction).toBe("Executar o teste");
    expect(tomorrow.lockIn.tomorrow?.source).toBe("offline");
    expect(() => reviewDay(reviewed, { outcome: "partial", reason: "", nextAction: "" }, 1, new Date(start))).toThrow(/mudou/);
  });
  it("removes textual contributions without erasing the recorded work or historical XP", () => {
    const saved = applyFocusCompletion(makeAppData(), { id: "delete-source", taskTitle: "Entrega", plannedMinutes: 5, elapsedSeconds: 300, xp: 1, status: "completed", startedAt: new Date(start).toISOString(), completedAt: new Date(start + 300000).toISOString(), reflection: "Meu relato privado de entrega" }, false);
    const next = removeEvidence(saved, "delete-source:evidence");
    expect(next.lockIn.evidence).toEqual([]);expect(next.progress.focusSessions[0]!.reflection).toBeUndefined();expect(next.progress.focusSessions[0]!.elapsedSeconds).toBe(300);expect(next.progress.totalXp).toBe(saved.progress.totalXp);
    expect(removeEvidence(next, "delete-source:evidence")).toBe(next);
  });
  it("rejects unsafe evidence links and makes evidence retries idempotent", () => {
    const data = makeAppData();
    const evidence = { id: "link", kind: "link" as const, origin: "user_reported" as const, text: "javascript:alert(1)", createdAt: new Date(start).toISOString() };
    expect(() => addEvidence(data, evidence)).toThrow();
    const valid = { ...evidence, text: "https://example.com/proof" };
    const next = addEvidence(data, valid);
    expect(addEvidence(next, valid)).toBe(next);
  });
});
