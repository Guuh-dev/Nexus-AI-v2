import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { AmbientSound, FocusMode } from "@/types";

const KEY = "@nexus-ai/focus-runtime";
const schema = z.object({
  taskId: z.string().max(120).optional(),
  taskTitle: z.string().min(1).max(120),
  duration: z.number().int().min(5).max(360),
  mode: z.enum(["pomodoro", "profundo", "fluxo", "sprint", "personalizado"]),
  intention: z.string().max(300),
  ambientSound: z.enum(["nenhum", "chuva", "floresta", "cafeteria", "ruido_marrom", "ruido_branco", "espaco"]),
  status: z.enum(["running", "paused"]),
  elapsedBase: z.number().int().min(0).max(86_400),
  runStartedAt: z.number().int().positive().nullable(),
  sessionStartedAt: z.string().datetime(),
}).strict();

export type FocusRuntime = z.infer<typeof schema>;

export async function saveFocusRuntime(runtime: FocusRuntime): Promise<void> {
  const parsed = schema.safeParse(runtime);
  if (!parsed.success) return;
  await AsyncStorage.setItem(KEY, JSON.stringify(parsed.data));
}

export async function loadFocusRuntime(): Promise<FocusRuntime | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) { await AsyncStorage.removeItem(KEY); return null; }
    return parsed.data;
  } catch { return null; }
}

export async function clearFocusRuntime(): Promise<void> { await AsyncStorage.removeItem(KEY); }

export type FocusSetup = { mode: FocusMode; ambientSound: AmbientSound; intention: string };
