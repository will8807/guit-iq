import { describe, it, expect } from "vitest";
import {
  calculateDifficulty,
  calculateAccuracy,
  type AnswerHistory,
  type Difficulty,
} from "./difficultyEngine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHistory(
  count: number,
  correctRatio: number,
  challengeType = "find-the-note"
): AnswerHistory[] {
  return Array.from({ length: count }, (_, i) => ({
    correct: i < Math.round(count * correctRatio),
    challengeType,
    timestamp: Date.now() + i,
  }));
}

// ─── calculateDifficulty ─────────────────────────────────────────────────────

describe("calculateDifficulty", () => {
  it("returns current difficulty when history is empty", () => {
    expect(calculateDifficulty([], "easy")).toBe("easy");
    expect(calculateDifficulty([], "medium")).toBe("medium");
    expect(calculateDifficulty([], "hard")).toBe("hard");
  });

  it("returns current difficulty when history has fewer than 5 answers", () => {
    const history = makeHistory(4, 1.0);
    expect(calculateDifficulty(history, "easy")).toBe("easy");
  });

  it("promotes easy → medium when accuracy > 80%", () => {
    const history = makeHistory(20, 0.9); // 90 % correct
    expect(calculateDifficulty(history, "easy")).toBe("medium");
  });

  it("promotes medium → hard when accuracy > 80%", () => {
    const history = makeHistory(20, 0.85);
    expect(calculateDifficulty(history, "medium")).toBe("hard");
  });

  it("does NOT promote beyond hard (upper bound)", () => {
    const history = makeHistory(20, 1.0); // 100 % correct
    expect(calculateDifficulty(history, "hard")).toBe("hard");
  });

  it("demotes medium → easy when accuracy < 50%", () => {
    const history = makeHistory(20, 0.3); // 30 % correct
    expect(calculateDifficulty(history, "medium")).toBe("easy");
  });

  it("demotes hard → medium when accuracy < 50%", () => {
    const history = makeHistory(20, 0.4);
    expect(calculateDifficulty(history, "hard")).toBe("medium");
  });

  it("does NOT demote below easy (lower bound)", () => {
    const history = makeHistory(20, 0.0); // 0 % correct
    expect(calculateDifficulty(history, "easy")).toBe("easy");
  });

  it("stays at current level when accuracy is between 50% and 80%", () => {
    const history = makeHistory(20, 0.6); // 60 % — no change
    expect(calculateDifficulty(history, "easy")).toBe("easy");
    expect(calculateDifficulty(history, "medium")).toBe("medium");
    expect(calculateDifficulty(history, "hard")).toBe("hard");
  });

  it("stays at current when accuracy is exactly 80% (not strictly >)", () => {
    // 16/20 = exactly 0.80 → should NOT promote
    const history = makeHistory(20, 0.8);
    expect(calculateDifficulty(history, "easy")).toBe("easy");
  });

  it("stays at current when accuracy is exactly 50% (not strictly <)", () => {
    // 10/20 = exactly 0.50 → should NOT demote
    const history = makeHistory(20, 0.5);
    expect(calculateDifficulty(history, "medium")).toBe("medium");
  });

  it("only considers the most recent 20 answers", () => {
    // First 80 answers are all wrong (old), last 20 are all correct (recent)
    const old = makeHistory(80, 0.0);
    const recent = makeHistory(20, 1.0);
    const history = [...old, ...recent];
    expect(calculateDifficulty(history, "easy")).toBe("medium"); // promotes
  });

  it("works with mixed challenge types", () => {
    const notes = makeHistory(10, 1.0, "find-the-note");
    const intervals = makeHistory(10, 1.0, "find-the-interval");
    expect(calculateDifficulty([...notes, ...intervals], "easy")).toBe("medium");
  });
});

// ─── calculateAccuracy ───────────────────────────────────────────────────────

describe("calculateAccuracy", () => {
  it("returns null for empty history", () => {
    expect(calculateAccuracy([])).toBeNull();
  });

  it("returns null when no answers match the challenge type filter", () => {
    const history = makeHistory(10, 1.0, "find-the-note");
    expect(calculateAccuracy(history, "find-the-interval")).toBeNull();
  });

  it("returns 1.0 for all-correct history", () => {
    expect(calculateAccuracy(makeHistory(10, 1.0))).toBe(1.0);
  });

  it("returns 0 for all-incorrect history", () => {
    expect(calculateAccuracy(makeHistory(10, 0.0))).toBe(0);
  });

  it("filters by challenge type correctly", () => {
    const notes = makeHistory(10, 1.0, "find-the-note");        // 100%
    const intervals = makeHistory(10, 0.0, "find-the-interval"); // 0%
    const history = [...notes, ...intervals];
    expect(calculateAccuracy(history, "find-the-note")).toBe(1.0);
    expect(calculateAccuracy(history, "find-the-interval")).toBe(0);
  });

  it("returns overall accuracy when no type filter given", () => {
    const history = makeHistory(10, 0.5); // 5 correct out of 10
    expect(calculateAccuracy(history)).toBeCloseTo(0.5);
  });
});
