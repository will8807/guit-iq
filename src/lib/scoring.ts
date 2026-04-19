/**
 * lib/scoring.ts
 *
 * Pure scoring utilities for GuitIQ sessions.
 * No side-effects — all functions are deterministic given the same inputs.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionScore {
  /** Number of correctly answered challenges */
  correct: number;
  /** Total challenges attempted */
  total: number;
  /** Accuracy as an integer percentage 0–100 */
  accuracy: number;
  /** Session duration in milliseconds */
  durationMs: number;
  /** Longest correct-answer streak within the session */
  bestStreak: number;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Calculate the summary score for a completed session.
 *
 * @param correct   Number of correct answers
 * @param total     Total number of attempts
 * @param durationMs Elapsed time in ms from first challenge to session end
 * @param bestStreak Longest consecutive-correct streak within the session
 */
export function calculateSessionScore(
  correct: number,
  total: number,
  durationMs: number,
  bestStreak: number,
): SessionScore {
  if (correct < 0) throw new Error("correct must be >= 0");
  if (total < 0) throw new Error("total must be >= 0");
  if (correct > total) throw new Error("correct cannot exceed total");
  if (durationMs < 0) throw new Error("durationMs must be >= 0");
  if (bestStreak < 0) throw new Error("bestStreak must be >= 0");

  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  return { correct, total, accuracy, durationMs, bestStreak };
}

/**
 * Format a duration in ms as a human-readable string (e.g. "1m 23s", "45s").
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
