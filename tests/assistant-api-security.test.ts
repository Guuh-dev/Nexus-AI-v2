import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/assistant+api";
import { makeProfile } from "@/tests/fixtures";

const originalKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

function requestWith(context: unknown): Request {
  return new Request("https://nexus.example/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Nexus-Client-Id": "install-security-test" },
    body: JSON.stringify({
      mode: "brain",
      requestId: `request-${Math.random().toString(36).slice(2)}-security`,
      clientId: "install-security-test",
      message: "Organize meu dia",
      profile: makeProfile(),
      context,
    }),
  });
}

describe("assistant API security", () => {
  it("rejects prototype-related keys before calling a provider", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    const unsafe = JSON.parse('{"today":{},"__proto__":{"polluted":true}}') as unknown;
    const response = await POST(requestWith(unsafe));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "bad_request" } });
  });

  it("rejects excessive context depth", async () => {
    process.env.OPENROUTER_API_KEY = "test-key-not-real";
    let context: unknown = "end";
    for (let index = 0; index < 12; index += 1) context = { next: context };
    const response = await POST(requestWith(context));
    expect(response.status).toBe(400);
  });

  it("does not expose stack traces when the key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const response = await POST(requestWith({ today: null }));
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).not.toMatch(/stack|OPENROUTER_API_KEY|at\s+\w+/i);
  });
});
