import { describe, it, expect } from "vitest";
import {
  generateChallenge,
  evaluateAnswer,
  type Difficulty,
} from "./findTheNote";
import { GUITAR_MIDI_MIN, GUITAR_MIDI_MAX } from "@/lib/music/notes";
import { getNoteAtPosition } from "@/lib/music/fretboard";

// ─── generateChallenge ────────────────────────────────────────────────────────

describe("generateChallenge", () => {
  const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

  for (const difficulty of DIFFICULTIES) {
    describe(`difficulty: ${difficulty}`, () => {
      it("returns a challenge with required fields", () => {
        const challenge = generateChallenge(difficulty);
        expect(challenge.difficulty).toBe(difficulty);
        expect(typeof challenge.targetMidi).toBe("number");
        expect(typeof challenge.targetNote).toBe("string");
        expect(Array.isArray(challenge.validPositions)).toBe(true);
        expect(challenge.validPositions.length).toBeGreaterThan(0);
      });

      it("targetMidi is within guitar range", () => {
        const challenge = generateChallenge(difficulty);
        expect(challenge.targetMidi).toBeGreaterThanOrEqual(GUITAR_MIDI_MIN);
        expect(challenge.targetMidi).toBeLessThanOrEqual(GUITAR_MIDI_MAX);
      });

      it("all validPositions produce the targetNote", () => {
        const challenge = generateChallenge(difficulty);
        for (const pos of challenge.validPositions) {
          const note = getNoteAtPosition(pos.string, pos.fret);
          // Note names may differ in accidental spelling but should be enharmonic
          // normalizeNote is already applied so exact match is expected
          expect(note).toBe(challenge.targetNote);
        }
      });

      it("validPositions respect the fret range for this difficulty", () => {
        const maxFret = difficulty === "easy" ? 4 : difficulty === "medium" ? 7 : 12;
        const challenge = generateChallenge(difficulty);
        for (const pos of challenge.validPositions) {
          expect(pos.fret).toBeGreaterThanOrEqual(0);
          expect(pos.fret).toBeLessThanOrEqual(maxFret);
        }
      });

      it("produces different challenges across multiple calls (randomness)", () => {
        const notes = new Set(
          Array.from({ length: 20 }, () => generateChallenge(difficulty).targetNote)
        );
        // With 20 calls we should get more than 1 unique note
        expect(notes.size).toBeGreaterThan(1);
      });
    });
  }

  it("easy difficulty only uses natural notes", () => {
    const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (let i = 0; i < 30; i++) {
      const { targetMidi } = generateChallenge("easy");
      expect(NATURAL_PITCH_CLASSES.has(targetMidi % 12)).toBe(true);
    }
  });

  it("medium difficulty only uses natural notes", () => {
    const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (let i = 0; i < 30; i++) {
      const { targetMidi } = generateChallenge("medium");
      expect(NATURAL_PITCH_CLASSES.has(targetMidi % 12)).toBe(true);
    }
  });
});

// ─── evaluateAnswer ───────────────────────────────────────────────────────────

describe("evaluateAnswer", () => {
  it("returns correct=true for a valid position", () => {
    // A2 = string 5 fret 0 (open A)
    const challenge = generateChallenge("easy");
    // Force a known challenge by finding one with A2 valid
    const knownChallenge = {
      targetMidi: 45, // A2
      targetNote: "A2",
      validPositions: [
        { string: 5, fret: 0 },
        { string: 6, fret: 5 },
      ],
      difficulty: "easy" as Difficulty,
    };

    const result = evaluateAnswer(knownChallenge, 5, 0);
    expect(result.correct).toBe(true);
    expect(result.tappedPosition).toEqual({ string: 5, fret: 0 });
    expect(result.targetNote).toBe("A2");
  });

  it("accepts all valid positions", () => {
    const knownChallenge = {
      targetMidi: 45,
      targetNote: "A2",
      validPositions: [
        { string: 5, fret: 0 },
        { string: 6, fret: 5 },
      ],
      difficulty: "easy" as Difficulty,
    };

    expect(evaluateAnswer(knownChallenge, 5, 0).correct).toBe(true);
    expect(evaluateAnswer(knownChallenge, 6, 5).correct).toBe(true);
  });

  it("returns correct=false for a wrong position", () => {
    const knownChallenge = {
      targetMidi: 45,
      targetNote: "A2",
      validPositions: [{ string: 5, fret: 0 }],
      difficulty: "easy" as Difficulty,
    };

    const result = evaluateAnswer(knownChallenge, 1, 0);
    expect(result.correct).toBe(false);
    expect(result.tappedPosition).toEqual({ string: 1, fret: 0 });
  });

  it("returns validPositions in the result", () => {
    const validPositions = [{ string: 5, fret: 0 }];
    const challenge = {
      targetMidi: 45,
      targetNote: "A2",
      validPositions,
      difficulty: "easy" as Difficulty,
    };
    const result = evaluateAnswer(challenge, 3, 7);
    expect(result.validPositions).toBe(validPositions);
  });
});
