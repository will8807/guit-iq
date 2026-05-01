"use client";

import Link from "next/link";
import { useSettingsStore } from "@/store/settingsStore";
import { useProgressStore } from "@/store/progressStore";

const SESSION_LENGTHS = [4, 6, 8, 10, 12] as const;

/** Rounds a 0–1 fraction to the nearest 25% step */
function toPercent(v: number) {
  return Math.round(v * 100);
}

export default function SettingsPage() {
  const {
    showRoot,
    setShowRoot,
    sessionLength,
    setSessionLength,
    intervalMix,
    setIntervalMix,
    chordMix,
    setChordMix,
    findAllMix,
    setFindAllMix,
  } = useSettingsStore();
  const { clearProgress, totalSessions } = useProgressStore();

  function handleClearProgress() {
    if (confirm("Clear all progress data? This cannot be undone.")) {
      clearProgress();
    }
  }

  const MIX_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

  return (
    <main className="min-h-screen bg-[#100c06] text-white flex flex-col items-center gap-8 p-6 pt-10">
      <div className="flex items-center justify-between w-full max-w-sm">
        <Link href="/" className="text-zinc-400 hover:text-white text-sm">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
        <span className="w-12" /> {/* spacer */}
      </div>

      {/* Show Root */}
      <section className="w-full max-w-sm bg-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Training Mode</p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Show Root Note</p>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-[220px]">
              Highlights the root position on the fretboard. Good for practising
              without a guitar in hand.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={showRoot}
            onClick={() => setShowRoot(!showRoot)}
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              showRoot ? "bg-amber-500" : "bg-zinc-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-1 ${
                showRoot ? "translate-x-6" : "translate-x-1"
              }`}
            />
            <span className="sr-only">Show Root Note</span>
          </button>
        </div>
      </section>

      {/* Session Length */}
      <section className="w-full max-w-sm bg-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Session</p>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Challenges per session</p>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Session length">
            {SESSION_LENGTHS.map((n) => (
              <button
                key={n}
                onClick={() => setSessionLength(n)}
                aria-pressed={sessionLength === n}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sessionLength === n
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Challenge Mix */}
      <section className="w-full max-w-sm bg-zinc-800 rounded-xl p-5 flex flex-col gap-5">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Challenge Mix</p>

        {/* Interval Mix */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <p className="font-medium text-sm">Interval challenges</p>
            <p className="text-sm text-amber-300 font-semibold">{toPercent(intervalMix)}%</p>
          </div>
          <p className="text-xs text-zinc-400">
            Hear an interval — tap both notes. 0% = none, 100% = all.
          </p>
          <div className="flex gap-2" role="group" aria-label="Interval challenge fraction">
            {MIX_STEPS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  // Clamp so intervalMix + chordMix + findAllMix ≤ 1
                  const clamped = Math.min(v, 1 - chordMix - findAllMix);
                  setIntervalMix(clamped);
                }}
                aria-pressed={intervalMix === v}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  intervalMix === v
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {toPercent(v)}%
              </button>
            ))}
          </div>
        </div>

        {/* Chord Mix */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <p className="font-medium text-sm">Chord challenges</p>
            <p className="text-sm text-amber-300 font-semibold">{toPercent(chordMix)}%</p>
          </div>
          <p className="text-xs text-zinc-400">
            Hear a chord — tap all chord tones. 0% = none, 100% = all.
          </p>
          <div className="flex gap-2" role="group" aria-label="Chord challenge fraction">
            {MIX_STEPS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  const clamped = Math.min(v, 1 - intervalMix - findAllMix);
                  setChordMix(clamped);
                }}
                aria-pressed={chordMix === v}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  chordMix === v
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {toPercent(v)}%
              </button>
            ))}
          </div>
        </div>

        {/* Find All Mix */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <p className="font-medium text-sm">Find All Positions</p>
            <p className="text-sm text-emerald-300 font-semibold">{toPercent(findAllMix)}%</p>
          </div>
          <p className="text-xs text-zinc-400">
            Hear a note — tap every position for that exact pitch. 0% = none, 100% = all.
          </p>
          <div className="flex gap-2" role="group" aria-label="Find all positions challenge fraction">
            {MIX_STEPS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  const clamped = Math.min(v, 1 - intervalMix - chordMix);
                  setFindAllMix(clamped);
                }}
                aria-pressed={findAllMix === v}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  findAllMix === v
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {toPercent(v)}%
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-zinc-500 text-center">
          {toPercent(Math.max(0, 1 - intervalMix - chordMix - findAllMix))}% note ·{" "}
          {toPercent(intervalMix)}% interval · {toPercent(chordMix)}% chord · {toPercent(findAllMix)}% find-all
        </p>
      </section>

      {/* Data */}
      <section className="w-full max-w-sm bg-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Data</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Clear Progress</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {totalSessions} session{totalSessions !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button
            onClick={handleClearProgress}
            disabled={totalSessions === 0}
            className="px-4 py-2 bg-zinc-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </section>

      <div className="w-full max-w-sm mt-auto pt-4">
        <Link
          href="/session"
          className="block w-full text-center py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-full font-bold text-lg text-black transition-colors"
        >
          Start Session
        </Link>
      </div>
    </main>
  );
}
