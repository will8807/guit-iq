import { describe, it, expect } from "vitest";
import { calculateSessionScore, formatDuration } from "./scoring";

describe("calculateSessionScore", () => {
  it("returns 100% accuracy for perfect session", () => {
    const s = calculateSessionScore(8, 8, 120_000, 8);
    expect(s.correct).toBe(8);
    expect(s.total).toBe(8);
    expect(s.accuracy).toBe(100);
    expect(s.durationMs).toBe(120_000);
    expect(s.bestStreak).toBe(8);
  });

  it("returns 0% accuracy for all wrong", () => {
    const s = calculateSessionScore(0, 8, 60_000, 0);
    expect(s.accuracy).toBe(0);
  });

  it("rounds accuracy to nearest integer", () => {
    // 1/3 ≈ 33.33 → 33
    expect(calculateSessionScore(1, 3, 0, 1).accuracy).toBe(33);
    // 2/3 ≈ 66.67 → 67
    expect(calculateSessionScore(2, 3, 0, 2).accuracy).toBe(67);
  });

  it("returns 0% accuracy when total is 0 (no division by zero)", () => {
    const s = calculateSessionScore(0, 0, 0, 0);
    expect(s.accuracy).toBe(0);
    expect(s.total).toBe(0);
  });

  it("throws when correct > total", () => {
    expect(() => calculateSessionScore(5, 3, 0, 0)).toThrow();
  });

  it("throws on negative correct", () => {
    expect(() => calculateSessionScore(-1, 3, 0, 0)).toThrow();
  });

  it("throws on negative total", () => {
    expect(() => calculateSessionScore(0, -1, 0, 0)).toThrow();
  });

  it("throws on negative durationMs", () => {
    expect(() => calculateSessionScore(0, 0, -1, 0)).toThrow();
  });

  it("throws on negative bestStreak", () => {
    expect(() => calculateSessionScore(0, 0, 0, -1)).toThrow();
  });
});

describe("formatDuration", () => {
  it("formats seconds only when < 60s", () => {
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatDuration(1_000)).toBe("1s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(83_000)).toBe("1m 23s");
    expect(formatDuration(120_000)).toBe("2m 0s");
  });

  it("rounds to nearest second", () => {
    expect(formatDuration(1_499)).toBe("1s");
    expect(formatDuration(1_500)).toBe("2s");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("handles negative (returns 0s)", () => {
    expect(formatDuration(-1000)).toBe("0s");
  });
});
