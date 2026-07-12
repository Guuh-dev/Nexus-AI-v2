const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);
const RECOVERABLE_BACKEND_STATUSES = new Set([404, 405, 502, 503, 504]);

export type NexusApiErrorCode = "unreachable" | "incompatible" | "invalid_url";

export class NexusApiError extends Error {
  constructor(
    public readonly code: NexusApiErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NexusApiError";
  }
}

export function normalizeApiBase(value: string | undefined): string | null {
  const candidate = value?.trim().replace(/\/+$/, "");
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ALLOWED_LOCAL_HOSTS.has(url.hostname))) {
      return null;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function apiCandidates(path: `/api/${string}`): string[] {
  const configured = normalizeApiBase(process.env.EXPO_PUBLIC_API_URL);
  const environmentFallback = normalizeApiBase(process.env.EXPO_PUBLIC_API_FALLBACK_URL);
  const urls = [
    configured ? `${configured}${path}` : null,
    environmentFallback ? `${environmentFallback}${path}` : null,
  ];

  // On web, same-origin API routes are the most reliable recovery path when a
  // configured Render URL still points to an older deployment.
  if (typeof window !== "undefined") urls.push(path);
  if (!configured && typeof window === "undefined") urls.push(path);

  return urls.filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
}

export async function fetchNexusApi(
  path: `/api/${string}`,
  init: RequestInit,
): Promise<Response> {
  const candidates = apiCandidates(path);
  if (!candidates.length) {
    throw new NexusApiError("invalid_url", "Nenhum backend seguro foi configurado.");
  }

  let lastError: unknown;
  let lastResponse: Response | undefined;
  for (let index = 0; index < candidates.length; index += 1) {
    const url = candidates[index]!;
    try {
      const response = await fetch(url, init);
      const hasAlternative = index < candidates.length - 1;
      if (hasAlternative && RECOVERABLE_BACKEND_STATUSES.has(response.status)) {
        lastResponse = response;
        continue;
      }
      if (response.status === 404 || response.status === 405) {
        lastError = new NexusApiError(
          "incompatible",
          "O backend conectado é antigo e não possui esta rota do Nexus.",
          response.status,
        );
        lastResponse = response;
        continue;
      }
      return response;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError instanceof NexusApiError) throw lastError;
  throw new NexusApiError("unreachable", "Não foi possível alcançar o backend do Nexus.");
}
