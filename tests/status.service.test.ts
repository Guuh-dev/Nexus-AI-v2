import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntelligenceStatus } from "@/services/status.service";

const originalUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

describe("intelligence status compatibility", () => {
  it("marks an unversioned V1 backend as incompatible", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ configured: true, primaryModel: "openrouter/free", fallback: "local" }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const status = await getIntelligenceStatus();
    expect(status?.configured).toBe(true);
    expect(status?.assistantAvailable).toBe(false);
  });

  it("accepts the V2.1 assistant API", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ configured: true, primaryModel: "openrouter/free", fallback: "local", apiVersion: "2.1", assistantAvailable: true }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const status = await getIntelligenceStatus();
    expect(status?.assistantAvailable).toBe(true);
  });
});
