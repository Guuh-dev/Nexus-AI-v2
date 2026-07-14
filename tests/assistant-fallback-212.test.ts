import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRemoteError,
  askNexus,
} from "@/services/assistant.service";
import { makeAppData } from "@/tests/fixtures";

const originalUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

describe("assistant remote failure v3", () => {
  it.each(["brain", "professor", "roadmap", "weekly_review"] as const)(
    "returns an actionable error instead of a local %s answer",
    async (mode) => {
      process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "missing_key",
                  message: "indisponível",
                },
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            ),
        ),
      );

      const promise = askNexus({
        data: makeAppData(),
        mode,
        message: "Me ajude sem perder esta mensagem",
      });
      await expect(promise).rejects.toBeInstanceOf(AssistantRemoteError);
      await expect(promise).rejects.toMatchObject({
        code: "missing_key",
        message: expect.stringMatching(/tente novamente/i),
      });
    },
  );

  it("keeps the explicitly labeled local interpretation only for capture", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: "missing_key", message: "indisponível" },
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    const result = await askNexus({
      data: makeAppData(),
      mode: "capture",
      message: "Revisar proposta por 20 minutos",
    });
    expect(result.meta?.source).toBe("local");
    expect(result.warning).toMatch(/localmente|offline/i);
    expect(result.capture?.title).toBeTruthy();
  });

  it("waits briefly and retries a backend that is still starting", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "provider_unavailable",
              message: "inicializando",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "A IA voltou. Qual tarefa você quer iniciar agora?",
            meta: {
              source: "remote",
              model: "qwen/qwen3-30b-a3b-instruct-2507",
              latencyMs: 10,
              attempts: 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await askNexus({
      data: makeAppData(),
      mode: "brain",
      message: "Qual é o primeiro passo?",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.meta).toMatchObject({ source: "remote", attempts: 2 });
    expect(result.message).toMatch(/IA voltou/i);
  });
});
