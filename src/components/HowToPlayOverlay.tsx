"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = (type: Props["challengeType"]) => `guitiq_how_to_play_seen_${type}`;

interface Props {
  challengeType: "find-the-note" | "find-the-interval" | "find-the-chord" | "find-all-positions";
  forceOpen?: boolean;
  onOpen?: () => void;
  onDismiss: () => void;
}

const INSTRUCTIONS: Record<Props["challengeType"], { title: string; steps: string[] }> = {
  "find-the-note": {
    title: "Find the Note",
    steps: [
      "🔊 Listen to the note that plays",
      "🎸 Tap the matching fret on the fretboard",
      "🔁 Use Replay if you need to hear it again",
    ],
  },
  "find-the-interval": {
    title: "Find the Interval",
    steps: [
      "🔊 Two notes will play — root, then second",
      "🎸 Tap the root note on the fretboard",
      "🎸 Then tap the second note",
      "✅ Press Done to submit your answer",
      "🔁 Use Replay to hear the pair again",
    ],
  },
  "find-the-chord": {
    title: "Find the Chord",
    steps: [
      "🔊 Listen to the chord that plays",
      "🎸 Tap every note of the chord on the fretboard",
      "🔁 Use Replay to hear it again",
      "✅ Press Done when you've tapped them all",
    ],
  },
  "find-all-positions": {
    title: "Find All Positions",
    steps: [
      "🔊 Listen to the note that plays",
      "🎸 Find every place that note appears on the fretboard",
      "🔁 Use Replay to hear it again",
      "✅ Press Done when you've found them all",
    ],
  },
};

export default function HowToPlayOverlay({ challengeType, forceOpen, onOpen, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY(challengeType));
    if (!seen) {
      setVisible(true);
      onOpen?.();
    }
  }, [challengeType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (forceOpen) setVisible(true);
  }, [forceOpen]);

  if (!visible) return null;

  const { title, steps } = INSTRUCTIONS[challengeType];

  function dismiss() {
    localStorage.setItem(STORAGE_KEY(challengeType), "1");
    setVisible(false);
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎸</span>
          <div>
            <p className="text-xs text-rust-300 uppercase tracking-widest font-semibold">How to play</p>
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
        </div>

        {/* Steps */}
        <ol className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
              <span className="text-zinc-600 font-mono text-xs mt-0.5 w-4 shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="w-full py-3 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-xl font-bold text-white transition-colors shadow-md shadow-rust-700/40"
        >
          Got it — let's go!
        </button>

        <p className="text-center text-xs text-zinc-600">Tap anywhere to dismiss</p>
      </div>
    </div>
  );
}
