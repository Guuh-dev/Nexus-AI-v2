import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, statusProbeClientKey } from "@/app/api/status+api";
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

  it("rejects a V2 assistant API after the v3 contract change", async () => {
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
              apiVersion: "2.4.0",
              assistantAvailable: true,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const status = await getIntelligenceStatus();
    expect(status?.assistantAvailable).toBe(false);
    expect(status?.errorCode).toBe("incompatible_backend");
  });

  it("accepts the V3 assistant API", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://nexus.example";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              configured: true,
              primaryModel: "deepseek/deepseek-v4-flash",
              fallback: "qwen/qwen3-30b-a3b-instruct-2507",
              apiVersion: "3.0.0",
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
      async (_url: string, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            configured: true,
            primaryModel: "openrouter/free",
            fallback: "local",
            apiVersion: "3.0.0",
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

describe("status API v3", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  });

  it("reports an honest configured capability route without local fallback", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    const response = GET();
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      configured: true,
      apiVersion: "3.0.0",
      assistantAvailable: true,
      service: "nexus-ai-v3",
    });
    expect(body.primaryModel).not.toBe("openrouter/free");
    expect(String(body.fallback)).not.toMatch(/local/i);
    expect(body.capabilities).not.toContain("local-fallback");
  });

  it("keys probe throttling by canonical network identity, not a spoofable client id", () => {
    const first = new Request("https://nexus.example/api/status", {
      headers: {
        "cf-connecting-ip": "203.0.113.42",
        "x-nexus-client-id": "client-one",
      },
    });
    const second = new Request("https://nexus.example/api/status", {
      headers: {
        "cf-connecting-ip": "203.0.113.42",
        "x-nexus-client-id": "client-two",
      },
    });

    expect(statusProbeClientKey(first)).toBe("203.0.113.42");
    expect(statusProbeClientKey(second)).toBe(statusProbeClientKey(first));
  });
});
