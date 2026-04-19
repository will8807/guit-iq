"use client";

import { useState } from "react";
import { initAudio, playNote, playChord, playSequence, playFeedbackChime, isAudioReady } from "@/lib/audio/engine";

const NOTES_TO_PLAY = [
  { label: "C3", note: "C3" },
  { label: "A3", note: "A3" },
  { label: "E4", note: "E4" },
];

export default function AudioDevPage() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Not initialised");

  async function handleInit() {
    setStatus("Initialising…");
    try {
      await initAudio();
      setReady(isAudioReady());
      setStatus(isAudioReady() ? "Audio ready ✓" : "Init failed");
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  async function handle(fn: () => Promise<void>, label: string) {
    if (!ready) return;
    setStatus(`Playing ${label}…`);
    await fn();
    setStatus("Done");
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8 space-y-8">
      <h1 className="text-2xl font-bold">🎸 Audio Engine Dev Page</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={handleInit}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold"
        >
          Init Audio
        </button>
        <span
          className={`text-sm font-mono px-3 py-1 rounded ${
            ready ? "bg-green-700" : "bg-zinc-700"
          }`}
        >
          {status}
        </span>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Single Notes</h2>
        <div className="flex flex-wrap gap-3">
          {NOTES_TO_PLAY.map(({ label, note }) => (
            <button
              key={note}
              disabled={!ready}
              onClick={() => handle(() => playNote(note), label)}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chord &amp; Interval</h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!ready}
            onClick={() => handle(() => playChord(["C3", "E3", "G3"]), "C major chord")}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded"
          >
            C Major Chord
          </button>
          <button
            disabled={!ready}
            onClick={() => handle(() => playSequence(["C3", "G3"], 500), "P5 interval")}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded"
          >
            P5 Interval (C→G)
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Feedback Chimes</h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!ready}
            onClick={() => handle(() => playFeedbackChime("correct"), "correct chime")}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded"
          >
            ✓ Correct
          </button>
          <button
            disabled={!ready}
            onClick={() => handle(() => playFeedbackChime("incorrect"), "incorrect chime")}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded"
          >
            ✗ Incorrect
          </button>
        </div>
      </section>
    </main>
  );
}
