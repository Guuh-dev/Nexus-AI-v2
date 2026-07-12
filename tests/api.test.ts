import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate-plan+api";
import { POST as ASSISTANT_POST } from "@/app/api/assistant+api";
import { makeProfile } from "@/tests/fixtures";

describe("generate plan API", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  });

  it("returns a friendly missing-key response without exposing secrets", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const request = new Request("http://localhost/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: makeProfile(), date: "2026-07-10", requestId: "request-missing-key-123", clientId: "install-test-123" }),
    });
    const response = await POST(request);
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).toContain("A inteligência do Nexus ainda não foi configurada");
    expect(text).not.toContain("OPENROUTER_API_KEY");
  });

  it("rejects malformed and oversized requests", async () => {
    const malformed = await POST(new Request("http://localhost/api/generate-plan", { method: "POST", body: "<html>nope</html>" }));
    expect(malformed.status).toBe(400);
    const oversized = await POST(new Request("http://localhost/api/generate-plan", { method: "POST", headers: { "content-length": "999999" }, body: "{}" }));
    expect(oversized.status).toBe(413);
  });

  it("rejects a mismatched plan client identifier before provider access", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const response = await POST(new Request("http://localhost/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Nexus-Client-Id": "install-header-client" },
      body: JSON.stringify({
        profile: makeProfile(),
        date: "2026-07-10",
        requestId: "request-client-mismatch-456",
        clientId: "install-body-client",
      }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "bad_request" } });
  });

  it("protects the Professor endpoint when the server key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const response = await ASSISTANT_POST(new Request("http://localhost/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "roadmap",
        requestId: "professor-missing-key-123",
        clientId: "install-test-123",
        message: "Quero aprender React Native",
        profile: makeProfile(),
        context: {},
      }),
    }));
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).toContain("A inteligência do Nexus ainda não foi configurada");
    expect(text).not.toContain("OPENROUTER_API_KEY");
  });
});
