import { afterEach, describe, expect, it } from "vitest";
import { normalizeApiBase } from "@/services/api-config";
import { shouldRetryWithoutJsonSchema } from "@/services/openrouter-compat";

describe("API configuration", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it("aceita HTTPS e rejeita HTTP remoto", () => {
    expect(normalizeApiBase("https://nexus.example.com/")).toBe("https://nexus.example.com");
    expect(normalizeApiBase("http://evil.example.com")).toBeNull();
    expect(normalizeApiBase("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("detecta provedor sem suporte a JSON Schema", () => {
    expect(shouldRetryWithoutJsonSchema(new Error("400 response_format unsupported"))).toBe(true);
    expect(shouldRetryWithoutJsonSchema({ status: 422 })).toBe(true);
    expect(shouldRetryWithoutJsonSchema({ status: 401 })).toBe(false);
  });
});
