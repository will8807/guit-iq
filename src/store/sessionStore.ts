/**
 * store/sessionStore.ts
 *
 * Zustand store managing the full session lifecycle.
 *
 * State machine:
 *
 *   idle ──startChallenge()──► playing ──noteReady()──► awaiting
 *     ▲                                                      │
 *     │                                              submitAnswer()
 *   startSession()                                           │
 *     │                                                      ▼
 *     └── (queue not exhausted) ── nextChallenge() ◄── feedback
 *                                        │
 *                                  (queue exhausted)
 *                                        │
 *                                     complete
 *
 * "playing"  = audio is currently being played to the user
 * "awaiting" = audio done, fretboard is active, waiting for tap
 * "feedback" = result shown (correct / incorrect + revealed positions)
 * "complete" = session finished (queue exhausted or score.total >= SESSION_LENGTH)
 *
 * Challenge types supported (discriminated by `challenge.type`):
 *   "find-the-note"     → single-tap evaluation against target note
 *   "find-the-interval" → two-tap evaluation: first tap = root, second tap = second note
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateWeightedChallenge,
  evaluateAnswer,
  STREAK_THRESHOLD,
  NEXT_DIFFICULTY,
  type EvaluationResult,
  type Difficulty,
  type NoteStats,
} from "@/lib/challenges/findTheNote";
import { evaluateTwoTapInterval } from "@/lib/challenges/findTheInterval";
import {
  generateSession,
  type Challenge,
  type SessionConfig,
} from "@/lib/session/sessionGenerator";
import type { AnswerHistory } from "@/lib/difficulty/difficultyEngine";
import { useProgressStore } from "@/store/progressStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionPhase = "idle" | "playing" | "awaiting" | "feedback" | "complete";

/** Number of challenges in a single session (used as fallback when no queue) */
export const SESSION_LENGTH = 8;

export interface SessionState {
  phase: SessionPhase;
  difficulty: Difficulty;
  /** Pre-built challenge queue for the current session (empty until startSession) */
  queue: Challenge[];
  /** Index of the currently active challenge within the queue */
  queueIndex: number;
  challenge: Challenge | null;
  lastResult: EvaluationResult | null;
  /** Running counts for the current session */
  score: { correct: number; total: number };
  /** Per-note accuracy stats (persisted across sessions) */
  noteStats: Record<string, NoteStats>;
  /** Current correct-answer streak within the session */
  streak: number;
  /** Best streak achieved within the current session */
  bestStreak: number;
  /** Set to the new difficulty when auto-promoted; cleared after the toast is dismissed */
  promotedDifficulty: Difficulty | null;
  /** Unix ms when the current session's first challenge started; null when idle */
  sessionStartTime: number | null;
  /**
   * For interval challenges: stores the first tap (root note position) while
   * waiting for the second tap. Null for note challenges and before first tap.
   */
  intervalFirstTap: { string: number; fret: number } | null;
  /** Per-answer history for the current session — passed to progressStore on completion */
  answers: AnswerHistory[];

  // ── Actions ──────────────────────────────────────────────────────────────
  /**
   * Generate a fresh challenge queue and immediately start the first challenge.
   * Resets all per-session state (score, streak, timing) but preserves noteStats.
   */
  startSession: (config?: SessionConfig) => void;
  /** Advance to the next challenge from the queue (or generate one if no queue). */
  startChallenge: () => void;
  /** Call once audio playback has finished — unlocks the fretboard */
  noteReady: () => void;
  /** Evaluate the user's fretboard tap */
  submitAnswer: (string: number, fret: number) => void;
  /** Move from "feedback" → "idle" (next challenge) or "complete" (session done) */
  nextChallenge: () => void;
  /** Change difficulty (only allowed from idle) */
  setDifficulty: (difficulty: Difficulty) => void;
  /** Dismiss the promotion toast */
  clearPromotion: () => void;
  /** Full reset — clears score + streak + timing + queue, back to idle (noteStats preserved) */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      difficulty: "easy",
      queue: [],
      queueIndex: 0,
      challenge: null,
      lastResult: null,
      score: { correct: 0, total: 0 },
      noteStats: {},
      streak: 0,
      bestStreak: 0,
      promotedDifficulty: null,
      sessionStartTime: null,
      intervalFirstTap: null,
      answers: [],

      startSession(config?: SessionConfig) {
        const { difficulty, noteStats } = get();
        const mergedConfig: SessionConfig = {
          difficulty,
          noteStats,
          ...config,
        };
        const queue = generateSession(mergedConfig);
        const challenge = queue[0] ?? null;
        set({
          phase: challenge ? "playing" : "idle",
          queue,
          queueIndex: 0,
          challenge,
          lastResult: null,
          score: { correct: 0, total: 0 },
          streak: 0,
          bestStreak: 0,
          promotedDifficulty: null,
          sessionStartTime: Date.now(),
          intervalFirstTap: null,
          answers: [],
        });
      },

