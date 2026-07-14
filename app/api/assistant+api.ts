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
const clientBuckets = new Map<string, { count: number; resetAt: number }>();
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
let globalBucket = { count: 0, resetAt: Date.now() + DAY_MS };
const cache = new Map<string, { expiresAt: number; fingerprint: string; response: AssistantResponse }>();
type RunningAssistant = {
  fingerprint: string;
  promise: Promise<AssistantResponse>;
  deltas: string[];
  subscribers: Set<(delta: string) => void>;
};
const inFlight = new Map<string, RunningAssistant>();

const requestSchema = z.object({
  mode: z.enum([
    "brain",
    "professor",
    "roadmap",
    "capture",
    "weekly_review",
    "evidence_review",
  ]),
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

function sseHeaders(request: Request): HeadersInit {
  return {
    ...headers(request),
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, max-age=0",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

function streamEvent(type: string, body: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(body)}\n\n`);
}

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") ?? forwarded ?? "native";
}

function consumeBucket(
  collection: Map<string, { count: number; resetAt: number }>,
  bucketKey: string,
  maximum: number,
  now: number,
): boolean {
  const current = collection.get(bucketKey);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;
  if (bucket.count >= maximum) return false;
  bucket.count += 1;
  collection.set(bucketKey, bucket);
  return true;
}

function allow(request: Request, clientId: string): boolean {
  const now = Date.now();
  if (now >= globalBucket.resetAt) globalBucket = { count: 0, resetAt: now + DAY_MS };
  if (globalBucket.count >= MAX_GLOBAL_PER_DAY) return false;
  const ip = requestIp(request);
  if (!consumeBucket(ipBuckets, ip, 60, now)) return false;
  if (!consumeBucket(clientBuckets, `${ip}:${clientId}`, MAX_PER_WINDOW, now)) return false;
  globalBucket.count += 1;
  for (const collection of [clientBuckets, ipBuckets]) {
    if (collection.size > 5000) {
      for (const [itemKey, item] of collection) if (item.resetAt <= now) collection.delete(itemKey);
    }
  }
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

function requestFingerprint(data: AssistantRequest): string {
  return JSON.stringify(data);
}

function startAssistant(
  cacheKey: string,
  fingerprint: string,
  data: AssistantRequest,
): RunningAssistant {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 32_000);
  const deltas: string[] = [];
  const subscribers = new Set<(delta: string) => void>();
  let operation!: RunningAssistant;
  const promise = runAssistant(data, controller.signal, (delta) => {
    if (!delta || controller.signal.aborted) return;
    deltas.push(delta);
    for (const subscriber of subscribers) subscriber(delta);
  }).then((response) => {
    cache.set(cacheKey, {
      expiresAt: Date.now() + WINDOW_MS,
      fingerprint,
      response,
    });
    return response;
  }).catch((error: unknown) => {
    if (controller.signal.aborted) {
      const timeoutError = new Error("OPENROUTER_STREAM_504");
      Object.assign(timeoutError, { status: 504 });
      throw timeoutError;
    }
    throw error;
  }).finally(() => {
    clearTimeout(timeout);
    if (inFlight.get(cacheKey) === operation) inFlight.delete(cacheKey);
  });
  operation = { fingerprint, promise, deltas, subscribers };
  inFlight.set(cacheKey, operation);
  return operation;
}

function streamError(error: unknown): { code: string; message: string } {
  const status = statusFromError(error);
  const code = status === 401 ? "unauthorized"
    : status === 402 ? "payment_required"
      : status === 429 ? "rate_limit"
        : [408, 425, 504, 529].includes(status) ? "timeout"
          : "provider_unavailable";
  return {
    code,
    message: code === "timeout"
      ? "A IA demorou mais que o esperado."
      : "A inteligência está temporariamente indisponível.",
  };
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
  const fingerprint = requestFingerprint(data);
  const contextSafety = validateUntrustedJson(data.context, { maxDepth: 8, maxNodes: 2500, maxKeysPerObject: 140, maxArrayLength: 500 });
  if (!contextSafety.valid) return json(request, { error: { code: "bad_request", message: "O contexto enviado é complexo ou inseguro demais." } }, 400);
  const existing = cache.get(requestCacheKey);
  if (existing && existing.expiresAt > Date.now()) {
    if (existing.fingerprint !== fingerprint) return json(request, { error: { code: "request_conflict", message: "Este identificador já foi usado por outra solicitação." } }, 409);
    return json(request, existing.response);
  }
  const running = inFlight.get(requestCacheKey);
  if (running && running.fingerprint !== fingerprint) {
    return json(request, { error: { code: "request_conflict", message: "Este identificador já está processando outra solicitação." } }, 409);
  }
  if (!running) {
    if (!process.env.OPENROUTER_API_KEY) return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
    if (!allow(request, data.clientId)) return json(request, { error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }, 429);
    if (inFlight.size >= 24) return json(request, { error: { code: "provider_busy", message: "O Nexus está processando muitas solicitações. Tente novamente em instantes." } }, 503);
  }
  const operation = running ?? startAssistant(requestCacheKey, fingerprint, data);

  const wantsStream = request.headers.get("accept")?.includes("text/event-stream") === true
    && (data.mode === "brain" || data.mode === "professor");
  if (wantsStream) {
    let closed = false;
    let unsubscribe: () => void = () => undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const publish = (delta: string) => {
          if (!closed) streamController.enqueue(streamEvent("delta", { delta }));
        };
        operation.subscribers.add(publish);
        unsubscribe = () => operation.subscribers.delete(publish);
        streamController.enqueue(streamEvent("ready", { requestId: data.requestId }));
        for (const delta of operation.deltas) publish(delta);
        void (async () => {
          try {
            const response = await operation.promise;
            if (!closed) streamController.enqueue(streamEvent("result", response));
          } catch (error) {
            if (!closed) streamController.enqueue(streamEvent("error", { error: streamError(error) }));
          } finally {
            unsubscribe();
            if (!closed) streamController.close();
          }
        })();
      },
      cancel() {
        closed = true;
        unsubscribe();
      },
    });
    return new Response(stream, { status: 200, headers: sseHeaders(request) });
  }

  try {
    return json(request, await operation.promise);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXUS_MISSING_OPENROUTER_KEY") return json(request, { error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }, 503);
    const status = statusFromError(error);
    if (status === 401) return json(request, { error: { code: "unauthorized", message: "Não foi possível validar a inteligência do Nexus." } }, 401);
    if (status === 402) return json(request, { error: { code: "payment_required", message: "A cota da inteligência terminou. Tente novamente mais tarde." } }, 402);
    if (status === 429) return json(request, { error: { code: "rate_limit", message: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes." } }, 429);
    if ([408, 425, 504, 529].includes(status)) return json(request, { error: { code: "timeout", message: "O provedor remoto demorou ou está temporariamente sobrecarregado." } }, 504);
    return json(request, { error: { code: "provider_unavailable", message: "A inteligência está temporariamente indisponível." } }, 503);
  }
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: { ...headers(request), "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Accept, Content-Type, X-Nexus-Client-Id", "Access-Control-Max-Age": "86400" } });
}
