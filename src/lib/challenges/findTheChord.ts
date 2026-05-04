/**
 * lib/challenges/findTheChord.ts
 *
 * "Find the Chord" challenge: the system plays a chord and the user must
 * tap all the pitch classes on the fretboard (any voicing, any octave).
 *
 * Evaluation is pitch-class based:
 *   - Each tapped position is tested against the set of required pitch classes.
 *   - Any voicing is accepted — the user doesn't need to tap the exact octave.
 *   - Extra wrong taps count as incorrect taps.
 *   - The answer is fully correct only when every required pitch class has been
 *     covered by at least one correct tap (with no wrong taps).
 */

import { midiToNote, GUITAR_MIDI_MIN, GUITAR_MIDI_MAX, fretToMidi } from "@/lib/music/notes";
import { getAllPositionsForNote } from "@/lib/music/fretboard";
import {
  CHORDS,
  pickChordForDifficulty,
  buildChordVoicing,
  isPlayableVoicing,
  type ChordDefWithKey,
} from "@/lib/music/chords";
import type { FretPosition } from "@/lib/music/fretboard";
import type { Difficulty } from "@/lib/challenges/findTheNote";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FindTheChordChallenge {
  type: "find-the-chord";
  /** Root note MIDI number */
  rootMidi: number;
  /** Root note name, e.g. "C4" */
  rootNote: string;
  /** Short chord key, e.g. "Maj", "m7" */
  chordKey: string;
  /** Human-readable chord name, e.g. "Major" */
  chordName: string;
  /** Full chord label, e.g. "C Major" */
  chordLabel: string;
  /** MIDI values for each chord tone (root + intervals) */
  midiNotes: number[];
  /** Set of pitch classes (0–11) that constitute the chord */
  pitchClasses: Set<number>;
  difficulty: Difficulty;
}

export interface ChordTapResult {
  /** The position the user tapped */
  position: FretPosition;
  /** Whether this tap's pitch class is in the chord */
  correct: boolean;
  /** The pitch class of the tapped note (midi % 12) */
  pitchClass: number;
}

/** Short display label for each interval semitone offset from root */
export const INTERVAL_LABELS: Record<number, string> = {
  0: "R",
  2: "2",
  3: "♭3",
  4: "3",
  5: "4",
  6: "♭5",
  7: "5",
  8: "#5",
  9: "6",
  10: "♭7",
  11: "7",
};

export interface ChordEvaluationResult {
  /** True only when every pitch class was covered with no wrong taps */
  correct: boolean;
  /** Per-tap breakdown */
  tapResults: ChordTapResult[];
  /** Pitch classes that were required but not covered by any correct tap */
  missedPitchClasses: Set<number>;
  /** Human-readable label, e.g. "C Major" */
  chordLabel: string;
  /** Maps each required pitch class → role label, e.g. 5 → "R", 9 → "3", 0 → "#5" */
  pitchClassLabels: Map<number, string>;
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate a chord challenge. Picks a chord from the pool for the given difficulty
 * and a random root MIDI value such that all chord tones are within guitar range.
 */
export function generateChordChallenge(
  difficulty: Difficulty = "easy",
  rand = Math.random,
): FindTheChordChallenge {
  const chord: ChordDefWithKey = pickChordForDifficulty(difficulty, rand);

  // Find root MIDI values that produce a complete, playable ascending voicing
  const expectedNoteCount = chord.intervals.length + 1; // root + all chord tones
  const candidates: number[] = [];
  for (let m = GUITAR_MIDI_MIN; m <= GUITAR_MIDI_MAX; m++) {
    const voicing = buildChordVoicing(m, chord.intervals);
    if (isPlayableVoicing(voicing, expectedNoteCount)) {
      candidates.push(m);
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No valid root found for chord "${chord.key}"`);
  }

  // Bias toward lower-register voicings (roots on strings 4–6, ≤ A3 = MIDI 57)
  // so chords don't always sound on the treble strings.
  // 60 % of the time: prefer low-register candidates if any exist.
  const LOW_REGISTER_MAX_MIDI = 57; // A3
  const lowCandidates = candidates.filter((m) => m <= LOW_REGISTER_MAX_MIDI);
  const usePool = lowCandidates.length > 0 && rand() < 0.6 ? lowCandidates : candidates;
  const rootMidi = usePool[Math.floor(rand() * usePool.length)]!;
  // buildChordVoicing already produces notes in ascending order
  const midiNotes = buildChordVoicing(rootMidi, chord.intervals);
  const pitchClasses = new Set(midiNotes.map((n) => n % 12));
  const rootNote = midiToNote(rootMidi);

  return {
    type: "find-the-chord",
    rootMidi,
    rootNote,
    chordKey: chord.key,
    chordName: chord.name,
    chordLabel: `${rootNote.replace(/\d/, "")} ${chord.name}`,
    midiNotes,
    pitchClasses,
    difficulty,
  };
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Evaluate the user's multi-tap answer against the chord's pitch classes.
 *
 * @param challenge  The active chord challenge
 * @param taps       All fretboard positions the user tapped before pressing "Done"
 */
export function evaluateChordAnswer(
  challenge: FindTheChordChallenge,
  taps: FretPosition[],
): ChordEvaluationResult {
  const tapResults: ChordTapResult[] = taps.map((pos) => {
    const midi = fretToMidi(pos.string, pos.fret);
    const pitchClass = midi % 12;
    return {
      position: pos,
      correct: challenge.pitchClasses.has(pitchClass),
      pitchClass,
    };
  });

  // Which pitch classes did correct taps cover?
  const coveredPitchClasses = new Set(
    tapResults.filter((t) => t.correct).map((t) => t.pitchClass),
  );

  const missedPitchClasses = new Set(
    [...challenge.pitchClasses].filter((pc) => !coveredPitchClasses.has(pc)),
  );

  const hasWrongTaps = tapResults.some((t) => !t.correct);
  const correct = missedPitchClasses.size === 0 && !hasWrongTaps;

  // Build pitch-class → role label map (root=0 offset, others by interval)
  const rootPc = challenge.rootMidi % 12;
  const chord = CHORDS[challenge.chordKey];
  const pitchClassLabels = new Map<number, string>();
  pitchClassLabels.set(rootPc, "R");
  for (const interval of chord?.intervals ?? []) {
    const pc = (rootPc + interval) % 12;
    pitchClassLabels.set(pc, INTERVAL_LABELS[interval] ?? String(interval));
  }

  return {
    correct,
    tapResults,
    missedPitchClasses,
    chordLabel: challenge.chordLabel,
    pitchClassLabels,
  };
}

/**
 * For a given set of missed pitch classes, return all fretboard positions
 * where those notes can be found (for feedback reveal).
 */
export function getMissedPositions(
  missedPitchClasses: Set<number>,
): FretPosition[] {
  const positions: FretPosition[] = [];
  const seen = new Set<string>();
  for (const pc of missedPitchClasses) {
    for (let midi = GUITAR_MIDI_MIN; midi <= GUITAR_MIDI_MAX; midi++) {
      if (midi % 12 === pc) {
        const noteName = midiToNote(midi);
        const notePositions = getAllPositionsForNote(noteName);
        for (const pos of notePositions) {
          const posKey = `${pos.string}-${pos.fret}`;
          if (!seen.has(posKey)) {
            seen.add(posKey);
            positions.push(pos);
          }
        }
        break; // one midi per pitch class is sufficient
      }
    }
  }
  return positions;
}
