export function openRouterStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
    message?: unknown;
  };
  for (const value of [
    candidate.status,
    candidate.statusCode,
    candidate.response?.status,
  ]) {
    if (typeof value === "number") return value;
  }
  if (typeof candidate.message === "string") {
    const match = candidate.message.match(
      /(?:STREAM_|status\D*)(400|401|402|404|408|422|425|429|500|502|503|504|529)\b/i,
    );
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

export function shouldRetryWithoutJsonSchema(error: unknown): boolean {
  const status = openRouterStatus(error);
  const message =
    error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";
  return (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    message.includes("response_format") ||
    message.includes("responseformat") ||
    message.includes("json_schema") ||
    message.includes("structured output") ||
    message.includes("no endpoints") ||
    message.includes("unsupported")
  );
}

export function isTransientOpenRouterError(error: unknown): boolean {
  const status = openRouterStatus(error);
  if (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 529
  ) {
    return true;
  }
  const message =
    error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded") ||
    message.includes("rate limit") ||
    message.includes("network") ||
    message.includes("fetch failed")
  );
}
