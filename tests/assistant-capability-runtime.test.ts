import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRIMARY_MODEL,
  PRIMARY_MODEL_CANONICAL,
  SECONDARY_MODEL,
} from "@/constants/models";
import {
  assistantTelemetrySnapshot,
  probeOpenRouter,
  resetAssistantTelemetry,
  runAssistant,
} from "@/services/assistant.server";
import { assistantAiResponseSchema } from "@/schemas/assistant.schema";
import { makeProfile } from "@/tests/fixtures";

const send = vi.hoisted(() => vi.fn());

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: class OpenRouterMock {
    chat = { send };
  },
}));

const originalKey = process.env.OPENROUTER_API_KEY;

type TestChunk = {
  model?: string;
  choices: { delta: { content?: string } }[];
};

function streamOf(...items: (TestChunk | Error)[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        if (item instanceof Error) throw item;
        yield item;
      }
    },
  };
}

function request(message: string) {
  return {
    mode: "brain" as const,
    requestId: "assistant-runtime-v3-request",
    clientId: "assistant-runtime-v3-client",
    message,
    profile: makeProfile(),
    context: {
      today: {
        mission: "Concluir uma entrega observável",
        tasks: [{ title: "Publicar a primeira versão", completed: false }],
      },
    },
  };
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key-never-log-this";
  send.mockReset();
  resetAssistantTelemetry();
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

describe("assistant runtime capability enforcement", () => {
  it.each(["OPENROUTER_STREAM_401", "OPENROUTER_STREAM_402"])(
    "stops all assistant routing on shared account error %s",
    async (code) => {
      send.mockResolvedValueOnce(streamOf(new Error(code)));

      await expect(runAssistant(
        request("Qual é a ação concreta de agora?"),
        new AbortController().signal,
      )).rejects.toThrow(code);

      expect(send).toHaveBeenCalledTimes(1);
      expect(assistantTelemetrySnapshot()).toHaveLength(1);
    },
  );

  it("does not probe an alternate model after an authentication failure", async () => {
    send.mockResolvedValueOnce(streamOf(new Error("OPENROUTER_STREAM_401")));

    await expect(probeOpenRouter(new AbortController().signal)).rejects.toThrow("401");

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("accepts the exact canonical slug resolved for the primary model", async () => {
    send.mockResolvedValueOnce(
      streamOf({
        model: PRIMARY_MODEL_CANONICAL,
        choices: [{
          delta: {
            content: "Abra a tarefa principal e execute o primeiro passo agora.",
          },
        }],
      }),
    );

    const response = await runAssistant(
      request("Qual é a ação concreta de agora?"),
      new AbortController().signal,
    );

    expect(response.meta?.model).toBe(PRIMARY_MODEL_CANONICAL);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("blocks an incompatible resolved safety model and tries the compatible alternate", async () => {
    send
      .mockResolvedValueOnce(
        streamOf({
          model: "nvidia/nemotron-3.5-content-safety:free",
          choices: [{ delta: { content: "User Safety: safe" } }],
        }),
      )
      .mockResolvedValueOnce(
        streamOf({
          model: SECONDARY_MODEL,
          choices: [
            {
              delta: {
                content:
                  "Qual tarefa da sua missão precisa do primeiro passo agora?",
              },
            },
          ],
        }),
      );
    const deltas: string[] = [];

    const response = await runAssistant(
      request("Me guie somente no primeiro passo e faça uma pergunta por vez."),
      new AbortController().signal,
      (delta) => deltas.push(delta),
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]?.chatRequest?.provider).toMatchObject({
      allowFallbacks: true,
      sort: "throughput",
      dataCollection: "deny",
      zdr: true,
      maxPrice: { prompt: "0.15", completion: "0.55" },
    });
    expect(response.meta?.model).toBe(SECONDARY_MODEL);
    expect(response.message.match(/\?/g)).toHaveLength(1);
    expect(deltas.join("")).toBe(response.message);
    expect(deltas.join("")).not.toMatch(/User Safety/i);

    const telemetry = assistantTelemetrySnapshot();
    expect(telemetry).toMatchObject([
      {
        model: "nvidia/nemotron-3.5-content-safety:free",
        status: "blocked",
        errorCode: "model_blocked",
      },
      {
        model: SECONDARY_MODEL,
        status: "success",
        fallbackReason: "model_blocked",
      },
    ]);
    expect(JSON.stringify(telemetry)).not.toContain("primeiro passo");
    expect(JSON.stringify(telemetry)).not.toContain("test-key-never-log-this");
  });

  it("retries the primary model once on a short transient failure", async () => {
    send
      .mockResolvedValueOnce(
        streamOf(new Error("OPENROUTER_STREAM_503")),
      )
      .mockResolvedValueOnce(
        streamOf({
          model: PRIMARY_MODEL,
          choices: [
            {
              delta: {
                content: "Comece abrindo a tarefa principal e defina a entrega.",
              },
            },
          ],
        }),
      );

    const response = await runAssistant(
      request("Qual é a ação concreta de agora?"),
      new AbortController().signal,
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(
      send.mock.calls.map((call) => call[0]?.chatRequest?.model),
    ).toEqual([PRIMARY_MODEL, PRIMARY_MODEL]);
    expect(response.meta?.attempts).toBe(2);
    expect(assistantTelemetrySnapshot().at(-1)).toMatchObject({
      status: "success",
      fallbackReason: "provider_unavailable",
    });
  });

  it("publishes validated plain text incrementally instead of a fake final delta", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first =
      "**Resposta**\nVamos focar na missão principal agora. " +
      "Abra a tarefa, escolha a menor entrega observável e comece sem adicionar outro objetivo. ".repeat(
        3,
      );
    send.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield {
          model: PRIMARY_MODEL,
          choices: [{ delta: { content: first } }],
        };
        await gate;
        yield {
          model: PRIMARY_MODEL,
          choices: [{ delta: { content: "Qual arquivo você abrirá primeiro?" } }],
        };
      },
    });
    const onDelta = vi.fn();

    const pending = runAssistant(
      request("Uma pergunta por vez, por favor."),
      new AbortController().signal,
      onDelta,
    );
    await vi.waitFor(() => expect(onDelta).toHaveBeenCalled());
    const partial = onDelta.mock.calls.map((call) => call[0]).join("");
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan(first.length);

    release();
    const response = await pending;
    expect(onDelta.mock.calls.length).toBeGreaterThan(1);
    expect(onDelta.mock.calls.map((call) => call[0]).join("")).toBe(
      response.message,
    );
  });

  it("injects weekly score and confidence from local evidence, never from the model", async () => {
    const modelDraft = {
      message: "Há poucos registros para uma interpretação confiável.",
      weeklyReview: {
        highlights: ["Dados insuficientes para uma nota confiável."],
        patterns: ["Não há dados suficientes para afirmar um padrão."],
        keep: ["Registrar conclusões e foco."],
        cut: ["Evitar conclusões sem evidência."],
        nextWeekFocus: "Registrar ações concluídas.",
        challenge: "Registrar três tarefas concluídas.",
      },
    };
    expect(() =>
      assistantAiResponseSchema.parse({
        ...modelDraft,
        weeklyReview: {
          ...modelDraft.weeklyReview,
          consistencyScore: 99,
        },
      }),
    ).toThrow();
    send.mockResolvedValueOnce(
      streamOf({
        model: PRIMARY_MODEL,
        choices: [{ delta: { content: JSON.stringify(modelDraft) } }],
      }),
    );

    const response = await runAssistant(
      {
        mode: "weekly_review",
        requestId: "assistant-weekly-v3-request",
        clientId: "assistant-weekly-v3-client",
        message: "Interprete somente as evidências.",
        profile: makeProfile(),
        context: {
          weeklyEvidence: {
            weekStart: "2026-07-06",
            weekEnd: "2026-07-12",
            completionPercentage: 0,
            xpEarned: 0,
            focusMinutes: 0,
            score: null,
            confidence: "insufficient",
          },
        },
      },
      new AbortController().signal,
    );

    expect(response.weeklyReview).toMatchObject({
      consistencyScore: null,
      confidence: "insufficient",
      source: "ai",
      weekStart: "2026-07-06",
      weekEnd: "2026-07-12",
    });
  });

  it("rejects a structurally incomplete primary result and uses the alternate", async () => {
    expect(() => assistantAiResponseSchema.parse({
      message: "Organizei a captura.",
      capture: {
        title: "Publicar endpoint",
        category: "desenvolvimento",
        priority: "alta",
        estimatedMinutes: 30,
        recurring: false,
      },
    })).toThrow();
    send
      .mockResolvedValueOnce(
        streamOf({
          model: PRIMARY_MODEL,
          choices: [{ delta: { content: JSON.stringify({ message: "Pronto." }) } }],
        }),
      )
      .mockResolvedValueOnce(
        streamOf({
          model: SECONDARY_MODEL,
          choices: [{
            delta: {
              content: JSON.stringify({
                message: "Organizei a captura.",
                capture: {
                  title: "Publicar endpoint",
                  context: "A publicação desbloqueia a integração que depende deste endpoint.",
                  firstStep: "Abra o painel de deploy e confira a configuração do serviço.",
                  expectedResult: "Endpoint publicado e respondendo ao health check.",
                  doneWhen: "O health check retorna sucesso e a URL foi registrada.",
                  category: "desenvolvimento",
                  priority: "alta",
                  estimatedMinutes: 30,
                  recurring: false,
                },
              }),
            },
          }],
        }),
      );

    const response = await runAssistant({
      ...request("Preciso publicar o endpoint"),
      mode: "capture",
    }, new AbortController().signal);

    expect(send).toHaveBeenCalledTimes(2);
    expect(response.meta?.model).toBe(SECONDARY_MODEL);
    expect(response.capture?.title).toBe("Publicar endpoint");
    expect(response.capture).toMatchObject({
      firstStep: "Abra o painel de deploy e confira a configuração do serviço.",
      expectedResult: "Endpoint publicado e respondendo ao health check.",
      doneWhen: "O health check retorna sucesso e a URL foi registrada.",
    });
    expect(assistantTelemetrySnapshot()).toMatchObject([
      { model: PRIMARY_MODEL, status: "failed", errorCode: "invalid_response" },
      { model: SECONDARY_MODEL, status: "success", fallbackReason: "invalid_response" },
    ]);
  });

  it("returns a validated evidence correction and requires an executable adjustment on rejection", async () => {
    expect(() => assistantAiResponseSchema.parse({
      message: "A entrega ainda está incompleta.",
      lessonReview: {
        accepted: false,
        feedback: "O teste citado não mostra o caso de entrada vazia.",
      },
    })).toThrow();
    send.mockResolvedValueOnce(
      streamOf({
        model: PRIMARY_MODEL,
        choices: [{
          delta: {
            content: JSON.stringify({
              message: "A entrega precisa de um ajuste.",
              lessonReview: {
                accepted: false,
                feedback: "O caso de entrada vazia ainda não foi demonstrado.",
                nextAdjustment: "Execute e registre o teste com entrada vazia.",
              },
            }),
          },
        }],
      }),
    );

    const response = await runAssistant({
      ...request("Avalie a entrega."),
      mode: "evidence_review",
      context: {
        roadmapEvidenceReview: {
          lesson: {
            objective: "Validar entradas",
            deliverable: "Teste executável",
            successCriteria: "Entrada vazia tratada",
          },
          submission: "O teste principal passou.",
        },
      },
    }, new AbortController().signal);

    expect(response.lessonReview).toEqual({
      accepted: false,
      feedback: "O caso de entrada vazia ainda não foi demonstrado.",
      nextAdjustment: "Execute e registre o teste com entrada vazia.",
    });
  });
});
