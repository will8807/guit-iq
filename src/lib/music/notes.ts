/**
 * lib/music/notes.ts
 *
 * Pure note/MIDI utility functions. No side effects. No imports.
 *
 * MIDI note numbers:
 *   C4 (middle C) = 60
 *   Each octave = 12 semitones
 *   Formula: midi = (octave + 1) * 12 + pitchClassIndex
 */

// ─── Pitch Classes ────────────────────────────────────────────────────────────

/** Canonical sharp names, index = semitone within octave (0–11) */
export const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/** Flat equivalents, same index order */
export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type SharpName = (typeof SHARP_NAMES)[number];
export type FlatName = (typeof FLAT_NAMES)[number];
export type PitchClass = SharpName | FlatName;

/** Map any note name (sharp or flat) to its semitone index 0–11 */
const PITCH_CLASS_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a note string like "A3", "C#4", "Bb2" into pitch class and octave.
 * Returns null if the string is not a valid note.
 */
export function parseNote(note: string): {
  pitchClass: string;
  octave: number;
} | null {
  const match = /^([A-G][b#]?)(-?\d+)$/.exec(note.trim());
  if (!match) return null;
  const pitchClass = match[1] as string;
  const octave = parseInt(match[2] as string, 10);
  if (!(pitchClass in PITCH_CLASS_TO_SEMITONE)) return null;
  return { pitchClass, octave };
}

// ─── Conversions ──────────────────────────────────────────────────────────────

/**
 * Convert a note string to a MIDI number.
 * e.g. "C4" → 60, "A4" → 69, "E2" → 40
 * Throws if the note string is invalid.
 */
export function noteToMidi(note: string): number {
  const parsed = parseNote(note);
  if (!parsed) throw new Error(`Invalid note: "${note}"`);
  const semitone = PITCH_CLASS_TO_SEMITONE[parsed.pitchClass];
  if (semitone === undefined)
    throw new Error(`Invalid pitch class: "${parsed.pitchClass}"`);
  return (parsed.octave + 1) * 12 + semitone;
}

/**
 * Convert a MIDI number to a note string (using sharp names).
 * e.g. 60 → "C4", 61 → "C#4", 69 → "A4"
 */
export function midiToNote(midi: number): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new Error(`Invalid MIDI number: ${midi}`);
  }
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const pitchClass = SHARP_NAMES[semitone];
  if (!pitchClass) throw new Error(`Could not resolve pitch class for ${midi}`);
  return `${pitchClass}${octave}`;
}

/**
 * Convert a MIDI number to a frequency in Hz.
 * Uses standard A4 = 440 Hz tuning.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ─── Enharmonic Equivalence ───────────────────────────────────────────────────

/**
 * Return true if two note strings represent the same pitch.
 * e.g. "C#4" and "Db4" → true, "C4" and "C5" → false
 */
export function isEnharmonic(a: string, b: string): boolean {
  try {
    return noteToMidi(a) === noteToMidi(b);
  } catch {
    return false;
  }
}

/**
 * Normalize a note to its canonical sharp form.
 * e.g. "Db4" → "C#4", "Bb3" → "A#3"
 */
export function normalizeNote(note: string): string {
  return midiToNote(noteToMidi(note));
}

// ─── Standard Guitar Tuning ───────────────────────────────────────────────────

/**
 * Standard tuning open string notes, indexed 1–6.
 * String 1 = high E, String 6 = low E.
 *
 *   String 1: E4 (MIDI 64)
 *   String 2: B3 (MIDI 59)
 *   String 3: G3 (MIDI 55)
 *   String 4: D3 (MIDI 50)
 *   String 5: A2 (MIDI 45)
 *   String 6: E2 (MIDI 40)
 */
export const STANDARD_TUNING: Record<number, string> = {
  1: "E4",
  2: "B3",
  3: "G3",
  4: "D3",
  5: "A2",
  6: "E2",
};

/**
 * Get the MIDI number for a given string (1–6) and fret (0–24) in standard tuning.
 */
export function fretToMidi(string: number, fret: number): number {
  const openNote = STANDARD_TUNING[string];
  if (!openNote) throw new Error(`Invalid string number: ${string}`);
  return noteToMidi(openNote) + fret;
}

/**
 * Get the note name for a given string and fret.
 */
export function fretToNote(string: number, fret: number): string {
  return midiToNote(fretToMidi(string, fret));
}

// ─── Note Range Utilities ─────────────────────────────────────────────────────

/** MIDI range of the guitar neck (strings 1–6, frets 0–12) */
export const GUITAR_MIDI_MIN = noteToMidi("E2"); // string 6, fret 0  = 40
export const GUITAR_MIDI_MAX = noteToMidi("E5"); // string 1, fret 12 = 76

/**
 * Return all unique MIDI values playable on the guitar within a fret range.
 */
export function getMidiRange(
  minFret: number,
  maxFret: number
): Set<number> {
  const result = new Set<number>();
  for (let string = 1; string <= 6; string++) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      result.add(fretToMidi(string, fret));
    }
  }
  return result;
}

/**
 * Pick a random MIDI number from a Set.
 */
export function randomFromSet(set: Set<number>): number {
  const arr = Array.from(set);
  if (arr.length === 0) throw new Error("Cannot pick from empty set");
  const idx = Math.floor(Math.random() * arr.length);
  const value = arr[idx];
  if (value === undefined) throw new Error("Unexpected undefined in set");
  return value;
}
