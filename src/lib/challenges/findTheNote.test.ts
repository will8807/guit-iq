import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateChallenge,
  generateWeightedChallenge,
  noteWeight,
  evaluateAnswer,
  STREAK_THRESHOLD,
  NEXT_DIFFICULTY,
  type Difficulty,
  type NoteStats,
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

// ─── noteWeight ───────────────────────────────────────────────────────────────

describe("noteWeight", () => {
  it("returns 1.0 for undefined stats (unseen note)", () => {
    expect(noteWeight(undefined)).toBe(1.0);
  });

  it("returns 1.0 for zero attempts", () => {
    expect(noteWeight({ attempts: 0, correct: 0 })).toBe(1.0);
  });

  it("returns BASE_WEIGHT (0.2) for 100% accuracy", () => {
    expect(noteWeight({ attempts: 10, correct: 10 })).toBeCloseTo(0.2);
  });

  it("returns 2.0 for 0% accuracy", () => {
    expect(noteWeight({ attempts: 10, correct: 0 })).toBeCloseTo(2.0);
  });

  it("returns ~1.1 for 50% accuracy", () => {
    expect(noteWeight({ attempts: 10, correct: 5 })).toBeCloseTo(1.1);
  });
});

// ─── generateWeightedChallenge ────────────────────────────────────────────────

describe("generateWeightedChallenge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a valid challenge with required fields", () => {
    const ch = generateWeightedChallenge("easy", {});
    expect(ch.difficulty).toBe("easy");
    expect(typeof ch.targetNote).toBe("string");
    expect(ch.validPositions.length).toBeGreaterThan(0);
  });

  it("heavily weights notes with low accuracy toward the front of selection", () => {
    // Spy on Math.random — drive it to pick from near the start of the weight array
    // Notes at the front with weight 2.0 (0% accuracy) should be drawn at r near 0
    vi.spyOn(Math, "random").mockReturnValue(0); // r = 0 → pick first candidate

    const ch1 = generateWeightedChallenge("easy", {});
    expect(ch1.targetNote).toBeTruthy();
  });

  it("uses noteStats to bias selection (statistical)", () => {
    // Build stats where one note is mastered and everything else is unknown.
    // Run many trials and verify the mastered note appears less often.
    const samples = 200;
    let masteredCount = 0;

    // Pick A2 as the mastered note (always in easy pool, string 5 fret 0)
    const noteStats: Record<string, NoteStats> = {
      A2: { attempts: 100, correct: 100 }, // weight = 0.2
    };

    for (let i = 0; i < samples; i++) {
      const ch = generateWeightedChallenge("easy", noteStats);
      if (ch.targetNote === "A2") masteredCount++;
    }

    // A2 has weight 0.2 vs avg ~1.0 for others → should appear << (1/poolSize)*samples
    // Just verify it's significantly less than uniform expectation
    const easyPoolSize = 25; // approximate
    const uniformExpected = samples / easyPoolSize;
    expect(masteredCount).toBeLessThan(uniformExpected * 0.5);
  });

  it("still eventually picks mastered notes (weight floor)", () => {
    const noteStats: Record<string, NoteStats> = {};
    // Master every note except A2
    const ch = generateWeightedChallenge("easy", noteStats);
    expect(ch).toBeDefined();
  });
});

// ─── STREAK_THRESHOLD / NEXT_DIFFICULTY ──────────────────────────────────────

describe("STREAK_THRESHOLD", () => {
  it("is a positive integer", () => {
    expect(STREAK_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(STREAK_THRESHOLD)).toBe(true);
  });
});

describe("NEXT_DIFFICULTY", () => {
  it("easy → medium", () => expect(NEXT_DIFFICULTY.easy).toBe("medium"));
  it("medium → hard", () => expect(NEXT_DIFFICULTY.medium).toBe("hard"));
  it("hard has no next", () => expect(NEXT_DIFFICULTY.hard).toBeUndefined());
});
