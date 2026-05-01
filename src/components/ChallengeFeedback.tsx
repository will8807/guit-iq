"use client";

/**
 * components/ChallengeFeedback.tsx
 *
 * Shown during "feedback" phase.
 * Reveals whether the answer was correct.
 * For interval challenges, also shows per-note breakdown and the interval name.
 * For chord challenges, shows per-tap breakdown and the chord name.
 */

import type { EvaluationResult } from "@/lib/challenges/findTheNote";

interface ChallengeFeedbackProps {
  result: EvaluationResult;
  score: { correct: number; total: number };
  onNext: () => void;
  /** Whether the player used the hint button on this challenge */
  hinted?: boolean;
}

export default function ChallengeFeedback({
  result,
  score,
  onNext,
  hinted = false,
}: ChallengeFeedbackProps) {
  const ir = result.intervalResult;
  const cr = result.chordResult;
  const far = result.findAllResult;

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        {/* Result banner */}
        <div
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            result.correct
              ? "bg-green-800/60 border border-green-600 feedback-correct"
              : "bg-red-900/60 border border-red-600 feedback-incorrect",
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

        {/* Hinted badge */}
        {hinted && (
          <span className="text-xs text-amber-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
            💡 hinted
          </span>
        )}

        {/* Next button */}
        <button
          onClick={onNext}
          className="ml-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-full font-semibold text-black text-sm transition-colors shrink-0"
        >
          Next →
        </button>
      </div>

      {/* Interval educational context */}
      {ir && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-xs text-zinc-400">
            That was a{" "}
            <span className="text-amber-300 font-semibold">{ir.intervalName}</span>
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

      {/* Same-string hint — shown only when the pitch was right but same string */}
      {ir?.secondSameString && (
        <p className="text-xs text-amber-400 px-1">
          ✓ Correct note — try it on a different string
        </p>
      )}

      {/* Chord educational context */}
      {cr && (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-400">
              That was a{" "}
              <span className="text-amber-300 font-semibold">{cr.chordLabel}</span>
            </p>
            {/* Missed note count pill */}
            {cr.missedPitchClasses.size > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/60 text-amber-300">
                {cr.missedPitchClasses.size} missed
              </span>
            )}
          </div>

          {/* Per-tap result pills (max 6 shown) */}
          {cr.tapResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cr.tapResults.slice(0, 6).map((tap, i) => (
                <span
                  key={i}
                  className={[
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    tap.correct
                      ? "bg-green-800/60 text-green-300"
                      : "bg-red-900/60 text-red-300",
                  ].join(" ")}
                >
                  Tap {i + 1} {tap.correct ? "✓" : "✗"}
                </span>
              ))}
              {cr.tapResults.length > 6 && (
                <span className="text-xs text-zinc-500 px-1 py-0.5">
                  +{cr.tapResults.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Find All Positions educational context */}
      {far && (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-400">
              That was{" "}
              <span className="text-amber-300 font-semibold">{far.targetNote}</span>
            </p>
            {far.missedPositions.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/60 text-amber-300">
                {far.missedPositions.length} missed
              </span>
            )}
          </div>

          {far.tapResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {far.tapResults.slice(0, 6).map((tap, i) => (
                <span
                  key={i}
                  className={[
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    tap.correct
                      ? "bg-green-800/60 text-green-300"
                      : "bg-red-900/60 text-red-300",
                  ].join(" ")}
                >
                  Tap {i + 1} {tap.correct ? "✓" : "✗"}
                </span>
              ))}
              {far.tapResults.length > 6 && (
                <span className="text-xs text-zinc-500 px-1 py-0.5">
                  +{far.tapResults.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
