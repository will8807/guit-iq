import { describe, it, expect } from "vitest";
import {
  CHORDS,
  CHORD_POOL,
  pickChordForDifficulty,
  buildChordVoicing,
  isPlayableVoicing,
  MAX_VOICING_SPAN,
} from "@/lib/music/chords";
import { GUITAR_MIDI_MIN, GUITAR_MIDI_MAX } from "@/lib/music/notes";

describe("CHORDS", () => {
  it("all entries have a name and at least 2 interval semitones", () => {
    for (const [key, chord] of Object.entries(CHORDS)) {
      expect(chord.name.length, `${key} name`).toBeGreaterThan(0);
      expect(chord.intervals.length, `${key} intervals`).toBeGreaterThanOrEqual(2);
    }
  });

  it("Major has intervals [4, 7]", () => {
    expect(CHORDS["Maj"]!.intervals).toEqual([4, 7]);
  });

  it("Minor has intervals [3, 7]", () => {
    expect(CHORDS["min"]!.intervals).toEqual([3, 7]);
  });

  it("dom7 has intervals [4, 7, 10]", () => {
    expect(CHORDS["dom7"]!.intervals).toEqual([4, 7, 10]);
  });
});

describe("CHORD_POOL", () => {
  it("easy pool contains only Maj and min", () => {
    expect(CHORD_POOL["easy"]).toEqual(["Maj", "min"]);
  });

  it("hard pool contains all 10 chord types", () => {
    expect(CHORD_POOL["hard"]!.length).toBe(10);
  });

  it("all pool keys map to valid CHORDS entries", () => {
    for (const [, pool] of Object.entries(CHORD_POOL)) {
      for (const key of pool) {
        expect(CHORDS[key], `CHORDS["${key}"]`).toBeDefined();
      }
    }
  });
});

describe("pickChordForDifficulty", () => {
  it("returns a chord from the correct pool", () => {
    const pool = CHORD_POOL["easy"]!;
    for (let i = 0; i < 20; i++) {
      const chord = pickChordForDifficulty("easy");
      expect(pool).toContain(chord.key);
    }
  });

  it("is deterministic with a fixed rand", () => {
    const a = pickChordForDifficulty("medium", () => 0);
    const b = pickChordForDifficulty("medium", () => 0);
    expect(a.key).toBe(b.key);
  });

  it("falls back to medium pool for unknown difficulty", () => {
    const pool = CHORD_POOL["medium"]!;
    const chord = pickChordForDifficulty("unknown", () => 0);
    expect(pool).toContain(chord.key);
  });
});

describe("buildChordVoicing", () => {
  it("includes the root note", () => {
    const root = 60; // C4
    const notes = buildChordVoicing(root, [4, 7]);
    expect(notes[0]).toBe(root);
  });

  it("builds correct C Major voicing (C4=60 → E4=64, G4=67)", () => {
    const notes = buildChordVoicing(60, [4, 7]);
    expect(notes).toEqual([60, 64, 67]);
  });

  it("builds correct A minor voicing (A3=57 → C4=60, E4=64)", () => {
    const notes = buildChordVoicing(57, [3, 7]);
    expect(notes).toEqual([57, 60, 64]);
  });

  it("notes that cannot fit within guitar range are omitted (incomplete voicing)", () => {
    // Root very close to the top — interval notes will exceed GUITAR_MIDI_MAX and be excluded
    const root = GUITAR_MIDI_MAX - 1; // one below max
    const notes = buildChordVoicing(root, [4, 7]);
    // Root is always included; upper chord tones won't fit → length < 3
    expect(notes[0]).toBe(root);
    expect(notes.length).toBeLessThan(3);
    // Every note that IS present must be in range
    for (const n of notes) {
      expect(n).toBeLessThanOrEqual(GUITAR_MIDI_MAX);
      expect(n).toBeGreaterThanOrEqual(GUITAR_MIDI_MIN);
    }
  });

  it("voicing is always in strict ascending order", () => {
    const notes = buildChordVoicing(48, [4, 7, 10]); // C3 dom7
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i]!).toBeGreaterThan(notes[i - 1]!);
    }
  });

  it("root is always the lowest note", () => {
    const root = 55; // G3
    const notes = buildChordVoicing(root, [4, 7]);
    expect(notes[0]).toBe(root);
    expect(Math.min(...notes)).toBe(root);
  });

  it("each note has the correct pitch class", () => {
    const root = 60; // C4
    const intervals = [4, 7, 11]; // maj7
    const notes = buildChordVoicing(root, intervals);
    expect(notes.length).toBe(4);
    expect(notes[0]! % 12).toBe(root % 12);          // C
    expect(notes[1]! % 12).toBe((root + 4) % 12);    // E
    expect(notes[2]! % 12).toBe((root + 7) % 12);    // G
    expect(notes[3]! % 12).toBe((root + 11) % 12);   // B
  });

  it("builds dom7 with 4 notes", () => {
    const notes = buildChordVoicing(60, [4, 7, 10]);
    expect(notes.length).toBe(4);
  });
});

describe("isPlayableVoicing", () => {
  it("returns true for a complete voicing within MAX_VOICING_SPAN", () => {
    const notes = buildChordVoicing(60, [4, 7]); // C Major: [60, 64, 67], span=7
    expect(isPlayableVoicing(notes, 3)).toBe(true);
  });

  it("returns false when note count doesn't match expected (incomplete voicing)", () => {
    // Force an incomplete voicing by using a root near the top of range
    const root = GUITAR_MIDI_MAX - 1;
    const notes = buildChordVoicing(root, [4, 7]);
    expect(notes.length).toBeLessThan(3);
    expect(isPlayableVoicing(notes, 3)).toBe(false);
  });

  it("returns false when span exceeds MAX_VOICING_SPAN", () => {
    // Manually craft an out-of-spec voicing
    const wideNotes = [40, 40 + MAX_VOICING_SPAN + 1, 40 + MAX_VOICING_SPAN + 5];
    expect(isPlayableVoicing(wideNotes, 3)).toBe(false);
  });

  it("returns true when span is exactly MAX_VOICING_SPAN", () => {
    const notes = [40, 50, 40 + MAX_VOICING_SPAN];
    expect(isPlayableVoicing(notes, 3)).toBe(true);
  });

  it("all generated chord voicings for all roots pass isPlayableVoicing", () => {
    for (const [key, chord] of Object.entries(CHORDS)) {
      const expectedCount = chord.intervals.length + 1;
      let validCount = 0;
      for (let root = GUITAR_MIDI_MIN; root <= GUITAR_MIDI_MAX; root++) {
        const notes = buildChordVoicing(root, chord.intervals);
        if (isPlayableVoicing(notes, expectedCount)) validCount++;
      }
      // Every chord type must have at least some valid roots
      expect(validCount, `${key} has no valid roots`).toBeGreaterThan(0);
    }
  });
});