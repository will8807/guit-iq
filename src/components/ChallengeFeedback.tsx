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
    <div className="flex items-center gap-3 py-2">
      {/* Result banner */}
      <div
        className={[
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          result.correct
            ? "bg-green-800/60 border border-green-600"
            : "bg-red-900/60 border border-red-600",
        ].join(" ")}
      >
        <span className="text-lg">{result.correct ? "✓" : "✗"}</span>
        <span className="font-semibold text-white text-sm">
          {result.correct ? "Correct!" : "Not quite"}
        </span>
      </div>

      {/* Score */}
      <p className="text-sm text-zinc-400 shrink-0">
        {score.correct} / {score.total}
      </p>

      {/* Next button */}
      <button
        onClick={onNext}
        className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-full font-semibold text-white text-sm transition-colors shrink-0"
      >
        Next →
      </button>
    </div>
  );
}
