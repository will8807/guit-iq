"use client";

import { useState, useCallback } from "react";
import Fretboard, { type FretHighlight } from "@/components/Fretboard";
import { initAudio, isAudioReady } from "@/lib/audio/engine";
import { getNoteAtPosition } from "@/lib/music/fretboard";

export default function FretboardDevPage() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Tap Init Audio to begin");
  const [highlights, setHighlights] = useState<FretHighlight[]>([]);
  const [lastTapped, setLastTapped] = useState<string | null>(null);

  async function handleInit() {
    setStatus("Initialising…");
    try {
      await initAudio();
      setReady(isAudioReady());
      setStatus(isAudioReady() ? "Audio ready ✓  — tap any fret" : "Init failed");
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  const handleSelect = useCallback((string: number, fret: number) => {
    const note = getNoteAtPosition(string, fret);
    setLastTapped(`String ${string}, Fret ${fret} → ${note}`);
    // Flash a hint highlight, clear after 800 ms
    setHighlights([{ string, fret, variant: "hint" }]);
    setTimeout(() => setHighlights([]), 800);
  }, []);

  function addHighlight(variant: FretHighlight["variant"]) {
    if (!lastTapped) return;
    // Parse last tapped
    const match = lastTapped.match(/String (\d), Fret (\d+)/);
    if (!match) return;
    const string = Number(match[1]);
    const fret = Number(match[2]);
    setHighlights([{ string, fret, variant }]);
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">🎸 Fretboard Dev Page</h1>

      <div className="flex flex-wrap items-center gap-3">
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

      {lastTapped && (
        <div className="text-sm font-mono text-zinc-300 bg-zinc-800 px-3 py-2 rounded">
          Last tapped: <span className="text-white">{lastTapped}</span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Highlight last tapped as…</p>
        <div className="flex gap-2">
          <button
            disabled={!lastTapped}
            onClick={() => addHighlight("correct")}
            className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded text-sm"
          >
            ✓ Correct
          </button>
          <button
            disabled={!lastTapped}
            onClick={() => addHighlight("incorrect")}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded text-sm"
          >
            ✗ Incorrect
          </button>
          <button
            disabled={!lastTapped}
            onClick={() => addHighlight("hint")}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 rounded text-sm"
          >
            💡 Hint
          </button>
          <button
            onClick={() => setHighlights([])}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-zinc-800 rounded-xl p-4">
        <Fretboard
          onSelect={handleSelect}
          highlights={highlights}
          disabled={!ready}
        />
      </div>

      <p className="text-xs text-zinc-600">
        Strings 1–6 (high E → low E). Frets 0–12. No note labels by design.
      </p>
    </main>
  );
}
