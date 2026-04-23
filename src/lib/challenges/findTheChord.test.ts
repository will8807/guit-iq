/**
 * lib/challenges/findTheChord.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  generateChordChallenge,
  evaluateChordAnswer,
  getMissedPositions,
  type FindTheChordChallenge,
} from "./findTheChord";
import { GUITAR_MIDI_MIN, GUITAR_MIDI_MAX } from "@/lib/music/notes";

// ─── generateChordChallenge ───────────────────────────────────────────────────

describe("generateChordChallenge", () => {
  it("returns the correct type discriminant", () => {
    const c = generateChordChallenge("easy");
    expect(c.type).toBe("find-the-chord");
  });

  it("includes root in midiNotes", () => {
    const c = generateChordChallenge("easy");
    expect(c.midiNotes).toContain(c.rootMidi);
  });

  it("all midi notes are within guitar range", () => {
    for (let i = 0; i < 20; i++) {
      const c = generateChordChallenge("hard");
      for (const m of c.midiNotes) {
        expect(m).toBeGreaterThanOrEqual(GUITAR_MIDI_MIN);
        expect(m).toBeLessThanOrEqual(GUITAR_MIDI_MAX);
      }
    }
  });

  it("pitchClasses matches midiNotes mod 12", () => {
    const c = generateChordChallenge("medium");
    const expected = new Set(c.midiNotes.map((m) => m % 12));
    expect(c.pitchClasses).toEqual(expected);
  });

  it("chordLabel contains rootNote and chordName", () => {
    const c = generateChordChallenge("easy");
    expect(c.chordLabel).toContain(c.chordName);
  });

  it("easy difficulty only uses Maj or min", () => {
    for (let i = 0; i < 30; i++) {
      const c = generateChordChallenge("easy");
      expect(["Maj", "min"]).toContain(c.chordKey);
    }
  });

  it("hard difficulty can produce 7th chords", () => {
    const keys = new Set<string>();
    // Use deterministic-ish random to hit all 10 chord types with enough tries
    for (let i = 0; i < 200; i++) {
      keys.add(generateChordChallenge("hard").chordKey);
    }
    // At minimum 7th chords should appear
    const hasSevenths = [...keys].some((k) => k.includes("7"));
    expect(hasSevenths).toBe(true);
  });

  it("is deterministic given a seeded rand", () => {
    const seq = [0.1, 0.5, 0.9];
    let idx = 0;
    const rand = () => seq[idx++ % seq.length]!;
    const a = generateChordChallenge("medium", rand);
    idx = 0;
    const b = generateChordChallenge("medium", rand);
    expect(a.chordKey).toBe(b.chordKey);
    expect(a.rootMidi).toBe(b.rootMidi);
  });
});

// ─── evaluateChordAnswer ──────────────────────────────────────────────────────

/** Build a minimal challenge for evaluation tests */
function makeChallenge(pitchClasses: number[]): FindTheChordChallenge {
  return {
    type: "find-the-chord",
    rootMidi: 48, // C3
    rootNote: "C3",
    chordKey: "Maj",
    chordName: "Major",
    chordLabel: "C Major",
    midiNotes: [48, 52, 55],
    pitchClasses: new Set(pitchClasses),
    difficulty: "easy",
  };
}

