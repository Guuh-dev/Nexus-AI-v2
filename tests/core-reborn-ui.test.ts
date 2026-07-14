import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NEXUS_THEMES } from "@/theme/theme";

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(first: string, second: string): number {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

describe("Core Reborn UI contract", () => {
  it("exposes exactly the five core tabs", () => {
    const layout = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    const names = [...layout.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(names).toEqual(["today", "brain", "focus", "progress", "profile"]);
    expect(layout).not.toMatch(/operations|habits|week|finance/);
  });

  it("does not link retired modules from the primary surfaces", () => {
    const primarySurface = [
      "app/(tabs)/today.tsx",
      "app/(tabs)/focus.tsx",
      "app/(tabs)/progress.tsx",
      "app/(tabs)/profile.tsx",
      "app/customize.tsx",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(primarySurface).not.toMatch(/router\.(?:push|replace)\("\/(?:operations|habits|week|finance)/);
    expect(
      [
        "app/operations.tsx",
        "app/habits.tsx",
        "app/week.tsx",
        "app/finance.tsx",
      ].filter(existsSync),
    ).toEqual([]);
  });

  it("recovers a missing plan directly instead of looping through the splash route", () => {
    const today = readFileSync("app/(tabs)/today.tsx", "utf8");
    const emptyStart = today.indexOf("if (!plan || !data.profile)");
    const emptyEnd = today.indexOf("const saveTask", emptyStart);
    const emptyState = today.slice(emptyStart, emptyEnd);
    expect(emptyState).toContain('router.push("/loading-plan")');
    expect(emptyState).toContain("void recoverPlanLocally()");
    expect(emptyState).toContain('router.replace("/onboarding")');
    expect(emptyState).not.toContain('router.replace("/")');
  });

  it("keeps legacy data read-only while removing its dead Provider mutations", () => {
    const provider = readFileSync("providers/NexusProvider.tsx", "utf8");
    for (const mutation of [
      "createOperation",
      "toggleOperationPhase",
      "createHabit",
      "toggleHabitToday",
      "addWeeklyPlanItem",
      "moveWeeklyPlanItem",
      "updateFinance",
    ]) {
    expect(provider).not.toContain(mutation);
    }
    expect(provider).toContain("restoreMigrationBackup");
    const quickCapture = readFileSync("components/QuickCapture.tsx", "utf8");
    expect(quickCapture).toContain("await saveCapture");
    expect(quickCapture).toContain("INTERPRETAÇÃO LOCAL/OFFLINE");
    expect(quickCapture).toContain('lastAssistantMeta?.source === "local"');
  });

  it("ships six complete themes with readable text and primary actions", () => {
    const themes = Object.values(NEXUS_THEMES);
    expect(themes.map((theme) => theme.id)).toEqual([
      "nexus",
      "amoled",
      "glass",
      "light",
      "pixel",
      "minimal",
    ]);

    const expectedColorTokens = Object.keys(themes[0]!.colors).sort();
    const expectedVisualTokens = Object.keys(themes[0]!.visuals).sort();
    for (const theme of themes) {
      expect(Object.keys(theme.colors).sort()).toEqual(expectedColorTokens);
      expect(Object.keys(theme.visuals).sort()).toEqual(expectedVisualTokens);
      expect(contrast(theme.colors.text, theme.colors.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.text, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.textSecondary, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.primarySoft, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.warning, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.danger, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.onPrimary, theme.colors.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.onSuccess, theme.colors.success)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps required component colors in theme tokens", () => {
    const sources = [
      "components/ui/Card.tsx",
      "components/ui/NexusButton.tsx",
      "components/ui/NexusText.tsx",
      "components/ThemeBackdrop.tsx",
      "components/PixelMascot.tsx",
      "components/CompanionMascot.tsx",
      "components/BrainChatList.tsx",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });
});
