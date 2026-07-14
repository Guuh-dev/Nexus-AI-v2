import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/generate-plan+api";
import { generateLocalPlan } from "@/services/planning.service";
import { makeProfile } from "@/tests/fixtures";

const generatePlanWithOpenRouter = vi.hoisted(() => vi.fn());

vi.mock("@/services/openrouter.server", () => ({ generatePlanWithOpenRouter }));

const originalKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  generatePlanWithOpenRouter.mockReset();
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

function planRequest(
  requestId: string,
  overrides: { date?: string; reason?: string; reverseKeys?: boolean } = {},
): Request {
  const body = {
    profile: makeProfile(),
    date: overrides.date ?? "2026-07-13",
    requestId,
    clientId: "install-plan-idempotency",
    context: { reason: overrides.reason ?? "Planejamento inicial" },
  };
  const payload = overrides.reverseKeys
    ? Object.fromEntries(Object.entries(body).reverse())
    : body;
  return new Request("https://nexus.example/api/generate-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Nexus-Client-Id": "install-plan-idempotency",
    },
    body: JSON.stringify(payload),
  });
}

function successfulGeneration() {
  generatePlanWithOpenRouter.mockImplementation(async (request) => ({
    plan: generateLocalPlan(request),
    model: "test/planning-model",
    repaired: false,
  }));
}

describe("generate plan API idempotency", () => {
  it("replays a cached response for the same validated payload regardless of JSON key order", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    successfulGeneration();
    const requestId = `request-plan-${Date.now()}-cache-replay`;

    const first = await POST(planRequest(requestId));
    const replay = await POST(planRequest(requestId, { reverseKeys: true }));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(await first.json());
    expect(generatePlanWithOpenRouter).toHaveBeenCalledTimes(1);
  });

  it("rejects a cached request id reused with a different validated payload", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    successfulGeneration();
    const requestId = `request-plan-${Date.now()}-cache-conflict`;

    const first = await POST(planRequest(requestId));
    const conflict = await POST(planRequest(requestId, { date: "2026-07-14" }));

    expect(first.status).toBe(200);
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: { code: "request_conflict" } });
    expect(generatePlanWithOpenRouter).toHaveBeenCalledTimes(1);
  });

  it("rejects a live request id reused with a different validated payload", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    generatePlanWithOpenRouter.mockImplementation(async (request) => {
      await gate;
      return {
        plan: generateLocalPlan(request),
        model: "test/planning-model",
        repaired: false,
      };
    });
    const requestId = `request-plan-${Date.now()}-live-conflict`;

    const firstPromise = POST(planRequest(requestId));
    await vi.waitFor(() => expect(generatePlanWithOpenRouter).toHaveBeenCalledTimes(1));
    const conflict = await POST(planRequest(requestId, { reason: "Payload divergente" }));

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: { code: "request_conflict" } });
    expect(generatePlanWithOpenRouter).toHaveBeenCalledTimes(1);

    release();
    expect((await firstPromise).status).toBe(200);
  });
});
