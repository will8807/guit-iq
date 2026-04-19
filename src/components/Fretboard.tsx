"use client";

/**
 * components/Fretboard.tsx
 *
 * A touch-friendly guitar fretboard — VERTICAL layout (portrait-first).
 *
 * Orientation:
 *   - Strings run LEFT → RIGHT: string 1 (high E) on the left, string 6 (low E) on the right
 *   - Frets run TOP → BOTTOM: fret 0 (open / nut) at the top, fret 12 at the bottom
 *
 * Design constraints:
 * - NO note name labels ever shown — the fretboard is an input device, not a diagram
 * - Tapping a cell plays the note through the audio engine
 * - onSelect(string, fret) bubbles the tap up so challenge logic can evaluate it
 * - highlights prop lets callers mark positions (e.g. correct/incorrect feedback)
 *
 * String numbering: 1 = high E (leftmost column), 6 = low E (rightmost column)
 * Fret numbering:   0 = open string (top row), 12 = 12th fret (bottom row)
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

const STRINGS = [6, 5, 4, 3, 2, 1] as const; // left = low E, right = high E
const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0–12

const HIGHLIGHT_CLASSES: Record<HighlightVariant, string> = {
  correct: "bg-green-500",
  incorrect: "bg-red-500",
  hint: "bg-yellow-400",
};

// Single inlay dot in the centre column (between strings 3 & 4) at these frets
const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9]);
// 12th fret double dots sit between strings 2/3 and 4/5
// We render them in the dot strip after a fret row when fret === 12

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
      className="w-full select-none"
    >
      {/* String name labels at the top */}
      <div aria-hidden="true" className="flex mb-1">
        <div className="w-6 shrink-0" />
        {STRINGS.map((string) => {
          // string 1=high E, 2=B, 3=G, 4=D, 5=A, 6=low E
          const nameByString: Record<number, string> = { 1: "e", 2: "B", 3: "G", 4: "D", 5: "A", 6: "E" };
          return (
            <div
              key={string}
              className="flex-1 text-center text-[10px] text-zinc-500"
            >
              {nameByString[string]}
            </div>
          );
        })}
      </div>

      {/* Fret rows — top = open/nut, bottom = fret 12 */}
      {FRETS.map((fret) => (
        <div key={fret}>
          {/* Clickable cells for this fret, with inlay dots overlaid */}
          <div role="row" className="flex">
            {/* Fret number label */}
            <div
              aria-hidden="true"
              className="w-6 shrink-0 flex items-center justify-center text-[10px] text-zinc-500"
            >
              {fret === 0 ? "" : fret}
            </div>

            {/* String columns — relative so dots can be absolutely positioned */}
            <div className="relative flex flex-1">
              {STRINGS.map((string) => {
                const highlight = getHighlight(highlights, string, fret);
                const isNut = fret === 0;

                return (
                  <button
                    key={string}
                    role="gridcell"
                    aria-label={`String ${string}, fret ${fret}`}
                    aria-disabled={disabled}
                    onClick={() => handleTap(string, fret)}
                    className={[
                      "flex-1 h-12 relative flex items-center justify-center",
                      // Vertical string line — hide when highlighted so dot shows cleanly
                      highlight ? "" : "before:absolute before:inset-x-1/2 before:inset-y-0 before:w-px before:bg-zinc-500",
                      // Bottom border = fret wire; nut is thicker
                      isNut
                        ? "border-b-4 border-b-zinc-300"
                        : "border-b border-b-zinc-600",
                      // Highlight colour kept on the button for test assertions
                      highlight
                        ? HIGHLIGHT_CLASSES[highlight.variant]
                        : "hover:bg-zinc-700 active:bg-zinc-600",
                      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {highlight && (
                      <span
                        aria-hidden="true"
                        className="w-7 h-7 rounded-full z-10 block bg-white/20"
                      />
                    )}
                  </button>
                );
              })}

              {/* Inlay dots — absolutely positioned over the string area, between strings */}
              {SINGLE_DOT_FRETS.has(fret) && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-10"
                />
              )}
              {fret === 12 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-10"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 pointer-events-none z-10"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
