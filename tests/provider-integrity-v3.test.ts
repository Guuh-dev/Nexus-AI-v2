import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Provider v3 integrity gates", () => {
  const provider = readFileSync("providers/NexusProvider.tsx", "utf8");

  it("shows the reminder state the platform actually accepted", () => {
    const reconcileStart = provider.indexOf("async function reconcileDailyReminder");
    const reconcileEnd = provider.indexOf("function unlockAchievements", reconcileStart);
    const reconcile = provider.slice(reconcileStart, reconcileEnd);
    expect(reconcile).toContain("if (result.enabled === requested) return data");
    expect(reconcile).not.toContain("!result.supported");
    expect(reconcile).toContain("notificationEnabled: result.enabled");
  });

  it("never consumes widget actions before hydration or while storage is read-only", () => {
    const syncStart = provider.indexOf("const syncWidgetActions");
    const guard = provider.indexOf("if (stateReplacementInProgressRef.current || !hydratedRef.current || nexusRepository.readOnlyReason()) return", syncStart);
    const peek = provider.indexOf("peekAndroidWidgetActions()", syncStart);
    const commit = provider.indexOf("await commitConfirmed", peek);
    const acknowledge = provider.indexOf("acknowledgeAndroidWidgetActions", commit);
    expect(syncStart).toBeGreaterThanOrEqual(0);
    expect(guard).toBeGreaterThan(syncStart);
    expect(guard).toBeLessThan(peek);
    expect(peek).toBeLessThan(commit);
    expect(commit).toBeLessThan(acknowledge);
    expect(provider).toContain("widgetTaskActionsSatisfied(confirmed.data, batch.actions)");
    expect(provider).toContain('if (state === "active") void synchronizeActiveState()');
    expect(provider).toContain("const rollover = rolloverIfNeeded(previous)");
    expect(provider.match(/refreshDailyChallengesAt\(rollover\.data\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("preserves same-day evidence whenever a generated plan replaces the active plan", () => {
    expect(provider).toContain("activePlan: mergeSameDayPlanEvidence(current.activePlan, replacement)");
    expect(provider).toContain("activePlan: mergeSameDayPlanEvidence(latest.activePlan, response.plan)");
    expect(provider.match(/mergeSameDayPlanEvidence\(/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("coordinates reset with focus runtime, reminders and the serialized repository clear", () => {
    const resetStart = provider.indexOf("const resetAll");
    const resetEnd = provider.indexOf("const clearTemporary", resetStart);
    const reset = provider.slice(resetStart, resetEnd);
    expect(reset.indexOf("await beginStateReplacement()"))
      .toBeLessThan(reset.indexOf("await clearFocusRuntime()"));
    expect(reset.indexOf("await clearFocusRuntime()")).toBeLessThan(reset.indexOf("await nexusRepository.clearAll()"));
    expect(reset.indexOf("await configureDailyReminder(false")).toBeLessThan(reset.indexOf("await nexusRepository.clearAll()"));
    expect(reset).toContain("finishStateReplacement()");
  });

  it("quiesces in-flight AI before import or restore can publish replacement state", () => {
    const beginStart = provider.indexOf("const beginStateReplacement");
    const beginEnd = provider.indexOf("const finishStateReplacement", beginStart);
    const begin = provider.slice(beginStart, beginEnd);
    expect(begin).toContain('generationCancelReason.current = "recovery"');
    expect(begin.indexOf("generationController.current?.abort()"))
      .toBeLessThan(begin.indexOf("await Promise.allSettled"));
    expect(begin.indexOf("assistantController.current?.abort()"))
      .toBeLessThan(begin.indexOf("await Promise.allSettled"));
    expect(begin).toContain("const activeSync = activeSyncRef.current");
    expect(begin).toContain("activeSync ?? Promise.resolve()");

    const replaceStart = provider.indexOf("const replaceAppState");
    const replaceEnd = provider.indexOf("const inspectBackup", replaceStart);
    const replace = provider.slice(replaceStart, replaceEnd);
    expect(replace.indexOf("await beginStateReplacement()"))
      .toBeLessThan(replace.indexOf("await nexusRepository.save(reconciled)"));
    expect(replace.indexOf("reconcileDailyReminder(candidate)"))
      .toBeLessThan(replace.indexOf("await nexusRepository.save(reconciled)"));
    expect(replace.indexOf("await clearFocusRuntime()"))
      .toBeLessThan(replace.indexOf("dataRef.current = reconciled"));
    expect(replace.indexOf("const restoredPrevious = await reconcileDailyReminder(previous)"))
      .toBeLessThan(replace.indexOf("await nexusRepository.save(restoredPrevious)"));
    expect(replace).toContain("dataRef.current = restoredPrevious");
    expect(replace).toContain("updateAndroidWidget(restoredPrevious)");
    expect(provider).toContain("if (stateReplacementInProgressRef.current) return null");
    expect(provider).toContain("if (stateReplacementInProgressRef.current) return Promise.resolve(false)");
    expect(provider).toContain("if (stateReplacementInProgressRef.current || !hydratedRef.current) return Promise.resolve()");
    expect(provider.match(/stateReplacementInProgressRef\.current \|\| !batch\.actions\.length/g)?.length).toBe(1);
    expect(provider.match(/replaceAppState\((imported|restored),/g)?.length).toBe(3);
  });

  it("never leaves a cancelled streaming fragment looking like a saved answer", () => {
    const catchStart = provider.indexOf("const aborted = controller.signal.aborted");
    const catchEnd = provider.indexOf("} finally {", catchStart);
    const failureCleanup = provider.slice(catchStart, catchEnd);
    expect(catchStart).toBeGreaterThanOrEqual(0);
    expect(failureCleanup).toContain("filter((message) => message.id !== streamingMessageId)");
    expect(failureCleanup).toContain("message.id === userMessage.id ? { ...message, failed: true }");
    expect(failureCleanup).toContain("await commitConfirmed(markMessageForRetry)");
    expect(failureCleanup.indexOf("await commitConfirmed(markMessageForRetry)"))
      .toBeLessThan(failureCleanup.indexOf("if (!aborted)"));
    expect(failureCleanup).toContain("setData(safeState.data)");
  });

  it("keeps failed assistant task actions pending and distinguishes saved Atlas evidence", () => {
    expect(provider).toContain("O plano de hoje já tem cinco tarefas");
    expect(provider).toContain("withTask === current");
    expect(provider).toContain('type EvidenceSubmissionResult = "not_saved" | "saved_pending" | "reviewed"');
    expect(readFileSync("components/RoadmapCard.tsx", "utf8")).toContain('result === "saved_pending"');
  });

  it("only accepts a replan proposal after generation reports a persisted plan", () => {
    const actionStart = provider.indexOf('if (selected.type === "replan")');
    const actionEnd = provider.indexOf('if (selected.type === "create_task")', actionStart);
    const action = provider.slice(actionStart, actionEnd);
    expect(provider).toContain("generationPromise = useRef<Promise<boolean> | null>");
    expect(action).toContain("const replanned = await replanDay");
    expect(action.indexOf("if (!replanned)")).toBeLessThan(action.indexOf('"accepted"'));
  });

  it("keeps future captures editable, cancelable and rejects past dates", () => {
    expect(provider).toContain("capture.scheduledDate < today");
    expect(provider).toContain("rescheduleCapture");
    expect(provider).toContain("deleteScheduledCapture");
    const today = readFileSync("app/(tabs)/today.tsx", "utf8");
    expect(today).toContain("Capturas agendadas");
    expect(today).toContain("await rescheduleCapture");
    expect(today).toContain("await deleteScheduledCapture");
  });
});
