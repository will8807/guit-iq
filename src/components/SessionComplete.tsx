"use client";

import { useState } from "react";
import Link from "next/link";
import type { Difficulty } from "@/lib/challenges/findTheNote";

interface SessionCompleteProps {
  score: { correct: number; total: number };
  bestStreak: number;
  /** Unix ms when the session started */
  sessionStartTime: number | null;
  difficulty: Difficulty;
  onPlayAgain: () => void;
}

/** Format elapsed milliseconds as "m:ss" */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SessionComplete({
  score,
  bestStreak,
  sessionStartTime,
  difficulty,
  onPlayAgain,
}: SessionCompleteProps) {
  const accuracy =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  // Capture the current time once on mount so it doesn't change on re-renders
  const [now] = useState(() => Date.now());
  const elapsed = sessionStartTime != null ? now - sessionStartTime : null;

  // Emoji grade based on accuracy
  const grade =
    accuracy === 100
      ? "🏆"
      : accuracy >= 80
        ? "🎯"
        : accuracy >= 60
          ? "👍"
          : "💪";

  return (
    <main
      className="min-h-screen bg-[#100c06] text-white flex flex-col items-center justify-center gap-8 p-6"
      data-testid="session-complete"
    >
      {/* Grade emoji + heading */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl" role="img" aria-label="result">
          {grade}
        </span>
        <h1 className="text-3xl font-bold">Session Complete</h1>
      </div>

      {/* Stats card */}
      <div className="bg-zinc-800 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-5">
        {/* Score */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm uppercase tracking-wide">
            Score
          </span>
          <span className="text-2xl font-bold">
            {score.correct}
            <span className="text-zinc-500 text-lg font-normal">
              /{score.total}
            </span>
          </span>
        </div>

        {/* Accuracy */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm uppercase tracking-wide">
            Accuracy
          </span>
          <span
            className={[
              "text-2xl font-bold",
              accuracy >= 80
                ? "text-green-400"
                : accuracy >= 60
                  ? "text-rust-300"
                  : "text-red-400",
            ].join(" ")}
            data-testid="accuracy"
          >
            {accuracy}%
          </span>
        </div>

        {/* Best streak */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm uppercase tracking-wide">
            Best streak
          </span>
          <span className="text-2xl font-bold">
            {bestStreak > 0 ? `🔥 ${bestStreak}` : "—"}
          </span>
        </div>

        {/* Time */}
        {elapsed != null && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm uppercase tracking-wide">
              Time
            </span>
            <span className="text-2xl font-bold" data-testid="elapsed-time">
              {formatDuration(elapsed)}
            </span>
          </div>
        )}

        {/* Difficulty */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm uppercase tracking-wide">
            Difficulty
          </span>
          <span className="text-lg font-semibold capitalize">{difficulty}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onPlayAgain}
          className="py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-full text-lg font-bold text-white transition-colors shadow-lg shadow-rust-700/40"
        >
          Play Again
        </button>
        <Link
          href="/"
          className="py-4 bg-zinc-700 hover:bg-zinc-600 rounded-full text-lg font-semibold text-center transition-colors"
        >
          Home
        </Link>
      </div>
    </main>
  );
}