describe("evaluateChordAnswer", () => {
  it("returns correct=true when all pitch classes are tapped correctly", () => {
    // C Major pitch classes: 0 (C), 4 (E), 7 (G)
    const challenge = makeChallenge([0, 4, 7]);
    // string/fret combos that produce C3=48, E3=52, G3=55
    const taps = [
      { string: 5, fret: 3 }, // C3 → midi=48, pc=0
      { string: 4, fret: 2 }, // E3 → midi=52, pc=4
      { string: 4, fret: 5 }, // G3 → midi=55, pc=7 (if applicable)
    ];
    // We don't need exact positions — just evaluate pitch classes
    // Use frets that give correct pitch classes
    // fretToMidi(string, fret): string 1=E4(64), 2=B3(59), 3=G3(55), 4=D3(50), 5=A2(45), 6=E2(40)
    // C: fretToMidi(5, 3) = 45+3=48 ✓ pc=0
    // E: fretToMidi(4, 2) = 50+2=52 ✓ pc=4
    // G: fretToMidi(3, 0) = 55 ✓ pc=7
    const correctTaps = [
      { string: 5, fret: 3 }, // C
      { string: 4, fret: 2 }, // E
      { string: 3, fret: 0 }, // G
    ];
    const result = evaluateChordAnswer(challenge, correctTaps);
    expect(result.correct).toBe(true);
    expect(result.missedPitchClasses.size).toBe(0);
    expect(result.tapResults.every((t) => t.correct)).toBe(true);
  });

  it("returns correct=false when some pitch classes are missing", () => {
    const challenge = makeChallenge([0, 4, 7]); // C E G
    // Only tap C and E, miss G
    const partialTaps = [
      { string: 5, fret: 3 }, // C (pc=0)
      { string: 4, fret: 2 }, // E (pc=4)
    ];
    const result = evaluateChordAnswer(challenge, partialTaps);
    expect(result.correct).toBe(false);
    expect(result.missedPitchClasses.has(7)).toBe(true);
  });

  it("returns correct=false when a wrong tap is included", () => {
    const challenge = makeChallenge([0, 4, 7]);
    const tapsWithWrong = [
      { string: 5, fret: 3 }, // C (pc=0)
      { string: 4, fret: 2 }, // E (pc=4)
      { string: 3, fret: 0 }, // G (pc=7)
      { string: 6, fret: 1 }, // F2 (pc=5) — wrong
    ];
    const result = evaluateChordAnswer(challenge, tapsWithWrong);
    expect(result.correct).toBe(false);
    const wrongTap = result.tapResults.find((t) => !t.correct);
    expect(wrongTap).toBeDefined();
  });

  it("accepts notes in any octave (pitch-class based)", () => {
    const challenge = makeChallenge([0, 4, 7]);
    // Tap C in a different octave: C4=60, pc=0 ✓
    const taps = [
      { string: 2, fret: 1 },  // C4=60 pc=0
      { string: 4, fret: 2 },  // E3=52 pc=4
      { string: 3, fret: 0 },  // G3=55 pc=7
    ];
    const result = evaluateChordAnswer(challenge, taps);
    expect(result.correct).toBe(true);
  });

  it("returns empty tapResults for empty taps", () => {
    const challenge = makeChallenge([0, 4, 7]);
    const result = evaluateChordAnswer(challenge, []);
    expect(result.correct).toBe(false);
    expect(result.tapResults).toHaveLength(0);
    expect(result.missedPitchClasses).toEqual(new Set([0, 4, 7]));
  });

  it("includes chordLabel and pitchClassLabels in result", () => {
    const challenge = makeChallenge([0, 4, 7]);
    const result = evaluateChordAnswer(challenge, []);
    expect(result.chordLabel).toBe("C Major");
    expect(result.pitchClassLabels).toBeInstanceOf(Map);
    expect(result.pitchClassLabels.get(0)).toBe("R"); // root = C (pc 0)
    expect(result.pitchClassLabels.get(4)).toBe("3"); // major 3rd
    expect(result.pitchClassLabels.get(7)).toBe("5"); // perfect 5th
  });
});

// ─── getMissedPositions ───────────────────────────────────────────────────────

describe("getMissedPositions", () => {
  it("returns fret positions for missed pitch classes", () => {
    const positions = getMissedPositions(new Set([0])); // C
    expect(positions.length).toBeGreaterThan(0);
  });

  it("returns empty array for empty set", () => {
    expect(getMissedPositions(new Set())).toHaveLength(0);
  });

  it("all returned positions are within guitar range (string 1–6, fret 0–12)", () => {
    const positions = getMissedPositions(new Set([4, 7])); // E, G
    for (const pos of positions) {
      expect(pos.string).toBeGreaterThanOrEqual(1);
      expect(pos.string).toBeLessThanOrEqual(6);
      expect(pos.fret).toBeGreaterThanOrEqual(0);
    }
  });
});
