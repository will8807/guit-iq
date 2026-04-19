/**
 * lib/challenges/findTheNote.ts
 *
 * "Find the Note" challenge: the user hears a note and must locate it on the fretboard.
 *
 * Difficulty levels control which notes are used and how wide the fret range is:
 *   - easy:   open strings + frets 0–4,  notes from E2/A2/D3/G3/B3/E4 only
 *   - medium: frets 0–7,  all natural notes
 *   - hard:   frets 0–12, all 12 pitch classes (including sharps/flats)
 */

import {
  getMidiRange,
  randomFromSet,
  midiToNote,
  normalizeNote,
} from "@/lib/music/notes";
import {
  getAllPositionsForNote,
  type FretPosition,
} from "@/lib/music/fretboard";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export interface FindTheNoteChallenge {
  /** The MIDI number of the target note */
  targetMidi: number;
  /** Canonical note name, e.g. "A3" */
  targetNote: string;
  /** All fretboard positions that produce this note (within the difficulty fret range) */
  validPositions: FretPosition[];
  difficulty: Difficulty;
}

export interface EvaluationResult {
  correct: boolean;
  /** The position the user tapped */
  tappedPosition: FretPosition;
  /** All positions that would have been correct */
  validPositions: FretPosition[];
  targetNote: string;
}

// ─── Difficulty config ────────────────────────────────────────────────────────

interface DifficultyConfig {
  minFret: number;
  maxFret: number;
  /** If set, only MIDI values in this whitelist are eligible */
  midiFilter?: (midi: number) => boolean;
}

// Natural note MIDI pitch classes (C D E F G A B)
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    minFret: 0,
    maxFret: 4,
    midiFilter: (midi) => NATURAL_PITCH_CLASSES.has(midi % 12),
  },
  medium: {
    minFret: 0,
    maxFret: 7,
    midiFilter: (midi) => NATURAL_PITCH_CLASSES.has(midi % 12),
  },
  hard: {
    minFret: 0,
    maxFret: 12,
  },
};

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Generate a new Find the Note challenge.
 *
 * Picks a random note that appears somewhere on the fretboard within the
 * difficulty's fret range, then records all valid positions for it.
 */
export function generateChallenge(
  difficulty: Difficulty = "easy"
): FindTheNoteChallenge {
  const config = DIFFICULTY_CONFIG[difficulty];
  let candidatePool = getMidiRange(config.minFret, config.maxFret);

  if (config.midiFilter) {
    candidatePool = new Set(
      Array.from(candidatePool).filter(config.midiFilter)
    );
  }

  if (candidatePool.size === 0) {
    throw new Error(`No candidate notes for difficulty "${difficulty}"`);
  }

  const targetMidi = randomFromSet(candidatePool);
  const targetNote = normalizeNote(midiToNote(targetMidi));

  // Valid positions: all fretboard spots that produce this note AND are within fret range
  const allPositions = getAllPositionsForNote(targetNote);
  const validPositions = allPositions.filter(
    (p) => p.fret >= config.minFret && p.fret <= config.maxFret
  );

  return { targetMidi, targetNote, validPositions, difficulty };
}

// ─── Evaluate ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a user's fretboard tap against the challenge.
 *
 * Correct if the tapped position is in the validPositions list OR
 * produces an enharmonic equivalent of the target note.
 */
export function evaluateAnswer(
  challenge: FindTheNoteChallenge,
  string: number,
  fret: number
): EvaluationResult {
  const tappedPosition: FretPosition = { string, fret };

  const correct = challenge.validPositions.some(
    (p) => p.string === string && p.fret === fret
  );

  return {
    correct,
    tappedPosition,
    validPositions: challenge.validPositions,
    targetNote: challenge.targetNote,
  };
}
