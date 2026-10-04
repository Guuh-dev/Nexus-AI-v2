import { describe, expect, it } from "vitest";
import { decideConsultation, receiveProposal } from "@/features/assistant/consultation";
import { assistanceProposalSchema, consultationSchema } from "@/schemas/consultation.schema";
import { assistantClientResponseSchema, assistantJsonSchemaForMode } from "@/schemas/assistant.schema";
import { brainStateSchema } from "@/schemas/expansion.schema";
import { compactAssistantContext } from "@/services/assistant.service";
import type { ChatThread } from "@/types";
const proposal = assistanceProposalSchema.parse({ understanding: "Criar um projeto React", context: "Nível ainda não confirmado", outcome: "Uma aplicação utilizável", uncertainties: ["Tempo semanal desconhecido"], approach: "Definir um projeto pequeno", deliverable: "Uma primeira tela validada", timeFit: "Confirmar uma janela antes de planejar" });
const base: ChatThread = { id: "thread-test", kind: "professor", title: "React", createdAt: "2026-10-02T12:00:00.000Z", updatedAt: "2026-10-02T12:00:00.000Z", archived: false, summary: "", messages: [{ id: "proposal-message", role: "assistant", content: "Revise esta proposta antes de começar.", createdAt: "2026-10-02T12:00:00.000Z" }], consultation: { stage: "understanding", revision: 0 } };
const proposed = () => ({ ...base, consultation: receiveProposal(base, proposal, "proposal-message") });
describe("conversation diagnostic and approval lifecycle", () => {
  it("persists a proposal through a strict backup round trip and approves exactly its revision", () => {
    const state = brainStateSchema.parse(JSON.parse(JSON.stringify({ threads: [proposed()], memories: [] })));
    const t = state.threads[0]!;
    const accepted = decideConsultation(t, 1, true, "2026-10-02T13:00:00.000Z");
    expect(accepted.consultation?.stage).toBe("approved");
    expect(consultationSchema.parse(accepted.consultation).approvedAt).toBe("2026-10-02T13:00:00.000Z");
    expect(() => decideConsultation(accepted, 1, true, accepted.updatedAt)).toThrow();
  });
  it("rejects stale revisions and missing source messages", () => {
    expect(() => decideConsultation(proposed(), 0, true, base.updatedAt)).toThrow();
    expect(() => decideConsultation({ ...proposed(), messages: [] }, 1, true, base.updatedAt)).toThrow();
  });
  it("preserves accepted parts as reference during adjustment but requires a new approval", () => {
    const t = decideConsultation(proposed(), 1, false, base.updatedAt);
    expect(t.consultation?.stage).toBe("adjusting");
    expect(t.consultation?.proposal).toEqual(proposal);
    const revised = receiveProposal(t, { ...proposal, approach: "Começar pela API local" }, "new-proposal");
    expect(revised?.revision).toBe(3);
    expect(revised?.stage).toBe("proposed");
    expect(revised?.approvedAt).toBeUndefined();
    expect(revised?.proposal?.outcome).toEqual(proposal.outcome);
  });
  it("does not fabricate approval or diagnosis in a legacy conversation", () => {
    expect(receiveProposal({ ...base, consultation: undefined }, undefined, "message")).toBeUndefined();
    expect(consultationSchema.safeParse({ stage: "approved", revision: 1 }).success).toBe(false);
  });
  it("preserves the review contract even when context must be compacted", () => {
    const c = proposed().consultation!;
    const compact = compactAssistantContext({ consultation: c, today: { details: "x".repeat(30000) } }, "professor");
    expect(compact.consultation).toEqual(c);
    expect(assistantClientResponseSchema.safeParse({ message: "Revise a proposta.", assistanceProposal: proposal }).success).toBe(true);
    expect(Object.keys(assistantJsonSchemaForMode("professor", true).properties)).toEqual(["message", "assistanceProposal"]);
  });
});

it("keeps lesson continuation separate from the diagnosis of a new learning goal", async () => {
  const { threadEntry } = await import("@/features/assistant/thread-entry");
  const { makeAppData } = await import("@/tests/fixtures");
  const data = makeAppData();
  data.learning.roadmaps = [{ id: "roadmap", topic: "React", outcome: "Um app", currentLevel: "intermediario", weeklyMinutes: 120, status: "active", createdAt: base.createdAt, updatedAt: base.updatedAt, phases: [{ id: "phase", order: 0, title: "Aplicação", objective: "Criar", lessons: [{ id: "lesson", title: "Uma tela", description: "Uma aplicação", estimatedMinutes: 25, completed: false }] }] }];
  data.learning.activeRoadmapId = "roadmap";
  expect(threadEntry(data, "professor")).toEqual({ consultation: { stage: "understanding", revision: 0 } });
  expect(threadEntry(data, "professor", true)).toEqual({ roadmapId: "roadmap", lessonId: "lesson" });
  expect(threadEntry(data, "brain", true).consultation?.stage).toBe("understanding");
});
