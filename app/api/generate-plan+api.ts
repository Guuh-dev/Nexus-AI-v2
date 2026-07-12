import { z } from "zod";
import { generatePlanWithOpenRouter } from "@/services/openrouter.server";
import { profileSchema } from "@/schemas/profile.schema";
import { storedTaskSchema } from "@/schemas/daily-plan.schema";
import type { PlanRequest, PlanResponse } from "@/types";
import { sanitizeText } from "@/utils/text";
import { validateUntrustedJson } from "@/utils/untrusted-data";

const MAX_BODY_BYTES = 24_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_GLOBAL_PER_DAY = 45;

const requestSchema = z
  .object({
    profile: profileSchema,
    date: z.string().date(),
    requestId: z.string().trim().min(8).max(120),
    clientId: z.string().trim().min(8).max(120),
    carryOver: z.array(storedTaskSchema).max(6).optional(),
    context: z.object({
      reason: z.string().trim().max(600).optional(),
      minutesRemaining: z.number().int().min(5).max(720).optional(),
      currentEnergy: z.enum(["baixa", "media", "alta"]).optional(),
      preserveTaskIds: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
      learning: z.object({
        topic: z.string().trim().min(2).max(160),
        nextLesson: z.string().trim().min(2).max(160),
        estimatedMinutes: z.number().int().min(5).max(180),
      }).strict().optional(),
    }).strict().optional(),
  })
  .strict();

type Bucket = { count: number; resetAt: number };
const clientBuckets = new Map<string, Bucket>();
let globalBucket: Bucket = { count: 0, resetAt: Date.now() + DAY_MS };
const idempotencyCache = new Map<string, { expiresAt: number; response: PlanResponse }>();
const inFlightPlans = new Map<string, Promise<PlanResponse>>();

function responseHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = origin === requestOrigin ? origin : null;
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("cf-connecting-ip") ?? forwarded ?? "native-client";
  const clientId = sanitizeText(request.headers.get("x-nexus-client-id"), 120);
  const agent = sanitizeText(request.headers.get("user-agent"), 80);
  return `${ip}:${clientId || agent}`;
}

function rateLimit(request: Request): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  if (now >= globalBucket.resetAt) globalBucket = { count: 0, resetAt: now + DAY_MS };
  if (globalBucket.count >= MAX_GLOBAL_PER_DAY) {
    return { allowed: false, retryAfter: Math.ceil((globalBucket.resetAt - now) / 1000) };
  }

  const key = clientKey(request);
  const current = clientBuckets.get(key);
  const bucket = !current || now >= current.resetAt ? { count: 0, resetAt: now + WINDOW_MS } : current;
  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  globalBucket.count += 1;
  clientBuckets.set(key, bucket);
  if (clientBuckets.size > 5000) {
    for (const [bucketKey, value] of clientBuckets) {
      if (value.resetAt <= now) clientBuckets.delete(bucketKey);
    }
  }
  if (idempotencyCache.size > 2000) {
    for (const [cacheKey, value] of idempotencyCache) {
      if (value.expiresAt <= now) idempotencyCache.delete(cacheKey);
    }
  }
  return { allowed: true };
}

function cached(cacheKey: string): PlanResponse | undefined {
  const now = Date.now();
  const value = idempotencyCache.get(cacheKey);
  if (!value) return undefined;
  if (value.expiresAt <= now) {
    idempotencyCache.delete(cacheKey);
    return undefined;
  }
  return value.response;
}

function upstreamStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
    message?: unknown;
  };
  for (const value of [candidate.status, candidate.statusCode, candidate.response?.status]) {
    if (typeof value === "number") return value;
  }
  if (typeof candidate.message === "string") {
    const match = candidate.message.match(/(?:STREAM_|status\D*)(400|401|402|429|500|502|503|529)\b/i);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json(request, { error: { code: "bad_request", message: "Solicitação muito grande." } }, 413);

  let rawBody = "";
  try {
    rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  } catch {
    return json(request, { error: { code: "bad_request", message: "Não foi possível ler a solicitação." } }, 400);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return json(request, { error: { code: "bad_request", message: "Envie um JSON válido." } }, 400);
  }
  const rawSafety = validateUntrustedJson(parsedBody, { maxDepth: 8, maxNodes: 1800, maxKeysPerObject: 120, maxArrayLength: 100 });
  if (!rawSafety.valid) return json(request, { error: { code: "bad_request", message: "A solicitação contém uma estrutura insegura." } }, 400);
  const validation = requestSchema.safeParse(parsedBody);
  if (!validation.success) return json(request, { error: { code: "bad_request", message: "Os dados do planejamento estão incompletos." } }, 400);

  const requestData = validation.data as PlanRequest;
  const headerClientId = sanitizeText(request.headers.get("x-nexus-client-id"), 120);
  if (headerClientId && headerClientId !== requestData.clientId) {
    return json(request, { error: { code: "bad_request", message: "Identificador do cliente inconsistente." } }, 400);
  }
  const requestCacheKey = `${requestData.clientId}:${requestData.requestId}`;
  const previous = cached(requestCacheKey);
  if (previous) return json(request, previous);

  const existingRequest = inFlightPlans.get(requestCacheKey);
  if (existingRequest) {
    try {
      return json(request, await existingRequest);
    } catch {
      return json(request, { error: { code: "provider_unavailable", message: "A inteligência está temporariamente indisponível." } }, 503);
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
  }
  const limit = rateLimit(request);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }),
      { status: 429, headers: { ...responseHeaders(request), "Retry-After": String(limit.retryAfter) } },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const generation = generatePlanWithOpenRouter(requestData, controller.signal).then((result) => ({
    plan: result.plan,
    ...(result.warning ? { warning: result.warning } : {}),
    meta: {
      model: result.model,
      ...(result.reasoningTokens !== undefined ? { reasoningTokens: result.reasoningTokens } : {}),
      repaired: result.repaired,
    },
  } satisfies PlanResponse));
  inFlightPlans.set(requestCacheKey, generation);
  try {
    const response = await generation;
    idempotencyCache.set(requestCacheKey, { expiresAt: Date.now() + WINDOW_MS, response });
    return json(request, response);
  } catch (error) {
    if (controller.signal.aborted) {
      return json(request, { error: { code: "timeout", message: "O planejamento demorou mais que o esperado. Tente novamente." } }, 504);
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "NEXUS_MISSING_OPENROUTER_KEY") {
      return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
    }
    const status = upstreamStatus(error);
    if (status === 401) return json(request, { error: { code: "unauthorized", message: "Não foi possível validar a inteligência do Nexus." } }, 401);
    if (status === 402) return json(request, { error: { code: "payment_required", message: "A cota da inteligência terminou. O plano local continua disponível." } }, 402);
    if (status === 429) return json(request, { error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }, 429);
    if (status === 400) return json(request, { error: { code: "bad_request", message: "A inteligência não conseguiu processar estes dados." } }, 400);
    return json(request, { error: { code: "provider_unavailable", message: "A inteligência está temporariamente indisponível." } }, 503);
  } finally {
    clearTimeout(timeout);
    inFlightPlans.delete(requestCacheKey);
  }
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...responseHeaders(request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Nexus-Request-Id, X-Nexus-Client-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
}
