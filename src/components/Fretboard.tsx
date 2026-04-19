"use client";

/**
 * components/Fretboard.tsx
 *
 * A touch-friendly guitar fretboard grid (6 strings × 13 frets).
 *
 * Design constraints:
 * - NO note name labels ever shown — the fretboard is an input device, not a diagram
 * - Tapping a cell plays the note through the audio engine
 * - onSelect(string, fret) bubbles the tap up so challenge logic can evaluate it
 * - highlights prop lets callers mark positions (e.g. correct/incorrect feedback)
 *
 * String numbering: 1 = high E (top row), 6 = low E (bottom row)
 * Fret numbering:   0 = open string, 12 = 12th fret
 */

import { getNoteAtPosition, type FretPosition } from "@/lib/music/fretboard";
import { playNote, isAudioReady } from "@/lib/audio/engine";

export type HighlightVariant = "correct" | "incorrect" | "hint";

export interface FretHighlight extends FretPosition {
  variant: HighlightVariant;
}

interface FretboardProps {
  /** Called when the user taps a fret cell */
  onSelect?: (string: number, fret: number) => void;
  /** Positions to highlight with feedback colours */
  highlights?: FretHighlight[];
  /** Disable all interaction (e.g. while audio is playing) */
  disabled?: boolean;
}

const STRINGS = [1, 2, 3, 4, 5, 6] as const;
const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0–12

const HIGHLIGHT_CLASSES: Record<HighlightVariant, string> = {
  correct: "bg-green-500",
  incorrect: "bg-red-500",
  hint: "bg-yellow-400",
};

const NUT_MARKER_FRETS = new Set([3, 5, 7, 9, 12]);

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
}: FretboardProps) {
  async function handleTap(string: number, fret: number) {
    if (disabled) return;
    onSelect?.(string, fret);
    if (isAudioReady()) {
      const note = getNoteAtPosition(string, fret);
      await playNote(note, 1.5);
    }
  }

  return (
    <div
      role="grid"
      aria-label="Guitar fretboard"
      className="w-full overflow-x-auto select-none"
    >
      {/* Fret number header */}
      <div
        role="row"
        className="flex"
        aria-hidden="true"
      >
        {/* Spacer for string label column */}
        <div className="w-6 shrink-0" />
        {FRETS.map((fret) => (
          <div
            key={fret}
            className="flex-1 text-center text-[10px] text-zinc-500 pb-1"
          >
            {fret === 0 ? "" : fret}
          </div>
        ))}
      </div>

      {/* String rows */}
      {STRINGS.map((string) => (
        <div key={string} role="row" className="flex items-center mb-1">
          {/* String number label (screen-reader only) */}
          <span className="sr-only">String {string}</span>
          {/* Visual string line indicator */}
          <div
            aria-hidden="true"
            className="w-6 shrink-0 text-center text-[10px] text-zinc-600"
          >
            {string}
          </div>

          {FRETS.map((fret) => {
            const highlight = getHighlight(highlights, string, fret);
            const isOpen = fret === 0;
            const hasDot = NUT_MARKER_FRETS.has(fret) && string === 3;

            return (
              <button
                key={fret}
                role="gridcell"
                aria-label={`String ${string}, fret ${fret}`}
                aria-disabled={disabled}
                onClick={() => handleTap(string, fret)}
                className={[
                  "flex-1 h-10 relative flex items-center justify-center",
                  "border-r border-zinc-700",
                  isOpen
                    ? "border-l-4 border-l-zinc-300" // nut
                    : "border-l border-zinc-700",
                  // String line through the middle
                  "before:absolute before:inset-y-1/2 before:inset-x-0 before:h-px before:bg-zinc-500",
                  highlight
                    ? `${HIGHLIGHT_CLASSES[highlight.variant]} before:hidden rounded-full`
                    : "hover:bg-zinc-700 active:bg-zinc-600",
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                ].join(" ")}
              >
                {hasDot && !highlight && (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-zinc-500 z-10"
                  />
                )}
                {highlight && (
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-full z-10 block"
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
