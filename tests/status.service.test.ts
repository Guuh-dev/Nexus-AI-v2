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
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              configured: true,
              primaryModel: "openrouter/free",
              fallback: "local",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const status = await getIntelligenceStatus();
    expect(status?.configured).toBe(true);
    expect(status?.assistantAvailable).toBe(false);
  });

  it("accepts the V2.1 assistant API", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              configured: true,
              primaryModel: "openrouter/free",
              fallback: "local",
              apiVersion: "2.1",
              assistantAvailable: true,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const status = await getIntelligenceStatus();
    expect(status?.assistantAvailable).toBe(true);
  });
  it("runs a deep provider probe with POST and exposes model latency", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) =>
        new Response(
          JSON.stringify({
            configured: true,
            primaryModel: "openrouter/free",
            fallback: "local",
            apiVersion: "2.1.3",
            assistantAvailable: true,
            probe: {
              ok: true,
              model: "free/model",
              latencyMs: 420,
              checkedAt: "2026-07-12T12:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const status = await getIntelligenceStatus(undefined, true);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(status?.probeOk).toBe(true);
    expect(status?.probeModel).toBe("free/model");
    expect(status?.probeLatencyMs).toBe(420);
  });
});
