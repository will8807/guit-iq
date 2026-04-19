import { describe, it, expect } from "vitest";
import {
  noteToMidi,
  midiToNote,
  midiToFrequency,
  isEnharmonic,
  normalizeNote,
  fretToMidi,
  fretToNote,
  parseNote,
  STANDARD_TUNING,
  GUITAR_MIDI_MIN,
  GUITAR_MIDI_MAX,
  getMidiRange,
} from "@/lib/music/notes";

// ─── noteToMidi ───────────────────────────────────────────────────────────────

describe("noteToMidi", () => {
  it("converts middle C correctly", () => {
    expect(noteToMidi("C4")).toBe(60);
  });

  it("converts A4 (concert pitch) correctly", () => {
    expect(noteToMidi("A4")).toBe(69);
  });

  it("converts open strings correctly", () => {
    // Standard tuning open strings
    expect(noteToMidi("E4")).toBe(64); // string 1
    expect(noteToMidi("B3")).toBe(59); // string 2
    expect(noteToMidi("G3")).toBe(55); // string 3
    expect(noteToMidi("D3")).toBe(50); // string 4
    expect(noteToMidi("A2")).toBe(45); // string 5
    expect(noteToMidi("E2")).toBe(40); // string 6
  });

  it("handles sharps correctly", () => {
    expect(noteToMidi("C#4")).toBe(61);
    expect(noteToMidi("F#3")).toBe(54);
    expect(noteToMidi("A#4")).toBe(70);
  });

  it("handles flats correctly", () => {
    expect(noteToMidi("Db4")).toBe(61);
    expect(noteToMidi("Gb3")).toBe(54);
    expect(noteToMidi("Bb4")).toBe(70);
  });

  it("handles different octaves", () => {
    expect(noteToMidi("C0")).toBe(12);
    expect(noteToMidi("C1")).toBe(24);
    expect(noteToMidi("C2")).toBe(36);
    expect(noteToMidi("C3")).toBe(48);
    expect(noteToMidi("C5")).toBe(72);
  });

  it("handles B and E (no sharp/flat above)", () => {
    expect(noteToMidi("B4")).toBe(71);
    expect(noteToMidi("E4")).toBe(64);
  });

  it("throws on invalid note name", () => {
    expect(() => noteToMidi("X4")).toThrow();
    expect(() => noteToMidi("C")).toThrow();
    expect(() => noteToMidi("")).toThrow();
    expect(() => noteToMidi("C#")).toThrow();
  });
});

// ─── midiToNote ───────────────────────────────────────────────────────────────

describe("midiToNote", () => {
  it("converts 60 to C4", () => {
    expect(midiToNote(60)).toBe("C4");
  });

  it("converts 69 to A4", () => {
    expect(midiToNote(69)).toBe("A4");
  });

  it("uses sharp names for accidentals", () => {
    expect(midiToNote(61)).toBe("C#4");
    expect(midiToNote(63)).toBe("D#4");
    expect(midiToNote(70)).toBe("A#4");
  });

  it("round-trips with noteToMidi (natural notes)", () => {
    const naturals = ["C3", "D3", "E3", "F3", "G3", "A3", "B3"];
    for (const note of naturals) {
      expect(midiToNote(noteToMidi(note))).toBe(note);
    }
  });

  it("throws for out-of-range MIDI values", () => {
    expect(() => midiToNote(-1)).toThrow();
    expect(() => midiToNote(128)).toThrow();
  });

  it("throws for non-integer MIDI values", () => {
    expect(() => midiToNote(60.5)).toThrow();
  });
});

// ─── midiToFrequency ──────────────────────────────────────────────────────────

describe("midiToFrequency", () => {
  it("returns 440 Hz for A4 (MIDI 69)", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it("returns 880 Hz for A5 (one octave up)", () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 2);
  });

  it("returns 220 Hz for A3 (one octave down)", () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 2);
  });

  it("returns ~261.63 Hz for middle C (C4)", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });
});

// ─── isEnharmonic ─────────────────────────────────────────────────────────────

describe("isEnharmonic", () => {
  it("C# and Db are enharmonic", () => {
    expect(isEnharmonic("C#4", "Db4")).toBe(true);
  });

  it("F# and Gb are enharmonic", () => {
    expect(isEnharmonic("F#3", "Gb3")).toBe(true);
  });

  it("A# and Bb are enharmonic", () => {
    expect(isEnharmonic("A#2", "Bb2")).toBe(true);
  });

  it("all flat/sharp pairs are enharmonic", () => {
    const pairs: [string, string][] = [
      ["C#4", "Db4"],
      ["D#4", "Eb4"],
      ["F#4", "Gb4"],
      ["G#4", "Ab4"],
      ["A#4", "Bb4"],
    ];
    for (const [a, b] of pairs) {
      expect(isEnharmonic(a, b)).toBe(true);
    }
  });

  it("same note name is enharmonic with itself", () => {
    expect(isEnharmonic("A4", "A4")).toBe(true);
  });

  it("different pitches are not enharmonic", () => {
    expect(isEnharmonic("C4", "C5")).toBe(false);
    expect(isEnharmonic("A3", "A4")).toBe(false);
    expect(isEnharmonic("C#4", "D4")).toBe(false);
  });

  it("returns false for invalid notes (no throw)", () => {
    expect(isEnharmonic("X4", "C4")).toBe(false);
  });
});

