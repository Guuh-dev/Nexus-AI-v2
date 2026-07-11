const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

export class NexusApiError extends Error {
  constructor(
    public readonly code: "unreachable" | "incompatible" | "invalid_url",
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
  const fallback = normalizeApiBase(process.env.EXPO_PUBLIC_API_FALLBACK_URL);
  const urls = [configured ? `${configured}${path}` : null, fallback ? `${fallback}${path}` : null];

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
  for (const url of candidates) {
    try {
      const response = await fetch(url, init);
      // 404/405 are strong signs that an APK is still connected to the backend
      // da V1, which did not expose the assistant route.
      if (response.status === 404 || response.status === 405) {
        lastError = new NexusApiError(
          "incompatible",
          "O backend conectado é antigo e não possui esta rota da V2.1.",
          response.status,
        );
        continue;
      }
      return response;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
  }

  if (lastError instanceof NexusApiError) throw lastError;
  throw new NexusApiError("unreachable", "Não foi possível alcançar o backend do Nexus.");
}
