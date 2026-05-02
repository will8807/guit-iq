/**
 * Audio engine integration tests.
 *
 * Strategy:
 * - Tone.js is mocked at the module boundary using Vitest's vi.mock()
 * - We verify that the correct note names are passed to the sampler/synth
 * - We never test actual audio output (non-deterministic, hardware-dependent)
 * - Each test resets engine state via _resetForTesting()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Tone.js ─────────────────────────────────────────────────────────────

const mockTriggerAttackRelease = vi.fn();
const mockSamplerDispose = vi.fn();
const mockSynthDispose = vi.fn();

// vi.fn() mocks used as constructors MUST use regular functions (not arrow fns)
const MockSampler = vi.fn(function (this: unknown, { onload }: { onload: () => void; onerror?: (e: Error) => void }) {
  // Simulate async load success
  setTimeout(onload, 0);
  return {
    triggerAttackRelease: mockTriggerAttackRelease,
    dispose: mockSamplerDispose,
    toDestination: vi.fn().mockReturnThis(),
  };
});

const MockPolySynth = vi.fn(function (this: unknown) {
  return {
    triggerAttackRelease: mockTriggerAttackRelease,
    dispose: mockSynthDispose,
    toDestination: vi.fn().mockReturnThis(),
  };
});

const mockFeedbackSynth = {
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
  toDestination: vi.fn().mockReturnThis(),
};

const MockSynth = vi.fn(function (this: unknown) {
  return mockFeedbackSynth;
});

vi.mock("tone", () => ({
  start: vi.fn().mockResolvedValue(undefined),
  Sampler: MockSampler,
  PolySynth: MockPolySynth,
  Synth: MockSynth,
  now: vi.fn(() => 0),
}));

// ─── Import engine after mock is set up ──────────────────────────────────────

import {
  initAudio,
  playNote,
  playSequence,
  playChord,
  playFeedbackChime,
  isAudioReady,
  _resetForTesting,
} from "@/lib/audio/engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function initWithSampler(): Promise<void> {
  _resetForTesting();
  MockSampler.mockImplementationOnce(function (
    this: unknown,
    { onload }: { onload: () => void }
  ) {
    setTimeout(onload, 0);
    return {
      triggerAttackRelease: mockTriggerAttackRelease,
      dispose: mockSamplerDispose,
      toDestination: vi.fn().mockReturnThis(),
    };
  });
  await initAudio();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("initAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("starts the Tone.js audio context", async () => {
    const Tone = await import("tone");
    await initAudio();
    expect(Tone.start).toHaveBeenCalledOnce();
  });

  it("sets isAudioReady to true after init", async () => {
    expect(isAudioReady()).toBe(false);
    await initAudio();
    expect(isAudioReady()).toBe(true);
  });

  it("is safe to call multiple times (idempotent)", async () => {
    const Tone = await import("tone");
    await initAudio();
    await initAudio();
    await initAudio();
    expect(Tone.start).toHaveBeenCalledOnce();
  });

  it("falls back to PolySynth when sampler loading fails", async () => {
    _resetForTesting();
    MockSampler.mockImplementationOnce(function (
      this: unknown,
      {
        onerror,
      }: {
        onload: () => void;
        onerror?: (e: Error) => void;
      }
    ) {
        setTimeout(() => onerror?.(new Error("load failed")), 0);
      return {
        triggerAttackRelease: mockTriggerAttackRelease,
        dispose: mockSamplerDispose,
        toDestination: vi.fn().mockReturnThis(),
      };
    });
    await initAudio();
    expect(isAudioReady()).toBe(true);
    // PolySynth should have been constructed as the fallback
    expect(MockPolySynth).toHaveBeenCalled();
  });
});

describe("playNote", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initWithSampler();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("calls triggerAttackRelease with the correct note name", async () => {
    await playNote("A3");
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("A3", 1.5);
  });

  it("uses a custom duration when provided", async () => {
    await playNote("E4", 2.5);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("E4", 2.5);
  });

  it("passes the note name exactly as given (engine does not transpose)", async () => {
    await playNote("C#4");
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("C#4", 1.5);
  });

  it("throws if audio is not initialized", async () => {
    _resetForTesting();
    await expect(playNote("A3")).rejects.toThrow();
  });
});

describe("playSequence", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initWithSampler(); // init with real timers first
    vi.useFakeTimers();      // fake timers only after sampler is loaded
  });

  afterEach(() => {
    vi.useRealTimers();
    _resetForTesting();
  });

  it("plays notes in order with delays", async () => {
    const sequencePromise = playSequence(["A3", "E4"], 100);
    await vi.runAllTimersAsync();
    await sequencePromise;

    expect(mockTriggerAttackRelease).toHaveBeenNthCalledWith(1, "A3", 1.2);
    expect(mockTriggerAttackRelease).toHaveBeenNthCalledWith(2, "E4", 1.2);
  });

  it("calls triggerAttackRelease once per note", async () => {
    const notes = ["C3", "E3", "G3"];
    const sequencePromise = playSequence(notes, 50);
    await vi.runAllTimersAsync();
    await sequencePromise;
    expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(3);
  });
});

describe("playChord", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initWithSampler();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("passes the full notes array to triggerAttackRelease", async () => {
    const chord = ["C3", "E3", "G3"];
    await playChord(chord);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith(chord, 2);
  });

  it("uses custom duration when provided", async () => {
    await playChord(["A3", "C#4", "E4"], 3);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith(
      ["A3", "C#4", "E4"],
      3
    );
  });
});

describe("playFeedbackChime", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initWithSampler(); // init with real timers first
    vi.useFakeTimers();      // fake timers only after sampler is loaded
  });

  afterEach(() => {
    vi.useRealTimers();
    _resetForTesting();
  });

  it("plays a high note for correct feedback", async () => {
    await playFeedbackChime("correct");
    // Correct: ascending arpeggio C5 → E5 → G5 (+0.01 lookahead offset)
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("C5", "8n", 0.01);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("E5", "8n", 0.11);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("G5", "8n", 0.21);
  });

  it("plays a low note for incorrect feedback", async () => {
    await playFeedbackChime("incorrect");
    // Incorrect: dissonant descending pair C3 → Bb2 (+0.01 lookahead offset)
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("C3", "4n", 0.01);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith("Bb2", "4n", 0.13);
  });

  it("silently no-ops if audio is not ready", async () => {
    _resetForTesting();
    // Should not throw
    await expect(playFeedbackChime("correct")).resolves.toBeUndefined();
  });

  it("disposes the chime synth after playback", async () => {
    await playFeedbackChime("correct");
    vi.advanceTimersByTime(1600);
    expect(mockSynthDispose).toHaveBeenCalled();
  });
});

describe("_resetForTesting", () => {
  it("resets isAudioReady to false", async () => {
    await initAudio();
    expect(isAudioReady()).toBe(true);
    _resetForTesting();
    expect(isAudioReady()).toBe(false);
  });
});
