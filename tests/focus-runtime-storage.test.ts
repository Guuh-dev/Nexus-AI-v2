import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ values: new Map<string, string>(), blocked: false, release: null as (() => void) | null, started: null as (() => void) | null }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (key: string) => state.values.get(key) ?? null, setItem: async (key: string, value: string) => { if (state.blocked) { state.started?.(); await new Promise<void>((resolve) => { state.release = resolve; }); } state.values.set(key, value); }, removeItem: async (key: string) => { state.values.delete(key); } } }));
import { clearFocusRuntime, saveFocusRuntime, loadFocusRuntime, focusRuntimeEpoch } from "@/services/focus-runtime.service";
import type { FocusRuntime } from "@/features/focus/runtime";
const runtime = (): FocusRuntime => ({ epoch: focusRuntimeEpoch(), version: 2, sessionId: "stable", taskTitle: "Entrega", duration: 5, mode: "profundo", intention: "", ambientSound: "nenhum", status: "paused", elapsedBase: 90, runStartedAt: null, sessionStartedAt: "2026-10-01T12:00:00Z" });
beforeEach(async () => { state.blocked = false; state.values.clear(); await clearFocusRuntime(); });
describe("focus storage ordering", () => {
  it("rejects stale runtime writes after reset/import and cannot resurrect the session", async () => {
    const old = runtime();
    state.blocked = true;
    const started = new Promise<void>((resolve) => { state.started = resolve; });
    const saving = saveFocusRuntime(old);
    await started;
    const clearing = clearFocusRuntime();
    state.blocked = false; state.release?.();
    await saving; await clearing;
    await expect(saveFocusRuntime(old)).rejects.toThrow(/substituído/);
    expect(await loadFocusRuntime()).toBeNull();
  });
  it("preserves malformed or future runtime rather than deleting evidence", async () => {
    const raw = JSON.stringify({ ...runtime(), version: 99 });
    state.values.set("@nexus-ai/focus-runtime", raw);
    await expect(loadFocusRuntime()).rejects.toThrow();
    expect(state.values.get("@nexus-ai/focus-runtime")).toBe(raw);
  });
});
