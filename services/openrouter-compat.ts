export function openRouterStatus(error: unknown): number | undefined {
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
    const match = candidate.message.match(/(?:STREAM_|status\D*)(400|404|422|429|500|502|503|529)\b/i);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

export function shouldRetryWithoutJsonSchema(error: unknown): boolean {
  const status = openRouterStatus(error);
  const message = error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";
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
