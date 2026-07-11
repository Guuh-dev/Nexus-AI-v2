import { describe, expect, it } from "vitest";
import { calculateLevel, focusXpForSeconds, levelTitle, xpNeededForLevel } from "@/utils/levels";

describe("levels", () => {
  it("uses deterministic progressive thresholds", () => {
    expect(xpNeededForLevel(1)).toBe(0);
    expect(xpNeededForLevel(2)).toBe(100);
    expect(xpNeededForLevel(3)).toBe(225);
    expect(xpNeededForLevel(10)).toBeGreaterThan(xpNeededForLevel(9));
    expect(calculateLevel(0)).toMatchObject({ level: 1, title: "Iniciante", progress: 0 });
    expect(calculateLevel(100).level).toBe(2);
  });

  it("assigns the milestone titles", () => {
    expect(levelTitle(5)).toBe("Construtor");
    expect(levelTitle(10)).toBe("Executor");
    expect(levelTitle(20)).toBe("Arquiteto");
    expect(levelTitle(35)).toBe("Elite");
    expect(levelTitle(50)).toBe("Nexus");
  });

  it("caps focus XP and never returns negatives", () => {
    expect(focusXpForSeconds(-10)).toBe(0);
    expect(focusXpForSeconds(25 * 60)).toBe(25);
    expect(focusXpForSeconds(24 * 60 * 60)).toBe(50);
  });
});
