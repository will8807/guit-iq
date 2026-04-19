/**
 * lib/music/fretboard.ts
 *
 * Utilities for mapping guitar fretboard positions to notes and vice versa.
 *
 * Coordinate system:
 *   string: 1 (high E) – 6 (low E), matching STANDARD_TUNING
 *   fret:   0 (open) – 12
 */

import { fretToNote, normalizeNote, STANDARD_TUNING } from "./notes";

export interface FretPosition {
  string: number; // 1–6
  fret: number;   // 0–12
}

/**
 * Returns the note name at a given string/fret position.
 * e.g. getNoteAtPosition(1, 5) → "A4"
 */
export function getNoteAtPosition(string: number, fret: number): string {
  if (string < 1 || string > 6) {
    throw new RangeError(`String must be 1–6, got ${string}`);
  }
  if (fret < 0 || fret > 12) {
    throw new RangeError(`Fret must be 0–12, got ${fret}`);
  }
  return fretToNote(string, fret);
}

/**
 * Returns every fretboard position (frets 0–12) that produces the given note,
 * regardless of octave.
 *
 * e.g. getAllPositionsForNote("A") → [{string:1,fret:5},{string:2,fret:10},…]
 *
 * Accepts note names with or without octave (e.g. "A", "A4", "Bb", "C#3").
 * When an octave is provided the match is octave-specific.
 * When no octave is provided the match is pitch-class only.
 */
export function getAllPositionsForNote(note: string): FretPosition[] {
  const hasOctave = /\d$/.test(note.trim());
  const normalized = normalizeNote(hasOctave ? note : `${note}4`);
  // pitch class = note name without octave digits
  const targetClass = normalized.replace(/\d+$/, "");

  const positions: FretPosition[] = [];

  for (const stringNum of [1, 2, 3, 4, 5, 6] as const) {
    for (let fret = 0; fret <= 12; fret++) {
      const posNote = fretToNote(stringNum, fret);
      const posNormalized = normalizeNote(posNote);

      if (hasOctave) {
        if (posNormalized === normalized) {
          positions.push({ string: stringNum, fret });
        }
      } else {
        const posClass = posNormalized.replace(/\d+$/, "");
        if (posClass === targetClass) {
          positions.push({ string: stringNum, fret });
        }
      }
    }
  }

  return positions;
}

/**
 * All 78 fretboard positions (6 strings × 13 frets).
 * Useful for building a full fretboard map.
 */
export function getAllPositions(): FretPosition[] {
  const positions: FretPosition[] = [];
  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= 12; fret++) {
      positions.push({ string, fret });
    }
  }
  return positions;
}

/**
 * Build a lookup map: "E2" → [{string:6,fret:0}, …]
 * Covers all 78 positions, keyed by normalized note name (with octave).
 */
export function buildFretboardMap(): Map<string, FretPosition[]> {
  const map = new Map<string, FretPosition[]>();
  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= 12; fret++) {
      const note = normalizeNote(fretToNote(string, fret));
      const existing = map.get(note) ?? [];
      existing.push({ string, fret });
      map.set(note, existing);
    }
  }
  return map;
}

export { STANDARD_TUNING };
