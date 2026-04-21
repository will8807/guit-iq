import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStore, computeStreak, toUtcDateString } from "./progressStore";
import type { AnswerHistory } from "@/lib/difficulty/difficultyEngine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAnswers(
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

// Reset store before each test
beforeEach(() => {
  useProgressStore.setState({
    sessions: [],
    answerHistory: [],
    currentStreak: 0,
    bestStreak: 0,
    totalSessions: 0,
    accuracyByType: {},
  });
});

// ─── toUtcDateString ──────────────────────────────────────────────────────────

describe("toUtcDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = toUtcDateString(new Date("2026-04-20T12:00:00Z"));
    expect(result).toBe("2026-04-20");
  });
});

// ─── computeStreak ────────────────────────────────────────────────────────────

describe("computeStreak", () => {
  it("returns 1 when there is no previous session", () => {
    expect(computeStreak(0, null, "2026-04-20")).toBe(1);
  });

  it("returns current streak unchanged on the same day", () => {
    expect(computeStreak(5, "2026-04-20", "2026-04-20")).toBe(5);
  });

  it("increments streak on consecutive day", () => {
    expect(computeStreak(3, "2026-04-19", "2026-04-20")).toBe(4);
  });

  it("resets streak to 1 when a day is missed", () => {
    expect(computeStreak(7, "2026-04-18", "2026-04-20")).toBe(1);
  });

  it("resets streak to 1 on a large gap", () => {
    expect(computeStreak(30, "2026-01-01", "2026-04-20")).toBe(1);
  });

  it("handles month boundary correctly (consecutive)", () => {
    expect(computeStreak(2, "2026-03-31", "2026-04-01")).toBe(3);
  });

  it("handles year boundary correctly (consecutive)", () => {
    expect(computeStreak(10, "2025-12-31", "2026-01-01")).toBe(11);
  });
});

// ─── recordSession ────────────────────────────────────────────────────────────

describe("recordSession", () => {
  it("records the first session correctly", () => {
    const answers = makeAnswers(8, 0.75);
    useProgressStore.getState().recordSession(answers, "2026-04-20");
    const state = useProgressStore.getState();

    expect(state.totalSessions).toBe(1);
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.date).toBe("2026-04-20");
    expect(state.sessions[0]!.correct).toBe(6);
    expect(state.sessions[0]!.total).toBe(8);
    expect(state.sessions[0]!.accuracy).toBeCloseTo(0.75);
  });

  it("starts streak at 1 for first session", () => {
    useProgressStore.getState().recordSession(makeAnswers(5, 1.0), "2026-04-20");
    expect(useProgressStore.getState().currentStreak).toBe(1);
  });

  it("increments streak on consecutive days", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(5, 1.0), "2026-04-19");
    recordSession(makeAnswers(5, 1.0), "2026-04-20");
    expect(useProgressStore.getState().currentStreak).toBe(2);
  });

  it("does NOT increment streak when replaying on the same day", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(5, 1.0), "2026-04-20");
    recordSession(makeAnswers(5, 1.0), "2026-04-20");
    expect(useProgressStore.getState().currentStreak).toBe(1);
    // Session list should still have 1 entry (updated in-place)
    expect(useProgressStore.getState().sessions).toHaveLength(1);
  });

  it("resets streak when a day is missed", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(5, 1.0), "2026-04-18");
    recordSession(makeAnswers(5, 1.0), "2026-04-20"); // gap
    expect(useProgressStore.getState().currentStreak).toBe(1);
  });

  it("updates bestStreak when currentStreak exceeds it", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(5, 1.0), "2026-04-18");
    recordSession(makeAnswers(5, 1.0), "2026-04-19");
    recordSession(makeAnswers(5, 1.0), "2026-04-20");
    const state = useProgressStore.getState();
    expect(state.currentStreak).toBe(3);
    expect(state.bestStreak).toBe(3);
  });

  it("bestStreak is preserved after streak resets", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(5, 1.0), "2026-04-18");
    recordSession(makeAnswers(5, 1.0), "2026-04-19");
    recordSession(makeAnswers(5, 1.0), "2026-04-20");
    // Miss a day
    recordSession(makeAnswers(5, 1.0), "2026-04-22");
    const state = useProgressStore.getState();
    expect(state.currentStreak).toBe(1);
    expect(state.bestStreak).toBe(3);
  });

  it("accumulates answer history up to 100 entries", () => {
    const { recordSession } = useProgressStore.getState();
    // Record 3 sessions of 40 answers each (120 total)
    recordSession(makeAnswers(40, 1.0), "2026-04-18");
    recordSession(makeAnswers(40, 1.0), "2026-04-19");
    recordSession(makeAnswers(40, 1.0), "2026-04-20");
    expect(useProgressStore.getState().answerHistory).toHaveLength(100);
  });

  it("accumulates sessions up to 100 entries", () => {
    const { recordSession } = useProgressStore.getState();
    for (let i = 0; i < 105; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i));
      recordSession(makeAnswers(5, 1.0), toUtcDateString(date));
    }
    expect(useProgressStore.getState().sessions).toHaveLength(100);
  });

  it("tracks accuracyByType correctly", () => {
    const notes = makeAnswers(10, 1.0, "find-the-note");
    const intervals = makeAnswers(10, 0.5, "find-the-interval");
    useProgressStore.getState().recordSession([...notes, ...intervals], "2026-04-20");

    const { accuracyByType } = useProgressStore.getState();
    expect(accuracyByType["find-the-note"]!.correct).toBe(10);
    expect(accuracyByType["find-the-note"]!.total).toBe(10);
    expect(accuracyByType["find-the-interval"]!.correct).toBe(5);
    expect(accuracyByType["find-the-interval"]!.total).toBe(10);
  });

  it("accumulates accuracyByType across multiple sessions", () => {
    const { recordSession } = useProgressStore.getState();
    recordSession(makeAnswers(10, 1.0, "find-the-note"), "2026-04-19");
    recordSession(makeAnswers(10, 0.0, "find-the-note"), "2026-04-20");

    const { accuracyByType } = useProgressStore.getState();
    expect(accuracyByType["find-the-note"]!.correct).toBe(10);
    expect(accuracyByType["find-the-note"]!.total).toBe(20);
  });

  it("handles empty answers array gracefully", () => {
    useProgressStore.getState().recordSession([], "2026-04-20");
    const state = useProgressStore.getState();
    expect(state.totalSessions).toBe(1);
    expect(state.sessions[0]!.accuracy).toBe(0);
  });
});

// ─── clearProgress ────────────────────────────────────────────────────────────

describe("clearProgress", () => {
  it("resets all state to initial values", () => {
    const { recordSession, clearProgress } = useProgressStore.getState();
    recordSession(makeAnswers(8, 1.0), "2026-04-20");
    clearProgress();

    const state = useProgressStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.answerHistory).toHaveLength(0);
    expect(state.currentStreak).toBe(0);
    expect(state.bestStreak).toBe(0);
    expect(state.totalSessions).toBe(0);
    expect(Object.keys(state.accuracyByType)).toHaveLength(0);
  });
});
