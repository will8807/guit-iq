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
import {
  generateChallenge,
  evaluateAnswer,
  type FindTheNoteChallenge,
  type EvaluationResult,
  type Difficulty,
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

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Begin a new challenge (picks a random note and moves to "playing") */
  startChallenge: () => void;
  /** Call once audio playback has finished — unlocks the fretboard */
  noteReady: () => void;
  /** Evaluate the user's fretboard tap */
  submitAnswer: (string: number, fret: number) => void;
  /** Move from "feedback" back to "idle", ready for next challenge */
  nextChallenge: () => void;
  /** Change difficulty (only allowed from idle) */
  setDifficulty: (difficulty: Difficulty) => void;
  /** Full reset — clears score, back to idle */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: "idle",
  difficulty: "easy",
  challenge: null,
  lastResult: null,
  score: { correct: 0, total: 0 },

  startChallenge() {
    const { difficulty, phase } = get();
    if (phase !== "idle" && phase !== "feedback") return;
    const challenge = generateChallenge(difficulty);
    set({ phase: "playing", challenge, lastResult: null });
  },

  noteReady() {
    if (get().phase !== "playing") return;
    set({ phase: "awaiting" });
  },

  submitAnswer(string, fret) {
    const { phase, challenge, score } = get();
    if (phase !== "awaiting" || !challenge) return;

    const result = evaluateAnswer(challenge, string, fret);
    set({
      phase: "feedback",
      lastResult: result,
      score: {
        correct: score.correct + (result.correct ? 1 : 0),
        total: score.total + 1,
      },
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

  reset() {
    set({
      phase: "idle",
      challenge: null,
      lastResult: null,
      score: { correct: 0, total: 0 },
      difficulty: "easy",
    });
  },
}));
