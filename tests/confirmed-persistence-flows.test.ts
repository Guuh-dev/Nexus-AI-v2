import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe("confirmed product persistence flows", () => {
  const provider = readFileSync("providers/NexusProvider.tsx", "utf8");

  it("exposes confirmed mutations and implements them with commitConfirmed", () => {
    for (const contract of [
      /completeDiscovery: .*Promise<boolean>/,
      /addTask: .*Promise<boolean>/,
      /updateTask: .*Promise<boolean>/,
      /finishFocusSession: .*Promise<boolean>/,
      /renameThread: .*Promise<boolean>/,
      /deleteThread: .*Promise<boolean>/,
      /renameRoadmap: .*Promise<boolean>/,
      /deleteRoadmap: .*Promise<boolean>/,
    ]) {
      expect(provider).toMatch(contract);
    }

    for (const [start, end] of [
      ["const completeDiscovery", "const replanDay"],
      ["const finishFocusSession", "const createThread"],
      ["const renameThread", "const sendChatMessage"],
      ["const renameRoadmap", "const regenerateRoadmap"],
    ] as const) {
      expect(section(provider, start, end)).toContain("commitConfirmed");
    }

    const contextValue = section(provider, "const value = useMemo", "return <NexusContext.Provider");
    expect(contextValue).toMatch(/addTask: async[\s\S]*commitConfirmed/);
    expect(contextValue).toMatch(/updateTask: async[\s\S]*commitConfirmed/);
  });

  it("keeps the task editor open and busy until Today confirms persistence", () => {
    const editor = readFileSync("components/TaskEditor.tsx", "utf8");
    const today = readFileSync("app/(tabs)/today.tsx", "utf8");
    expect(editor).toContain("onSave: (value: TaskEditorValue) => Promise<boolean>");
    expect(editor).toContain("const saved = await onSave");
    expect(editor.indexOf("const saved = await onSave")).toBeLessThan(editor.indexOf("if (saved) onClose()"));
    expect(editor).toContain("loading={saving}");
    expect(today).toContain("const saveTask = async (value: TaskEditorValue): Promise<boolean>");
    expect(today).toMatch(/return updateTask\(editingTask\.id, value\)/);
    expect(today).toMatch(/return addTask\(value\)/);
  });

  it("clears the focus runtime and resets the UI only after a confirmed session", () => {
    const focus = readFileSync("app/(tabs)/focus.tsx", "utf8");
    const persistFlow = section(focus, "const persistFocusSession", "const saveSession");
    const resetFlow = section(focus, "const resetPersistedSession", "const persistFocusSession");
    expect(persistFlow).toContain("const persisted = await finishFocusSession");
    expect(persistFlow).toContain("if (!persisted)");
    expect(persistFlow.indexOf("if (!persisted)")).toBeLessThan(persistFlow.indexOf("return await resetPersistedSession()"));
    expect(resetFlow.indexOf("await clearFocusRuntime()" )).toBeLessThan(resetFlow.indexOf('setStatus("idle")'));
    expect(focus).toContain('loading={pendingAction === "cancel"}');
    expect(focus).toContain("Seu timer foi mantido; tente novamente.");
    expect(focus).toContain("sessionId: sessionId.current");
    expect(focus).toContain("id: sessionId.current");
    expect(provider).toContain("focusSessions.some((item) => item.id === session.id)");
  });

  it("navigates or closes destructive dialogs only after confirmed writes", () => {
    const discovery = readFileSync("app/discovery.tsx", "utf8");
    const brain = readFileSync("app/(tabs)/brain.tsx", "utf8");
    const roadmap = readFileSync("components/RoadmapCard.tsx", "utf8");
    expect(discovery.indexOf("await completeDiscovery")).toBeLessThan(discovery.indexOf("router.replace"));
    expect(discovery).toContain("loading={saving}");
    expect(brain).toMatch(/if \(await deleteThread[\s\S]*setDeleteTarget\(null\)/);
    expect(brain).toMatch(/if \(await renameThread[\s\S]*setRenameTarget\(null\)/);
    expect(roadmap).toMatch(/if \(await renameRoadmap[\s\S]*setDialog\(null\)/);
    expect(roadmap).toMatch(/if \(await deleteRoadmap[\s\S]*setDialog\(null\)/);
  });
});
