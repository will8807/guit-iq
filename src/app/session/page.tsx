"use client";

import Link from "next/link";
import { useEffect, useCallback, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { initAudio, playNote, playChord, playFeedbackChime } from "@/lib/audio/engine";
import Fretboard, { type FretHighlight } from "@/components/Fretboard";
import ChallengePrompt from "@/components/ChallengePrompt";
import ChallengeFeedback from "@/components/ChallengeFeedback";
import HowToPlayOverlay from "@/components/HowToPlayOverlay";
import SessionComplete from "@/components/SessionComplete";
import { useOrientation, type FretboardLayout } from "@/hooks/useOrientation";
import type { Difficulty } from "@/lib/challenges/findTheNote";
import type { Challenge } from "@/lib/session/sessionGenerator";
import { getAllPositionsForNote } from "@/lib/music/fretboard";
import { midiToNote } from "@/lib/music/notes";
import { getValidSecondPositions } from "@/lib/challenges/findTheInterval";

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
    intervalSecondTap,
    intervalSameStringHint,
    chordTaps,
    startSession,
    startChallenge,
    noteReady,
    submitAnswer,
    submitChordAnswer,
    submitIntervalAnswer,
    nextChallenge,
    setDifficulty,
    clearPromotion,
  } = useSessionStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const { showRoot, setShowRoot, intervalMix, chordMix } = useSettingsStore();

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
    if (c.type === "find-the-interval") return [c.rootNote, c.secondNote];
    if (c.type === "find-the-chord") return c.midiNotes.map((m) => midiToNote(m));
    // find-all-positions: play the single target note
    return [c.targetNote];
  }

  const playChallenge = useCallback(async () => {
    if (!challenge) return;
    setIsPlaying(true);
    const notes = getChallengeNotes(challenge);
    if (notes.length === 1) {
      await playNote(notes[0]!, 2);
    } else if (challenge.type === "find-the-chord") {
      // Play all chord tones simultaneously as a chord, then arpeggiate
      const { playSequence } = await import("@/lib/audio/engine");
      await playChord(notes, 2);
      await new Promise((r) => setTimeout(r, 900));
      await playSequence(notes, 250);
    } else {
      const { playSequence } = await import("@/lib/audio/engine");
      await playSequence(notes, 400);
    }
    setIsPlaying(false);
    noteReady();
  }, [challenge, noteReady]);

  // Auto-play when a new challenge starts
  useEffect(() => {
    if (phase === "playing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      playChallenge();
    }
  }, [phase, playChallenge]);

  // Play feedback chime when answer is evaluated
  useEffect(() => {
    if (phase === "feedback" && lastResult) {
      playFeedbackChime(lastResult.correct ? "correct" : "incorrect").catch(() => {});
    }
  }, [phase, lastResult]);

  // Show promotion toast for 3 seconds then clear
  useEffect(() => {
    if (promotedDifficulty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToastVisible(true);
      const timer = setTimeout(() => {
        setToastVisible(false);
        clearPromotion();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [promotedDifficulty, clearPromotion]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleStart() {
    await initAudio();
    startSession({ difficulty, intervalMix, chordMix });
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
    } else if (challenge.type === "find-the-chord") {
      const { playSequence } = await import("@/lib/audio/engine");
      await playChord(notes, 2);
      await new Promise((r) => setTimeout(r, 900));
      await playSequence(notes, 250);
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
    startSession({ difficulty, intervalMix, chordMix });
  }

  // ── Highlights ────────────────────────────────────────────────────────────

  const highlights: FretHighlight[] = [];

  if (phase === "awaiting" && challenge?.type === "find-the-interval") {
    if (intervalFirstTap) {
      highlights.push({ ...intervalFirstTap, variant: "hint", label: "R" });
    }
    if (intervalSecondTap) {
      const intervalKey = challenge.intervalKey;
      highlights.push({ ...intervalSecondTap, variant: "hint", label: intervalKey });
    }
    // Same-string hint: show all cross-string valid positions for the second note
    if (intervalSameStringHint && intervalFirstTap) {
      const crossStringPositions = getValidSecondPositions(
        intervalFirstTap.string,
        challenge.secondNote,
      );
      for (const pos of crossStringPositions) {
        highlights.push({ ...pos, variant: "hint", label: challenge.intervalKey });
      }
    }
  }

  if (phase === "awaiting" && challenge?.type === "find-the-chord") {
    // Show all accumulated chord taps as hint dots
    for (const tap of chordTaps) {
      highlights.push({ ...tap, variant: "hint" });
    }
    // When Show Root is ON, also highlight root positions
    if (showRoot && !isPlaying) {
      for (const pos of getAllPositionsForNote(challenge.rootNote)) {
        const alreadyTapped = chordTaps.some(
          (t) => t.string === pos.string && t.fret === pos.fret,
        );
        if (!alreadyTapped) {
          highlights.push({ ...pos, variant: "hint", label: "R" });
        }
      }
    }
  }

  if (phase === "feedback" && lastResult) {
    const ir = lastResult.intervalResult;
    const cr = lastResult.chordResult;
    if (cr) {
      // Chord feedback: per-tap correct/incorrect highlights
      for (const tap of cr.tapResults) {
        highlights.push({
          ...tap.position,
          variant: tap.correct ? "correct" : "incorrect",
        });
      }
      // All chord-tone positions labeled by role (R, 3, #5, etc.)
      const tappedKeys = new Set(cr.tapResults.map((t) => `${t.position.string}-${t.position.fret}`));
      for (const [pc, label] of cr.pitchClassLabels) {
        // Find a representative note name for this pitch class (any octave)
        const noteName = midiToNote(pc + 48); // e.g. pc=5 → midi 53 → "F3"
        for (const pos of getAllPositionsForNote(noteName.replace(/\d/, ""))) {
          const key = `${pos.string}-${pos.fret}`;
          if (!tappedKeys.has(key)) {
            highlights.push({ ...pos, variant: "hint", label });
          }
        }
      }
    } else if (ir) {
      // Interval feedback: per-note highlights
      highlights.push({
        ...ir.rootTap,
        variant: ir.rootCorrect ? "correct" : "incorrect",
        label: "R",
      });
      const intervalKey =
        challenge?.type === "find-the-interval" ? challenge.intervalKey : undefined;
      highlights.push({
        ...ir.secondTap,
        variant: ir.secondCorrect ? "correct" : "incorrect",
        label: intervalKey,
      });
      if (!ir.rootCorrect) {
        for (const pos of ir.rootValidPositions) {
          if (pos.string !== ir.rootTap.string || pos.fret !== ir.rootTap.fret) {
            highlights.push({ ...pos, variant: "hint", label: "R" });
          }
        }
      }
      if (!ir.secondCorrect) {
        for (const pos of ir.secondValidPositions) {
          if (pos.string !== ir.secondTap.string || pos.fret !== ir.secondTap.fret) {
            highlights.push({ ...pos, variant: "hint", label: intervalKey });
          }
        }
      }
    } else {
      // Note feedback
      highlights.push({
        ...lastResult.tappedPosition,
        variant: lastResult.correct ? "correct" : "incorrect",
      });
      const allPositions = getAllPositionsForNote(lastResult.targetNote);
      for (const pos of allPositions) {
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

  // Step 1: difficulty picker (idle before first challenge)
  // Audio is initialised lazily inside handleStart() on the Play button click,
  // which satisfies the Web Audio API user-gesture requirement.
  if (phase === "idle") {
    return (
      <main className="min-h-screen bg-[#100c06] text-white flex flex-col items-center justify-center gap-8 p-6">
        <h1 className="text-3xl font-bold"><span className="text-rust-300">Guit</span>IQ</h1>

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
                  ? "bg-rust-500 text-white"
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
              showRoot ? "bg-rust-500" : "bg-zinc-600",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                showRoot ? "translate-x-6" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>

        <button
          onClick={handleStart}
          className="px-8 py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-full text-xl font-bold text-white shadow-lg shadow-rust-700/40"
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
    <main className="min-h-screen w-full bg-[#100c06] text-white flex flex-col p-4 gap-4 max-w-2xl mx-auto">
      {/* How to play overlay — shown once on first session */}
      {phase === "awaiting" && challenge && (
        <HowToPlayOverlay challengeType={challenge.type} forceOpen={helpOpen} onDismiss={() => setHelpOpen(false)} />
      )}

      {/* Promotion toast */}
      {toastVisible && promotedDifficulty && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rust-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg text-sm animate-bounce"
        >
          🎉 Levelled up to <span className="capitalize">{promotedDifficulty}</span>!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold"><span className="text-rust-300">Guit</span>IQ</h1>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="text-sm text-rust-300 font-semibold" aria-label={`${streak} streak`}>
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
          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-lg"
          >
            ⚙️
          </Link>
          {(phase === "awaiting" || phase === "playing") && (
            <button
              onClick={() => setHelpOpen(true)}
              aria-label="How to play"
              title="How to play"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors text-xs font-bold"
            >
              ?
            </button>
          )}
          <span className="text-sm text-zinc-400">
            {score.correct}/{score.total}
          </span>
        </div>
      </div>

      {/* Prompt or Feedback — fixed height so the fretboard never shifts */}
      <div className="h-24 shrink-0 flex flex-col justify-center">
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
            chordTapCount={
              challenge?.type === "find-the-chord" ? chordTaps.length : 0
            }
            rootNote={
              showRoot
                ? challenge?.type === "find-the-interval"
                  ? (challenge as { rootNote: string }).rootNote
                  : challenge?.type === "find-the-note"
                    ? (challenge as { targetNote: string }).targetNote
                    : challenge?.type === "find-the-chord"
                      ? (challenge as { chordLabel: string }).chordLabel
                      : undefined
                : undefined
            }
            onDone={
              phase === "awaiting" && challenge?.type === "find-the-chord"
                ? submitChordAnswer
                : phase === "awaiting" && challenge?.type === "find-the-interval" && intervalSecondTap
                  ? submitIntervalAnswer
                  : undefined
            }
            doneLabel={
              challenge?.type === "find-the-chord"
                ? `Done (${chordTaps.length} tap${chordTaps.length !== 1 ? "s" : ""})`
                : "Done"
            }
            doneDisabled={
              challenge?.type === "find-the-chord" && chordTaps.length === 0
            }
            sameStringHint={
              phase === "awaiting" &&
              challenge?.type === "find-the-interval" &&
              intervalSameStringHint
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
      </div>

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


