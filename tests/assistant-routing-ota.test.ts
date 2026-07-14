import { describe, expect, it } from "vitest";
import {
  PRIMARY_MODEL,
  PRIMARY_MODEL_CANONICAL,
  SECONDARY_MODEL,
  assertModelSupportsMode,
  forbiddenModelReason,
  modelSupportsMode,
} from "@/constants/models";
import {
  assistantModelOrder,
  hasExplicitCommercialIntent,
} from "@/services/assistant.server";

describe("assistant capability routing v3", () => {
  it("uses two explicit compatible production models and never a random router", () => {
    const order = assistantModelOrder("brain", {});
    expect(order).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(order).not.toContain("openrouter/free");
  });

  it("ignores unknown and non-conversational configured models", () => {
    expect(
      assistantModelOrder("brain", {
        OPENROUTER_FAST_MODELS: [
          "nvidia/nemotron-3.5-content-safety:free",
          "vendor/embedding-model:free",
          "acme/unknown-chat:free",
        ].join(","),
      }),
    ).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
  });

  it("deduplicates repeated allowlisted models without changing variants", () => {
    expect(
      assistantModelOrder("professor", {
        OPENROUTER_FAST_MODELS: `${SECONDARY_MODEL},${SECONDARY_MODEL}`,
      }),
    ).toEqual([SECONDARY_MODEL, PRIMARY_MODEL]);
  });

  it("allows only exact production IDs from configuration", () => {
    expect(
      assistantModelOrder("brain", {
        OPENROUTER_FAST_MODELS: PRIMARY_MODEL,
      }),
    ).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(
      assistantModelOrder("brain", {
        OPENROUTER_FAST_MODELS: SECONDARY_MODEL,
      }),
    ).toEqual([SECONDARY_MODEL, PRIMARY_MODEL]);
  });

  it.each([
    "openrouter/free",
    "nvidia/nemotron-content-safety:free",
    "vendor/moderation-v2",
    "vendor/text-classifier",
    "vendor/llm-guard",
    "vendor/embedding-small",
    "vendor/reranker-large",
    "vendor/image-only",
    "vendor/vision-only",
  ])("blocks incompatible identifier %s", (model) => {
    expect(forbiddenModelReason(model)).not.toBeNull();
    expect(modelSupportsMode(model, "brain")).toBe(false);
    expect(() => assertModelSupportsMode(model, "brain")).toThrow(
      /NEXUS_MODEL_BLOCKED/,
    );
  });

  it("accepts only allowlisted models with every capability required by a mode", () => {
    expect(modelSupportsMode(PRIMARY_MODEL, "brain")).toBe(true);
    expect(modelSupportsMode(PRIMARY_MODEL_CANONICAL, "brain")).toBe(true);
    expect(modelSupportsMode(`${PRIMARY_MODEL_CANONICAL}-lookalike`, "brain")).toBe(false);
    expect(modelSupportsMode(PRIMARY_MODEL, "roadmap")).toBe(true);
    expect(modelSupportsMode(PRIMARY_MODEL, "weekly_review")).toBe(true);
    expect(modelSupportsMode(PRIMARY_MODEL, "safety")).toBe(false);
  });

  it("keeps technical topics separate from explicit commercial intent", () => {
    expect(hasExplicitCommercialIntent("Programação")).toBe(false);
    expect(hasExplicitCommercialIntent("Programação com IA")).toBe(false);
    expect(hasExplicitCommercialIntent("Vender Landing Pages para clientes")).toBe(true);
  });
});
