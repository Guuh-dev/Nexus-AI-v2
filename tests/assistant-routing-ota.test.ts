import { describe, expect, it } from "vitest";
import { assistantModelOrder } from "@/services/assistant.server";

describe("assistant free routing OTA", () => {
  it("uses the free router exactly once by default", () => {
    expect(assistantModelOrder("brain", {})).toEqual(["openrouter/free"]);
  });

  it("prefers unique explicit free models and keeps the router as fallback", () => {
    expect(assistantModelOrder("brain", {
      OPENROUTER_FAST_MODELS: "acme/fast:free, openrouter/free, acme/fast:free",
    })).toEqual(["acme/fast:free", "openrouter/free"]);
  });

  it("does not silently enable a paid model", () => {
    expect(assistantModelOrder("professor", {
      OPENROUTER_FAST_MODELS: "vendor/paid-model, vendor/safe:free",
    })).toEqual(["vendor/safe:free", "openrouter/free"]);
  });

  it("only enables the configured paid fallback with explicit consent", () => {
    expect(assistantModelOrder("brain", {
      OPENROUTER_FAST_MODELS: "vendor/paid-model",
      OPENROUTER_ALLOW_PAID_FALLBACK: "true",
    })).toEqual([
      "vendor/paid-model",
      "openrouter/free",
      "deepseek/deepseek-v4-flash",
    ]);
  });
});
