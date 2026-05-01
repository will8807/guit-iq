/**
 * Tests for findAllPositions.ts — generator + evaluator
 */

import { describe, it, expect } from "vitest";
import {
  generateFindAllChallenge,
  evaluateFindAllAnswer,
  type FindAllPositionsChallenge,
} from "./findAllPositions";
import { getAllPositionsForNote } from "@/lib/music/fretboard";

// ─── Generator ────────────────────────────────────────────────────────────────

describe("generateFindAllChallenge", () => {
  it("returns a find-all-positions challenge shape", () => {
    const c = generateFindAllChallenge("easy");
    expect(c.type).toBe("find-all-positions");
    expect(typeof c.targetMidi).toBe("number");
    expect(typeof c.targetNote).toBe("string");
    expect(Array.isArray(c.validPositions)).toBe(true);
    expect(c.validPositions.length).toBeGreaterThan(0);
    expect(c.difficulty).toBe("easy");
  });

  it("validPositions matches getAllPositionsForNote for the chosen note", () => {
    const c = generateFindAllChallenge("medium");
    const expected = getAllPositionsForNote(c.targetNote);
    expect(c.validPositions).toEqual(expected);
  });

  it("easy difficulty only uses natural notes", () => {
    const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (let i = 0; i < 30; i++) {
      const c = generateFindAllChallenge("easy");
      expect(NATURAL_PCS.has(c.targetMidi % 12)).toBe(true);
    }
  });

  it("medium difficulty only uses natural notes", () => {
    const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (let i = 0; i < 30; i++) {
      const c = generateFindAllChallenge("medium");
      expect(NATURAL_PCS.has(c.targetMidi % 12)).toBe(true);
    }
  });

  it("hard difficulty can return sharps/flats", () => {
    // Run many draws and expect at least one non-natural (pitch class not in natural set)
    const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
    const midiSet = new Set<number>();
    // Use a seeded deterministic rand that cycles to ensure we hit non-natural notes
    for (let i = 0; i < 200; i++) {
      const c = generateFindAllChallenge("hard", () => i / 200);
      midiSet.add(c.targetMidi % 12);
    }
    const hasSharp = Array.from(midiSet).some((pc) => !NATURAL_PCS.has(pc));
    expect(hasSharp).toBe(true);
  });

  it("prefers notes with ≥ 2 valid positions (using deterministic rand)", () => {
    // If we can find at least some notes, they should have ≥ 2 positions
    for (let i = 0; i < 20; i++) {
      const c = generateFindAllChallenge("easy", () => i / 20);
      expect(c.validPositions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts a custom rand function for determinism", () => {
    const c1 = generateFindAllChallenge("hard", () => 0);
    const c2 = generateFindAllChallenge("hard", () => 0);
    expect(c1.targetMidi).toBe(c2.targetMidi);
    expect(c1.targetNote).toBe(c2.targetNote);
  });
});

// ─── Evaluator ────────────────────────────────────────────────────────────────

function makeChallenge(targetNote: string): FindAllPositionsChallenge {
  const validPositions = getAllPositionsForNote(targetNote);
  return {
    type: "find-all-positions",
    targetMidi: 0, // not used by evaluator
    targetNote,
    validPositions,
    difficulty: "easy",
  };
}

describe("evaluateFindAllAnswer", () => {
  it("correct when all valid positions are tapped and no wrong taps", () => {
    const challenge = makeChallenge("E2");
    const taps = challenge.validPositions;
    const result = evaluateFindAllAnswer(challenge, taps);
    expect(result.correct).toBe(true);
    expect(result.missedPositions).toHaveLength(0);
    expect(result.tapResults.every((t) => t.correct)).toBe(true);
  });

  it("incorrect when a valid position is missed", () => {
    const challenge = makeChallenge("E2");
    // Tap all but the last valid position
    const taps = challenge.validPositions.slice(0, -1);
    const result = evaluateFindAllAnswer(challenge, taps);
    expect(result.correct).toBe(false);
    expect(result.missedPositions.length).toBeGreaterThan(0);
  });

  it("incorrect when a wrong tap is included (even if all valid positions covered)", () => {
    const challenge = makeChallenge("A2");
    const wrongTap = { string: 1, fret: 5 }; // probably not A2
    // Assume this is not in validPositions — verify
    const isValid = challenge.validPositions.some(
      (p) => p.string === wrongTap.string && p.fret === wrongTap.fret,
    );
    if (isValid) return; // skip if coincidentally valid

    const taps = [...challenge.validPositions, wrongTap];
    const result = evaluateFindAllAnswer(challenge, taps);
    expect(result.correct).toBe(false);
    const wrongResult = result.tapResults.find(
      (t) => t.position.string === wrongTap.string && t.position.fret === wrongTap.fret,
    );
    expect(wrongResult?.correct).toBe(false);
  });

  it("returns per-tap breakdown with correct flags", () => {
    const challenge = makeChallenge("B2");
    const validTap = challenge.validPositions[0]!;
    const invalidTap = { string: 1, fret: 11 }; // unlikely to be B2
    const isValid = challenge.validPositions.some(
      (p) => p.string === invalidTap.string && p.fret === invalidTap.fret,
    );

    const taps = isValid ? [validTap] : [validTap, invalidTap];
    const result = evaluateFindAllAnswer(challenge, taps);
    expect(result.tapResults[0]?.correct).toBe(true);
    if (!isValid) {
      expect(result.tapResults[1]?.correct).toBe(false);
    }
  });

  it("missedPositions lists positions not covered by correct taps", () => {
    const challenge = makeChallenge("G2");
    // Tap nothing
    const result = evaluateFindAllAnswer(challenge, []);
    expect(result.missedPositions).toEqual(challenge.validPositions);
    expect(result.correct).toBe(false);
  });

  it("targetNote is echoed in the result", () => {
    const challenge = makeChallenge("D3");
    const result = evaluateFindAllAnswer(challenge, challenge.validPositions);
    expect(result.targetNote).toBe("D3");
  });

  it("handles empty taps gracefully — incorrect when positions exist", () => {
    // Use E2 which has positions (open low E string is E2)
    const challenge = makeChallenge("E2");
    expect(challenge.validPositions.length).toBeGreaterThan(0);
    const result = evaluateFindAllAnswer(challenge, []);
    expect(result.correct).toBe(false);
    expect(result.tapResults).toHaveLength(0);
    expect(result.missedPositions.length).toBe(challenge.validPositions.length);
  });
});
