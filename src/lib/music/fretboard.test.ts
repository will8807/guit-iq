import { describe, it, expect } from "vitest";
import {
  getNoteAtPosition,
  getAllPositionsForNote,
  getAllPositions,
  buildFretboardMap,
} from "./fretboard";
import { normalizeNote, fretToNote } from "./notes";

// ─── getNoteAtPosition ────────────────────────────────────────────────────────

describe("getNoteAtPosition", () => {
  it("returns open string notes for all 6 strings", () => {
    expect(getNoteAtPosition(1, 0)).toBe("E4");
    expect(getNoteAtPosition(2, 0)).toBe("B3");
    expect(getNoteAtPosition(3, 0)).toBe("G3");
    expect(getNoteAtPosition(4, 0)).toBe("D3");
    expect(getNoteAtPosition(5, 0)).toBe("A2");
    expect(getNoteAtPosition(6, 0)).toBe("E2");
  });

  it("5th fret of string 6 = A2 (standard tuning A440 anchor)", () => {
    expect(getNoteAtPosition(6, 5)).toBe("A2");
  });

  it("5th fret of string 5 = D3", () => {
    expect(getNoteAtPosition(5, 5)).toBe("D3");
  });

  it("5th fret of string 4 = G3", () => {
    expect(getNoteAtPosition(4, 5)).toBe("G3");
  });

  it("5th fret of string 3 = C4 (middle C)", () => {
    expect(normalizeNote(getNoteAtPosition(3, 5))).toBe("C4");
  });

  it("5th fret of string 2 = E4 (unison with open string 1)", () => {
    expect(getNoteAtPosition(2, 5)).toBe("E4");
  });

  it("12th fret is an octave above open", () => {
    // string 6 open = E2, 12th fret = E3
    expect(getNoteAtPosition(6, 12)).toBe("E3");
    expect(getNoteAtPosition(1, 12)).toBe("E5");
  });

  it("throws RangeError for invalid string", () => {
    expect(() => getNoteAtPosition(0, 0)).toThrow(RangeError);
    expect(() => getNoteAtPosition(7, 0)).toThrow(RangeError);
  });

  it("throws RangeError for invalid fret", () => {
    expect(() => getNoteAtPosition(1, -1)).toThrow(RangeError);
    expect(() => getNoteAtPosition(1, 13)).toThrow(RangeError);
  });

  it("covers all 78 positions without throwing", () => {
    let count = 0;
    for (let s = 1; s <= 6; s++) {
      for (let f = 0; f <= 12; f++) {
        expect(() => getNoteAtPosition(s, f)).not.toThrow();
        count++;
      }
    }
    expect(count).toBe(78);
  });
});

// ─── getAllPositionsForNote ───────────────────────────────────────────────────

describe("getAllPositionsForNote", () => {
  it("finds open E on string 1 and string 6 (pitch-class search)", () => {
    const positions = getAllPositionsForNote("E");
    const stringNums = positions.map((p) => p.string);
    // String 6 open (E2), string 1 open (E4) should both appear
    expect(positions.some((p) => p.string === 6 && p.fret === 0)).toBe(true);
    expect(positions.some((p) => p.string === 1 && p.fret === 0)).toBe(true);
    // All results should be E notes
    positions.forEach((p) => {
      const note = normalizeNote(getNoteAtPosition(p.string, p.fret));
      expect(note.replace(/\d+$/, "")).toBe("E");
    });
  });

  it("finds A2 in exactly the right positions (octave-specific search)", () => {
    const positions = getAllPositionsForNote("A2");
    positions.forEach((p) => {
      expect(normalizeNote(getNoteAtPosition(p.string, p.fret))).toBe("A2");
    });
    // A2: string 5 fret 0 (open A), string 6 fret 5
    expect(positions.some((p) => p.string === 5 && p.fret === 0)).toBe(true);
    expect(positions.some((p) => p.string === 6 && p.fret === 5)).toBe(true);
  });

  it("handles enharmonic input (Bb = A#)", () => {
    const bb = getAllPositionsForNote("Bb");
    const asharp = getAllPositionsForNote("A#");
    expect(bb.length).toBe(asharp.length);
    bb.forEach((p, i) => {
      expect(p.string).toBe(asharp[i]!.string);
      expect(p.fret).toBe(asharp[i]!.fret);
    });
  });

  it("returns an empty array for a note out of guitar range", () => {
    // C8 is way above guitar range (max E5)
    const positions = getAllPositionsForNote("C8");
    expect(positions).toHaveLength(0);
  });

  it("pitch-class search for A returns multiple positions across strings", () => {
    const positions = getAllPositionsForNote("A");
    expect(positions.length).toBeGreaterThan(3);
  });
});

// ─── getAllPositions ──────────────────────────────────────────────────────────

describe("getAllPositions", () => {
  it("returns exactly 78 positions", () => {
    expect(getAllPositions()).toHaveLength(78);
  });

  it("includes string 1 fret 0 and string 6 fret 12", () => {
    const all = getAllPositions();
    expect(all.some((p) => p.string === 1 && p.fret === 0)).toBe(true);
    expect(all.some((p) => p.string === 6 && p.fret === 12)).toBe(true);
  });
});

// ─── buildFretboardMap ────────────────────────────────────────────────────────

describe("buildFretboardMap", () => {
  it("maps all unique notes produced on the neck", () => {
    const map = buildFretboardMap();
    // E2 (string 6 open) must be in the map
    expect(map.has("E2")).toBe(true);
    expect(map.get("E2")!.some((p) => p.string === 6 && p.fret === 0)).toBe(true);
  });

  it("total entries across all map values equals 78", () => {
    const map = buildFretboardMap();
    const total = Array.from(map.values()).reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(78);
  });

  it("every position in the map round-trips back to the correct note", () => {
    const map = buildFretboardMap();
    map.forEach((positions, note) => {
      positions.forEach((p) => {
        expect(normalizeNote(fretToNote(p.string, p.fret))).toBe(note);
      });
    });
  });
});
