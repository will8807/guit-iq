/**
 * lib/session/sessionGenerator.ts
 *
 * Generates a typed queue of challenges for a single GuitIQ session.
 *
 * Design:
 *   - A session is an ordered array of Challenge objects, pre-generated before
 *     the session starts so the UI can show progress ("3 / 8") without recalculating.
 *   - Challenge is a discriminated union keyed on `type`:
 *       "find-the-note"     → FindTheNoteChallenge (+ type tag)
 *       "find-the-interval" → IntervalChallenge    (+ type tag)
 *   - SessionConfig controls length, difficulty, and the fraction of interval
 *     challenges (intervalMix, 0 = none, 1 = all, default 0 = note-only for now).
 *   - The generated queue is shuffled so challenge types are interleaved.
 */

import {
  generateWeightedChallenge,
  type FindTheNoteChallenge,
  type NoteStats,
  type Difficulty,
} from "@/lib/challenges/findTheNote";
import {
  generateIntervalChallenge,
  type IntervalChallenge,
} from "@/lib/challenges/findTheInterval";

// ─── Discriminated union ──────────────────────────────────────────────────────

/** Find-the-Note challenge with an explicit type discriminant */
export type TaggedNoteChallenge = FindTheNoteChallenge & { type: "find-the-note" };

/** Find-the-Interval challenge with an explicit type discriminant */
export type TaggedIntervalChallenge = IntervalChallenge & { type: "find-the-interval" };

/** Union of all challenge types the session can contain */
export type Challenge = TaggedNoteChallenge | TaggedIntervalChallenge;

// ─── Config ───────────────────────────────────────────────────────────────────

export interface SessionConfig {
  /** Total number of challenges in the session (default: 8) */
  length?: number;
  /** Difficulty level applied to all challenges (default: "easy") */
  difficulty?: Difficulty;
  /**
   * Fraction of challenges that should be interval challenges, 0–1 (default: 0).
   * 0   = all "Find the Note"
   * 0.5 = 50/50 mix
   * 1   = all "Find the Interval"
   * The actual count is rounded to the nearest integer.
   */
  intervalMix?: number;
  /**
   * Per-note adaptive stats passed through to the weighted note generator.
   * Leave empty for uniform random selection.
   */
  noteStats?: Record<string, NoteStats>;
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate a pre-built session queue of `length` challenges.
 *
 * @param config Session configuration (all fields optional with sensible defaults).
 * @returns Shuffled array of Challenge objects ready to be consumed in order.
 */
export function generateSession(config: SessionConfig = {}): Challenge[] {
  const {
    length = 8,
    difficulty = "easy",
    intervalMix = 0,
    noteStats = {},
  } = config;

  if (length < 1) throw new Error("Session length must be >= 1");
  if (intervalMix < 0 || intervalMix > 1)
    throw new Error("intervalMix must be between 0 and 1");

  const intervalCount = Math.round(length * intervalMix);
  const noteCount = length - intervalCount;

  const challenges: Challenge[] = [];

  for (let i = 0; i < noteCount; i++) {
    const base = generateWeightedChallenge(difficulty, noteStats);
    challenges.push({ ...base, type: "find-the-note" });
  }

  for (let i = 0; i < intervalCount; i++) {
    const base = generateIntervalChallenge(difficulty);
    challenges.push({ ...base, type: "find-the-interval" });
  }

  // Fisher-Yates shuffle so the types are interleaved, not blocked
  for (let i = challenges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // biome-ignore lint/style/noNonNullAssertion: bounds guaranteed by loop
    [challenges[i], challenges[j]] = [challenges[j]!, challenges[i]!];
  }

  return challenges;
}
