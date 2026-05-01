"use client";

/**
 * /demo — UI Enhancement Showcase
 *
 * Renders every visual and interaction enhancement in one place so you can
 * review them without playing through the game:
 *
 *  1. Fretboard — portrait & landscape, interactive tap animations
 *  2. Note highlights — correct / incorrect / hint dots on the fretboard
 *  3. Feedback banners — correct & incorrect with CSS animations (re-triggerable)
 *  4. Chromatic tuner — linked at the bottom
 */

import { useState, useCallback } from "react";
import Fretboard, { type FretHighlight } from "@/components/Fretboard";
import ChallengeFeedback from "@/components/ChallengeFeedback";
import type { EvaluationResult } from "@/lib/challenges/findTheNote";
import type { ChordEvaluationResult } from "@/lib/challenges/findTheChord";
import type { FindAllEvaluationResult } from "@/lib/challenges/findAllPositions";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold text-zinc-200 tracking-wide uppercase mb-3 border-b border-zinc-700 pb-1">
      {children}
    </h2>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 text-center mb-1">{children}</p>;
}

// ─── Mock result factories ────────────────────────────────────────────────────

const POS = { string: 2, fret: 5 } as const;
const POS2 = { string: 4, fret: 7 } as const;

function makeResult(correct: boolean, variant: "note" | "interval" | "chord" | "findAll"): EvaluationResult {
  const base: EvaluationResult = {
    correct,
    tappedPosition: POS,
    validPositions: [POS],
    targetNote: "A3",
  };

  if (variant === "interval") {
    base.intervalResult = {
      intervalName: correct ? "Perfect 5th" : "Minor 3rd",
      rootTap: POS,
      rootCorrect: true,
      rootValidPositions: [POS],
      secondTap: POS2,
      secondCorrect: correct,
      secondValidPositions: [POS2],
      secondSameString: false,
    };
  }

  if (variant === "chord") {
    const chordResult: ChordEvaluationResult = {
      correct,
      chordLabel: correct ? "C Major" : "A Minor",
      tapResults: correct
        ? [
            { correct: true,  position: { string: 5, fret: 3 }, pitchClass: 0 },
            { correct: true,  position: { string: 4, fret: 2 }, pitchClass: 4 },
            { correct: true,  position: { string: 3, fret: 0 }, pitchClass: 7 },
          ]
        : [
            { correct: true,  position: { string: 5, fret: 0 }, pitchClass: 9 },
            { correct: false, position: { string: 4, fret: 7 }, pitchClass: 6 },
            { correct: false, position: { string: 3, fret: 5 }, pitchClass: 2 },
          ],
      missedPitchClasses: correct ? new Set() : new Set([4, 7]),
      pitchClassLabels: new Map([[0, "R"], [4, "3"], [7, "5"]]),
    };
    base.chordResult = chordResult;
  }

  if (variant === "findAll") {
    const findAllResult: FindAllEvaluationResult = {
      correct,
      targetNote: "A",
      tapResults: correct
        ? [
            { correct: true, position: { string: 1, fret: 5 } },
            { correct: true, position: { string: 2, fret: 10 } },
            { correct: true, position: { string: 3, fret: 2 } },
            { correct: true, position: { string: 4, fret: 7 } },
            { correct: true, position: { string: 5, fret: 0 } },
          ]
        : [
            { correct: true,  position: { string: 1, fret: 5 } },
            { correct: false, position: { string: 2, fret: 9 } },
            { correct: true,  position: { string: 3, fret: 2 } },
            { correct: false, position: { string: 4, fret: 6 } },
          ],
      missedPositions: correct ? [] : [{ string: 2, fret: 10 }, { string: 6, fret: 0 }],
    };
    base.findAllResult = findAllResult;
  }

  return base;
}

// ─── Feedback panel (re-triggerable animation) ───────────────────────────────

