import AsyncStorage from "@react-native-async-storage/async-storage";
import { focusRuntimeSchema, restoreRuntime, type FocusRuntime } from "@/features/focus/runtime";
export type { FocusRuntime } from "@/features/focus/runtime";
export type FocusSetup = Pick<FocusRuntime, "mode" | "ambientSound" | "intention">;
const KEY = "@nexus-ai/focus-runtime";
let epoch = 0;
export function focusRuntimeEpoch(): number { return epoch; }
let writeQueue: Promise<void> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const task = writeQueue.catch(() => undefined).then(operation);
  writeQueue = task.then(() => undefined, () => undefined);
  return task;
}
export function saveFocusRuntime(runtime: FocusRuntime): Promise<void> {
  const parsed = focusRuntimeSchema.parse(runtime);
  const expected = runtime.epoch ?? epoch;
  return enqueue(async () => { if (expected !== epoch) throw new Error("O estado foi substituído. Reabra Foco antes de continuar."); await AsyncStorage.setItem(KEY, JSON.stringify({ ...parsed, epoch })); });
}
export function loadFocusRuntime(): Promise<FocusRuntime | null> {
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    // Preserve malformed/future runtime for recovery rather than deleting it.
    const restored = { ...restoreRuntime(JSON.parse(raw) as unknown), epoch };
    await AsyncStorage.setItem(KEY, JSON.stringify(restored));
    return restored;
  });
}
export function clearFocusRuntime(): Promise<void> { epoch++; return enqueue(() => AsyncStorage.removeItem(KEY)); }
export function peekFocusRuntime(): Promise<FocusRuntime | null> {
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = focusRuntimeSchema.parse(JSON.parse(raw) as unknown);
    return parsed.sessionId ? { ...parsed, sessionId: parsed.sessionId } : null;
  });
}
