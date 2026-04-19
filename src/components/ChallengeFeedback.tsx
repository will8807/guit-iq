"use client";

/**
 * components/ChallengeFeedback.tsx
 *
 * Shown during "feedback" phase.
 * Reveals whether the answer was correct.
 * For interval challenges, also shows per-note breakdown and the interval name
 * as educational reinforcement.
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
  const ir = result.intervalResult;

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
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

      {/* Interval educational context */}
      {ir && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-xs text-zinc-400">
            That was a{" "}
            <span className="text-indigo-300 font-semibold">{ir.intervalName}</span>
          </p>
          {/* Per-note result pills */}
          <div className="ml-auto flex gap-2">
            <span
              className={[
                "text-xs px-2 py-0.5 rounded-full font-medium",
                ir.rootCorrect
                  ? "bg-green-800/60 text-green-300"
                  : "bg-red-900/60 text-red-300",
              ].join(" ")}
            >
              Root {ir.rootCorrect ? "✓" : "✗"}
            </span>
            <span
              className={[
                "text-xs px-2 py-0.5 rounded-full font-medium",
                ir.secondCorrect
                  ? "bg-green-800/60 text-green-300"
                  : "bg-red-900/60 text-red-300",
              ].join(" ")}
            >
              Interval {ir.secondCorrect ? "✓" : "✗"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