      startChallenge() {
        const { difficulty, noteStats, phase, sessionStartTime, queue, queueIndex } = get();
        if (phase !== "idle" && phase !== "feedback") return;

        let challenge: Challenge;
        if (queue.length > 0 && queueIndex < queue.length) {
          // Queue-driven: pull next challenge from the pre-built queue
          challenge = queue[queueIndex]!;
        } else {
          // Fallback: generate on-the-fly (used in tests and legacy call sites)
          challenge = { ...generateWeightedChallenge(difficulty, noteStats), type: "find-the-note" };
        }

        set({
          phase: "playing",
          challenge,
          lastResult: null,
          sessionStartTime: sessionStartTime ?? Date.now(),
        });
      },

      noteReady() {
        if (get().phase !== "playing") return;
        set({ phase: "awaiting" });
      },

      submitAnswer(string, fret) {
        const { phase, challenge, score, noteStats, streak, bestStreak, difficulty, intervalFirstTap, answers } = get();
        if (phase !== "awaiting" || !challenge) return;

        let result: EvaluationResult;

        if (challenge.type === "find-the-note") {
          // ── Find the Note evaluation ────────────────────────────────────
          result = evaluateAnswer(challenge, string, fret);

          // Update per-note adaptive stats
          const note = challenge.targetNote;
          const existing = noteStats[note] ?? { attempts: 0, correct: 0 };
          const newNoteStats: Record<string, NoteStats> = {
            ...noteStats,
            [note]: {
              attempts: existing.attempts + 1,
              correct: existing.correct + (result.correct ? 1 : 0),
            },
          };

          const newStreak = result.correct ? streak + 1 : 0;
          const newBestStreak = Math.max(bestStreak, newStreak);
          let newDifficulty = difficulty;
          let promotedDifficulty: Difficulty | null = null;
          if (newStreak >= STREAK_THRESHOLD && NEXT_DIFFICULTY[difficulty]) {
            newDifficulty = NEXT_DIFFICULTY[difficulty]!;
            promotedDifficulty = newDifficulty;
          }

          set({
            phase: "feedback",
            lastResult: result,
            score: {
              correct: score.correct + (result.correct ? 1 : 0),
              total: score.total + 1,
            },
            noteStats: newNoteStats,
            streak: newStreak,
            bestStreak: newBestStreak,
            difficulty: newDifficulty,
            promotedDifficulty,
            answers: [
              ...answers,
              { correct: result.correct, challengeType: challenge.type, timestamp: Date.now() },
            ],
          });
        } else {
          // ── Find the Interval evaluation (two-tap) ───────────────────────
          if (intervalFirstTap === null) {
            // First tap: lock in the root note position, stay in "awaiting"
            set({ intervalFirstTap: { string, fret } });
            return; // don't advance to feedback yet
          }

          // Second tap: evaluate both taps together
          result = evaluateTwoTapInterval(challenge, intervalFirstTap, { string, fret });

          const newStreak = result.correct ? streak + 1 : 0;
          const newBestStreak = Math.max(bestStreak, newStreak);

          set({
            phase: "feedback",
            lastResult: result,
            intervalFirstTap: null,
            score: {
              correct: score.correct + (result.correct ? 1 : 0),
              total: score.total + 1,
            },
            streak: newStreak,
            bestStreak: newBestStreak,
            answers: [
              ...answers,
              { correct: result.correct, challengeType: challenge.type, timestamp: Date.now() },
            ],
          });
        }
      },

      nextChallenge() {
        if (get().phase !== "feedback") return;
        const { queue, queueIndex, score, answers } = get();

        const nextIndex = queueIndex + 1;
        const isQueueDriven = queue.length > 0;
        const isDone = isQueueDriven
          ? nextIndex >= queue.length
          : score.total >= SESSION_LENGTH;

        if (isDone) {
          // Record progress before transitioning — synchronous write to localStorage
          if (answers.length > 0) {
            useProgressStore.getState().recordSession(answers);
          }
          set({ phase: "complete" });
        } else {
          set({ phase: "idle", queueIndex: nextIndex });
        }
      },

      setDifficulty(difficulty) {
        if (get().phase !== "idle") return;
        set({ difficulty });
      },

      clearPromotion() {
        set({ promotedDifficulty: null });
      },

      reset() {
        set({
          phase: "idle",
          queue: [],
          queueIndex: 0,
          challenge: null,
          lastResult: null,
          score: { correct: 0, total: 0 },
          streak: 0,
          bestStreak: 0,
          promotedDifficulty: null,
          sessionStartTime: null,
          intervalFirstTap: null,
          answers: [],
          difficulty: "easy",
          // noteStats intentionally preserved across resets
        });
      },
    }),
    {
      name: "guitiq-session",
      // Only persist adaptive data and difficulty; transient UI state is not saved
      partialize: (state) => ({
        noteStats: state.noteStats,
        difficulty: state.difficulty,
      }),
    }
  )
);
