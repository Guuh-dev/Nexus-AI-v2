import type { ChatThread } from "@/types";
import type { AssistanceProposal } from "@/schemas/consultation.schema";
export function receiveProposal(thread: ChatThread, proposal: AssistanceProposal | undefined, messageId: string): ChatThread["consultation"] {
  const prior = thread.consultation;
  if (!prior || prior.stage === "approved") return prior;
  return { ...prior, revision: prior.revision + 1, stage: proposal ? "proposed" : "understanding", ...(proposal ? { proposal, proposalMessageId: messageId } : {}) };
}
export function decideConsultation(thread: ChatThread, revision: number, approve: boolean, at: string): ChatThread {
  const c = thread.consultation;
  if (!c || c.revision !== revision || c.stage !== "proposed" || !c.proposal || !thread.messages.some(m => m.id === c.proposalMessageId && m.role === "assistant" && !m.failed)) throw new Error("A proposta mudou. Revise a versão atual.");
  return { ...thread, consultation: { ...c, revision: c.revision + 1, stage: approve ? "approved" : "adjusting", approvedAt: approve ? at : undefined }, updatedAt: at };
}
