import { afterEach, describe, expect, it, vi } from "vitest";
import { generateLocalPlan, generatePlan } from "@/services/planning.service";
import { aiDailyPlanSchema, extractJson, hydrateAiPlan, parseAiDailyPlan } from "@/schemas/daily-plan.schema";
import { makeProfile } from "@/tests/fixtures";

describe("planning", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a useful bounded local plan", () => {
    const request = { profile: makeProfile(), date: "2026-07-10", requestId: "request-local-123", clientId: "install-test-123" };
    const plan = generateLocalPlan(request);
    expect(plan.source).toBe("offline");
    expect(plan.tasks).toHaveLength(4);
    expect(new Set(plan.tasks.map((task) => task.title)).size).toBe(plan.tasks.length);
    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(720);
    expect(plan.mainMission.xp).toBe(75);
  });

  it("extracts fenced JSON and normalizes a safe daily plan", () => {
    const raw = `\`\`\`json\n${JSON.stringify({
      date: "2026-07-10",
      mainMission: { title: "Enviar proposta", description: "Finalizar e enviar uma proposta concreta.", estimatedMinutes: 40, priority: "alta" },
      tasks: [{ title: "Revisar portfólio", category: "desenvolvimento", priority: "media", estimatedMinutes: 25, xp: 99, recurring: false }],
      focusMessage: "Execute antes de consumir.",
      avoidToday: ["Distrações"],
      totalEstimatedMinutes: 65,
    })}\n\`\`\``;
    expect(extractJson(raw)).toBeTruthy();
    const parsed = parseAiDailyPlan(raw);
    const hydrated = hydrateAiPlan(parsed, { date: "2026-07-10", requestId: "request-ai-123" });
    expect(hydrated.tasks[0]?.id).toMatch(/^task-/);
    expect(hydrated.tasks[0]?.xp).toBe(30);
    expect(hydrated.source).toBe("ai");
  });

  it("rejects unsafe extra AI fields", () => {
    const invalid = {
      date: "2026-07-10",
      mainMission: { title: "Missão", description: "Descrição", estimatedMinutes: 20, priority: "alta", execute: "code" },
      tasks: [], focusMessage: "Foco", avoidToday: [], totalEstimatedMinutes: 20,
    };
    expect(aiDailyPlanSchema.safeParse(invalid).success).toBe(false);
  });

  it("deduplicates AI task IDs and titles before hydration", () => {
    const raw = JSON.stringify({
      date: "2026-07-10",
      mainMission: { title: "Missão", description: "Descrição segura", estimatedMinutes: 20, priority: "alta" },
      tasks: [
        { id: "same", title: "Enviar proposta", category: "dinheiro", priority: "alta", estimatedMinutes: 20, xp: 50, recurring: false },
        { id: "same", title: "Enviar proposta", category: "dinheiro", priority: "media", estimatedMinutes: 10, xp: 30, recurring: false },
      ],
      focusMessage: "Execute.", avoidToday: [], totalEstimatedMinutes: 50,
    });
    const parsed = parseAiDailyPlan(raw);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0]?.id).toBe("same");
  });

  it("stops a timed out request and returns the local fallback", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));
    const response = await generatePlan(
      { profile: makeProfile(), date: "2026-07-10", requestId: "request-timeout-123", clientId: "install-test-123" },
      { timeoutMs: 50 },
    );
    expect(response.plan.source).toBe("offline");
    expect(response.warning).toMatch(/demorou|offline/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a temporary server failure exactly once", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: { code: "provider_unavailable", message: "Indisponível" } }),
      { status: 503, headers: { "content-type": "application/json" } },
    )));
    const response = await generatePlan(
      { profile: makeProfile(), date: "2026-07-10", requestId: "request-retry-123", clientId: "install-test-123" },
      { timeoutMs: 500 },
    );
    expect(response.plan.source).toBe("offline");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a missing server key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: { code: "missing_key", message: "A inteligência do Nexus ainda não foi configurada." } }),
      { status: 503, headers: { "content-type": "application/json" } },
    )));
    const response = await generatePlan(
      { profile: makeProfile(), date: "2026-07-10", requestId: "request-key-123", clientId: "install-test-123" },
      { timeoutMs: 50 },
    );
    expect(response.plan.source).toBe("offline");
    expect(response.warning).toMatch(/não foi configurada/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
