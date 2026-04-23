"use client";

/**
 * components/Fretboard.tsx
 *
 * A touch-friendly guitar fretboard that supports two layouts:
 *
 * "portrait"  (default) — vertical, strings = columns, frets = rows
 *   Low E on the left, high e on the right; nut at the top.
 *   Best for portrait phone use.
 *
 * "landscape" — horizontal, strings = rows, frets = columns
 *   Low E at the top, high e at the bottom; nut on the left.
 *   Best for landscape phone use.
 *
 * Design constraints:
 * - NO note name labels ever shown — the fretboard is an input device, not a diagram
 * - Tapping a cell plays the note through the audio engine
 * - onSelect(string, fret) bubbles the tap up so challenge logic can evaluate it
 * - highlights prop lets callers mark positions (e.g. correct/incorrect feedback)
 *
 * String numbering: 1 = high E, 6 = low E
 * Fret numbering:   0 = open string, 12 = 12th fret
 */

import { getNoteAtPosition, type FretPosition } from "@/lib/music/fretboard";
import { playNote, isAudioReady } from "@/lib/audio/engine";
import type { FretboardLayout } from "@/hooks/useOrientation";

export type HighlightVariant = "correct" | "incorrect" | "hint";

export interface FretHighlight extends FretPosition {
  variant: HighlightVariant;
  /** Short label rendered inside the highlight circle (e.g. "R", "P5", "m3") */
  label?: string;
}

interface FretboardProps {
  /** Called when the user taps a fret cell */
  onSelect?: (string: number, fret: number) => void;
  /** Positions to highlight with feedback colours */
  highlights?: FretHighlight[];
  /** Disable all interaction (e.g. while audio is playing) */
  disabled?: boolean;
  /** Visual orientation of the fretboard */
  layout?: FretboardLayout;
}

// Portrait: strings as columns left→right (low E first)
const STRINGS_PORTRAIT = [6, 5, 4, 3, 2, 1] as const;
// Landscape: strings as rows top→bottom (high e first, low E at bottom)
const STRINGS_LANDSCAPE = [1, 2, 3, 4, 5, 6] as const;
const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0–12

const STRING_NAMES: Record<number, string> = { 1: "e", 2: "B", 3: "G", 4: "D", 5: "A", 6: "E" };

const HIGHLIGHT_CLASSES: Record<HighlightVariant, string> = {
  correct: "bg-green-500",
  incorrect: "bg-red-500",
  hint: "bg-yellow-400",
};

const LABEL_CLASSES: Record<HighlightVariant, string> = {
  correct: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
  incorrect: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
  hint: "text-zinc-900",
};

const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9]);

// Realistic string thicknesses: string 6 (low E) is thickest, string 1 (high e) thinnest.
// Portrait layout: string line is vertical (width varies).
const STRING_LINE_PORTRAIT: Record<number, string> = {
  1: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-px   before:bg-zinc-500",
  2: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-px   before:bg-zinc-500",
  3: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-[1.5px] before:bg-zinc-400",
  4: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-[2px]  before:bg-zinc-400",
  5: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-[2.5px] before:bg-zinc-400",
  6: "before:absolute before:left-1/2 before:-translate-x-1/2 before:inset-y-0 before:w-[3px]  before:bg-zinc-300",
};
// Landscape layout: string line is horizontal (height varies).
const STRING_LINE_LANDSCAPE: Record<number, string> = {
  1: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-px   before:bg-zinc-500",
  2: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-px   before:bg-zinc-500",
  3: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-[1.5px] before:bg-zinc-400",
  4: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-[2px]  before:bg-zinc-400",
  5: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-[2.5px] before:bg-zinc-400",
  6: "before:absolute before:top-1/2 before:-translate-y-1/2 before:inset-x-0 before:h-[3px]  before:bg-zinc-300",
};

function getHighlight(
  highlights: FretHighlight[],
  string: number,
  fret: number
): FretHighlight | undefined {
  return highlights.find((h) => h.string === string && h.fret === fret);
}

export default function Fretboard({
  onSelect,
  highlights = [],
  disabled = false,
  layout = "portrait",
}: FretboardProps) {
  async function handleTap(string: number, fret: number) {
    if (disabled) return;
    onSelect?.(string, fret);
    if (isAudioReady()) {
      const note = getNoteAtPosition(string, fret);
      await playNote(note, 1.5);
    }
  }

  if (layout === "landscape") {
    return <LandscapeFretboard highlights={highlights} disabled={disabled} handleTap={handleTap} />;
  }
  return <PortraitFretboard highlights={highlights} disabled={disabled} handleTap={handleTap} />;
}

// ─── Shared cell ────────────────────────────────────────────────────────────

interface CellProps {
  string: number;
  fret: number;
  highlight: FretHighlight | undefined;
  disabled: boolean;
  isNut: boolean;
  nutEdge: "top" | "left";
  handleTap: (string: number, fret: number) => void;
  className?: string;
}

