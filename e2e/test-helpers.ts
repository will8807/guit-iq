/**
 * Shared E2E test helpers used across multiple spec files.
 */

/** Stub Tone.js / Web Audio so audio init resolves instantly in headless Chrome. */
export async function stubAudio(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__TONE_STUB__ = true;

    const _originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("midi-js-soundfonts") || url.includes(".mp3")) {
        return new Response(new ArrayBuffer(0), { status: 200 });
      }
      return _originalFetch(input, init);
    };

    if (typeof AudioContext !== "undefined") {
      const OrigAC = AudioContext;
      (window as unknown as Record<string, unknown>).AudioContext = class extends OrigAC {
        resume() { return Promise.resolve(); }
      };
    }
  });
}

/**
 * Seed guitiq-settings with intervalMix:0 and chordMix:0 so the session only
 * generates find-the-note challenges. This ensures a single fretboard tap
 * always transitions directly to the feedback phase (chord and interval
 * challenges require multiple taps + a Done button click).
 *
 * Uses addInitScript so the setting is written before React hydrates and is
 * re-applied on every subsequent page navigation within the same test.
 */
export async function stubSettings(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("guitiq-settings", JSON.stringify({
      state: { showRoot: false, sessionLength: 8, intervalMix: 0, chordMix: 0, findAllMix: 0 },
      version: 0,
    }));
  });
}
