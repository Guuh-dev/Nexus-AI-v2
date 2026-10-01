import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ values: new Map<string, string>(), supported: true, failure: false, blocked: false, started: undefined as (() => void) | undefined, release: undefined as (() => void) | undefined }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@/modules/nexus-widget/src/NexusWidgetModule", () => ({ default: {
  journalSupported: async () => { if (state.failure) throw new Error("native failure"); return state.supported; },
  saveJournal: async (id: string, text: string) => { if (state.blocked) { state.started?.(); await new Promise<void>((resolve) => { state.release = resolve; }); } state.values.set(id, text); },
  readJournal: async (id: string) => state.values.get(id) ?? null,
  deleteJournal: async (id: string) => { state.values.delete(id); },
  clearJournal: async () => { state.values.clear(); },
} }));
import { clearJournalIfSupported, saveJournal, readJournal } from "@/services/journal.service";
beforeEach(async () => { state.failure = false; state.supported = true; state.blocked = false; await clearJournalIfSupported(); });
describe("protected journal ordering", () => {
  it("waits for an active save, clears it, and rejects older queued saves after reset", async () => {
    state.blocked = true;
    const started = new Promise<void>((resolve) => { state.started = resolve; });
    const first = saveJournal("entry-1", "private first"); await started;
    const stale = saveJournal("entry-2", "private queued");
    const rejected = expect(stale).rejects.toThrow(/substituído/);
    const clearing = clearJournalIfSupported();
    state.blocked = false; state.release?.();
    await first; await rejected; await clearing;
    expect(await readJournal("entry-1")).toBeNull();expect(state.values.size).toBe(0);
  });
  it("does not turn a native cleanup failure into a successful reset", async () => {
    await saveJournal("entry", "private data");state.failure = true;
    await expect(clearJournalIfSupported()).rejects.toThrow("native failure");
    expect(state.values.get("entry")).toBe("private data");
    state.failure = false;await clearJournalIfSupported();expect(state.values.size).toBe(0);
  });
  it("allows an older APK without journal support to reset its existing data", async () => {
    state.supported = false;await expect(clearJournalIfSupported()).resolves.toBeUndefined();
    await expect(saveJournal("entry", "private data")).rejects.toThrow(/Atualize/);
  });
});
