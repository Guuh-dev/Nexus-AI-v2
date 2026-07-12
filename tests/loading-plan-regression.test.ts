import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("post-onboarding plan generation recovery", () => {
  const provider = readFileSync("providers/NexusProvider.tsx", "utf8");
  const route = readFileSync("app/loading-plan.tsx", "utf8");
  const loading = readFileSync("components/LoadingPlan.tsx", "utf8");

  it("does not cancel generation when the loading stage rerenders", () => {
    expect(route).not.toMatch(/useEffect\(\(\) => \(\) =>[\s\S]{0,240}cancelPlanGeneration/);
    expect(provider).toContain("const cancelPlanGeneration = useCallback");
  });

  it("has an absolute watchdog and local recovery", () => {
    expect(provider).toContain("50_000");
    expect(provider).toContain('generationCancelReason.current = "watchdog"');
    expect(provider).toContain("commitLocalPlan(profile, message)");
    expect(provider).toContain('reason === "recovery"');
  });

  it("offers retry and immediate local continuation", () => {
    expect(loading).toContain('label="Tentar novamente"');
    expect(loading).toContain('label="Continuar com plano local"');
    expect(route).toContain("retryPlanGeneration");
    expect(route).toContain("recoverPlanLocally");
  });
});
