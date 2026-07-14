import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ASSISTANT_JSON_SCHEMA,
  assistantAiResponseSchema,
  assistantClientResponseSchema,
} from "@/schemas/assistant.schema";
import { brainStateSchema } from "@/schemas/expansion.schema";

const baseAction = {
  title: "Atualizar objetivo principal",
  description: "Trocar a meta somente após confirmação.",
};

describe("assistant update_goal contract", () => {
  it("requires a material payload.mainGoal in AI and client responses", () => {
    for (const schema of [assistantAiResponseSchema, assistantClientResponseSchema]) {
      expect(schema.safeParse({
        message: "Posso propor essa mudança.",
        actions: [{ ...baseAction, type: "update_goal", payload: {} }],
      }).success).toBe(false);
      expect(schema.safeParse({
        message: "Posso propor essa mudança.",
        actions: [{ ...baseAction, type: "update_goal", payload: { mainGoal: 42 } }],
      }).success).toBe(false);
      expect(schema.safeParse({
        message: "Posso propor essa mudança.",
        actions: [{
          ...baseAction,
          type: "update_goal",
          payload: { mainGoal: "Publicar uma versão utilizável do produto" },
        }],
      }).success).toBe(true);
    }
  });

  it("does not constrain payloads of unrelated action types", () => {
    expect(assistantAiResponseSchema.safeParse({
      message: "Vou propor o próximo passo.",
      actions: [{
        ...baseAction,
        type: "create_task",
        payload: { title: "Testar o fluxo", estimatedMinutes: 25 },
      }],
    }).success).toBe(true);
  });

  it("persists update_goal only with the same discriminated payload contract", () => {
    const thread = {
      threads: [{
        id: "thread-update-goal",
        kind: "brain",
        title: "Meta",
        summary: "",
        createdAt: "2026-07-13T12:00:00.000Z",
        updatedAt: "2026-07-13T12:00:00.000Z",
        archived: false,
        messages: [{
          id: "message-update-goal",
          role: "assistant",
          content: "Proposta",
          createdAt: "2026-07-13T12:00:00.000Z",
          actions: [{
            id: "action-update-goal",
            ...baseAction,
            type: "update_goal",
            payload: {},
            status: "proposed",
          }],
        }],
      }],
      memories: [],
    };

    expect(brainStateSchema.safeParse(thread).success).toBe(false);
  });

  it("publishes the conditional requirement in OpenRouter schema and prompt", () => {
    const items = ASSISTANT_JSON_SCHEMA.properties.actions.items as unknown as {
      oneOf: Array<{ properties: { type: { const?: string }; payload: { required?: string[] } } }>;
    };
    const updateGoal = items.oneOf.find((option) => option.properties.type.const === "update_goal");
    expect(updateGoal?.properties.payload.required).toContain("mainGoal");

    const server = readFileSync("services/assistant.server.ts", "utf8");
    expect(server).toContain("Toda action update_goal deve incluir payload.mainGoal");
  });

  it("keeps an invalid runtime proposal pending and tells the user it is rejectable", () => {
    const provider = readFileSync("providers/NexusProvider.tsx", "utf8");
    const start = provider.indexOf('if (selected.type === "update_goal")');
    const end = provider.indexOf("const resetToday", start);
    const branch = provider.slice(start, end);
    expect(branch).toContain("typeof rawPayload.mainGoal");
    expect(branch).toContain("continua pendente para você rejeitar");
    expect(branch.indexOf("mainGoal.length < 10")).toBeLessThan(branch.indexOf('"accepted"'));
  });
});