function FretCell({ string, fret, highlight, disabled, isNut, nutEdge, handleTap, className = "" }: CellProps) {
  const nutClass = nutEdge === "top"
    ? (isNut ? "border-b-4 border-b-zinc-300" : "border-b border-b-zinc-600")
    : (isNut ? "border-l-4 border-l-zinc-300" : "border-l border-l-zinc-600");

  // String line: thickness and colour vary per string for realism
  const stringLineClass = nutEdge === "top"
    ? (STRING_LINE_PORTRAIT[string] ?? STRING_LINE_PORTRAIT[1]!)
    : (STRING_LINE_LANDSCAPE[string] ?? STRING_LINE_LANDSCAPE[1]!);

  return (
    <button
      role="gridcell"
      aria-label={`String ${string}, fret ${fret}`}
      aria-disabled={disabled}
      onClick={() => handleTap(string, fret)}
      className={[
        "relative flex items-center justify-center",
        highlight ? "" : stringLineClass,
        nutClass,
        highlight ? "" : "hover:bg-zinc-700 active:bg-zinc-600",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {highlight && (
        <span
          aria-hidden="true"
          data-variant={highlight.variant}
          data-label={highlight.label}
          className={`w-8 h-8 rounded-full z-10 flex items-center justify-center ${HIGHLIGHT_CLASSES[highlight.variant]}`}
        >
          {highlight.label && (
            <span className={`text-[11px] font-black leading-none select-none ${LABEL_CLASSES[highlight.variant]}`}>
              {highlight.label}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// ─── Portrait layout ─────────────────────────────────────────────────────────
// Strings = columns (low E left → high e right), Frets = rows (nut top → 12 bottom)

interface LayoutProps {
  highlights: FretHighlight[];
  disabled: boolean;
  handleTap: (string: number, fret: number) => void;
}

function PortraitFretboard({ highlights, disabled, handleTap }: LayoutProps) {
  return (
    <div role="grid" aria-label="Guitar fretboard" className="w-full select-none">
      {/* String name labels */}
      <div aria-hidden="true" className="flex mb-1">
        <div className="w-6 shrink-0" />
        {STRINGS_PORTRAIT.map((s) => (
          <div key={s} className="flex-1 text-center text-[10px] text-zinc-500">
            {STRING_NAMES[s]}
          </div>
        ))}
      </div>

      {FRETS.map((fret) => (
        <div key={fret}>
          <div role="row" className="flex">
            {/* Fret number */}
            <div aria-hidden="true" className="w-6 shrink-0 flex items-center justify-center text-[10px] text-zinc-500">
              {fret === 0 ? "" : fret}
            </div>

            <div className="relative flex flex-1">
              {STRINGS_PORTRAIT.map((string) => (
                <FretCell
                  key={string}
                  string={string}
                  fret={fret}
                  highlight={getHighlight(highlights, string, fret)}
                  disabled={disabled}
                  isNut={fret === 0}
                  nutEdge="top"
                  handleTap={handleTap}
                  className="flex-1 h-12"
                />
              ))}

              {/* Inlay dots */}
              {SINGLE_DOT_FRETS.has(fret) && (
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-20" />
              )}
              {fret === 12 && (
                <>
                  <span aria-hidden="true" className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-20" />
                  <span aria-hidden="true" className="absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-20" />
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Landscape layout ────────────────────────────────────────────────────────
// Strings = rows (low E top → high e bottom), Frets = columns (nut left → 12 right)

// Pre-compute dot left positions as percentages of the fret-area width.
// Fret columns are flex-1 across 13 slots (0–12), so each slot = 1/13 of the area.
const DOT_LEFT: Record<number, string> = Object.fromEntries(
  FRETS.map((f) => [f, `${((f + 0.5) / 13) * 100}%`])
);

function LandscapeFretboard({ highlights, disabled, handleTap }: LayoutProps) {
  return (
    <div role="grid" aria-label="Guitar fretboard" className="w-full select-none">
      {/* Fret number header */}
      <div aria-hidden="true" className="flex mb-1">
        <div className="w-6 shrink-0" /> {/* spacer for string label column */}
        {FRETS.map((fret) => (
          <div key={fret} className="flex-1 text-center text-[10px] text-zinc-500">
            {fret === 0 ? "" : fret}
          </div>
        ))}
      </div>

      {/* String rows + inlay dot overlay */}
      <div className="relative">
        {STRINGS_LANDSCAPE.map((string) => (
          <div key={string} role="row" className="flex items-center">
            {/* String label */}
            <div aria-hidden="true" className="w-6 shrink-0 text-center text-[10px] text-zinc-500">
              {STRING_NAMES[string]}
            </div>

            <div className="flex flex-1">
              {FRETS.map((fret) => (
                <FretCell
                  key={fret}
                  string={string}
                  fret={fret}
                  highlight={getHighlight(highlights, string, fret)}
                  disabled={disabled}
                  isNut={fret === 0}
                  nutEdge="left"
                  handleTap={handleTap}
                  className="flex-1 h-10 border-r border-r-zinc-700"
                />
              ))}
            </div>
          </div>
        ))}

        {/* Inlay dots — absolutely overlaid so they don't break the fret grid */}
        <div aria-hidden="true" className="absolute left-6 right-0 top-0 bottom-0 pointer-events-none">
          {[...SINGLE_DOT_FRETS].map((fret) => (
            <span
              key={fret}
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400"
              style={{ left: DOT_LEFT[fret], top: "50%" }}
            />
          ))}
          {/* Double dot at fret 12 */}
          <span
            className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400"
            style={{ left: DOT_LEFT[12], top: "33%" }}
          />
          <span
            className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400"
            style={{ left: DOT_LEFT[12], top: "67%" }}
          />
        </div>
      </div>
    </div>
  );
}