function FeedbackDemo({
  variant,
  resultType,
}: {
  variant: "correct" | "incorrect";
  resultType: "note" | "interval" | "chord" | "findAll";
}) {
  const [key, setKey] = useState(0);
  const result = makeResult(variant === "correct", resultType);

  return (
    <div className="bg-zinc-900 rounded-xl p-3 flex flex-col gap-2">
      <SubLabel>
        {variant === "correct" ? "✓ Correct" : "✗ Incorrect"} —{" "}
        {resultType === "note" ? "Find Note" : resultType === "interval" ? "Interval" : resultType === "chord" ? "Chord" : "Find All Positions"}
      </SubLabel>
      <div key={key}>
        <ChallengeFeedback
          result={result}
          score={{ correct: variant === "correct" ? 4 : 3, total: 5 }}
          onNext={() => {}}
          hinted={resultType === "interval" && variant === "correct"}
        />
      </div>
      <button
        onClick={() => setKey((k) => k + 1)}
        className="self-end text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
      >
        ↺ Re-play animation
      </button>
    </div>
  );
}

// ─── Fretboard highlight demo ─────────────────────────────────────────────────

const HIGHLIGHT_SHOWCASE: FretHighlight[] = [
  // Root of an interval — correct
  { string: 5, fret: 3, variant: "correct", label: "R" },
  // Second note — correct
  { string: 4, fret: 5, variant: "correct", label: "P5" },
  // Incorrect tap
  { string: 3, fret: 7, variant: "incorrect" },
  // Hint dot
  { string: 2, fret: 5, variant: "hint" },
  // Bare correct dot (Find Note)
  { string: 1, fret: 0, variant: "correct" },
  // Bare incorrect dot
  { string: 6, fret: 2, variant: "incorrect" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [tapLog, setTapLog] = useState<string[]>([]);

  const handleTap = useCallback((string: number, fret: number) => {
    setTapLog((prev) => [`String ${string}, Fret ${fret}`, ...prev.slice(0, 4)]);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6 flex flex-col gap-10 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">UI Enhancement Showcase</h1>
        <p className="text-sm text-zinc-400 mt-1">
          All recent visual & interaction improvements — no gameplay required.
        </p>
        <nav className="flex flex-wrap gap-3 mt-3 text-xs text-indigo-400">
          <a href="#fretboard-animations" className="hover:underline">Fretboard Animations</a>
          <a href="#note-highlights" className="hover:underline">Note Highlights</a>
          <a href="#feedback-correct" className="hover:underline">Feedback (Correct)</a>
          <a href="#feedback-incorrect" className="hover:underline">Feedback (Incorrect)</a>
          <a href="#tuner" className="hover:underline">Chromatic Tuner</a>
        </nav>
      </div>

      {/* ── 1. Fretboard tap animations ─────────────────────────────────── */}
      <section aria-label="Fretboard Animations" data-section="fretboard-animations">
        <SectionHeading id="fretboard-animations">
          Fretboard — Tap Animations
        </SectionHeading>
        <p className="text-xs text-zinc-400 mb-4">
          Tap any cell to see the ripple, string-pluck, and press-scale animations.
          Recent taps are logged below.
        </p>

        <div className="flex flex-col gap-6">
          {/* Portrait */}
          <div>
            <SubLabel>Portrait layout</SubLabel>
            <div
              className="rounded-xl overflow-hidden"
              data-testid="fretboard-portrait"
              style={{ background: "linear-gradient(to right, #1c1409 0%, #2a1e0e 15%, #2e2210 50%, #2a1e0e 85%, #1c1409 100%)" }}
            >
              <Fretboard onSelect={handleTap} layout="portrait" />
            </div>
          </div>

          {/* Landscape */}
          <div>
            <SubLabel>Landscape layout</SubLabel>
            <div
              className="rounded-xl overflow-hidden"
              data-testid="fretboard-landscape"
              style={{ background: "linear-gradient(to bottom, #1c1409 0%, #2a1e0e 15%, #2e2210 50%, #2a1e0e 85%, #1c1409 100%)" }}
            >
              <Fretboard onSelect={handleTap} layout="landscape" />
            </div>
          </div>

          {/* Tap log */}
          <div className="bg-zinc-900 rounded-lg px-4 py-2 text-xs text-zinc-400 min-h-[48px]" data-testid="tap-log">
            {tapLog.length === 0
              ? <span className="text-zinc-600 italic">Tap a cell above to see the log…</span>
              : tapLog.map((entry, i) => (
                  <div key={i} className={i === 0 ? "text-indigo-300 font-medium" : "text-zinc-500"}>
                    {entry}
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── 2. Note highlights ──────────────────────────────────────────── */}
      <section aria-label="Note Highlights" data-section="note-highlights">
        <SectionHeading id="note-highlights">
          Note Highlights
        </SectionHeading>
        <p className="text-xs text-zinc-400 mb-4">
          Correct (green), incorrect (red), and hint (amber) dots. Labels inside dots show interval names.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <SubLabel>Portrait — mixed highlights</SubLabel>
            <div
              className="rounded-xl overflow-hidden"
              data-testid="highlights-portrait"
              style={{ background: "linear-gradient(to right, #1c1409 0%, #2a1e0e 15%, #2e2210 50%, #2a1e0e 85%, #1c1409 100%)" }}
            >
              <Fretboard highlights={HIGHLIGHT_SHOWCASE} layout="portrait" disabled />
            </div>
          </div>

          <div>
            <SubLabel>Landscape — mixed highlights</SubLabel>
            <div
              className="rounded-xl overflow-hidden"
              data-testid="highlights-landscape"
              style={{ background: "linear-gradient(to bottom, #1c1409 0%, #2a1e0e 15%, #2e2210 50%, #2a1e0e 85%, #1c1409 100%)" }}
            >
              <Fretboard highlights={HIGHLIGHT_SHOWCASE} layout="landscape" disabled />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-700 border border-green-500 flex items-center justify-center text-[9px] font-bold text-green-200">R</span>
              Correct with label
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-700 border border-green-500" />
              Correct (bare)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-900 border border-red-600" />
              Incorrect
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-700 border border-amber-500" />
              Hint
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Feedback banners — correct ───────────────────────────────── */}
      <section aria-label="Feedback Correct" data-section="feedback-correct">
        <SectionHeading id="feedback-correct">
          Feedback Banners — Correct
        </SectionHeading>
        <p className="text-xs text-zinc-400 mb-4">
          Green glow pulse + slide-up on correct. Click ↺ to replay the CSS animation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeedbackDemo variant="correct" resultType="note" />
          <FeedbackDemo variant="correct" resultType="interval" />
          <FeedbackDemo variant="correct" resultType="chord" />
          <FeedbackDemo variant="correct" resultType="findAll" />
        </div>
      </section>

      {/* ── 4. Feedback banners — incorrect ─────────────────────────────── */}
      <section aria-label="Feedback Incorrect" data-section="feedback-incorrect">
        <SectionHeading id="feedback-incorrect">
          Feedback Banners — Incorrect
        </SectionHeading>
        <p className="text-xs text-zinc-400 mb-4">
          Red shake + slide-up on incorrect. Click ↺ to replay the CSS animation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeedbackDemo variant="incorrect" resultType="note" />
          <FeedbackDemo variant="incorrect" resultType="interval" />
          <FeedbackDemo variant="incorrect" resultType="chord" />
          <FeedbackDemo variant="incorrect" resultType="findAll" />
        </div>
      </section>

      {/* ── 5. Chromatic tuner ──────────────────────────────────────────── */}
      <section aria-label="Chromatic Tuner" data-section="tuner">
        <SectionHeading id="tuner">Chromatic Tuner</SectionHeading>
        <p className="text-xs text-zinc-400 mb-4">
          Real-time pitch detection with a ±50¢ needle gauge, note name, and nearest-string indicator.
          Opens in a new tab.
        </p>
        <Link
          href="/tuner"
          target="_blank"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 rounded-full text-sm font-semibold text-white transition-colors"
          data-testid="tuner-link"
        >
          🎸 Open Tuner →
        </Link>
      </section>

      {/* Footer nav */}
      <div className="flex justify-between text-xs text-zinc-600 border-t border-zinc-800 pt-4">
        <Link href="/" className="hover:text-zinc-400 transition-colors">← Home</Link>
        <Link href="/session" className="hover:text-zinc-400 transition-colors">Start Training →</Link>
      </div>
    </main>
  );
}
