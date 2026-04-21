/**
 * Integration test — M5.14
 *
 * Verifies that recording 20 correct answers causes the difficulty engine to
 * recommend a promotion, and that the data flows correctly from progressStore
 * through calculateDifficulty.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStore } from "./progressStore";
import { calculateDifficulty } from "@/lib/difficulty/difficultyEngine";

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

describe("difficulty integration: progressStore + calculateDifficulty", () => {
  it("promotes easy → medium after 20 all-correct answers", () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({
      correct: true,
      challengeType: "find-the-note",
      timestamp: Date.now() + i,
    }));

    useProgressStore.getState().recordSession(answers, "2026-04-20");

    const { answerHistory } = useProgressStore.getState();
    expect(answerHistory).toHaveLength(20);

    const nextDifficulty = calculateDifficulty(answerHistory, "easy");
    expect(nextDifficulty).toBe("medium");
  });

  it("stays at easy after 20 answers at 60% accuracy (no change zone)", () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({
      correct: i < 12, // 60%
      challengeType: "find-the-note",
      timestamp: Date.now() + i,
    }));

    useProgressStore.getState().recordSession(answers, "2026-04-20");

    const { answerHistory } = useProgressStore.getState();
    const nextDifficulty = calculateDifficulty(answerHistory, "easy");
    expect(nextDifficulty).toBe("easy");
  });

  it("demotes medium → easy after 20 all-wrong answers", () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({
      correct: false,
      challengeType: "find-the-note",
      timestamp: Date.now() + i,
    }));

    useProgressStore.getState().recordSession(answers, "2026-04-20");

    const { answerHistory } = useProgressStore.getState();
    const nextDifficulty = calculateDifficulty(answerHistory, "medium");
    expect(nextDifficulty).toBe("easy");
  });

  it("only the most recent 20 answers are used for difficulty calculation", () => {
    // First session: all wrong (40 answers)
    const oldAnswers = Array.from({ length: 40 }, (_, i) => ({
      correct: false,
      challengeType: "find-the-note",
      timestamp: Date.now() + i,
    }));
    useProgressStore.getState().recordSession(oldAnswers, "2026-04-19");

    // Second session: all correct (20 answers)
    const newAnswers = Array.from({ length: 20 }, (_, i) => ({
      correct: true,
      challengeType: "find-the-note",
      timestamp: Date.now() + 1000 + i,
    }));
    useProgressStore.getState().recordSession(newAnswers, "2026-04-20");

    const { answerHistory } = useProgressStore.getState();
    // difficulty engine only uses last 20 → should promote
    const nextDifficulty = calculateDifficulty(answerHistory, "easy");
    expect(nextDifficulty).toBe("medium");
  });
});
