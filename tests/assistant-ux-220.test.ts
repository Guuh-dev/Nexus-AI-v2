import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssistantMessage } from "@/features/assistant/message-format";

describe("Assistant UX 2.2", () => {
  it("turns dense Markdown into readable headings and steps", () => {
    const blocks = parseAssistantMessage("**Agora:** Comece pequeno.\n1. Abra o projeto\n2. Publique a demo\n- Me mande o link");
    expect(blocks).toMatchObject([
      { type: "heading", text: "Agora" },
      { type: "paragraph", text: "Comece pequeno." },
      { type: "bullet", index: 1 },
      { type: "bullet", index: 2 },
      { type: "bullet" },
    ]);
  });

  it("splits dense one-line model output into readable blocks", () => {
    const blocks = parseAssistantMessage(
      "**Objetivo da sessão:** Validar seu nível. **Passos:** 1. Abra o projeto 2. Publique a demo *Entrega:* Link funcionando. **Concluído quando:** O link abrir no celular.",
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "bullet",
      "bullet",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
    ]);
    expect(blocks[3]).toMatchObject({ type: "bullet", index: 1, text: "Abra o projeto" });
  });

  it("enforces compact Brain and one-step Atlas instructions", () => {
    const server = readFileSync("services/assistant.server.ts", "utf8");
    expect(server).toContain("Use no máximo 90 palavras");
    expect(server).toContain("Use no máximo 140 palavras");
    expect(server).toContain("Use no máximo 220 palavras");
    expect(server).toContain("Entregue uma etapa por vez");
    expect(server).toContain("Faça no máximo uma pergunta por resposta");
  });

  it("streams assistant deltas over SSE without exposing the key", () => {
    const route = readFileSync("app/api/assistant+api.ts", "utf8");
    const client = readFileSync("services/assistant.service.ts", "utf8");
    expect(route).toContain('"text/event-stream; charset=utf-8"');
    expect(route).toContain('streamEvent("delta"');
    expect(client).toContain('Accept: "text/event-stream"');
    expect(route).not.toContain("process.env.OPENROUTER_API_KEY,");
  });

  it("preserves a failed draft, exposes retry and supports contextual roadmap links", () => {
    const brain = readFileSync("app/(tabs)/brain.tsx", "utf8");
    expect(brain).toContain("useLocalSearchParams");
    expect(brain).toContain('raw === "roadmaps"');
    expect(brain).toContain("setFailedDraft(clean)");
    expect(brain).toContain('"Tentar novamente"');
  });
});
