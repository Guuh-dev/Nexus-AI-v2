const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type UntrustedDataLimits = {
  maxDepth?: number;
  maxNodes?: number;
  maxKeysPerObject?: number;
  maxArrayLength?: number;
};

export function validateUntrustedJson(
  value: unknown,
  limits: UntrustedDataLimits = {},
): { valid: true } | { valid: false; reason: string } {
  const maxDepth = limits.maxDepth ?? 8;
  const maxNodes = limits.maxNodes ?? 2_000;
  const maxKeysPerObject = limits.maxKeysPerObject ?? 120;
  const maxArrayLength = limits.maxArrayLength ?? 500;
  let nodes = 0;
  const seen = new Set<object>();

  const visit = (current: unknown, depth: number): string | null => {
    nodes += 1;
    if (nodes > maxNodes) return "complexity";
    if (depth > maxDepth) return "depth";
    if (current === null || typeof current === "string" || typeof current === "number" || typeof current === "boolean") {
      return null;
    }
    if (typeof current !== "object") return "unsupported_type";
    if (seen.has(current)) return "cycle";
    seen.add(current);

    if (Array.isArray(current)) {
      if (current.length > maxArrayLength) return "array_length";
      for (const item of current) {
        const issue = visit(item, depth + 1);
        if (issue) return issue;
      }
      return null;
    }

    const keys = Object.keys(current);
    if (keys.length > maxKeysPerObject) return "object_keys";
    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) return "forbidden_key";
      const issue = visit((current as Record<string, unknown>)[key], depth + 1);
      if (issue) return issue;
    }
    return null;
  };

  const reason = visit(value, 0);
  return reason ? { valid: false, reason } : { valid: true };
}
