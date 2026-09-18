import { describe, it, expect } from "vitest";
import { todayStr, shiftDay } from "./profile";

describe("todayStr", () => {
  it("formats a date as YYYY-MM-DD with zero-padding", () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayStr(new Date(2026, 10, 30))).toBe("2026-11-30");
  });
});

describe("shiftDay", () => {
  it("moves forward and backward by the given number of days", () => {
    expect(shiftDay("2026-03-15", 1)).toBe("2026-03-16");
    expect(shiftDay("2026-03-15", -1)).toBe("2026-03-14");
  });

  it("rolls over month boundaries", () => {
    expect(shiftDay("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDay("2026-02-01", -1)).toBe("2026-01-31");
  });

  it("rolls over year boundaries", () => {
    expect(shiftDay("2025-12-31", 1)).toBe("2026-01-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("is a no-op for delta 0", () => {
    expect(shiftDay("2026-06-15", 0)).toBe("2026-06-15");
  });
});
