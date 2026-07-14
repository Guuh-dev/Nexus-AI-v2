import {
  assistantModelOrder,
  probeOpenRouter,
} from "@/services/assistant.server";

const PROBE_COOLDOWN_MS = 12_000;
const GLOBAL_PROBE_WINDOW_MS = 60_000;
const MAX_GLOBAL_PROBES_PER_WINDOW = 6;
const probeBuckets = new Map<string, number>();
let globalProbeBucket = {
  count: 0,
  resetAt: Date.now() + GLOBAL_PROBE_WINDOW_MS,
};

function baseStatus() {
  const brainModels = assistantModelOrder("brain");
  const coreModes = [
    "brain",
    "professor",
    "roadmap",
    "weekly_review",
    "evidence_review",
  ] as const;
  const routingReady = coreModes.every(
    (mode) => assistantModelOrder(mode).length >= 2,
  );
  const configured = Boolean(process.env.OPENROUTER_API_KEY);
  return {
    configured,
    primaryModel: brainModels[0] ?? "sem-modelo-compativel",
    fallback: brainModels[1] ?? "sem-modelo-alternativo",
    apiVersion: "3.0.0",
    assistantAvailable: configured && routingReady,
    service: "nexus-ai-v3",
    capabilities: [
      "capability-routing",
      "assistant",
      "professor",
      "roadmap",
      "weekly-review",
      "validated-streaming",
      "live-probe",
    ],
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

export function statusProbeClientKey(request: Request): string {
  const key = request.headers.get("cf-connecting-ip")
    || request.headers.get("fly-client-ip")
    || request.headers.get("true-client-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown-client";
  return key.slice(0, 120);
}

function consumeGlobalProbe(now: number): boolean {
  if (now >= globalProbeBucket.resetAt) {
    globalProbeBucket = {
      count: 0,
      resetAt: now + GLOBAL_PROBE_WINDOW_MS,
    };
  }
  if (globalProbeBucket.count >= MAX_GLOBAL_PROBES_PER_WINDOW) return false;
  globalProbeBucket.count += 1;
  return true;
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
      assistantAvailable: false,
      probe: { ok: false, errorCode: "missing_key", message: "A credencial do provedor não está configurada no servidor publicado." },
    }, { status: 503, headers: headers() });
  }

  const key = statusProbeClientKey(request);
  const now = Date.now();
  const lastProbe = probeBuckets.get(key) ?? 0;
  if (now - lastProbe < PROBE_COOLDOWN_MS) {
    return Response.json({
      ...status,
      probe: { ok: false, errorCode: "cooldown", message: "Aguarde alguns segundos antes de testar novamente." },
    }, { status: 429, headers: headers() });
  }
  if (!consumeGlobalProbe(now)) {
    return Response.json({
      ...status,
      probe: { ok: false, errorCode: "global_cooldown", message: "O teste ao vivo atingiu o limite global. Tente novamente em instantes." },
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
            ? "Os modelos compatíveis estão ocupados agora."
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
