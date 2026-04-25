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

  return {
    rootMidi: rootMidi as number,
    secondMidi,
    rootNote,
    secondNote,
    intervalKey: interval.key,
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
 * Evaluate a complete two-tap interval answer. Tap order does not matter —
 * whichever tap matches the challenge's rootMidi is treated as the root tap.
 * If neither (or both) match the root pitch, tapA is treated as root for feedback.
 *
 * The root tap is correct when its pitch equals rootMidi.
 * The second tap is correct when its pitch equals secondMidi AND it is on a
 * different string from the root tap (real guitar constraint).
 * The overall result is correct only when BOTH taps are correct.
 *
 * @param challenge The active interval challenge
 * @param tapA      The first fretboard position tapped
 * @param tapB      The second fretboard position tapped
 */
export function evaluateTwoTapInterval(
  challenge: IntervalChallenge,
  tapA: { string: number; fret: number },
  tapB: { string: number; fret: number },
): EvaluationResult {
  const midiA = fretToMidi(tapA.string, tapA.fret)
  const midiB = fretToMidi(tapB.string, tapB.fret)

  // Auto-detect which tap is root: if tapB matches rootMidi (and tapA doesn't), swap.
  const aMatchesRoot = midiA === challenge.rootMidi
  const bMatchesRoot = midiB === challenge.rootMidi
  const rootTap = (bMatchesRoot && !aMatchesRoot) ? tapB : tapA
  const secondTap = (bMatchesRoot && !aMatchesRoot) ? tapA : tapB

  const rootMidi = fretToMidi(rootTap.string, rootTap.fret)
  const secondMidi = fretToMidi(secondTap.string, secondTap.fret)

  const rootCorrect = rootMidi === challenge.rootMidi
  // The second note must match pitch AND be on a different string (real guitar constraint)
  const secondPitchCorrect = secondMidi === challenge.secondMidi
  const secondSameString = secondPitchCorrect && secondTap.string === rootTap.string
  const secondCorrect = secondPitchCorrect && !secondSameString

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
    secondSameString,
  }

  return {
    correct: rootCorrect && secondCorrect,
    tappedPosition: secondTap,
    validPositions: validSecondPositions,
    targetNote: secondNote,
    intervalResult,
  }
}
