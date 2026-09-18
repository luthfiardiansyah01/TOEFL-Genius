import { describe, it, expect } from "vitest";
import { xpForLevel, levelFromXp, levelTitle, XP_REWARDS } from "./constants";

describe("xpForLevel", () => {
  it("increases as level increases", () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5));
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 xp", () => {
    const result = levelFromXp(0);
    expect(result.level).toBe(1);
    expect(result.intoLevel).toBe(0);
    expect(result.progressPct).toBe(0);
  });

  it("advances a level once enough xp is earned", () => {
    const level1Need = xpForLevel(1);
    const justBelow = levelFromXp(level1Need - 1);
    const exact = levelFromXp(level1Need);
    expect(justBelow.level).toBe(1);
    expect(exact.level).toBe(2);
    expect(exact.intoLevel).toBe(0);
  });

  it("never reports progressPct above 100", () => {
    for (const xp of [0, 50, 500, 5000, 50000]) {
      expect(levelFromXp(xp).progressPct).toBeLessThanOrEqual(100);
    }
  });

  it("is monotonic: more xp never yields a lower level", () => {
    let prevLevel = levelFromXp(0).level;
    for (let xp = 0; xp <= 20000; xp += 137) {
      const level = levelFromXp(xp).level;
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});

describe("levelTitle", () => {
  it("maps level thresholds to the right title", () => {
    expect(levelTitle(1)).toBe("Beginner");
    expect(levelTitle(2)).toBe("Apprentice");
    expect(levelTitle(4)).toBe("Intermediate");
    expect(levelTitle(7)).toBe("Advanced");
    expect(levelTitle(12)).toBe("Expert");
    expect(levelTitle(18)).toBe("Master");
    expect(levelTitle(25)).toBe("Grandmaster");
    expect(levelTitle(100)).toBe("Grandmaster");
  });
});

describe("XP_REWARDS.streakBonus", () => {
  it("scales with streak length", () => {
    expect(XP_REWARDS.streakBonus(1)).toBe(3);
    expect(XP_REWARDS.streakBonus(5)).toBe(15);
  });

  it("caps at 50", () => {
    expect(XP_REWARDS.streakBonus(20)).toBe(50);
    expect(XP_REWARDS.streakBonus(1000)).toBe(50);
  });
});
