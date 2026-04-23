import { test, expect } from "@playwright/test";

/**
 * M6.13 — Chord challenge E2E
 * M6.14 — Chord challenge with Show Root ON
 *
 * Strategy:
 *   - Pre-seed localStorage with chordMix:1, sessionLength:3 so the session
 *     is 3 chord challenges and nothing else.
 *   - Audio is stubbed the same way as session.spec.ts.
 *   - We don't need to know which chord was generated: we tap one or more fret
 *     cells, click "Done (N taps)", and assert the feedback shows "That was a".
 *   - For M6.14 we also pre-seed showRoot:true and assert the chord label is
 *     visible in the prompt before tapping.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function stubAudio(page: import("@playwright/test").Page) {
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

/** Seed the persisted settings store via localStorage before React hydrates */
function seedSettings(
  page: import("@playwright/test").Page,
  overrides: Record<string, unknown> = {},
) {
  return page.addInitScript((settings) => {
    const defaults = {
      state: {
        showRoot: false,
        sessionLength: 3,
        intervalMix: 0,
        chordMix: 1,
      },
      version: 0,
    };
    // Deep-merge overrides into defaults.state
    Object.assign(defaults.state, settings);
    localStorage.setItem("guitiq-settings", JSON.stringify(defaults));
  }, overrides);
}

/**
 * From the idle phase (Play button visible), play through one chord challenge:
 *   1. Click Play
 *   2. Wait for the fretboard to become active
 *   3. Tap `tapCount` fret cells
 *   4. Click the Done button
 *   5. Assert "That was a" appears in feedback
 *   6. Click Next →
 */
async function completeOneChordChallenge(
  page: import("@playwright/test").Page,
  tapCount = 2,
) {
  // Wait for fretboard to become active (awaiting phase)
  const firstCell = page.getByRole("gridcell").first();
  await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 10_000,
  });

  // Tap a few different cells
  const cells = page.getByRole("gridcell");
  for (let i = 0; i < tapCount; i++) {
    await cells.nth(i * 7).click();
  }

  // Click Done (enabled once at least one tap is recorded)
  const doneButton = page.getByRole("button", { name: /done/i });
  await expect(doneButton).toBeEnabled({ timeout: 3_000 });
  await doneButton.click();

  // Feedback: "That was a <chord name>"
  await expect(page.getByText(/that was a/i)).toBeVisible({ timeout: 5_000 });

  // Advance
  await page.getByRole("button", { name: "Next →" }).click();
}

// ─── M6.13: Complete 3 chord challenges ───────────────────────────────────────

test.describe("M6.13 — chord challenge flow", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    await seedSettings(page);
  });

  test("session with chordMix:1 shows chord prompt", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // Chord prompt text
    await expect(page.getByText(/tap all chord tones/i)).toBeVisible({
      timeout: 8_000,
    });
  });

  test("Done button appears after tapping a cell", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
      timeout: 10_000,
    });

    // Before any tap, Done button should be disabled
    const doneButton = page.getByRole("button", { name: /done/i });
    await expect(doneButton).toBeDisabled();

    // Tap a cell → Done becomes enabled
    await firstCell.click();
    await expect(doneButton).toBeEnabled({ timeout: 3_000 });
  });

  test("chord feedback shows 'That was a' after submitting", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
      timeout: 10_000,
    });
    await firstCell.click();

    await page.getByRole("button", { name: /done/i }).click();

    await expect(page.getByText(/that was a/i)).toBeVisible({ timeout: 5_000 });
  });

  test("can complete 3 chord challenges and reach session complete", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    for (let i = 0; i < 3; i++) {
      await completeOneChordChallenge(page);
    }

    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("score counter increments after each chord challenge", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // Complete challenge 1 — check score while still in feedback (before Next →)
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", { timeout: 10_000 });
    await firstCell.click();
    const doneBtn1 = page.getByRole("button", { name: /done/i });
    await expect(doneBtn1).toBeEnabled({ timeout: 3_000 });
    await doneBtn1.click();
    await expect(page.getByText(/that was a/i)).toBeVisible({ timeout: 5_000 });
    // Score shows /1 while in feedback
    await expect(page.getByText(/\/ 1/)).toBeVisible();
    await page.getByRole("button", { name: "Next →" }).click();

    // Complete challenge 2 — check score while still in feedback
    const firstCell2 = page.getByRole("gridcell").first();
    await expect(firstCell2).not.toHaveAttribute("aria-disabled", "true", { timeout: 10_000 });
    await firstCell2.click();
    const doneBtn2 = page.getByRole("button", { name: /done/i });
    await expect(doneBtn2).toBeEnabled({ timeout: 3_000 });
    await doneBtn2.click();
    await expect(page.getByText(/that was a/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/\/ 2/)).toBeVisible();
  });
});

// ─── M6.14: Chord challenge with Show Root ON ─────────────────────────────────

test.describe("M6.14 — chord challenge with Show Root ON", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    await seedSettings(page, { showRoot: true });
  });

  test("chord label is shown in prompt when showRoot is ON", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // Wait for fretboard to become active
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
      timeout: 10_000,
    });

    // ChallengePrompt shows chord label (e.g. "C Major") when showRoot is ON
    // We can't know the exact chord name, but we know the prompt heading changes
    // from the generic "Find the Chord" to include the actual label.
    // The chord label element has data-testid="chord-label" or is the h2.
    await expect(page.getByTestId("chord-label")).toBeVisible({ timeout: 5_000 });
  });

  test("root positions are highlighted on fretboard when showRoot is ON", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // Wait for fretboard
    const firstCell = page.getByRole("gridcell").first();
    await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
      timeout: 10_000,
    });

    // Root highlight cells carry data-variant="hint" and label "R"
    await expect(page.locator('[data-label="R"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can complete a chord challenge with showRoot ON", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    // completeOneChordChallenge waits for "That was a" internally
    await completeOneChordChallenge(page);
  });
});
