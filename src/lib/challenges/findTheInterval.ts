import { getMidiRange, midiToNote, GUITAR_MIDI_MAX, GUITAR_MIDI_MIN, fretToMidi } from "@/lib/music/notes"
import { getAllPositionsForNote, getNoteAtPosition } from "@/lib/music/fretboard"
import { pickIntervalForDifficulty, getIntervalByKey } from "@/lib/music/intervals"
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
 * Generate a Find The Interval challenge.
 * Picks an interval from the interval pool for the difficulty and a playable root note
 * such that the resulting second note is playable on the guitar fretboard.
 */
export function generateIntervalChallenge(difficulty = "medium", rand = Math.random): IntervalChallenge {
  const interval = pickIntervalForDifficulty(difficulty, rand)
  const semitones = interval.semitones

  // build playable root MIDI candidates (fret 0–12)
  const min = GUITAR_MIDI_MIN
  const max = GUITAR_MIDI_MAX

  // All MIDI on the guitar (0–12 frets)
  const playable: number[] = []
  for (let m = min; m <= max; m++) {
    // ensure second note is within guitar range
    const second = m + semitones
    if (second >= min && second <= max) playable.push(m)
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
  const secondCorrect = secondMidi === challenge.secondMidi

  const rootNote = midiToNote(challenge.rootMidi)
  const secondNote = midiToNote(challenge.secondMidi)

  const intervalResult: IntervalTapResult = {
    rootTap,
    rootCorrect,
    rootValidPositions: getAllPositionsForNote(rootNote),
    secondTap,
    secondCorrect,
    secondValidPositions: getAllPositionsForNote(secondNote),
    intervalName: challenge.intervalName,
  }

  return {
    correct: rootCorrect && secondCorrect,
    // tappedPosition / validPositions refer to the second note (for legacy compat)
    tappedPosition: secondTap,
    validPositions: getAllPositionsForNote(secondNote),
    targetNote: secondNote,
    intervalResult,
  }
}
