/**
 * lib/audio/engine.ts
 *
 * Singleton audio engine wrapping Tone.js.
 *
 * Design constraints:
 * - Tone.js is dynamically imported (keeps initial bundle small)
 * - AudioContext only created after an explicit initAudio() call
 *   (required by browser autoplay policies — must be triggered by a user gesture)
 * - If guitar samples fail to load, falls back to a PolySynth
 * - All public functions are safe to call before init (they no-op with a warning)
 *
 * Usage:
 *   // In a click handler / "Start Session" button:
 *   await initAudio();
 *
 *   // Then anywhere:
 *   await playNote("A3");
 *   await playSequence(["A3", "E4"], 400);
 *   await playChord(["C3", "E3", "G3"]);
 *   await playFeedbackChime("correct");
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedbackChimeType = "correct" | "incorrect";

export interface AudioEngine {
  isReady: boolean;
  initAudio: () => Promise<void>;
  playNote: (note: string, durationSeconds?: number) => Promise<void>;
  playSequence: (notes: string[], delayMs?: number) => Promise<void>;
  playChord: (notes: string[], durationSeconds?: number) => Promise<void>;
  playFeedbackChime: (type: FeedbackChimeType) => Promise<void>;
}

// ─── Internal state ───────────────────────────────────────────────────────────

let _isReady = false;
let _sampler: unknown = null; // Tone.Sampler or Tone.PolySynth
let _usingSynth = false;

// Pre-load the Tone.js module as soon as this module is imported (browser only).
// This ensures the dynamic import is already resolved by the time the user taps
// "Init Audio", so Tone.start() is called synchronously within the gesture —
// required by Android Chrome's strict autoplay policy.
let _tonePromise: Promise<typeof import("tone")> | null = null;
if (typeof window !== "undefined") {
  _tonePromise = import("tone");
}
async function getTone(): Promise<typeof import("tone")> {
  if (!_tonePromise) _tonePromise = import("tone");
  return _tonePromise;
}

// ─── Sample URLs ──────────────────────────────────────────────────────────────

/**
 * Maps note names to publicly hosted guitar sample URLs.
 * Using the Benjamin Gleitz MIDI.js soundfonts hosted via jsDelivr (CDN, no CORS).
 *
 * We only load a sparse set of samples; Tone.Sampler interpolates the rest.
 */
const SAMPLE_BASE =
  "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/acoustic_guitar_nylon-mp3/";

const GUITAR_SAMPLES: Record<string, string> = {
  E2: `${SAMPLE_BASE}E2.mp3`,
  A2: `${SAMPLE_BASE}A2.mp3`,
  D3: `${SAMPLE_BASE}D3.mp3`,
  G3: `${SAMPLE_BASE}G3.mp3`,
  B3: `${SAMPLE_BASE}B3.mp3`,
  E4: `${SAMPLE_BASE}E4.mp3`,
};

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initialize the audio engine. MUST be called from a user-gesture handler
 * (e.g., click, touchstart) to satisfy browser autoplay policies.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initAudio(): Promise<void> {
  if (_isReady) return;

  const Tone = await getTone();

  // Resume AudioContext (required by browsers after user gesture)
  await Tone.start();

  try {
    await loadSampler(Tone);
  } catch {
    console.warn(
      "[AudioEngine] Sample loading failed — falling back to PolySynth"
    );
    loadSynth(Tone);
  }

  _isReady = true;
}

async function loadSampler(Tone: typeof import("tone")): Promise<void> {
  return new Promise((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls: GUITAR_SAMPLES,
      onload: () => {
        _sampler = sampler;
        _usingSynth = false;
        resolve();
      },
      onerror: reject,
    }).toDestination();

    // Timeout: if samples don't load in 8 seconds, reject
    setTimeout(() => reject(new Error("Sample load timeout")), 8000);
  });
}

function loadSynth(Tone: typeof import("tone")): void {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
  }).toDestination();
  _sampler = synth;
  _usingSynth = true;
}

// ─── Guard ────────────────────────────────────────────────────────────────────

function assertReady(): void {
  if (!_isReady || !_sampler) {
    console.warn(
      "[AudioEngine] Audio not ready. Call initAudio() from a user gesture first."
    );
    throw new Error("AudioEngine not initialized");
  }
}

// ─── Playback ─────────────────────────────────────────────────────────────────

/**
 * Play a single note.
 * @param note - Note name, e.g. "A3", "C#4"
 * @param durationSeconds - How long to hold the note (default: 1.5s)
 */
export async function playNote(
  note: string,
  durationSeconds = 1.5
): Promise<void> {
  assertReady();
  const instrument = _sampler as {
    triggerAttackRelease: (
      note: string,
      duration: number,
      time?: number
    ) => void;
  };
  instrument.triggerAttackRelease(note, durationSeconds);
}

/**
 * Play notes in sequence (arpeggiated).
 * @param notes - Array of note names
 * @param delayMs - Gap between notes in milliseconds (default: 400ms)
 */
export async function playSequence(
  notes: string[],
  delayMs = 400
): Promise<void> {
  assertReady();
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (!note) continue;
    // Schedule each note offset by i * delayMs
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const instrument = _sampler as {
          triggerAttackRelease: (note: string, duration: number) => void;
        };
        instrument.triggerAttackRelease(note, 1.2);
        resolve();
      }, i * delayMs);
    });
  }
}

/**
 * Play multiple notes simultaneously (chord strum).
 * @param notes - Array of note names
 * @param durationSeconds - Hold duration (default: 2s)
 */
export async function playChord(
  notes: string[],
  durationSeconds = 2
): Promise<void> {
  assertReady();
  const instrument = _sampler as {
    triggerAttackRelease: (
      notes: string[],
      duration: number
    ) => void;
  };
  instrument.triggerAttackRelease(notes, durationSeconds);
}

/**
 * Play a short feedback chime.
 * Uses a simple synth tone regardless of whether guitar samples are loaded,
 * to keep feedback sounds distinct from the guitar audio.
 */
export async function playFeedbackChime(
  type: FeedbackChimeType
): Promise<void> {
  if (!_isReady) return; // Silent fail — feedback is non-critical

  const Tone = await getTone();
  const note = type === "correct" ? "C5" : "C3";
  const duration = type === "correct" ? 0.15 : 0.25;

  const chime = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.3 },
    volume: -12,
  }).toDestination();

  chime.triggerAttackRelease(note, duration);

  // Dispose after playback to avoid memory leaks
  setTimeout(() => chime.dispose(), 1000);
}

// ─── State accessor ───────────────────────────────────────────────────────────

export function isAudioReady(): boolean {
  return _isReady;
}

/**
 * Reset engine state — for testing only.
 * @internal
 */
export function _resetForTesting(): void {
  _isReady = false;
  _sampler = null;
  _usingSynth = false;
}

export const audioEngine: AudioEngine = {
  get isReady() {
    return _isReady;
  },
  initAudio,
  playNote,
  playSequence,
  playChord,
  playFeedbackChime,
};
