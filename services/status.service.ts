import { z } from "zod";
import { fetchNexusApi } from "@/services/api-config";

export type IntelligenceStatus = { configured: boolean; primaryModel: string; fallback: string; apiVersion?: string; assistantAvailable?: boolean };
const intelligenceStatusSchema = z.object({
  configured: z.boolean(),
  primaryModel: z.string().trim().min(1).max(200),
  fallback: z.string().trim().min(1).max(200),
  apiVersion: z.string().trim().max(40).optional(),
  assistantAvailable: z.boolean().optional(),
}).strict();

export async function getIntelligenceStatus(signal?: AbortSignal): Promise<IntelligenceStatus | null> {
  try {
    const response = await fetchNexusApi("/api/status", { ...(signal ? { signal } : {}), headers: { Accept: "application/json" } });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return null;
    const parsed = intelligenceStatusSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const compatible = Boolean(parsed.data.apiVersion && /^2\.(?:[1-9]|\d{2,})(?:\.|$)/.test(parsed.data.apiVersion));
    return {
      ...parsed.data,
      assistantAvailable: compatible && parsed.data.assistantAvailable !== false,
    };
  } catch {
    return null;
  }
}
