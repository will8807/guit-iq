/**
 * store/progressStore.ts
 *
 * Persisted progress store — tracks session history, streaks, and per-type accuracy.
 *
 * Streak logic:
 *   - A streak is the number of consecutive UTC calendar days on which the user
 *     completed at least one session.
 *   - Playing again on the SAME day does NOT break (or increment) the streak.
 *   - Missing a day resets the streak to 1 (the current day).
 *   - bestStreak is updated whenever currentStreak exceeds it.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnswerHistory } from "@/lib/difficulty/difficultyEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionRecord {
  /** UTC date string "YYYY-MM-DD" */
  date: string;
  /** Challenges answered correctly */
  correct: number;
  /** Total challenges in the session */
  total: number;
  /** Accuracy 0–1 */
  accuracy: number;
}

export interface AccuracyRecord {
  correct: number;
  total: number;
}

export interface ProgressState {
  /** Last 100 completed sessions */
  sessions: SessionRecord[];
  /** Last 100 individual answers (fed to difficultyEngine) */
  answerHistory: AnswerHistory[];
  /** Consecutive-day streak */
  currentStreak: number;
  /** All-time best streak */
  bestStreak: number;
  /** Total sessions ever completed */
  totalSessions: number;
  /** Per challenge-type accuracy totals */
  accuracyByType: Record<string, AccuracyRecord>;

  /** Record a completed session. `isoDate` defaults to today UTC. */
  recordSession: (
    answers: AnswerHistory[],
    isoDate?: string
  ) => void;

  /** Wipe all progress data */
  clearProgress: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for a given Date (UTC) */
export function toUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Given the last recorded session date and today's date, compute the new streak.
 *
 * Rules:
 *   - Same day → no change (return current)
 *   - Consecutive day → increment
 *   - Gap of 2+ days → reset to 1
 */
export function computeStreak(
  currentStreak: number,
  lastSessionDate: string | null,
  today: string
): number {
  if (!lastSessionDate) return 1; // first session ever

  if (lastSessionDate === today) return currentStreak; // same-day replay

  const last = new Date(lastSessionDate + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const diffDays = Math.round(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) return currentStreak + 1; // consecutive day
  return 1; // gap — streak broken
}

const MAX_HISTORY = 100;

// ─── Store ────────────────────────────────────────────────────────────────────

const initialState = {
  sessions: [] as SessionRecord[],
  answerHistory: [] as AnswerHistory[],
  currentStreak: 0,
  bestStreak: 0,
  totalSessions: 0,
  accuracyByType: {} as Record<string, AccuracyRecord>,
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordSession(answers, isoDate) {
        const today = isoDate ?? toUtcDateString();
        const state = get();

        // ── Streak ──────────────────────────────────────────────────────────
        const lastDate =
          state.sessions.length > 0
            ? state.sessions[state.sessions.length - 1]!.date
            : null;

        const newStreak = computeStreak(state.currentStreak, lastDate, today);
        const newBest = Math.max(state.bestStreak, newStreak);

        // ── Session record ──────────────────────────────────────────────────
        const correct = answers.filter((a) => a.correct).length;
        const total = answers.length;
        const accuracy = total > 0 ? correct / total : 0;

        const record: SessionRecord = { date: today, correct, total, accuracy };

        // Only append a new record if it's a different day; same-day replays
        // update the LAST record to reflect the latest run.
        let updatedSessions: SessionRecord[];
        if (lastDate === today && state.sessions.length > 0) {
          updatedSessions = [
            ...state.sessions.slice(0, -1),
            record,
          ];
        } else {
          updatedSessions = [...state.sessions, record].slice(-MAX_HISTORY);
        }

        // ── Answer history ───────────────────────────────────────────────────
        const updatedHistory = [...state.answerHistory, ...answers].slice(
          -MAX_HISTORY
        );

        // ── Accuracy by type ─────────────────────────────────────────────────
        const updatedByType = { ...state.accuracyByType };
        for (const a of answers) {
          const prev = updatedByType[a.challengeType] ?? { correct: 0, total: 0 };
          updatedByType[a.challengeType] = {
            correct: prev.correct + (a.correct ? 1 : 0),
            total: prev.total + 1,
          };
        }

        set({
          sessions: updatedSessions,
          answerHistory: updatedHistory,
          currentStreak: newStreak,
          bestStreak: newBest,
          totalSessions: state.totalSessions + 1,
          accuracyByType: updatedByType,
        });
      },

      clearProgress() {
        set({ ...initialState });
      },
    }),
    { name: "guitiq-progress" }
  )
);
