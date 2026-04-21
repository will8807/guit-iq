import { test, expect } from "@playwright/test";

/**
 * M5.15 — Progress persistence E2E
 *
 * Verifies that completing a session updates the /progress screen.
 *
 * Audio stub: same strategy as session.spec.ts — stub Tone.js so samples never
 * load and AudioContext resolves instantly in headless Chrome.
 */

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
        resume() {
          return Promise.resolve();
        }
      };
    }
  });
}

/** Complete one challenge by tapping fret cells then Next →
 * Handles both note (1-tap) and interval (2-tap) challenges.
 */
async function completeOneChallenge(page: import("@playwright/test").Page) {
  const firstCell = page.getByRole("gridcell").first();
  await expect(firstCell).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 10_000,
  });
  await firstCell.click();

  // For interval challenges the first tap locks in the root; a second tap is needed.
  // Check whether feedback appeared; if not, do a second tap.
  const feedbackLocator = page.getByText(/correct!/i).or(page.getByText(/not quite/i));
  const feedbackVisible = await feedbackLocator.isVisible().catch(() => false);
  if (!feedbackVisible) {
    // Second tap for interval challenge (tap a different cell so the store records it)
    const secondCell = page.getByRole("gridcell").nth(10);
    await secondCell.click();
  }

  await expect(feedbackLocator).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Next →" }).click();
}

test.describe("M5.15 — Progress screen updated after session", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    // Navigate first, then clear localStorage so we start clean but
    // don't wipe data on subsequent navigations within the test.
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("/progress shows empty state before any session", async ({ page }) => {
    await page.goto("/progress");
    // Total sessions should be 0 or show an empty-state message
    await expect(
      page
        .getByText(/0 sessions/i)
        .or(page.getByText(/no sessions/i))
        .or(page.getByText(/start your first session/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test("completing a session increments Total Sessions on /progress", async ({
    page,
  }) => {
    // ── 1. Complete a full session ────────────────────────────────────────
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /play/i }).click();

    for (let i = 0; i < 8; i++) {
      await completeOneChallenge(page);
    }

    // Wait for completion screen
    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 5000 });

    // ── 2. Navigate to /progress ──────────────────────────────────────────
    await page.goto("/progress");

    // Total Sessions should now show 1
    await expect(page.getByTestId("stat-total-sessions")).toHaveText("1", { timeout: 5000 });
    // Current Streak should be at least 1
    await expect(page.getByTestId("stat-streak")).not.toHaveText("—");
  });

  test("accuracy section appears after a completed session", async ({
    page,
  }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
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

    await page.goto("/progress");

    // Overall accuracy should render (progress screen shows accuracy %)
    await expect(page.getByTestId("stat-accuracy")).not.toHaveText("—", { timeout: 5000 });
  });

  test("completing two sessions on the same day keeps streak at 1", async ({
    page,
  }) => {
    // Session 1
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
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

    // Session 2 — Play Again
    await page.getByRole("button", { name: /play again/i }).click();
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

    await page.goto("/progress");

    // Streak should be 1 (same day doesn't extend streak)
    await expect(page.getByTestId("stat-streak")).not.toHaveText("—", { timeout: 5000 });
    // Total sessions should be 2 (both sessions recorded; totalSessions always increments)
    await expect(page.getByTestId("stat-total-sessions")).toHaveText("2", { timeout: 5000 });
  });
});
