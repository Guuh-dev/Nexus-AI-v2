import { z } from "zod";

export type IntelligenceStatus = { configured: boolean; primaryModel: string; fallback: string };
const intelligenceStatusSchema = z.object({
  configured: z.boolean(),
  primaryModel: z.string().trim().min(1).max(200),
  fallback: z.string().trim().min(1).max(200),
}).strict();

export async function getIntelligenceStatus(signal?: AbortSignal): Promise<IntelligenceStatus | null> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  const url = base ? `${base}/api/status` : "/api/status";
  try {
    const response = await fetch(url, { ...(signal ? { signal } : {}), headers: { Accept: "application/json" } });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return null;
    const parsed = intelligenceStatusSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
