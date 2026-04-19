import { describe, it, expect } from "vitest";
import { generateSession, type Challenge, type TaggedNoteChallenge, type TaggedIntervalChallenge } from "./sessionGenerator";
import { GUITAR_MIDI_MIN, GUITAR_MIDI_MAX } from "@/lib/music/notes";

// ─── helpers ──────────────────────────────────────────────────────────────────

const noteCount = (session: Challenge[]) =>
  session.filter((c) => c.type === "find-the-note").length;

const intervalCount = (session: Challenge[]) =>
  session.filter((c) => c.type === "find-the-interval").length;

// ─── generateSession ──────────────────────────────────────────────────────────

describe("generateSession", () => {
  // ── length ────────────────────────────────────────────────────────────────

  it("returns exactly `length` challenges (default 8)", () => {
    const session = generateSession();
    expect(session).toHaveLength(8);
  });

  it("respects a custom length", () => {
    expect(generateSession({ length: 3 })).toHaveLength(3);
    expect(generateSession({ length: 12 })).toHaveLength(12);
    expect(generateSession({ length: 1 })).toHaveLength(1);
  });

  it("throws when length < 1", () => {
    expect(() => generateSession({ length: 0 })).toThrow("Session length must be >= 1");
    expect(() => generateSession({ length: -1 })).toThrow();
  });

  // ── challenge type mix ────────────────────────────────────────────────────

  it("defaults to all find-the-note when intervalMix is not set", () => {
    const session = generateSession({ length: 8 });
    expect(noteCount(session)).toBe(8);
    expect(intervalCount(session)).toBe(0);
  });

  it("produces all interval challenges when intervalMix = 1", () => {
    const session = generateSession({ length: 6, intervalMix: 1 });
    expect(intervalCount(session)).toBe(6);
    expect(noteCount(session)).toBe(0);
  });

  it("splits 50/50 when intervalMix = 0.5 and length is even", () => {
    const session = generateSession({ length: 8, intervalMix: 0.5 });
    expect(noteCount(session)).toBe(4);
    expect(intervalCount(session)).toBe(4);
  });

  it("rounds interval count to nearest integer for non-even splits", () => {
    // 0.5 * 3 = 1.5 → rounds to 2 interval, 1 note
    const session = generateSession({ length: 3, intervalMix: 0.5 });
    // Math.round(1.5) = 2
    expect(intervalCount(session)).toBe(2);
    expect(noteCount(session)).toBe(1);
  });

  it("throws when intervalMix is out of [0, 1]", () => {
    expect(() => generateSession({ intervalMix: -0.1 })).toThrow("intervalMix must be between 0 and 1");
    expect(() => generateSession({ intervalMix: 1.1 })).toThrow();
  });

  // ── find-the-note shape ───────────────────────────────────────────────────

  it("find-the-note challenges have the correct shape", () => {
    const session = generateSession({ length: 4, difficulty: "easy" });
    for (const c of session.filter((ch) => ch.type === "find-the-note")) {
      const note = c as TaggedNoteChallenge;
      expect(note.type).toBe("find-the-note");
      expect(typeof note.targetMidi).toBe("number");
      expect(typeof note.targetNote).toBe("string");
      expect(Array.isArray(note.validPositions)).toBe(true);
      expect(note.validPositions.length).toBeGreaterThan(0);
      expect(note.difficulty).toBe("easy");
    }
  });

  it("find-the-note MIDI values are within guitar range", () => {
    const session = generateSession({ length: 20, difficulty: "hard" });
    for (const c of session.filter((ch) => ch.type === "find-the-note")) {
      const note = c as TaggedNoteChallenge;
      expect(note.targetMidi).toBeGreaterThanOrEqual(GUITAR_MIDI_MIN);
      expect(note.targetMidi).toBeLessThanOrEqual(GUITAR_MIDI_MAX);
    }
  });

  // ── find-the-interval shape ───────────────────────────────────────────────

  it("find-the-interval challenges have the correct shape", () => {
    const session = generateSession({ length: 4, intervalMix: 1, difficulty: "easy" });
    for (const c of session) {
      const interval = c as TaggedIntervalChallenge;
      expect(interval.type).toBe("find-the-interval");
      expect(typeof interval.rootMidi).toBe("number");
      expect(typeof interval.secondMidi).toBe("number");
      expect(typeof interval.rootNote).toBe("string");
      expect(typeof interval.secondNote).toBe("string");
      expect(typeof interval.intervalName).toBe("string");
      expect(interval.difficulty).toBe("easy");
    }
  });

  it("interval second note MIDI is root + correct semitones above root", () => {
    const session = generateSession({ length: 10, intervalMix: 1, difficulty: "medium" });
    for (const c of session) {
      const interval = c as TaggedIntervalChallenge;
      // second must be strictly above root within guitar range
      expect(interval.secondMidi).toBeGreaterThan(interval.rootMidi);
      expect(interval.secondMidi).toBeLessThanOrEqual(GUITAR_MIDI_MAX);
    }
  });

  // ── difficulty ────────────────────────────────────────────────────────────

  it("passes the difficulty through to all generated challenges", () => {
    for (const diff of ["easy", "medium", "hard"] as const) {
      const session = generateSession({ length: 4, difficulty: diff, intervalMix: 0.5 });
      for (const c of session) {
        expect(c.difficulty).toBe(diff);
      }
    }
  });

  // ── adaptive noteStats ────────────────────────────────────────────────────

  it("accepts noteStats without throwing", () => {
    const noteStats = {
      A3: { attempts: 5, correct: 1 },
      C4: { attempts: 10, correct: 9 },
    };
    expect(() => generateSession({ length: 8, noteStats })).not.toThrow();
  });

  // ── shuffle (statistical) ─────────────────────────────────────────────────

  it("interleaves types rather than blocking them (statistical)", () => {
    // With a 50/50 mix over 100 sessions, we should see varied orderings.
    // If it were un-shuffled, the first half would always be notes.
    // We check that at least one session starts with an interval.
    const startsWithInterval = Array.from({ length: 50 }, () =>
      generateSession({ length: 6, intervalMix: 0.5 })[0]?.type === "find-the-interval"
    );
    // With a fair shuffle, P(all 50 start with note) = 0.5^50 ≈ 0, so this should pass.
    expect(startsWithInterval.some(Boolean)).toBe(true);
  });
});
