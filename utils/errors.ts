export type FriendlyErrorCode =
  | "missing_key"
  | "unauthorized"
  | "payment_required"
  | "rate_limit"
  | "timeout"
  | "offline"
  | "provider_unavailable"
  | "invalid_response"
  | "cancelled"
  | "unknown";

const FRIENDLY_MESSAGES: Record<FriendlyErrorCode, string> = {
  missing_key: "A inteligência do Nexus ainda não foi configurada.",
  unauthorized: "Não foi possível validar a inteligência do Nexus.",
  payment_required: "A cota da inteligência terminou. Criamos um plano local para você.",
  rate_limit: "O Nexus está recebendo muitas solicitações. Tente novamente em instantes.",
  timeout: "O planejamento demorou mais que o esperado. Tente novamente.",
  offline: "Você está offline. Criamos uma missão temporária com base nas suas preferências.",
  provider_unavailable: "A inteligência está temporariamente indisponível. Seu plano local está pronto.",
  invalid_response: "A resposta da inteligência veio incompleta. Criamos um plano seguro para hoje.",
  cancelled: "O planejamento foi cancelado.",
  unknown: "Não foi possível gerar o plano agora. Criamos uma alternativa local.",
};

export class NexusError extends Error {
  constructor(
    public readonly code: FriendlyErrorCode,
    message = FRIENDLY_MESSAGES[code],
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NexusError";
  }
}

export function friendlyMessage(code: FriendlyErrorCode): string {
  return FRIENDLY_MESSAGES[code];
}

export function codeFromStatus(status: number): FriendlyErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 402) return "payment_required";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "provider_unavailable";
  return "unknown";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message.includes("aborted"));
}
