import { afterEach, describe, expect, it, vi } from "vitest";
import { askNexus } from "@/services/assistant.service";
import { makeAppData } from "@/tests/fixtures";

const originalUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

describe("assistant fallback 2.1.2", () => {
  it("answers locally as Atlas without creating a new roadmap for ordinary chat", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "provider_unavailable", message: "offline" } }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })));
    const result = await askNexus({
      data: makeAppData(),
      mode: "professor",
      message: "O que eu poderia fazer agora?",
    });
    expect(result.meta?.source).toBe("local");
    expect(result.roadmap).toBeUndefined();
    expect(result.message).toMatch(/Atlas está em modo local/i);
  });
});
