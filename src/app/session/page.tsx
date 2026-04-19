"use client";

import { useEffect, useCallback, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { initAudio, playNote, isAudioReady } from "@/lib/audio/engine";
import Fretboard, { type FretHighlight } from "@/components/Fretboard";
import ChallengePrompt from "@/components/ChallengePrompt";
import ChallengeFeedback from "@/components/ChallengeFeedback";
import { useOrientation, type FretboardLayout } from "@/hooks/useOrientation";
import type { Difficulty } from "@/lib/challenges/findTheNote";

export default function SessionPage() {
  const {
    phase,
    challenge,
    lastResult,
    score,
    difficulty,
    startChallenge,
    noteReady,
    submitAnswer,
    nextChallenge,
    setDifficulty,
    reset,
  } = useSessionStore();

  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Orientation: auto-detect + manual override
  const autoLayout = useOrientation();
  const [layoutOverride, setLayoutOverride] = useState<FretboardLayout | null>(null);
  const layout = layoutOverride ?? autoLayout;

  function toggleLayout() {
    // If already overridden, flip it; otherwise flip from auto
    setLayoutOverride(layout === "portrait" ? "landscape" : "portrait");
  }

  // ── Play the challenge note ────────────────────────────────────────────────

  const playChallenge = useCallback(async () => {
    if (!challenge) return;
    setIsPlaying(true);
    await playNote(challenge.targetNote, 2);
    setIsPlaying(false);
    noteReady();
  }, [challenge, noteReady]);

  // Auto-play when a new challenge starts
  useEffect(() => {
    if (phase === "playing") {
      playChallenge();
    }
  }, [phase, playChallenge]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleInit() {
    await initAudio();
    setAudioReady(isAudioReady());
  }

  function handleStart() {
    reset();
    startChallenge();
  }

  function handleFretboardSelect(string: number, fret: number) {
    if (phase !== "awaiting") return;
    submitAnswer(string, fret);
  }

  async function handleReplay() {
    if (!challenge || isPlaying) return;
    setIsPlaying(true);
    await playNote(challenge.targetNote, 2);
    setIsPlaying(false);
  }

  function handleNext() {
    nextChallenge();
    startChallenge();
  }

  // ── Highlights ────────────────────────────────────────────────────────────

  const highlights: FretHighlight[] = [];
  if (phase === "feedback" && lastResult) {
    // Show the position the user tapped
    highlights.push({
      ...lastResult.tappedPosition,
      variant: lastResult.correct ? "correct" : "incorrect",
    });
    // If wrong, also reveal all correct positions as hints
    if (!lastResult.correct) {
      for (const pos of lastResult.validPositions) {
        if (
          pos.string !== lastResult.tappedPosition.string ||
          pos.fret !== lastResult.tappedPosition.fret
        ) {
          highlights.push({ ...pos, variant: "hint" });
        }
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Step 1: init audio
  if (!audioReady) {
    return (
      <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center gap-8 p-6">
        <h1 className="text-3xl font-bold">🎸 GuitIQ</h1>
        <p className="text-zinc-400 text-center max-w-xs">
          Train your ear. Hear a note — find it on the fretboard.
        </p>
        <button
          onClick={handleInit}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-full text-xl font-bold"
        >
          Start
        </button>
      </main>
    );
  }

  // Step 2: difficulty picker (idle before first challenge)
  if (phase === "idle") {
    return (
      <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center gap-8 p-6">
        <h1 className="text-3xl font-bold">🎸 GuitIQ</h1>

        {score.total > 0 && (
          <p className="text-zinc-400">
            Last session: {score.correct}/{score.total} correct
          </p>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-sm text-zinc-500 uppercase tracking-wide text-center">Difficulty</p>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={[
                "py-3 rounded-lg font-semibold capitalize transition-colors",
                difficulty === d
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
              ].join(" ")}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-full text-xl font-bold"
        >
          Play
        </button>
      </main>
    );
  }

  // Step 3: active challenge (playing / awaiting / feedback)
  return (
    <main className="min-h-screen w-full bg-zinc-900 text-white flex flex-col p-4 gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">🎸 GuitIQ</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLayout}
            aria-label={`Switch to ${layout === "portrait" ? "landscape" : "portrait"} layout`}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-lg"
            title={layout === "portrait" ? "Switch to landscape" : "Switch to portrait"}
          >
            {layout === "portrait" ? "⇄" : "⇅"}
          </button>
          <span className="text-sm text-zinc-400">
            {score.correct}/{score.total}
          </span>
        </div>
      </div>

      {/* Prompt or Feedback */}
      {(phase === "playing" || phase === "awaiting") && (
        <ChallengePrompt isPlaying={isPlaying} onReplay={handleReplay} />
      )}
      {phase === "feedback" && lastResult && (
        <ChallengeFeedback
          result={lastResult}
          score={score}
          onNext={handleNext}
        />
      )}

      {/* Fretboard */}
      <div className="bg-zinc-800 rounded-xl p-3 flex-1">
        <Fretboard
          onSelect={handleFretboardSelect}
          highlights={highlights}
          disabled={phase !== "awaiting"}
          layout={layout}
        />
      </div>
    </main>
  );
}
