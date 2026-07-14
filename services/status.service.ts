import { z } from "zod";
import { fetchNexusApi } from "@/services/api-config";

export type IntelligenceStatus = {
  configured: boolean;
  primaryModel: string;
  fallback: string;
  apiVersion?: string;
  assistantAvailable?: boolean;
  service?: string;
  capabilities?: string[];
  endpoint?: string;
  latencyMs?: number;
  checkedAt?: string;
  reachable?: boolean;
  errorCode?: string;
  probeOk?: boolean;
  probeModel?: string;
  probeLatencyMs?: number;
  probeMessage?: string;
};

const probeSchema = z.object({
  ok: z.boolean(),
  model: z.string().trim().max(200).optional(),
  latencyMs: z.number().int().nonnegative().max(120_000).optional(),
  checkedAt: z.string().trim().max(80).optional(),
  errorCode: z.string().trim().max(80).optional(),
  message: z.string().trim().max(300).optional(),
}).strict();

const intelligenceStatusSchema = z.object({
  configured: z.boolean(),
  primaryModel: z.string().trim().min(1).max(200),
  fallback: z.string().trim().min(1).max(200),
  apiVersion: z.string().trim().max(40).optional(),
  assistantAvailable: z.boolean().optional(),
  service: z.string().trim().max(100).optional(),
  capabilities: z.array(z.string().trim().max(80)).max(20).optional(),
  serverTime: z.string().trim().max(80).optional(),
  probe: probeSchema.optional(),
}).strict();

export async function getIntelligenceStatus(signal?: AbortSignal, deep = false): Promise<IntelligenceStatus | null> {
  const startedAt = Date.now();
  try {
    const response = await fetchNexusApi("/api/status", {
      method: deep ? "POST" : "GET",
      ...(signal ? { signal } : {}),
      headers: { Accept: "application/json" },
    });
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) return null;
    const parsed = intelligenceStatusSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const compatible = Boolean(
      parsed.data.apiVersion && /^3\.\d+(?:\.|$)/.test(parsed.data.apiVersion),
    );
    const probe = parsed.data.probe;
    return {
      configured: parsed.data.configured,
      primaryModel: parsed.data.primaryModel,
      fallback: parsed.data.fallback,
      ...(parsed.data.apiVersion ? { apiVersion: parsed.data.apiVersion } : {}),
      ...(parsed.data.service ? { service: parsed.data.service } : {}),
      ...(parsed.data.capabilities ? { capabilities: parsed.data.capabilities } : {}),
      assistantAvailable: compatible && parsed.data.assistantAvailable !== false && (!deep || probe?.ok === true),
      endpoint: response.url || undefined,
      latencyMs: Date.now() - startedAt,
      checkedAt: probe?.checkedAt ?? new Date().toISOString(),
      reachable: true,
      ...(probe ? {
        probeOk: probe.ok,
        ...(probe.model ? { probeModel: probe.model } : {}),
        ...(probe.latencyMs !== undefined ? { probeLatencyMs: probe.latencyMs } : {}),
        ...(probe.message ? { probeMessage: probe.message } : {}),
      } : {}),
      ...(!compatible ? { errorCode: "incompatible_backend" } : probe?.errorCode ? { errorCode: probe.errorCode } : !response.ok ? { errorCode: `http_${response.status}` } : {}),
    };
  } catch {
    return null;
  }
}
