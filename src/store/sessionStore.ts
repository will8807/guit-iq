/**
 * store/sessionStore.ts
 *
 * Zustand store for a single "Find the Note" session.
 *
 * State machine:
 *
 *   idle ──startChallenge()──► playing ──noteReady()──► awaiting
 *                                                           │
 *                                                    submitAnswer()
 *                                                           │
 *                                                           ▼
 *                                                       feedback
 *                                                           │
 *                                              nextChallenge() / reset()
 *                                                           │
 *                                                           ▼
 *                                                         idle
 *
 * "playing"  = audio is currently being played to the user
 * "awaiting" = audio done, fretboard is active, waiting for tap
 * "feedback" = result shown (correct / incorrect + revealed positions)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateWeightedChallenge,
  evaluateAnswer,
  STREAK_THRESHOLD,
  NEXT_DIFFICULTY,
  type FindTheNoteChallenge,
  type EvaluationResult,
  type Difficulty,
  type NoteStats,
} from "@/lib/challenges/findTheNote";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionPhase = "idle" | "playing" | "awaiting" | "feedback";

export interface SessionState {
  phase: SessionPhase;
  difficulty: Difficulty;
  challenge: FindTheNoteChallenge | null;
  lastResult: EvaluationResult | null;
  /** Running counts for the current session */
  score: { correct: number; total: number };
  /** Per-note accuracy stats (persisted across sessions) */
  noteStats: Record<string, NoteStats>;
  /** Current correct-answer streak */
  streak: number;
  /** Set to the new difficulty when auto-promoted; cleared after the toast is dismissed */
  promotedDifficulty: Difficulty | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Begin a new challenge (picks a weighted note and moves to "playing") */
  startChallenge: () => void;
  /** Call once audio playback has finished — unlocks the fretboard */
  noteReady: () => void;
  /** Evaluate the user's fretboard tap */
  submitAnswer: (string: number, fret: number) => void;
  /** Move from "feedback" back to "idle", ready for next challenge */
  nextChallenge: () => void;
  /** Change difficulty (only allowed from idle) */
  setDifficulty: (difficulty: Difficulty) => void;
  /** Dismiss the promotion toast */
  clearPromotion: () => void;
  /** Full reset — clears score + streak, back to idle (noteStats preserved) */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      difficulty: "easy",
      challenge: null,
      lastResult: null,
      score: { correct: 0, total: 0 },
      noteStats: {},
      streak: 0,
      promotedDifficulty: null,

      startChallenge() {
        const { difficulty, noteStats, phase } = get();
        if (phase !== "idle" && phase !== "feedback") return;
        const challenge = generateWeightedChallenge(difficulty, noteStats);
        set({ phase: "playing", challenge, lastResult: null });
      },

      noteReady() {
        if (get().phase !== "playing") return;
        set({ phase: "awaiting" });
      },

      submitAnswer(string, fret) {
        const { phase, challenge, score, noteStats, streak, difficulty } = get();
        if (phase !== "awaiting" || !challenge) return;

        const result = evaluateAnswer(challenge, string, fret);

        // Update per-note stats
        const note = challenge.targetNote;
        const existing = noteStats[note] ?? { attempts: 0, correct: 0 };
        const newNoteStats: Record<string, NoteStats> = {
          ...noteStats,
          [note]: {
            attempts: existing.attempts + 1,
            correct: existing.correct + (result.correct ? 1 : 0),
          },
        };

        // Update streak
        const newStreak = result.correct ? streak + 1 : 0;

        // Auto-promote if streak threshold reached
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
          difficulty: newDifficulty,
          promotedDifficulty,
        });
      },

      nextChallenge() {
        if (get().phase !== "feedback") return;
        set({ phase: "idle" });
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
          challenge: null,
          lastResult: null,
          score: { correct: 0, total: 0 },
          streak: 0,
          promotedDifficulty: null,
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
