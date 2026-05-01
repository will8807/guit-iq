import { test, expect } from "@playwright/test";
import { stubAudio, stubSettings } from "./test-helpers";

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

test.describe("Session flow", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    await stubSettings(page);
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

  test("session page shows difficulty picker on arrival", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
  });

  test("can pick a difficulty and start a challenge", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });

    // Select medium difficulty
    await page.getByRole("button", { name: /medium/i }).click();
    await page.getByRole("button", { name: /play/i }).click();

    // Fretboard should appear (gridcells present)
    await expect(page.getByRole("gridcell").first()).toBeVisible({ timeout: 8000 });
  });

  test("tapping a fretboard cell during awaiting phase moves to feedback", async ({ page }) => {
    await page.goto("/session");
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

// ─── M4.5: session completion screen ─────────────────────────────────────────

test.describe("session completion", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    await stubSettings(page);
  });

  /**
   * Helper: from the difficulty-picker screen (after audio init), complete one
   * full challenge by tapping any fretboard cell and pressing Next →.
   */
  async function completeOneChallenge(page: import("@playwright/test").Page) {
    // Wait for fretboard to become enabled
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
      timeout: 10_000,
    });
    await firstCell.click();
    // Wait for feedback
    await expect(
      page.getByText(/correct!/i).or(page.getByText(/not quite/i))
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Next →" }).click();
  }

  test("completion screen appears after SESSION_LENGTH challenges", async ({
    page,
  }) => {
    await page.goto("/session");
    // Init audio
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // Complete 8 challenges
    for (let i = 0; i < 8; i++) {
      await completeOneChallenge(page);
    }

    // Completion screen should be visible
    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("completion screen shows score and accuracy", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    for (let i = 0; i < 8; i++) {
      await completeOneChallenge(page);
    }

    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 5000 });

    // Score shows /8
    await expect(page.getByText("/8")).toBeVisible();
    // Accuracy % rendered
    await expect(page.getByTestId("accuracy")).toBeVisible();
  });

  test("'Play Again' restarts the session", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    for (let i = 0; i < 8; i++) {
      await completeOneChallenge(page);
    }

    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /play again/i }).click();

    // Should be back in active challenge (fretboard visible)
    await expect(page.getByRole("grid")).toBeVisible({ timeout: 8000 });
  });

  test("'Home' link points to /", async ({ page }) => {
    await page.goto("/session");
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    for (let i = 0; i < 8; i++) {
      await completeOneChallenge(page);
    }

    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 5000 });

    const homeLink = page.getByRole("link", { name: /home/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");
  });
});
