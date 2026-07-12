import { z } from "zod";
import { profileSchema } from "@/schemas/profile.schema";
import { runAssistant } from "@/services/assistant.server";
import type { AssistantRequest, AssistantResponse } from "@/types";
import { validateUntrustedJson } from "@/utils/untrusted-data";
import { sanitizeText } from "@/utils/text";

const MAX_BODY_BYTES = 48_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_GLOBAL_PER_DAY = 250;
const buckets = new Map<string, { count: number; resetAt: number }>();
let globalBucket = { count: 0, resetAt: Date.now() + DAY_MS };
const cache = new Map<string, { expiresAt: number; response: AssistantResponse }>();
const inFlight = new Map<string, Promise<AssistantResponse>>();

const requestSchema = z.object({
  mode: z.enum(["brain", "professor", "roadmap", "capture", "weekly_review"]),
  requestId: z.string().trim().min(8).max(120),
  clientId: z.string().trim().min(8).max(120),
  message: z.string().trim().min(1).max(4000),
  profile: profileSchema,
  context: z.record(z.string(), z.unknown()),
}).strict();

function headers(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const own = new URL(request.url).origin;
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
    ...(origin === own ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

function key(request: Request, clientId: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${request.headers.get("cf-connecting-ip") ?? forwarded ?? "native"}:${clientId}`;
}

function allow(request: Request, clientId: string): boolean {
  const now = Date.now();
  if (now >= globalBucket.resetAt) globalBucket = { count: 0, resetAt: now + DAY_MS };
  if (globalBucket.count >= MAX_GLOBAL_PER_DAY) return false;
  const bucketKey = key(request, clientId);
  const current = buckets.get(bucketKey);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count += 1;
  globalBucket.count += 1;
  buckets.set(bucketKey, bucket);
  if (buckets.size > 5000) for (const [itemKey, item] of buckets) if (item.resetAt <= now) buckets.delete(itemKey);
  if (cache.size > 2000) for (const [requestId, item] of cache) if (item.expiresAt <= now) cache.delete(requestId);
  return true;
}

function statusFromError(error: unknown): number {
  if (!error || typeof error !== "object") return 503;
  const value = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  if (typeof value.status === "number") return value.status;
  if (typeof value.statusCode === "number") return value.statusCode;
  if (typeof value.message === "string") {
    const match = value.message.match(/(?:STREAM_|status\D*)(400|401|402|408|425|429|500|502|503|504|529)\b/i);
    if (match?.[1]) return Number(match[1]);
  }
  return 503;
}

export async function POST(request: Request): Promise<Response> {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_BODY_BYTES) return json(request, { error: { code: "bad_request", message: "Solicitação muito grande." } }, 413);
  let raw = "";
  try {
    raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new Error("too_large");
  } catch {
    return json(request, { error: { code: "bad_request", message: "Não foi possível ler a solicitação." } }, 400);
  }
  let body: unknown;
  try { body = JSON.parse(raw) as unknown; } catch { return json(request, { error: { code: "bad_request", message: "Envie JSON válido." } }, 400); }
  const rawSafety = validateUntrustedJson(body, { maxDepth: 10, maxNodes: 3000, maxKeysPerObject: 160, maxArrayLength: 600 });
  if (!rawSafety.valid) return json(request, { error: { code: "bad_request", message: "A solicitação contém uma estrutura insegura." } }, 400);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(request, { error: { code: "bad_request", message: "Os dados do Nexus Brain estão incompletos." } }, 400);
  const data = parsed.data as AssistantRequest;
  const headerClientId = sanitizeText(request.headers.get("x-nexus-client-id"), 120);
  if (headerClientId && headerClientId !== data.clientId) {
    return json(request, { error: { code: "bad_request", message: "Identificador do cliente inconsistente." } }, 400);
  }
  const requestCacheKey = `${data.clientId}:${data.requestId}`;
  const contextSafety = validateUntrustedJson(data.context, { maxDepth: 8, maxNodes: 2500, maxKeysPerObject: 140, maxArrayLength: 500 });
  if (!contextSafety.valid) return json(request, { error: { code: "bad_request", message: "O contexto enviado é complexo ou inseguro demais." } }, 400);
  const existing = cache.get(requestCacheKey);
  if (existing && existing.expiresAt > Date.now()) return json(request, existing.response);
  const running = inFlight.get(requestCacheKey);
  if (running) {
    try { return json(request, await running); } catch { return json(request, { error: { code: "provider_unavailable", message: "A inteligência está temporariamente indisponível." } }, 503); }
  }
  if (!process.env.OPENROUTER_API_KEY) return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
  if (!allow(request, data.clientId)) return json(request, { error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }, 429);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 32_000);
  const promise = runAssistant(data, controller.signal);
  inFlight.set(requestCacheKey, promise);
  try {
    const response = await promise;
    cache.set(requestCacheKey, { expiresAt: Date.now() + WINDOW_MS, response });
    return json(request, response);
  } catch (error) {
    if (controller.signal.aborted) return json(request, { error: { code: "timeout", message: "O Nexus demorou mais que o esperado. Tente novamente." } }, 504);
    if (error instanceof Error && error.message === "NEXUS_MISSING_OPENROUTER_KEY") return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
    const status = statusFromError(error);
    if (status === 401) return json(request, { error: { code: "unauthorized", message: "Não foi possível validar a inteligência do Nexus." } }, 401);
    if (status === 402) return json(request, { error: { code: "payment_required", message: "A cota da inteligência terminou. O modo local continua disponível." } }, 402);
    if (status === 429) return json(request, { error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }, 429);
    if ([408, 425, 504, 529].includes(status)) return json(request, { error: { code: "timeout", message: "O provedor remoto demorou ou está temporariamente sobrecarregado." } }, 504);
    return json(request, { error: { code: "provider_unavailable", message: "A inteligência está temporariamente indisponível." } }, 503);
  } finally {
    clearTimeout(timeout);
    inFlight.delete(requestCacheKey);
  }
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: { ...headers(request), "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Nexus-Client-Id", "Access-Control-Max-Age": "86400" } });
}
