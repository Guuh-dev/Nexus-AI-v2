import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ payloads: [] as Record<string, unknown>[], release: undefined as (() => void) | undefined, started: undefined as (() => void) | undefined, block: false }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@/services/focus-runtime.service", () => ({ peekFocusRuntime: async () => ({ status: "paused", elapsedBase: 600 }) }));
vi.mock("@/modules/nexus-widget/src/NexusWidgetModule", () => ({ default: {
  updateWidget: async (raw: string) => { if (state.block) { state.started?.(); await new Promise<void>((resolve) => { state.release = resolve; }); } state.payloads.push(JSON.parse(raw)); },
  listWidgetInstances: async () => "[]",
} }));
import { updateAndroidWidget } from "@/services/widget.service";
import { makeAppData } from "@/tests/fixtures";
beforeEach(() => { state.payloads = []; state.block = false; });
describe("widget sync ordering", () => {
 it("cannot republish sensitive content after a privacy change has been queued", async () => {
   const data = makeAppData();data.preferences.widget.privacyMode = false;
   const started = new Promise<void>((r) => { state.started = r; });state.block = true;
   const old = updateAndroidWidget(data);await started;
   const hidden = structuredClone(data);hidden.preferences.widget.privacyMode = true;
   const latest = updateAndroidWidget(hidden);state.block = false;state.release?.();
   await old;await latest;
   expect(state.payloads).toHaveLength(2);
   expect(state.payloads[0]).toMatchObject({ focusStatus: "paused", sessionMinutes: 10 });
   expect(state.payloads[1]).not.toHaveProperty("focusStatus");expect(state.payloads[1]).not.toHaveProperty("sessionMinutes");
   expect(state.payloads[1]).toMatchObject({ mainMission: "Missão protegida", tasks: [] });
 });
 it("skips a queued snapshot superseded before reaching native storage", async () => {
   const data = makeAppData();
   const first = updateAndroidWidget(data), last = updateAndroidWidget(data);
   expect((await first).updated).toBe(false);expect((await last).updated).toBe(true);expect(state.payloads).toHaveLength(1);
 });
});
