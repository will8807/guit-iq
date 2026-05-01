/**
 * lib/challenges/findAllPositions.ts
 *
 * "Find All Positions" challenge: the system plays a specific note (e.g. C3) and
 * the user must tap EVERY position on the fretboard (frets 0–12, all 6 strings)
 * where that exact pitch exists.
 *
 * Evaluation is identical to the chord challenge:
 *   - All valid positions must be tapped (no missed positions).
 *   - Any wrong tap (a position that is NOT the target note) counts as incorrect.
 *   - correct = all positions covered AND no wrong taps.
 *
 * To keep the challenge interesting, notes are drawn from the eligible pool
 * for the given difficulty (same note set as find-the-note) but the valid
 * positions are always the FULL set across frets 0–12 (not capped by
 * difficulty fret range) — the user must know the whole neck.
 */

import {
  getMidiRange,
  randomFromSet,
  midiToNote,
  normalizeNote,
  fretToMidi,
} from "@/lib/music/notes";
import {
  getAllPositionsForNote,
  type FretPosition,
} from "@/lib/music/fretboard";
import type { Difficulty } from "@/lib/challenges/findTheNote";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FindAllPositionsChallenge {
  type: "find-all-positions";
  /** MIDI number of the target note (octave-specific, e.g. 48 = C3) */
  targetMidi: number;
  /** Canonical note name with octave, e.g. "C3" */
  targetNote: string;
  /** Every fretboard position (frets 0–12, all 6 strings) that produces this note */
  validPositions: FretPosition[];
  difficulty: Difficulty;
}

export interface FindAllTapResult {
  position: FretPosition;
  /** True if this position is one of the valid positions */
  correct: boolean;
}

export interface FindAllEvaluationResult {
  /** True only when every valid position was tapped and no wrong taps were made */
  correct: boolean;
  /** Per-tap breakdown */
  tapResults: FindAllTapResult[];
  /** Valid positions that were not covered by any correct tap */
  missedPositions: FretPosition[];
  /** Human-readable note name, e.g. "C3" */
  targetNote: string;
}

// ─── Difficulty filter (mirrors findTheNote.ts) ───────────────────────────────

// Natural note MIDI pitch classes (C D E F G A B)
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

interface DifficultyConfig {
  minFret: number;
  maxFret: number;
  midiFilter?: (midi: number) => boolean;
}

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

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate a Find All Positions challenge.
 *
 * Picks a note eligible for the given difficulty, then sets validPositions
 * to ALL fretboard positions for that note across the full neck (frets 0–12).
 * Notes are filtered to those with ≥ 2 positions so the challenge is
 * non-trivial; falls back to any eligible note if none qualify.
 */
export function generateFindAllChallenge(
  difficulty: Difficulty = "easy",
  rand = Math.random,
): FindAllPositionsChallenge {
  const config = DIFFICULTY_CONFIG[difficulty];

  // Build the pool the same way as find-the-note
  let pool = getMidiRange(config.minFret, config.maxFret);
  if (config.midiFilter) {
    pool = new Set(Array.from(pool).filter(config.midiFilter));
  }

  const candidates = Array.from(pool);

  // Prefer notes with ≥ 2 positions on the full neck (more interesting challenge)
  const multiPositionCandidates = candidates.filter((midi) => {
    const note = normalizeNote(midiToNote(midi));
    return getAllPositionsForNote(note).length >= 2;
  });

  const eligible = multiPositionCandidates.length > 0 ? multiPositionCandidates : candidates;

  // Uniform random draw from eligible pool
  const targetMidi = eligible[Math.floor(rand() * eligible.length)]!;
  const targetNote = normalizeNote(midiToNote(targetMidi));

  // Valid positions = ALL positions on the full neck (frets 0–12)
  const validPositions = getAllPositionsForNote(targetNote);

  return {
    type: "find-all-positions",
    targetMidi,
    targetNote,
    validPositions,
    difficulty,
  };
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Evaluate the user's multi-tap answer against all valid positions.
 */
export function evaluateFindAllAnswer(
  challenge: FindAllPositionsChallenge,
  taps: FretPosition[],
): FindAllEvaluationResult {
  const validSet = new Set(
    challenge.validPositions.map((p) => `${p.string}-${p.fret}`),
  );

  const tapResults: FindAllTapResult[] = taps.map((pos) => ({
    position: pos,
    correct: validSet.has(`${pos.string}-${pos.fret}`),
  }));

  const coveredKeys = new Set(
    tapResults.filter((t) => t.correct).map((t) => `${t.position.string}-${t.position.fret}`),
  );

  const missedPositions = challenge.validPositions.filter(
    (p) => !coveredKeys.has(`${p.string}-${p.fret}`),
  );

  const hasWrongTaps = tapResults.some((t) => !t.correct);
  const correct = missedPositions.length === 0 && !hasWrongTaps;

  return {
    correct,
    tapResults,
    missedPositions,
    targetNote: challenge.targetNote,
  };
}
