"use client";

import Link from "next/link";
import { usePitchDetector } from "@/hooks/usePitchDetector";
import TunerNeedle from "@/components/TunerNeedle";
import { STANDARD_TUNING, nearestString } from "@/lib/music/tuner";

// ─── Colour helper ────────────────────────────────────────────────────────────

function centsColour(cents: number): string {
  const abs = Math.abs(cents);
  if (abs <= 5) return "text-emerald-400";
  if (abs <= 15) return "text-yellow-400";
  return "text-rose-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TunerPage() {
  const { pitch, isListening, start, stop, error } = usePitchDetector();

  const nearestStr = pitch ? nearestString(pitch) : null;

  return (
    <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-between p-6 gap-6">

      {/* ── Header ── */}
      <div className="w-full flex items-center justify-between">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Home
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Chromatic Tuner</h1>
        <div className="w-16" />
      </div>

      {/* ── Main display ── */}
      <div className="flex flex-col items-center gap-2 flex-1 justify-center w-full max-w-sm">

        {/* Note name */}
        <div className="flex items-end gap-2">
          <span className={`text-8xl font-black tabular-nums leading-none transition-colors ${pitch ? centsColour(pitch.cents) : "text-zinc-700"}`}>
            {pitch ? pitch.note : "–"}
          </span>
          <span className="text-3xl font-bold text-zinc-400 mb-2">
            {pitch ? pitch.octave : ""}
          </span>
        </div>

        {/* Frequency */}
        <p className="text-zinc-500 text-sm h-5">
          {pitch ? `${pitch.frequency.toFixed(1)} Hz` : isListening ? "Listening…" : ""}
        </p>

        {/* Needle gauge */}
        <div className="w-full flex justify-center mt-2">
          <TunerNeedle cents={pitch?.cents ?? 0} width={280} />
        </div>

        {/* Cents badge */}
        <div className={`text-2xl font-bold tabular-nums transition-colors ${pitch ? centsColour(pitch.cents) : "text-zinc-700"}`}>
          {pitch
            ? pitch.cents > 0.5
              ? `+${Math.round(pitch.cents)}¢`
              : pitch.cents < -0.5
                ? `${Math.round(pitch.cents)}¢`
                : "♪ In tune"
            : "±0¢"}
        </div>

        {/* Nearest open string highlight */}
        {nearestStr && (
          <p className="text-zinc-400 text-sm">
            Nearest string:{" "}
            <span className="font-semibold text-white">{nearestStr.guitarString.label}</span>
            {" — "}
            <span className={centsColour(nearestStr.centsOff)}>
              {nearestStr.centsOff > 0.5
                ? `+${Math.round(nearestStr.centsOff)}¢`
                : nearestStr.centsOff < -0.5
                  ? `${Math.round(nearestStr.centsOff)}¢`
                  : "in tune"}
            </span>
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-rose-400 text-sm text-center max-w-xs">{error}</p>
        )}
      </div>

      {/* ── Start / Stop button ── */}
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {isListening ? (
          <button
            onClick={stop}
            className="w-full py-4 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 font-bold text-lg transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="w-full py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-bold text-lg transition-colors"
          >
            {error ? "Try Again" : "Start Tuner"}
          </button>
        )}

        {/* ── Standard tuning reference ── */}
        <div className="w-full">
          <p className="text-zinc-500 text-xs text-center mb-2 uppercase tracking-widest">
            Standard Tuning
          </p>
          <div className="flex justify-between items-center gap-1">
            {STANDARD_TUNING.map((gs) => {
              const isNearest =
                nearestStr?.guitarString.string === gs.string;
              return (
                <div
                  key={gs.string}
                  className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-colors ${
                    isNearest
                      ? "bg-indigo-900/60 border border-indigo-500"
                      : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isNearest ? "text-indigo-300" : "text-zinc-400"
                    }`}
                  >
                    {gs.note}
                  </span>
                  <span className="text-zinc-600 text-[10px]">{gs.octave}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
