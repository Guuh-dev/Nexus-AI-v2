import { describe, expect, it } from "vitest";
import { assertSafeAssistantMessage } from "@/services/assistant.server";

describe("assistant response safety", () => {
  it("blocks leaked deliberation", () => expect(() => assertSafeAssistantMessage("We need to respond as Atlas. The user wants one question. Let's craft it.", "professor")).toThrow("NEXUS_INTERNAL_TEXT_BLOCKED"));
  it("blocks a classifier label before it can become a Brain answer", () => expect(() => assertSafeAssistantMessage("User Safety: safe", "brain")).toThrow("NEXUS_SAFETY_CLASSIFIER_OUTPUT_BLOCKED"));
  it("blocks English output", () => expect(() => assertSafeAssistantMessage("Choose the project you want to monetize first and describe the customer problem it solves.", "brain")).toThrow("NEXUS_NON_PORTUGUESE_RESPONSE"));
  it("accepts compact PT-BR", () => expect(() => assertSafeAssistantMessage("Vamos começar pelo projeto mais claro. Qual deles resolve um problema pelo qual alguém pagaria hoje?", "professor")).not.toThrow());
  it("blocks multiple Atlas questions", () => expect(() => assertSafeAssistantMessage("Qual projeto você escolhe? Quem pagaria por ele? Quanto cobraria?", "professor")).toThrow("NEXUS_TOO_MANY_QUESTIONS"));
  it("blocks multiple Brain questions", () => expect(() => assertSafeAssistantMessage("Qual tarefa está travada? O que você já tentou?", "brain")).toThrow("NEXUS_TOO_MANY_QUESTIONS"));
  it("blocks huge responses", () => expect(() => assertSafeAssistantMessage(`Agora ${"execute uma ação pequena. ".repeat(100)}`, "brain")).toThrow("NEXUS_RESPONSE_TOO_LONG"));
});
