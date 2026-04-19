"use client";

/**
 * components/ChallengeFeedback.tsx
 *
 * Shown during "feedback" phase.
 * Reveals whether the answer was correct and shows all valid positions.
 * Still NO note name shown — positions only.
 */

import type { EvaluationResult } from "@/lib/challenges/findTheNote";

interface ChallengeFeedbackProps {
  result: EvaluationResult;
  score: { correct: number; total: number };
  onNext: () => void;
}

export default function ChallengeFeedback({
  result,
  score,
  onNext,
}: ChallengeFeedbackProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Result banner */}
      <div
        className={[
          "w-full max-w-sm rounded-xl px-6 py-5 text-center",
          result.correct
            ? "bg-green-800/60 border border-green-600"
            : "bg-red-900/60 border border-red-600",
        ].join(" ")}
      >
        <p className="text-3xl mb-1">{result.correct ? "✓" : "✗"}</p>
        <p className="text-lg font-bold text-white">
          {result.correct ? "Correct!" : "Not quite"}
        </p>
        {!result.correct && (
          <p className="text-sm text-zinc-300 mt-2">
            The correct positions are highlighted on the fretboard above.
          </p>
        )}
      </div>

      {/* Score */}
      <p className="text-sm text-zinc-400">
        {score.correct} / {score.total} correct
      </p>

      {/* Next button */}
      <button
        onClick={onNext}
        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-full font-semibold text-white transition-colors"
      >
        Next →
      </button>
    </div>
  );
}
