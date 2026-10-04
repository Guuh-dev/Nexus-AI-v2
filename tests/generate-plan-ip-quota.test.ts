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

function planRequest(index: number, ip: string): Request {
  const clientId = `rotating-client-${index}`;
  return new Request("https://nexus.example/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Nexus-Client-Id": clientId, "CF-Connecting-IP": ip },
    body: JSON.stringify({
      profile: makeProfile(),
      date: "2026-07-13",
      requestId: `request-ip-quota-${index}`,
      clientId,
      context: { reason: "Planejamento inicial" },
    }),
  });
}

describe("generate plan API IP quota", () => {
  it("does not let one address multiply its quota by rotating client IDs", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    generatePlanWithOpenRouter.mockImplementation(async (request) => ({
      plan: generateLocalPlan(request),
      model: "test/planning-model",
      repaired: false,
    }));
    const statuses: number[] = [];
    for (let index = 0; index < 22; index += 1) {
      statuses.push((await POST(planRequest(index, "203.0.113.7"))).status);
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);

    const otherAddress = await POST(planRequest(100, "198.51.100.9"));
    expect(otherAddress.status).toBe(200);
  });
});
