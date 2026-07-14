export const PRIMARY_MODEL = "deepseek/deepseek-v4-flash";
export const PRIMARY_MODEL_CANONICAL =
  "deepseek/deepseek-v4-flash-20260423";
export const SECONDARY_MODEL = "qwen/qwen3-30b-a3b-instruct-2507";

export type AssistantModelMode =
  | "brain"
  | "professor"
  | "roadmap"
  | "capture"
  | "weekly_review"
  | "evidence_review"
  | "planning"
  | "safety";

export type ModelCapability =
  | "conversation"
  | "instruction"
  | "structured"
  | "evidence"
  | "planning"
  | "pt_br"
  | "safety";

export type AssistantModelDefinition = {
  id: string;
  aliases: readonly string[];
  capabilities: readonly ModelCapability[];
  cost: "free" | "paid";
};

const GENERAL_CAPABILITIES = [
  "conversation",
  "instruction",
  "structured",
  "evidence",
  "planning",
  "pt_br",
] as const satisfies readonly ModelCapability[];

/**
 * Server-side allowlist. Adding a model is an intentional release change: its
 * output modality and supported parameters must be checked before it enters a
 * user-facing route.
 */
export const ASSISTANT_MODEL_REGISTRY = [
  {
    id: PRIMARY_MODEL,
    // Exact canonical slug returned by the provider for PRIMARY_MODEL.
    // Keep this explicit: prefix/wildcard aliases would weaken the allowlist.
    aliases: [PRIMARY_MODEL_CANONICAL],
    capabilities: GENERAL_CAPABILITIES,
    cost: "paid",
  },
  {
    id: SECONDARY_MODEL,
    aliases: [],
    capabilities: GENERAL_CAPABILITIES,
    cost: "paid",
  },
] as const satisfies readonly AssistantModelDefinition[];

export const MODE_CAPABILITIES: Readonly<
  Record<AssistantModelMode, readonly ModelCapability[]>
> = {
  brain: ["conversation", "pt_br"],
  professor: ["conversation", "instruction", "pt_br"],
  roadmap: ["instruction", "structured", "pt_br"],
  capture: ["instruction", "structured", "pt_br"],
  weekly_review: ["structured", "evidence", "pt_br"],
  evidence_review: ["instruction", "structured", "evidence", "pt_br"],
  planning: ["structured", "planning", "pt_br"],
  safety: ["safety"],
};

const FORBIDDEN_MODEL_ID =
  /(?:^|[\/_:.-])(?:safety|safe-?guard|moderation|moderator|classifier|classification|guard|guardrail|embedding|embeddings|rerank|reranker|image-?only|vision-?only)(?:$|[\/_:.-])/i;

function normalizedModelId(model: string): string {
  return model.trim().toLocaleLowerCase("en-US");
}

export function forbiddenModelReason(model: string): string | null {
  const normalized = normalizedModelId(model);
  if (!normalized) return "empty_model";
  if (normalized === "openrouter/free") return "uncontrolled_router";
  const match = normalized.match(FORBIDDEN_MODEL_ID)?.[0]
    ?.replace(/^[\/_:.-]+|[\/_:.-]+$/g, "");
  return match ? `forbidden_${match.replace(/[^a-z0-9]+/g, "_")}` : null;
}

export function modelDefinition(
  model: string,
): AssistantModelDefinition | undefined {
  const normalized = normalizedModelId(model);
  return ASSISTANT_MODEL_REGISTRY.find(
    (entry) =>
      normalizedModelId(entry.id) === normalized ||
      entry.aliases.some((alias) => normalizedModelId(alias) === normalized),
  );
}

export function modelSupportsMode(
  model: string,
  mode: AssistantModelMode,
): boolean {
  if (forbiddenModelReason(model)) return false;
  const definition = modelDefinition(model);
  if (!definition) return false;
  const capabilities = new Set<ModelCapability>(definition.capabilities);
  return MODE_CAPABILITIES[mode].every((capability) =>
    capabilities.has(capability),
  );
}

export function assertModelSupportsMode(
  model: string,
  mode: AssistantModelMode,
): AssistantModelDefinition {
  const forbidden = forbiddenModelReason(model);
  if (forbidden) throw new Error(`NEXUS_MODEL_BLOCKED_${forbidden}`);
  const definition = modelDefinition(model);
  if (!definition) throw new Error("NEXUS_MODEL_NOT_ALLOWLISTED");
  if (!modelSupportsMode(model, mode)) {
    throw new Error(`NEXUS_MODEL_CAPABILITY_MISMATCH_${mode}`);
  }
  return definition;
}

export function defaultModelsForMode(
  mode: AssistantModelMode,
): string[] {
  if (mode === "safety") return [];
  return ASSISTANT_MODEL_REGISTRY.filter(
    (entry) => modelSupportsMode(entry.id, mode),
  ).map((entry) => entry.id);
}
