import { midiToNote, GUITAR_MIDI_MAX, GUITAR_MIDI_MIN, fretToMidi } from "@/lib/music/notes"
import { getAllPositionsForNote, type FretPosition } from "@/lib/music/fretboard"
import { pickIntervalForDifficulty } from "@/lib/music/intervals"
import type { EvaluationResult, IntervalTapResult } from "@/lib/challenges/findTheNote"

export type IntervalChallenge = {
  rootMidi: number
  secondMidi: number
  rootNote: string
  secondNote: string
  intervalKey: string
  intervalName: string
  difficulty: string
}

/**
 * Returns all fretboard positions for `secondNote` that are on a different
 * string than `rootString`. Used to enforce the real-guitar constraint that
 * both notes of an interval must be fingered on separate strings.
 */
export function getValidSecondPositions(rootString: number, secondNote: string): FretPosition[] {
  return getAllPositionsForNote(secondNote).filter((p) => p.string !== rootString)
}

/**
 * Returns true when the given rootMidi has at least one playable pair of
 * positions (rootPos on string X, secondPos on string Y, X ≠ Y) for the
 * given interval semitones. Used by challenge generation to ensure every
 * generated challenge is physically playable on guitar.
 */
function hasCrossStringPair(rootMidi: number, semitones: number): boolean {
  const secondMidi = rootMidi + semitones
  const rootNote = midiToNote(rootMidi)
  const secondNote = midiToNote(secondMidi)
  const rootPositions = getAllPositionsForNote(rootNote)
  const secondPositions = getAllPositionsForNote(secondNote)
  return rootPositions.some((rp) =>
    secondPositions.some((sp) => sp.string !== rp.string)
  )
}


/**
 * Picks an interval from the interval pool for the difficulty and a playable root note
 * such that the resulting second note is playable on the guitar fretboard.
 */
export function generateIntervalChallenge(difficulty = "medium", rand = Math.random): IntervalChallenge {
  const interval = pickIntervalForDifficulty(difficulty, rand)
  const semitones = interval.semitones

  // build playable root MIDI candidates (fret 0–12)
  const min = GUITAR_MIDI_MIN
  const max = GUITAR_MIDI_MAX

  // All MIDI on the guitar (0–12 frets) that also have a cross-string second note
  const playable: number[] = []
  for (let m = min; m <= max; m++) {
    // ensure second note is within guitar range AND playable on a different string
    const second = m + semitones
    if (second >= min && second <= max && hasCrossStringPair(m, semitones)) {
      playable.push(m)
    }
  }

  if (playable.length === 0) {
    throw new Error("No playable root found for chosen interval")
  }

  const rootIdx = Math.floor(rand() * playable.length)
  const rootMidi = playable[rootIdx] as number
  const secondMidi = rootMidi + semitones

  const rootNote = midiToNote(rootMidi)
  const secondNote = midiToNote(secondMidi)

  const intervalKey = interval.name

  return {
    rootMidi: rootMidi as number,
    secondMidi,
    rootNote,
    secondNote,
    intervalKey,
    intervalName: interval.name,
    difficulty,
  }
}

/**
 * Evaluate a player's tapped position (string/fret) against the target second note.
 * Returns true when the tapped pitch equals the expected second note.
 * @deprecated Use evaluateTwoTapInterval for full two-tap evaluation.
 */
export function evaluateIntervalAnswer(challenge: IntervalChallenge, stringNum: number, fret: number) {
  const midi = fretToMidi(stringNum, fret)
  return midi === challenge.secondMidi
}

/**
 * Evaluate a complete two-tap interval answer (root tap + second-note tap).
 *
 * The root tap is considered correct if its pitch matches the challenge's rootMidi.
 * The second tap is correct if its pitch matches secondMidi.
 * The overall result is correct only when BOTH taps are correct.
 *
 * @param challenge The active interval challenge
 * @param rootTap   The fretboard position the user tapped for the root note
 * @param secondTap The fretboard position the user tapped for the second note
 */
export function evaluateTwoTapInterval(
  challenge: IntervalChallenge,
  rootTap: { string: number; fret: number },
  secondTap: { string: number; fret: number },
): EvaluationResult {
  const rootMidi = fretToMidi(rootTap.string, rootTap.fret)
  const secondMidi = fretToMidi(secondTap.string, secondTap.fret)

  const rootCorrect = rootMidi === challenge.rootMidi
  // The second note must match pitch AND be on a different string (real guitar constraint)
  const secondCorrect = secondMidi === challenge.secondMidi && secondTap.string !== rootTap.string

  const rootNote = midiToNote(challenge.rootMidi)
  const secondNote = midiToNote(challenge.secondMidi)

  // Valid second positions: only cross-string from the root tap
  const validSecondPositions = getValidSecondPositions(rootTap.string, secondNote)

  const intervalResult: IntervalTapResult = {
    rootTap,
    rootCorrect,
    rootValidPositions: getAllPositionsForNote(rootNote),
    secondTap,
    secondCorrect,
    secondValidPositions: validSecondPositions,
    intervalName: challenge.intervalName,
  }

  return {
    correct: rootCorrect && secondCorrect,
    // tappedPosition / validPositions refer to the second note (for legacy compat)
    tappedPosition: secondTap,
    validPositions: validSecondPositions,
    targetNote: secondNote,
    intervalResult,
  }
}
