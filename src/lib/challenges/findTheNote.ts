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
  /** The position the user tapped (for intervals: the second-note tap) */
  tappedPosition: FretPosition;
  /** All positions that would have been correct (for intervals: second note) */
  validPositions: FretPosition[];
  targetNote: string;
  /**
   * Present only for interval challenges — provides per-note breakdown
   * and the interval name for educational post-answer display.
   */
  intervalResult?: IntervalTapResult;
  /**
   * Present only for chord challenges — provides per-tap breakdown,
   * missed pitch classes, and the chord label.
   */
  chordResult?: import("@/lib/challenges/findTheChord").ChordEvaluationResult;
}

/**
 * Per-note breakdown for a two-tap interval challenge evaluation.
 */
export interface IntervalTapResult {
  rootTap: FretPosition;
  rootCorrect: boolean;
  rootValidPositions: FretPosition[];
  secondTap: FretPosition;
  secondCorrect: boolean;
  secondValidPositions: FretPosition[];
  /** Human-readable interval name, e.g. "Perfect 5th" */
  intervalName: string;
  /**
   * True when the second tap has the correct pitch but is on the same string
   * as the root tap. The answer is still wrong (cross-string required), but the
   * UI can show a specific hint: "Correct note — try a different string".
   */
  secondSameString?: boolean;
}

/**
 * Per-note accuracy stats, keyed by canonical note name (e.g. "A3").
 * Used by the adaptive weighted selection algorithm.
 */
export interface NoteStats {
  attempts: number;
  correct: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a filtered MIDI candidate pool for the given difficulty.
 */
function buildCandidatePool(difficulty: Difficulty): Set<number> {
  const config = DIFFICULTY_CONFIG[difficulty];
  let pool = getMidiRange(config.minFret, config.maxFret);
  if (config.midiFilter) {
    pool = new Set(Array.from(pool).filter(config.midiFilter));
  }
  if (pool.size === 0) {
    throw new Error(`No candidate notes for difficulty "${difficulty}"`);
  }
  return pool;
}

/**
 * Build a FindTheNoteChallenge from a chosen MIDI value + difficulty.
 */
function challengeFromMidi(
  targetMidi: number,
  difficulty: Difficulty
): FindTheNoteChallenge {
  const config = DIFFICULTY_CONFIG[difficulty];
  const targetNote = normalizeNote(midiToNote(targetMidi));
  const allPositions = getAllPositionsForNote(targetNote);
  const validPositions = allPositions.filter(
    (p) => p.fret >= config.minFret && p.fret <= config.maxFret
  );
  return { targetMidi, targetNote, validPositions, difficulty };
}

// ─── Generate (uniform) ───────────────────────────────────────────────────────

/**
 * Generate a new Find the Note challenge using uniform random selection.
 */
export function generateChallenge(
  difficulty: Difficulty = "easy"
): FindTheNoteChallenge {
  const pool = buildCandidatePool(difficulty);
  return challengeFromMidi(randomFromSet(pool), difficulty);
}

// ─── Generate (adaptive / weighted) ──────────────────────────────────────────

/**
 * Compute a selection weight for a note given its historical stats.
 *
 * Notes never seen before get weight 1.0 (neutral).
 * Notes answered incorrectly more often get a higher weight (seen more).
 * Notes answered correctly most of the time get a lower weight (seen less).
 *
 * Weight formula:  w = BASE_WEIGHT + (1 - accuracy) * BOOST
 *   where accuracy = correct / attempts (clamped to [0, 1])
 *
 * This means:
 *   - 0% accuracy  → weight = 0.2 + 1.0 * 1.8 = 2.0  (seen ~10× more than a note at 100%)
 *   - 50% accuracy → weight = 0.2 + 0.5 * 1.8 = 1.1
 *   - 100% accuracy → weight = 0.2 + 0.0 * 1.8 = 0.2
 *   - unseen        → weight = 1.0
 */
const BASE_WEIGHT = 0.2;
const BOOST = 1.8;

export function noteWeight(stats: NoteStats | undefined): number {
  if (!stats || stats.attempts === 0) return 1.0;
  const accuracy = Math.min(1, stats.correct / stats.attempts);
  return BASE_WEIGHT + (1 - accuracy) * BOOST;
}

/**
 * Generate a challenge using adaptive weighted random selection.
 *
 * Notes the user finds harder (lower accuracy) are drawn more frequently.
 * Falls back to uniform selection if noteStats is empty.
 */
export function generateWeightedChallenge(
  difficulty: Difficulty = "easy",
  noteStats: Record<string, NoteStats> = {}
): FindTheNoteChallenge {
  const pool = buildCandidatePool(difficulty);
  const candidates = Array.from(pool);

  // Build weight array — map MIDI → note name → weight
  const weights = candidates.map((midi) => {
    const note = normalizeNote(midiToNote(midi));
    return noteWeight(noteStats[note]);
  });

  // Weighted random draw
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * totalWeight;
  let chosen: number = candidates[candidates.length - 1]!; // fallback
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!;
    if (r <= 0) {
      chosen = candidates[i]!;
      break;
    }
  }

  return challengeFromMidi(chosen, difficulty);
}

// ─── Difficulty progression ───────────────────────────────────────────────────

/** Number of consecutive correct answers needed to advance difficulty */
export const STREAK_THRESHOLD = 5;

export const NEXT_DIFFICULTY: Partial<Record<Difficulty, Difficulty>> = {
  easy: "medium",
  medium: "hard",
};

// ─── Evaluate ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a user's fretboard tap against the challenge.
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
