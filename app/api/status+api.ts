import { FREE_ROUTER, PRIMARY_MODEL } from "@/constants/models";
import { probeOpenRouter } from "@/services/assistant.server";

const PROBE_COOLDOWN_MS = 12_000;
const probeBuckets = new Map<string, number>();

function baseStatus() {
  const paidFallback = process.env.OPENROUTER_ALLOW_PAID_FALLBACK === "true";
  return {
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    primaryModel: process.env.OPENROUTER_FAST_MODEL?.trim() || FREE_ROUTER,
    fallback: paidFallback ? `${PRIMARY_MODEL} → plano local` : "plano local",
    apiVersion: "2.3.1",
    assistantAvailable: Boolean(process.env.OPENROUTER_API_KEY),
    service: "nexus-ai-v2-1",
    capabilities: ["assistant", "professor", "roadmap", "planning", "local-fallback", "live-probe"],
    serverTime: new Date().toISOString(),
  };
}

function headers(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function clientKey(request: Request): string {
  return request.headers.get("x-nexus-client-id")?.slice(0, 120)
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

function probeErrorCode(error: unknown, aborted: boolean): string {
  if (aborted) return "timeout";
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (/401|unauthor|invalid.*key/i.test(text)) return "unauthorized";
  if (/402|payment|credit/i.test(text)) return "payment_required";
  if (/429|rate|overload|busy/i.test(text)) return "rate_limit";
  if (/timeout|abort|408|504|529/i.test(text)) return "timeout";
  return "provider_unavailable";
}

export function GET(): Response {
  return Response.json(baseStatus(), { headers: headers() });
}

export async function POST(request: Request): Promise<Response> {
  const status = baseStatus();
  if (!status.configured) {
    return Response.json({
      ...status,
      probe: { ok: false, errorCode: "missing_key", message: "OPENROUTER_API_KEY não está configurada no servidor publicado." },
    }, { status: 503, headers: headers() });
  }

  const key = clientKey(request);
  const now = Date.now();
  const lastProbe = probeBuckets.get(key) ?? 0;
  if (now - lastProbe < PROBE_COOLDOWN_MS) {
    return Response.json({
      ...status,
      probe: { ok: false, errorCode: "cooldown", message: "Aguarde alguns segundos antes de testar novamente." },
    }, { status: 429, headers: headers() });
  }
  probeBuckets.set(key, now);
  if (probeBuckets.size > 1000) {
    for (const [itemKey, timestamp] of probeBuckets) {
      if (now - timestamp > PROBE_COOLDOWN_MS * 4) probeBuckets.delete(itemKey);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const probe = await probeOpenRouter(controller.signal);
    return Response.json({
      ...status,
      assistantAvailable: true,
      probe: { ok: true, model: probe.model, latencyMs: probe.latencyMs, checkedAt: new Date().toISOString() },
    }, { headers: headers() });
  } catch (error) {
    const errorCode = probeErrorCode(error, controller.signal.aborted);
    return Response.json({
      ...status,
      assistantAvailable: false,
      probe: {
        ok: false,
        errorCode,
        message: errorCode === "unauthorized"
          ? "A chave foi recusada pelo OpenRouter."
          : errorCode === "rate_limit"
            ? "Os modelos gratuitos estão ocupados agora."
            : errorCode === "timeout"
              ? "O OpenRouter não respondeu dentro do limite do teste."
              : "O provedor remoto não respondeu ao teste.",
        checkedAt: new Date().toISOString(),
      },
    }, { status: errorCode === "unauthorized" ? 401 : errorCode === "rate_limit" ? 429 : 503, headers: headers() });
  } finally {
    clearTimeout(timeout);
  }
}
