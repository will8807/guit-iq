"use client";

import { useEffect, useCallback, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { initAudio, playNote, isAudioReady } from "@/lib/audio/engine";
import Fretboard, { type FretHighlight } from "@/components/Fretboard";
import ChallengePrompt from "@/components/ChallengePrompt";
import ChallengeFeedback from "@/components/ChallengeFeedback";
import SessionComplete from "@/components/SessionComplete";
import { useOrientation, type FretboardLayout } from "@/hooks/useOrientation";
import type { Difficulty } from "@/lib/challenges/findTheNote";
import type { Challenge } from "@/lib/session/sessionGenerator";

export default function SessionPage() {
  const {
    phase,
    challenge,
    lastResult,
    score,
    difficulty,
    streak,
    bestStreak,
    sessionStartTime,
    promotedDifficulty,
    intervalFirstTap,
    startSession,
    startChallenge,
    noteReady,
    submitAnswer,
    nextChallenge,
    setDifficulty,
    clearPromotion,
    reset,
  } = useSessionStore();

  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const { showRoot, setShowRoot } = useSettingsStore();

  // Orientation: auto-detect + manual override
  const autoLayout = useOrientation();
  const [layoutOverride, setLayoutOverride] = useState<FretboardLayout | null>(null);
  const layout = layoutOverride ?? autoLayout;

  function toggleLayout() {
    // If already overridden, flip it; otherwise flip from auto
    setLayoutOverride(layout === "portrait" ? "landscape" : "portrait");
  }

  // ── Play the challenge note(s) ────────────────────────────────────────────

  /** Resolve the note(s) to play for the active challenge */
  function getChallengeNotes(c: Challenge): string[] {
    if (c.type === "find-the-note") return [c.targetNote];
    // Interval: play root then second note in sequence (handled by playSequence)
    return [c.rootNote, c.secondNote];
  }

  const playChallenge = useCallback(async () => {
    if (!challenge) return;
    setIsPlaying(true);
    const notes = getChallengeNotes(challenge);
    if (notes.length === 1) {
      await playNote(notes[0]!, 2);
    } else {
      // Import playSequence for interval challenges
      const { playSequence } = await import("@/lib/audio/engine");
      await playSequence(notes, 400);
    }
    setIsPlaying(false);
    noteReady();
  }, [challenge, noteReady]);

  // Auto-play when a new challenge starts
  useEffect(() => {
    if (phase === "playing") {
      playChallenge();
    }
  }, [phase, playChallenge]);

  // Show promotion toast for 3 seconds then clear
  useEffect(() => {
    if (promotedDifficulty) {
      setToastVisible(true);
      const timer = setTimeout(() => {
        setToastVisible(false);
        clearPromotion();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [promotedDifficulty, clearPromotion]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleInit() {
    await initAudio();
    setAudioReady(isAudioReady());
  }

  function handleStart() {
    startSession({ difficulty, intervalMix: 0.5 });
  }

  function handleFretboardSelect(string: number, fret: number) {
    if (phase !== "awaiting") return;
    submitAnswer(string, fret);
  }

  async function handleReplay() {
    if (!challenge || isPlaying) return;
    setIsPlaying(true);
    const notes = getChallengeNotes(challenge);
    if (notes.length === 1) {
      await playNote(notes[0]!, 2);
    } else {
      const { playSequence } = await import("@/lib/audio/engine");
      await playSequence(notes, 400);
    }
    setIsPlaying(false);
  }

  function handleNext() {
    nextChallenge();
    // startChallenge loads the next item from the queue (no-op when complete)
    startChallenge();
  }

  function handlePlayAgain() {
    // startSession resets transient state and generates a fresh queue
    startSession({ difficulty, intervalMix: 0.5 });
  }

  // ── Highlights ────────────────────────────────────────────────────────────

  const highlights: FretHighlight[] = [];

  if (phase === "awaiting" && challenge?.type === "find-the-interval" && intervalFirstTap) {
    // Show the locked-in root tap as a neutral hint highlight (two-tap flow)
    highlights.push({ ...intervalFirstTap, variant: "hint" });
  }
  if (phase === "feedback" && lastResult) {
    const ir = lastResult.intervalResult;
    if (ir) {
      // Interval feedback: per-note highlights
      highlights.push({
        ...ir.rootTap,
        variant: ir.rootCorrect ? "correct" : "incorrect",
      });
      highlights.push({
        ...ir.secondTap,
        variant: ir.secondCorrect ? "correct" : "incorrect",
      });
      // Reveal hints for incorrect taps
      if (!ir.rootCorrect) {
        for (const pos of ir.rootValidPositions) {
          if (pos.string !== ir.rootTap.string || pos.fret !== ir.rootTap.fret) {
            highlights.push({ ...pos, variant: "hint" });
          }
        }
      }
      if (!ir.secondCorrect) {
        for (const pos of ir.secondValidPositions) {
          if (pos.string !== ir.secondTap.string || pos.fret !== ir.secondTap.fret) {
            highlights.push({ ...pos, variant: "hint" });
          }
        }
      }
    } else {
      // Note feedback: existing single-tap logic
      highlights.push({
        ...lastResult.tappedPosition,
        variant: lastResult.correct ? "correct" : "incorrect",
      });
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

        {/* Show Root toggle */}
        <div className="flex items-center justify-between w-full max-w-xs bg-zinc-800 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Show Root</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {showRoot ? "Root highlighted — visual anchor mode" : "No hints — pure ear training"}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={showRoot}
            aria-label="Show Root toggle"
            onClick={() => setShowRoot(!showRoot)}
            className={[
              "relative w-12 h-6 rounded-full transition-colors shrink-0",
              showRoot ? "bg-indigo-600" : "bg-zinc-600",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                showRoot ? "translate-x-7" : "translate-x-1",
              ].join(" ")}
            />
          </button>
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

  // Step 3: completion screen
  if (phase === "complete") {
    return (
      <SessionComplete
        score={score}
        bestStreak={bestStreak}
        sessionStartTime={sessionStartTime}
        difficulty={difficulty}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Step 4: active challenge (playing / awaiting / feedback)
  return (
    <main className="min-h-screen w-full bg-zinc-900 text-white flex flex-col p-4 gap-4 max-w-2xl mx-auto">
      {/* Promotion toast */}
      {toastVisible && promotedDifficulty && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg text-sm animate-bounce"
        >
          🎉 Levelled up to <span className="capitalize">{promotedDifficulty}</span>!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">🎸 GuitIQ</h1>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="text-sm text-amber-400 font-semibold" aria-label={`${streak} streak`}>
              🔥 {streak}
            </span>
          )}
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
        <ChallengePrompt
          isPlaying={isPlaying}
          onReplay={handleReplay}
          challengeType={challenge?.type ?? "find-the-note"}
          intervalStep={intervalFirstTap ? 2 : 1}
          intervalName={
            showRoot && challenge?.type === "find-the-interval"
              ? (challenge as { intervalName: string }).intervalName
              : undefined
          }
          rootNote={
            showRoot && !isPlaying
              ? challenge?.type === "find-the-interval"
                ? (challenge as { rootNote: string }).rootNote
                : challenge?.type === "find-the-note"
                  ? (challenge as { targetNote: string }).targetNote
                  : undefined
              : undefined
          }
        />
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
