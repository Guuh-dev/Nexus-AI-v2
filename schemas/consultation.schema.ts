import { z } from "zod";
export const assistanceProposalSchema = z.object({
  understanding: z.string().trim().min(2).max(500),
  context: z.string().trim().min(2).max(500),
  outcome: z.string().trim().min(2).max(500),
  uncertainties: z.array(z.string().trim().min(2).max(200)).max(5),
  approach: z.string().trim().min(2).max(500),
  deliverable: z.string().trim().min(2).max(500),
  timeFit: z.string().trim().min(2).max(300),
}).strict();
export const consultationSchema = z.object({
  stage: z.enum(["understanding", "proposed", "approved", "adjusting"]),
  revision: z.number().int().min(0),
  proposal: assistanceProposalSchema.optional(),
  proposalMessageId: z.string().trim().min(1).max(120).optional(),
  approvedAt: z.string().datetime().optional(),
}).strict().superRefine((v, ctx) => {
  if ((v.stage === "proposed" || v.stage === "approved") && (!v.proposal || !v.proposalMessageId)) ctx.addIssue({ code: "custom", message: "Uma proposta precisa de conteúdo e origem." });
  if (v.stage === "approved" && !v.approvedAt) ctx.addIssue({ code: "custom", message: "A aprovação precisa de data." });
});
export type AssistanceProposal = z.infer<typeof assistanceProposalSchema>;
export type Consultation = z.infer<typeof consultationSchema>;
