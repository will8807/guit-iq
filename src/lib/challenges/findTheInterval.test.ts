import { describe, it, expect } from "vitest"
import { generateIntervalChallenge, evaluateIntervalAnswer, evaluateTwoTapInterval } from "./findTheInterval"
import { getAllPositions } from "@/lib/music/fretboard"
import { fretToMidi } from "@/lib/music/notes"

describe("findTheInterval", () => {
  it("generates a playable challenge and evaluates correct answer (legacy single-tap)", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)

    const positions = getAllPositions()
    const match = positions.find(p => fretToMidi(p.string, p.fret) === challenge.secondMidi)
    expect(match).toBeTruthy()
    if (!match) return

    const ok = evaluateIntervalAnswer(challenge, match.string, match.fret)
    expect(ok).toBe(true)

    const wrong = evaluateIntervalAnswer(challenge, match.string, (match.fret + 1) % 13)
    expect(wrong).toBe(false)
  })
})

describe("evaluateTwoTapInterval", () => {
  it("returns correct=true when both taps match", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)
    const positions = getAllPositions()

    const rootMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.rootMidi)
    const secondMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.secondMidi)
    expect(rootMatch).toBeTruthy()
    expect(secondMatch).toBeTruthy()
    if (!rootMatch || !secondMatch) return

    const result = evaluateTwoTapInterval(challenge, rootMatch, secondMatch)
    expect(result.correct).toBe(true)
    expect(result.intervalResult?.rootCorrect).toBe(true)
    expect(result.intervalResult?.secondCorrect).toBe(true)
    expect(result.intervalResult?.intervalName).toBe(challenge.intervalName)
  })

  it("returns correct=false when root is wrong", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)
    const positions = getAllPositions()

    const wrongRoot = positions.find(p => fretToMidi(p.string, p.fret) !== challenge.rootMidi)!
    const secondMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.secondMidi)!

    const result = evaluateTwoTapInterval(challenge, wrongRoot, secondMatch)
    expect(result.correct).toBe(false)
    expect(result.intervalResult?.rootCorrect).toBe(false)
    expect(result.intervalResult?.secondCorrect).toBe(true)
  })

  it("returns correct=false when second note is wrong", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)
    const positions = getAllPositions()

    const rootMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.rootMidi)!
    const wrongSecond = positions.find(p => fretToMidi(p.string, p.fret) !== challenge.secondMidi)!

    const result = evaluateTwoTapInterval(challenge, rootMatch, wrongSecond)
    expect(result.correct).toBe(false)
    expect(result.intervalResult?.rootCorrect).toBe(true)
    expect(result.intervalResult?.secondCorrect).toBe(false)
  })

  it("returns correct=false when both taps are wrong", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)
    const positions = getAllPositions()

    const wrongRoot = positions.find(p => fretToMidi(p.string, p.fret) !== challenge.rootMidi)!
    const wrongSecond = positions.find(p => fretToMidi(p.string, p.fret) !== challenge.secondMidi)!

    const result = evaluateTwoTapInterval(challenge, wrongRoot, wrongSecond)
    expect(result.correct).toBe(false)
    expect(result.intervalResult?.rootCorrect).toBe(false)
    expect(result.intervalResult?.secondCorrect).toBe(false)
  })

  it("populates rootValidPositions and secondValidPositions", () => {
    const challenge = generateIntervalChallenge("easy", () => 0.3)
    const positions = getAllPositions()

    const rootMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.rootMidi)!
    const secondMatch = positions.find(p => fretToMidi(p.string, p.fret) === challenge.secondMidi)!

    const result = evaluateTwoTapInterval(challenge, rootMatch, secondMatch)
    expect(result.intervalResult?.rootValidPositions.length).toBeGreaterThan(0)
    expect(result.intervalResult?.secondValidPositions.length).toBeGreaterThan(0)
  })
})