// ─── normalizeNote ────────────────────────────────────────────────────────────

describe("normalizeNote", () => {
  it("leaves sharp notes unchanged", () => {
    expect(normalizeNote("C#4")).toBe("C#4");
    expect(normalizeNote("F#3")).toBe("F#3");
  });

  it("converts flats to their sharp equivalents", () => {
    expect(normalizeNote("Db4")).toBe("C#4");
    expect(normalizeNote("Eb4")).toBe("D#4");
    expect(normalizeNote("Bb3")).toBe("A#3");
  });

  it("leaves natural notes unchanged", () => {
    expect(normalizeNote("C4")).toBe("C4");
    expect(normalizeNote("A3")).toBe("A3");
  });
});

// ─── parseNote ────────────────────────────────────────────────────────────────

describe("parseNote", () => {
  it("parses natural notes", () => {
    expect(parseNote("C4")).toEqual({ pitchClass: "C", octave: 4 });
  });

  it("parses sharp notes", () => {
    expect(parseNote("C#4")).toEqual({ pitchClass: "C#", octave: 4 });
  });

  it("parses flat notes", () => {
    expect(parseNote("Bb3")).toEqual({ pitchClass: "Bb", octave: 3 });
  });

  it("returns null for invalid strings", () => {
    expect(parseNote("X4")).toBeNull();
    expect(parseNote("C")).toBeNull();
    expect(parseNote("")).toBeNull();
  });
});

// ─── fretToMidi / fretToNote ──────────────────────────────────────────────────

describe("fretToMidi", () => {
  it("returns correct MIDI for open strings (fret 0)", () => {
    expect(fretToMidi(1, 0)).toBe(noteToMidi("E4")); // 64
    expect(fretToMidi(2, 0)).toBe(noteToMidi("B3")); // 59
    expect(fretToMidi(3, 0)).toBe(noteToMidi("G3")); // 55
    expect(fretToMidi(4, 0)).toBe(noteToMidi("D3")); // 50
    expect(fretToMidi(5, 0)).toBe(noteToMidi("A2")); // 45
    expect(fretToMidi(6, 0)).toBe(noteToMidi("E2")); // 40
  });

  it("adds semitones per fret", () => {
    // String 6 (E2=40), fret 5 = A2 (45)
    expect(fretToMidi(6, 5)).toBe(45);
    // String 6 (E2=40), fret 12 = E3 (52)
    expect(fretToMidi(6, 12)).toBe(52);
    // String 1 (E4=64), fret 12 = E5 (76)
    expect(fretToMidi(1, 12)).toBe(76);
  });

  it("throws for invalid string numbers", () => {
    expect(() => fretToMidi(0, 0)).toThrow();
    expect(() => fretToMidi(7, 0)).toThrow();
  });
});

describe("fretToNote", () => {
  it("returns correct note names for open strings", () => {
    expect(fretToNote(1, 0)).toBe("E4");
    expect(fretToNote(6, 0)).toBe("E2");
  });

  it("returns correct note at 5th fret of each string (A chord root check)", () => {
    // 5th fret of string 6 (E2) = A2
    expect(fretToNote(6, 5)).toBe("A2");
    // 5th fret of string 5 (A2) = D3
    expect(fretToNote(5, 5)).toBe("D3");
    // 5th fret of string 4 (D3) = G3
    expect(fretToNote(4, 5)).toBe("G3");
    // 5th fret of string 3 (G3) = C4
    expect(fretToNote(3, 5)).toBe("C4");
    // 4th fret of string 2 (B3) = D#4 (not 5th fret — guitar quirk)
    expect(fretToNote(2, 4)).toBe("D#4");
    // 5th fret of string 1 (E4) = A4
    expect(fretToNote(1, 5)).toBe("A4");
  });
});

// ─── STANDARD_TUNING constant ────────────────────────────────────────────────

describe("STANDARD_TUNING", () => {
  it("has correct notes for all 6 strings", () => {
    expect(STANDARD_TUNING[1]).toBe("E4");
    expect(STANDARD_TUNING[2]).toBe("B3");
    expect(STANDARD_TUNING[3]).toBe("G3");
    expect(STANDARD_TUNING[4]).toBe("D3");
    expect(STANDARD_TUNING[5]).toBe("A2");
    expect(STANDARD_TUNING[6]).toBe("E2");
  });
});

// ─── Guitar MIDI range ───────────────────────────────────────────────────────

describe("guitar MIDI range constants", () => {
  it("GUITAR_MIDI_MIN is E2 = 40", () => {
    expect(GUITAR_MIDI_MIN).toBe(40);
  });

  it("GUITAR_MIDI_MAX is E5 = 76", () => {
    expect(GUITAR_MIDI_MAX).toBe(76);
  });
});

describe("getMidiRange", () => {
  it("returns a non-empty set for frets 0–12", () => {
    const range = getMidiRange(0, 12);
    expect(range.size).toBeGreaterThan(0);
  });

  it("includes all open string MIDI values at fret 0", () => {
    const range = getMidiRange(0, 0);
    expect(range.has(64)).toBe(true); // E4 string 1
    expect(range.has(40)).toBe(true); // E2 string 6
  });

  it("the full neck (0–12) contains 37 unique pitches", () => {
    // E2(40) to E5(76) = 37 semitones
    const range = getMidiRange(0, 12);
    expect(range.size).toBe(37);
  });
});
