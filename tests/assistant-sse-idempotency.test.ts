import { afterEach, describe, expect, it, vi } from "vitest";
import { makeProfile } from "@/tests/fixtures";
import { POST } from "@/app/api/assistant+api";

const runAssistant = vi.hoisted(() => vi.fn());

vi.mock("@/services/assistant.server", () => ({ runAssistant }));

const originalKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  runAssistant.mockReset();
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

function assistantRequest(requestId: string, message = "Organize meu dia"): Request {
  return new Request("https://nexus.example/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Nexus-Client-Id": "install-sse-idempotency",
    },
    body: JSON.stringify({
      mode: "brain",
      requestId,
      clientId: "install-sse-idempotency",
      message,
      profile: makeProfile(),
      context: {},
    }),
  });
}

describe("assistant SSE idempotency", () => {
  it("shares one provider operation and one committed delta across simultaneous listeners", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    runAssistant.mockImplementation(async (request, _signal, onDelta) => {
      await gate;
      onDelta?.("Resposta única e validada.");
      return {
        message: "Resposta única e validada.",
        meta: {
          source: "remote",
          latencyMs: 5,
          attempts: 1,
          requestId: request.requestId,
        },
      };
    });

    const requestId = `request-sse-${Date.now()}-shared`;
    const first = await POST(assistantRequest(requestId));
    const second = await POST(assistantRequest(requestId));
    expect(runAssistant).toHaveBeenCalledTimes(1);

    release();
    const [firstBody, secondBody] = await Promise.all([first.text(), second.text()]);
    for (const body of [firstBody, secondBody]) {
      expect(body.match(/event: delta/g)).toHaveLength(1);
      expect(body).toContain("Resposta única e validada.");
      expect(body).toContain("event: result");
    }
  });

  it("rejects reuse of a live request id with a different payload", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    runAssistant.mockImplementation(async (request) => {
      await gate;
      return { message: "OK", meta: { source: "remote", latencyMs: 1, attempts: 1, requestId: request.requestId } };
    });

    const requestId = `request-sse-${Date.now()}-conflict`;
    const first = await POST(assistantRequest(requestId, "Primeira mensagem"));
    const conflict = await POST(assistantRequest(requestId, "Outra mensagem"));
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: { code: "request_conflict" } });

    release();
    await first.text();
  });
});
