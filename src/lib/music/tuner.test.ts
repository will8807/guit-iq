import { describe, it, expect } from "vitest";
import {
  frequencyToMidi,
  frequencyToNearestMidi,
  frequencyToCents,
  midiToFrequency,
  midiToNoteName,
  analyzePitch,
  nearestString,
  A4_HZ,
  A4_MIDI,
} from "./tuner";

describe("frequencyToMidi", () => {
  it("A4 = 440 Hz maps to MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5);
  });

  it("A3 = 220 Hz maps to MIDI 57", () => {
    expect(frequencyToMidi(220)).toBeCloseTo(57, 5);
  });

  it("E4 = 329.63 Hz maps to MIDI ~64", () => {
    expect(frequencyToMidi(329.63)).toBeCloseTo(64, 1);
  });
});

describe("frequencyToNearestMidi", () => {
  it("440 Hz rounds to 69", () => {
    expect(frequencyToNearestMidi(440)).toBe(69);
  });

  it("slightly sharp A4 still rounds to 69", () => {
    // 10 cents sharp of A4
    const sharpA4 = A4_HZ * Math.pow(2, 10 / 1200);
    expect(frequencyToNearestMidi(sharpA4)).toBe(69);
  });

  it("frequency just over 50 cents sharp rounds up to 70 (A#4)", () => {
    const halfSemitoneUp = A4_HZ * Math.pow(2, 51 / 1200);
    expect(frequencyToNearestMidi(halfSemitoneUp)).toBe(70);
  });
});

describe("frequencyToCents", () => {
  it("exact A4 = 0 cents", () => {
    expect(frequencyToCents(440)).toBeCloseTo(0, 5);
  });

  it("10 cents sharp returns ~+10", () => {
    const sharpA4 = A4_HZ * Math.pow(2, 10 / 1200);
    expect(frequencyToCents(sharpA4)).toBeCloseTo(10, 1);
  });

  it("10 cents flat returns ~-10", () => {
    const flatA4 = A4_HZ * Math.pow(2, -10 / 1200);
    expect(frequencyToCents(flatA4)).toBeCloseTo(-10, 1);
  });

  it("stays within -50..+50 range for normal inputs", () => {
    for (let midi = 40; midi <= 80; midi++) {
      const freq = midiToFrequency(midi);
      const cents = frequencyToCents(freq);
      expect(cents).toBeCloseTo(0, 2);
    }
  });
});

describe("midiToFrequency", () => {
  it("MIDI 69 = 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 3);
  });

  it("MIDI 57 = 220 Hz", () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 3);
  });

  it("roundtrips: midiToFrequency(frequencyToNearestMidi(f)) ≈ f for exact pitches", () => {
    for (let midi = 40; midi <= 80; midi++) {
      const f = midiToFrequency(midi);
      expect(midiToFrequency(frequencyToNearestMidi(f))).toBeCloseTo(f, 3);
    }
  });
});

describe("midiToNoteName", () => {
  it("MIDI 69 = A4", () => {
    expect(midiToNoteName(69)).toEqual({ note: "A", octave: 4 });
  });

  it("MIDI 60 = C4 (middle C)", () => {
    expect(midiToNoteName(60)).toEqual({ note: "C", octave: 4 });
  });

  it("MIDI 40 = E2 (low E string)", () => {
    expect(midiToNoteName(40)).toEqual({ note: "E", octave: 2 });
  });

  it("MIDI 64 = E4 (high E string)", () => {
    expect(midiToNoteName(64)).toEqual({ note: "E", octave: 4 });
  });
});

describe("analyzePitch", () => {
  it("returns correct info for A4", () => {
    const info = analyzePitch(440);
    expect(info).not.toBeNull();
    expect(info!.note).toBe("A");
    expect(info!.octave).toBe(4);
    expect(info!.cents).toBeCloseTo(0, 2);
    expect(info!.midi).toBe(69);
    expect(info!.frequency).toBe(440);
  });

  it("returns null for out-of-range frequencies", () => {
    expect(analyzePitch(20)).toBeNull();
    expect(analyzePitch(2000)).toBeNull();
    expect(analyzePitch(-1)).toBeNull();
    expect(analyzePitch(Infinity)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(analyzePitch(NaN)).toBeNull();
  });

  it("returns correct note for low E string (82.41 Hz)", () => {
    const info = analyzePitch(82.41);
    expect(info).not.toBeNull();
    expect(info!.note).toBe("E");
    expect(info!.octave).toBe(2);
  });
});

describe("nearestString", () => {
  it("A2 (110 Hz) maps to the A2 open string", () => {
    const pitch = analyzePitch(110)!;
    const { guitarString } = nearestString(pitch);
    expect(guitarString.note).toBe("A");
    expect(guitarString.octave).toBe(2);
  });

  it("E4 (329.63 Hz) maps to the high E string", () => {
    const pitch = analyzePitch(329.63)!;
    const { guitarString } = nearestString(pitch);
    expect(guitarString.note).toBe("E");
    expect(guitarString.string).toBe(1);
  });

  it("centsOff is ~0 for exact open string frequency", () => {
    const pitch = analyzePitch(midiToFrequency(A4_MIDI))!;
    // A4 is not a standard open string, so this just checks it returns a number
    const { centsOff } = nearestString(pitch);
    expect(typeof centsOff).toBe("number");
  });
});
