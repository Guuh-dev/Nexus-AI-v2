import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRIMARY_MODEL,
  SECONDARY_MODEL,
} from "@/constants/models";
import {
  generatePlanWithOpenRouter,
  planningModelOrder,
  planningTelemetrySnapshot,
  resetPlanningTelemetry,
} from "@/services/openrouter.server";
import { makeProfile } from "@/tests/fixtures";

const send = vi.hoisted(() => vi.fn());

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: class OpenRouterMock {
    chat = { send };
  },
}));

const originalEnvironment = {
  key: process.env.OPENROUTER_API_KEY,
  planningModels: process.env.OPENROUTER_PLANNING_MODELS,
  planningModel: process.env.OPENROUTER_PLANNING_MODEL,
  fastModels: process.env.OPENROUTER_FAST_MODELS,
  fastModel: process.env.OPENROUTER_FAST_MODEL,
};

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

function restoreEnvironment(
  key: keyof typeof originalEnvironment,
  environmentKey: string,
) {
  const value = originalEnvironment[key];
  if (value === undefined) delete process.env[environmentKey];
  else process.env[environmentKey] = value;
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "planning-test-key-never-log";
  delete process.env.OPENROUTER_PLANNING_MODELS;
  delete process.env.OPENROUTER_PLANNING_MODEL;
  delete process.env.OPENROUTER_FAST_MODELS;
  delete process.env.OPENROUTER_FAST_MODEL;
  send.mockReset();
  resetPlanningTelemetry();
});

afterEach(() => {
  restoreEnvironment("key", "OPENROUTER_API_KEY");
  restoreEnvironment("planningModels", "OPENROUTER_PLANNING_MODELS");
  restoreEnvironment("planningModel", "OPENROUTER_PLANNING_MODEL");
  restoreEnvironment("fastModels", "OPENROUTER_FAST_MODELS");
  restoreEnvironment("fastModel", "OPENROUTER_FAST_MODEL");
});

