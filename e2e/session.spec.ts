import { test, expect } from "@playwright/test";

/**
 * M3.10 — Session flow E2E
 *
 * Strategy for audio:
 *   The real audio engine requires a user gesture and Tone.js sampler loading,
 *   neither of which works in a headless browser. We stub the engine module by
 *   intercepting the JS bundle and injecting overrides via addInitScript so that:
 *     - initAudio() resolves immediately
 *     - isAudioReady() returns true
 *     - playNote() / playSequence() resolve immediately (no sound)
 *
 *   This lets us test the full UI state machine without real audio.
 *
 * The stub works by patching window.__audioStub__ before any React code runs,
 *   then the engine checks for it. But actually the cleanest approach for Next.js
 *   is to intercept the network response for the engine chunk and replace exports —
 *   instead we use page.addInitScript to override the module after load by
 *   monkeypatching the global that the engine exposes (isAudioReady / initAudio
 *   are imported directly, so we need to intercept at the React component level).
 *
 *   Simplest reliable approach: expose a test-only query param that the session
 *   page reads to skip the init screen. Since we don't want to couple prod code
 *   to test concerns, we instead:
 *   1. Click "Start" (this counts as a user gesture — enough for headless Chrome
 *      with --disable-web-security already set in playwright config)
 *   2. Stub Tone.js globals so it doesn't try to load remote samples
 *   3. Proceed through the challenge UI — the fretboard tap is the real user gesture
 */

// Inject audio stubs before page JS runs
async function stubAudio(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    // Stub Tone.js so the sampler never tries to fetch remote audio files
    (window as unknown as Record<string, unknown>).__TONE_STUB__ = true;

    // Override fetch for audio sample CDN requests
    const _originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("midi-js-soundfonts") || url.includes(".mp3")) {
        // Return an empty successful response so the sampler "loads" instantly
        return new Response(new ArrayBuffer(0), { status: 200 });
      }
      return _originalFetch(input, init);
    };

    // Stub AudioContext to avoid Web Audio errors in headless
    if (typeof AudioContext !== "undefined") {
      const OrigAC = AudioContext;
      (window as unknown as Record<string, unknown>).AudioContext = class extends OrigAC {
        resume() { return Promise.resolve(); }
      };
    }
  });
}

test.describe("Session flow", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
  });

  test("landing page has Start Training link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /start training/i })).toBeVisible();
  });

  test("Start Training navigates to /session", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /start training/i }).click();
    await expect(page).toHaveURL(/\/session/);
  });

  test("session page shows Start button before audio init", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /start/i })).toBeVisible();
  });

  test("clicking Start advances to difficulty picker (idle phase)", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    // After audio init we should see difficulty buttons and the Play button
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
  });

  test("can pick a difficulty and start a challenge", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });

    // Select medium difficulty
    await page.getByRole("button", { name: /medium/i }).click();
    await page.getByRole("button", { name: /play/i }).click();

    // Fretboard should appear (gridcells present)
    await expect(page.getByRole("gridcell").first()).toBeVisible({ timeout: 8000 });
  });

  test("tapping a fretboard cell during awaiting phase moves to feedback", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /play/i }).click();

    // Wait for fretboard to be active (awaiting phase — not disabled)
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).toBeVisible({ timeout: 8000 });

    // Wait until fretboard is enabled (phase = awaiting)
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", { timeout: 8000 });

    // Tap any cell
    await firstCell.click();

    // Should now show feedback (Correct! or Not quite)
    await expect(
      page.getByText(/correct!/i).or(page.getByText(/not quite/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test("score increments after each answered challenge", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /play/i }).click();

    // Answer challenge 1
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", { timeout: 8000 });
    await firstCell.click();
    await expect(page.getByText(/correct!/i).or(page.getByText(/not quite/i))).toBeVisible({ timeout: 5000 });

    // Score should read "?/1"
    await expect(page.getByText(/\/ 1/)).toBeVisible();

    // Next challenge
    await page.getByRole("button", { name: "Next →" }).click();
    await page.getByRole("button", { name: /play/i }).click();

    // Answer challenge 2
    const cell2 = page.getByRole("gridcell").nth(5);
    await expect(cell2).not.toHaveAttribute("aria-disabled", "true", { timeout: 8000 });
    await cell2.click();
    await expect(page.getByText(/correct!/i).or(page.getByText(/not quite/i))).toBeVisible({ timeout: 5000 });

    // Score should read "?/2"
    await expect(page.getByText(/\/ 2/)).toBeVisible();
  });
});
