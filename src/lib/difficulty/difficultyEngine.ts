/**
 * lib/difficulty/difficultyEngine.ts
 *
 * Adaptive difficulty engine for GuitIQ.
 *
 * Algorithm:
 *   - Look at the last 20 answers in history.
 *   - If accuracy > 80 % → promote one step (easy → medium → hard)
 *   - If accuracy < 50 % → demote one step  (hard → medium → easy)
 *   - Otherwise → stay
 *   - Never exceeds "hard" or goes below "easy"
 *   - If history is empty (or < 5 answers) → return current unchanged
 */

import type { Difficulty } from "@/lib/challenges/findTheNote";

// ─── Public types ─────────────────────────────────────────────────────────────

export type { Difficulty };

export interface AnswerHistory {
  /** Whether the user got this challenge correct */
  correct: boolean;
  /** "find-the-note" | "find-the-interval" */
  challengeType: string;
  /** Unix timestamp (ms) when the answer was recorded */
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of recent answers to include in the rolling window */
const WINDOW = 20;

/** Minimum answers required before we attempt a difficulty change */
const MIN_ANSWERS = 5;

/** Accuracy threshold above which difficulty increases */
const PROMOTE_THRESHOLD = 0.8;

/** Accuracy threshold below which difficulty decreases */
const DEMOTE_THRESHOLD = 0.5;

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Compute the next difficulty level based on recent answer history.
 *
 * @param history  All recorded answers (only the last `WINDOW` are used).
 * @param current  The difficulty level currently in use.
 * @returns        The recommended next difficulty level.
 */
export function calculateDifficulty(
  history: AnswerHistory[],
  current: Difficulty
): Difficulty {
  const window = history.slice(-WINDOW);

  if (window.length < MIN_ANSWERS) {
    return current;
  }

  const correct = window.filter((a) => a.correct).length;
  const accuracy = correct / window.length;

  const idx = DIFFICULTY_ORDER.indexOf(current);

  if (accuracy > PROMOTE_THRESHOLD) {
    // Promote — capped at "hard"
    return DIFFICULTY_ORDER[Math.min(idx + 1, DIFFICULTY_ORDER.length - 1)] as Difficulty;
  }

  if (accuracy < DEMOTE_THRESHOLD) {
    // Demote — floored at "easy"
    return DIFFICULTY_ORDER[Math.max(idx - 1, 0)] as Difficulty;
  }

  return current;
}

/**
 * Calculate rolling accuracy for a given challenge type (or all types).
 *
 * @param history       Full answer history.
 * @param challengeType If provided, filter to this challenge type only.
 * @returns             Accuracy 0–1, or null if no matching answers exist.
 */
export function calculateAccuracy(
  history: AnswerHistory[],
  challengeType?: string
): number | null {
  const filtered = challengeType
    ? history.filter((a) => a.challengeType === challengeType)
    : history;

  if (filtered.length === 0) return null;

  const correct = filtered.filter((a) => a.correct).length;
  return correct / filtered.length;
}
