/**
 * lib/music/tuner.ts
 *
 * Pure pitch math helpers for the chromatic tuner.
 * No side effects, no Web Audio API — just numbers.
 *
 * Tuning reference: A4 = 440 Hz (standard concert pitch)
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const A4_HZ = 440;
export const A4_MIDI = 69;

/** Chromatic note names (sharp spellings), index 0 = C */
const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PitchInfo {
  /** Nearest semitone as a MIDI note number (e.g. A4 = 69) */
  midi: number;
  /** Note letter name, e.g. "A" */
  note: string;
  /** Octave number, e.g. 4 */
  octave: number;
  /** Cents deviation from the nearest semitone, range −50..+50 */
  cents: number;
  /** Raw detected frequency in Hz */
  frequency: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a frequency in Hz to a (possibly fractional) MIDI note number.
 * midi = 69 + 12 * log2(f / 440)
 */
export function frequencyToMidi(frequency: number): number {
  return A4_MIDI + 12 * Math.log2(frequency / A4_HZ);
}

/**
 * Convert a frequency to its nearest semitone MIDI number (integer).
 */
export function frequencyToNearestMidi(frequency: number): number {
  return Math.round(frequencyToMidi(frequency));
}

/**
 * Cents deviation of a frequency from its nearest semitone.
 * Positive = sharp, negative = flat. Range: −50 to +50.
 */
export function frequencyToCents(frequency: number): number {
  const exact = frequencyToMidi(frequency);
  const nearest = Math.round(exact);
  return (exact - nearest) * 100;
}

/**
 * Convert a MIDI note number to its ideal frequency in Hz.
 */
export function midiToFrequency(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Decompose a MIDI note number into { note, octave }.
 */
export function midiToNoteName(midi: number): { note: string; octave: number } {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { note: NOTE_NAMES[pitchClass] ?? "C", octave };
}

/**
 * Full pitch info from a raw frequency.
 * Returns null for frequencies outside the guitar range (approx 70–1400 Hz).
 */
export function analyzePitch(frequency: number): PitchInfo | null {
  if (!isFinite(frequency) || frequency < 60 || frequency > 1400) return null;
  const midi = frequencyToNearestMidi(frequency);
  const { note, octave } = midiToNoteName(midi);
  const cents = frequencyToCents(frequency);
  return { midi, note, octave, cents, frequency };
}

// ─── Standard guitar string reference ────────────────────────────────────────

export interface GuitarString {
  string: number; // 1 = high E, 6 = low E
  note: string;
  octave: number;
  midi: number;
  label: string; // e.g. "E4"
}

export const STANDARD_TUNING: GuitarString[] = [
  { string: 1, note: "E", octave: 4, midi: 64, label: "E4" },
  { string: 2, note: "B", octave: 3, midi: 59, label: "B3" },
  { string: 3, note: "G", octave: 3, midi: 55, label: "G3" },
  { string: 4, note: "D", octave: 3, midi: 50, label: "D3" },
  { string: 5, note: "A", octave: 2, midi: 45, label: "A2" },
  { string: 6, note: "E", octave: 2, midi: 40, label: "E2" },
];

/**
 * Find the closest standard tuning string to a detected pitch.
 * Returns the string entry and how many cents away the open string is.
 */
export function nearestString(pitch: PitchInfo): { guitarString: GuitarString; centsOff: number } {
  let best: GuitarString = STANDARD_TUNING[0]!;
  let bestDist = Infinity;
  for (const gs of STANDARD_TUNING) {
    const dist = Math.abs(pitch.midi - gs.midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = gs;
    }
  }
  // cents from open string frequency
  const openFreq = midiToFrequency(best.midi);
  const centsOff = 1200 * Math.log2(pitch.frequency / openFreq);
  return { guitarString: best, centsOff };
}
