/**
 * lib/music/chords.ts
 *
 * Chord definitions and helpers for the "Find the Chord" challenge.
 *
 * A chord is defined by:
 *   - name:      human-readable label, e.g. "Major"
 *   - intervals: semitone offsets from the root, NOT including the root itself
 *                e.g. Major = [4, 7] → root + M3 + P5
 *
 * Chord keys use standard abbreviations:
 *   Maj, min, dim, aug, dom7, maj7, m7, m7b5, sus2, sus4
 */

import { GUITAR_MIDI_MIN, GUITAR_MIDI_MAX } from "@/lib/music/notes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChordDef {
  /** Human-readable name, e.g. "Major" */
  name: string;
  /** Semitone offsets from root (not including root). e.g. [4, 7] for major */
  intervals: number[];
}

export type ChordDefWithKey = ChordDef & { key: string };

// ─── Chord library ────────────────────────────────────────────────────────────

export const CHORDS: Record<string, ChordDef> = {
  Maj:  { name: "Major",          intervals: [4, 7] },
  min:  { name: "Minor",          intervals: [3, 7] },
  dim:  { name: "Diminished",     intervals: [3, 6] },
  aug:  { name: "Augmented",      intervals: [4, 8] },
  dom7: { name: "Dominant 7th",   intervals: [4, 7, 10] },
  maj7: { name: "Major 7th",      intervals: [4, 7, 11] },
  m7:   { name: "Minor 7th",      intervals: [3, 7, 10] },
  m7b5: { name: "Half-Diminished", intervals: [3, 6, 10] },
  sus2: { name: "Sus2",           intervals: [2, 7] },
  sus4: { name: "Sus4",           intervals: [5, 7] },
};

// ─── Difficulty pools ─────────────────────────────────────────────────────────

export const CHORD_POOL: Record<string, string[]> = {
  easy:   ["Maj", "min"],
  medium: ["Maj", "min", "dim", "aug", "dom7"],
  hard:   ["Maj", "min", "dim", "aug", "dom7", "maj7", "m7", "m7b5", "sus2", "sus4"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick a random chord definition for the given difficulty.
 */
export function pickChordForDifficulty(
  difficulty: string,
  rand = Math.random,
): ChordDefWithKey {
  const pool = CHORD_POOL[difficulty] ?? CHORD_POOL["medium"]!;
  const key = pool[Math.floor(rand() * pool.length)]!;
  const chord = CHORDS[key] ?? CHORDS["Maj"]!;
  return { ...chord, key };
}

/**
 * Maximum semitone span (lowest to highest note) for an acceptable voicing.
 * 24 = two octaves — keeps the chord in a tight, audible register.
 */
export const MAX_VOICING_SPAN = 24;

/**
 * Build an ascending chord voicing starting from rootMidi.
 *
 * Each chord tone is placed at the lowest MIDI pitch that is:
 *   - strictly above the previous note in the voicing
 *   - of the correct pitch class (rootMidi + interval) % 12
 *   - within guitar range (≤ GUITAR_MIDI_MAX)
 *
 * If a chord tone cannot be placed (no fitting note ≤ GUITAR_MIDI_MAX), it is
 * omitted — callers should check the returned length against `intervals.length + 1`
 * to detect incomplete voicings.
 *
 * The result is always in ascending pitch order with the root as the lowest note.
 */
export function buildChordVoicing(rootMidi: number, intervals: number[]): number[] {
  const notes: number[] = [rootMidi];
  for (const semitones of intervals) {
    const targetPc = (rootMidi + semitones) % 12;
    const prev = notes[notes.length - 1]!;
    // Climb from just above `prev` until we land on the right pitch class
    let candidate = prev + 1;
    while (candidate % 12 !== targetPc) candidate++;
    if (candidate <= GUITAR_MIDI_MAX) {
      notes.push(candidate);
    }
    // If candidate exceeds range this chord tone is omitted — voicing incomplete
  }
  return notes;
}

/**
 * Returns true when a voicing is usable for a challenge:
 *   - All expected chord tones are present (no omissions)
 *   - Total span from lowest to highest note ≤ MAX_VOICING_SPAN
 */
export function isPlayableVoicing(
  notes: number[],
  expectedNoteCount: number,
): boolean {
  if (notes.length !== expectedNoteCount) return false;
  const span = notes[notes.length - 1]! - notes[0]!;
  return span <= MAX_VOICING_SPAN;
}