describe("daily planning capability routing", () => {
  it.each(["OPENROUTER_STREAM_401", "OPENROUTER_STREAM_402"])(
    "stops planning routing on shared account error %s",
    async (code) => {
      send.mockResolvedValueOnce(streamOf(new Error(code)));

      await expect(generatePlanWithOpenRouter({
        profile: makeProfile(),
        date: "2026-07-13",
        requestId: `planning-terminal-${code}`,
        clientId: "planning-terminal-client",
      }, new AbortController().signal)).rejects.toThrow(code);

      expect(send).toHaveBeenCalledTimes(1);
      expect(planningTelemetrySnapshot()).toHaveLength(1);
    },
  );

  it("uses two explicit production routes and ignores retired aliases", () => {
    expect(planningModelOrder({})).toEqual([
      PRIMARY_MODEL,
      SECONDARY_MODEL,
    ]);
    expect(
      planningModelOrder({
        OPENROUTER_PLANNING_MODELS:
          "qwen/qwen-2.5-72b-instruct,openrouter/free,unknown/model",
      }),
    ).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
  });

  it("allows an exact compatible model to be promoted explicitly", () => {
    expect(
      planningModelOrder({ OPENROUTER_PLANNING_MODELS: SECONDARY_MODEL }),
    ).toEqual([SECONDARY_MODEL, PRIMARY_MODEL]);
  });

  it("blocks an incompatible resolved model before output and uses the alternate", async () => {
    send
      .mockResolvedValueOnce(
        streamOf({
          model: "provider/content-safety-classifier",
          choices: [{ delta: { content: "User Safety: safe" } }],
        }),
      )
      .mockResolvedValueOnce(
        streamOf({
          model: SECONDARY_MODEL,
          choices: [
            {
              delta: {
                content: JSON.stringify({
                  date: "2026-07-13",
                  mainMission: {
                    title: "Publicar a primeira versão",
                    description:
                      "Concluir e publicar uma versão verificável do projeto.",
                    firstStep: "Abrir o projeto e listar o bloqueio atual.",
                    expectedResult: "Versão publicada e acessível.",
                    doneWhen: "O link abrir e a entrega estiver registrada.",
                    estimatedMinutes: 40,
                    priority: "alta",
                  },
                  tasks: [
                    {
                      id: "task-plan-v3",
                      title: "Corrigir o bloqueio de publicação",
                      description: "Resolver o erro que impede a entrega.",
                      context: "A publicação depende desta correção.",
                      firstStep: "Reproduzir o erro e registrar a mensagem.",
                      expectedResult: "Build concluído sem o erro.",
                      doneWhen:
                        "O comando de build terminar com sucesso.",
                      category: "desenvolvimento",
                      priority: "alta",
                      estimatedMinutes: 30,
                      xp: 50,
                      recurring: false,
                    },
                  ],
                  focusMessage:
                    "Finalize uma entrega verificável antes de abrir outra frente.",
                  avoidToday: ["Adicionar escopo novo"],
                  totalEstimatedMinutes: 70,
                }),
              },
            },
          ],
        }),
      );

    const result = await generatePlanWithOpenRouter(
      {
        profile: makeProfile(),
        date: "2026-07-13",
        requestId: "planning-routing-v3-request",
        clientId: "planning-routing-v3-client",
      },
      new AbortController().signal,
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(
      send.mock.calls.map((call) => call[0]?.chatRequest?.model),
    ).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(send.mock.calls[0]?.[0]?.chatRequest?.provider).toMatchObject({
      allowFallbacks: true,
      sort: "throughput",
      dataCollection: "deny",
      zdr: true,
      maxPrice: { prompt: "0.15", completion: "0.55" },
      requireParameters: true,
    });
    expect(result.model).toBe(SECONDARY_MODEL);
    expect(result.plan).toMatchObject({
      source: "ai",
      requestId: "planning-routing-v3-request",
      mainMission: { title: "Publicar a primeira versão" },
    });

    const telemetry = planningTelemetrySnapshot();
    expect(telemetry).toMatchObject([
      {
        model: "provider/content-safety-classifier",
        status: "blocked",
        errorCode: "model_blocked",
      },
      {
        model: SECONDARY_MODEL,
        status: "success",
        fallbackReason: "model_blocked",
      },
    ]);
    expect(JSON.stringify(telemetry)).not.toContain("Gusta");
    expect(JSON.stringify(telemetry)).not.toContain(
      "planning-test-key-never-log",
    );
  });

  it("treats invalid plan content as a failed attempt and uses the alternate", async () => {
    send
      .mockResolvedValueOnce(
        streamOf({
          model: PRIMARY_MODEL,
          choices: [{ delta: { content: JSON.stringify({ date: "2026-07-13" }) } }],
        }),
      )
      .mockResolvedValueOnce(
        streamOf({
          model: SECONDARY_MODEL,
          choices: [{
            delta: {
              content: JSON.stringify({
                date: "2026-07-13",
                mainMission: {
                  title: "Publicar a versão",
                  description: "Concluir uma entrega verificável.",
                  estimatedMinutes: 40,
                  priority: "alta",
                },
                tasks: [{
                  title: "Executar o build",
                  description: "Validar a versão antes da publicação.",
                  category: "desenvolvimento",
                  priority: "alta",
                  estimatedMinutes: 30,
                  xp: 50,
                  recurring: false,
                }],
                focusMessage: "Conclua a entrega principal.",
                avoidToday: ["Adicionar escopo"],
                totalEstimatedMinutes: 70,
              }),
            },
          }],
        }),
      );

    const result = await generatePlanWithOpenRouter({
      profile: makeProfile(),
      date: "2026-07-13",
      requestId: "planning-invalid-primary-request",
      clientId: "planning-invalid-primary-client",
    }, new AbortController().signal);

    expect(send.mock.calls.map((call) => call[0]?.chatRequest?.model)).toEqual([
      PRIMARY_MODEL,
      SECONDARY_MODEL,
    ]);
    expect(result.model).toBe(SECONDARY_MODEL);
    expect(result.plan.mainMission.title).toBe("Publicar a versão");
    expect(planningTelemetrySnapshot()).toMatchObject([
      { model: PRIMARY_MODEL, status: "failed", errorCode: "invalid_response" },
      { model: SECONDARY_MODEL, status: "success", fallbackReason: "invalid_response" },
    ]);
  });
});
