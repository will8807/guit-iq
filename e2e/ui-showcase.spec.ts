import { test, expect } from "@playwright/test";

/**
 * UI Enhancement Showcase — visual snapshots of every new feature.
 *
 * These tests visit /demo and take screenshots of each section so you can
 * review the enhancements without playing the game.  Run with:
 *
 *   pnpm e2e --grep "UI Showcase"
 *
 * To update baselines after intentional design changes:
 *
 *   pnpm e2e --grep "UI Showcase" --update-snapshots
 *
 * Screenshots land in:
 *   test-results/ui-showcase-snapshots/<test-name>-<project>-<platform>.png
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for CSS animations to finish (longest is ~500ms) before snapping. */
const ANIMATION_SETTLE_MS = 600;

/** Disable CSS animations globally so screenshot baselines are stable. */
async function freezeAnimations(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay:    0s !important;
        transition-duration: 0s !important;
        transition-delay:    0s !important;
      }
    `,
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("UI Showcase", () => {
  // ── 1. Page loads & nav is visible ────────────────────────────────────────

  test("demo page loads with all section headings", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: /UI Enhancement Showcase/i })).toBeVisible();

    for (const heading of [
      /Fretboard.*Tap Animations/i,
      /Note Highlights/i,
      /^Feedback Banners — Correct$/i,
      /^Feedback Banners — Incorrect$/i,
      /Chromatic Tuner/i,
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  // ── 2. Full-page screenshot (frozen) ──────────────────────────────────────

  test("full demo page snapshot", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo");
    await freezeAnimations(page);
    // Wait for fretboard SVG/CSS to paint
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("demo-full-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  // ── 3. Fretboard — portrait ────────────────────────────────────────────────

  test("fretboard portrait — static appearance", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#fretboard-animations");
    await freezeAnimations(page);
    const board = page.getByTestId("fretboard-portrait");
    await expect(board).toBeVisible();
    await expect(board).toHaveScreenshot("fretboard-portrait.png");
  });

  test("fretboard portrait — tap ripple visible immediately after click", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#fretboard-animations");
    const board = page.getByTestId("fretboard-portrait");
    await expect(board).toBeVisible();

    // Tap a cell near the middle of the board — don't freeze animations here
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(
      box!.x + box!.width * 0.45,
      box!.y + box!.height * 0.55,
    );

    // Snap immediately — ripple span should be in the DOM
    await expect(board).toHaveScreenshot("fretboard-portrait-ripple.png", {
      animations: "allow",
    });

    // Tap log should now show a position
    await expect(page.getByTestId("tap-log")).not.toContainText("Tap a cell");
  });

  // ── 4. Fretboard — landscape ───────────────────────────────────────────────

  test("fretboard landscape — static appearance", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#fretboard-animations");
    await freezeAnimations(page);
    const board = page.getByTestId("fretboard-landscape");
    await expect(board).toBeVisible();
    await expect(board).toHaveScreenshot("fretboard-landscape.png");
  });

  test("fretboard landscape — tap ripple visible immediately after click", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#fretboard-animations");
    const board = page.getByTestId("fretboard-landscape");
    await expect(board).toBeVisible();

    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(
      box!.x + box!.width * 0.45,
      box!.y + box!.height * 0.55,
    );

    await expect(board).toHaveScreenshot("fretboard-landscape-ripple.png", {
      animations: "allow",
    });
  });

  // ── 5. Note highlights ─────────────────────────────────────────────────────

  test("note highlights — portrait (frozen)", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#note-highlights");
    await freezeAnimations(page);
    const board = page.getByTestId("highlights-portrait");
    await expect(board).toBeVisible();
    await expect(board).toHaveScreenshot("highlights-portrait.png");
  });

  test("note highlights — landscape (frozen)", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#note-highlights");
    await freezeAnimations(page);
    const board = page.getByTestId("highlights-landscape");
    await expect(board).toBeVisible();
    await expect(board).toHaveScreenshot("highlights-landscape.png");
  });

  // ── 6. Feedback banners — correct ─────────────────────────────────────────

  test("feedback correct — note (frozen after animation)", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#feedback-correct");
    await page.waitForTimeout(ANIMATION_SETTLE_MS);
    await freezeAnimations(page);

    const section = page.locator("[data-section='feedback-correct']");
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot("feedback-correct-all.png");
  });

  test("feedback correct — banner content", async ({ page }) => {
    await page.goto("/demo#feedback-correct");
    await freezeAnimations(page);
    await page.waitForTimeout(ANIMATION_SETTLE_MS);

    // Each sub-panel should display "Correct!"
    const banners = page.locator("[data-section='feedback-correct'] .feedback-correct");
    await expect(banners).toHaveCount(4);
    for (const banner of await banners.all()) {
      await expect(banner).toContainText("Correct!");
    }
  });

  test("feedback correct — animation re-triggered by button", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#feedback-correct");
    // Let the initial animation settle
    await page.waitForTimeout(ANIMATION_SETTLE_MS);

    // Click ↺ on the first panel to re-trigger
    const replayBtn = page.locator("[data-section='feedback-correct'] button").first();
    await replayBtn.click();

    // Capture mid-animation
    const firstPanel = page.locator("[data-section='feedback-correct'] > div > div").first();
    await expect(firstPanel).toHaveScreenshot("feedback-correct-replaying.png", {
      animations: "allow",
    });
  });

  // ── 7. Feedback banners — incorrect ───────────────────────────────────────

  test("feedback incorrect — all panels (frozen)", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#feedback-incorrect");
    await page.waitForTimeout(ANIMATION_SETTLE_MS);
    await freezeAnimations(page);

    const section = page.locator("[data-section='feedback-incorrect']");
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot("feedback-incorrect-all.png");
  });

  test("feedback incorrect — banner content", async ({ page }) => {
    await page.goto("/demo#feedback-incorrect");
    await freezeAnimations(page);
    await page.waitForTimeout(ANIMATION_SETTLE_MS);

    const banners = page.locator("[data-section='feedback-incorrect'] .feedback-incorrect");
    await expect(banners).toHaveCount(4);
    for (const banner of await banners.all()) {
      await expect(banner).toContainText("Not quite");
    }
  });

  test("feedback incorrect — shake animation re-triggered", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/demo#feedback-incorrect");
    await page.waitForTimeout(ANIMATION_SETTLE_MS);

    const replayBtn = page.locator("[data-section='feedback-incorrect'] button").first();
    await replayBtn.click();

    const firstPanel = page.locator("[data-section='feedback-incorrect'] > div > div").first();
    await expect(firstPanel).toHaveScreenshot("feedback-incorrect-shaking.png", {
      animations: "allow",
    });
  });

  // ── 8. Tuner link ──────────────────────────────────────────────────────────

  test("tuner link is visible on demo page", async ({ page }) => {
    await page.goto("/demo#tuner");
    const link = page.getByTestId("tuner-link");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/tuner");
  });

  test("tuner page loads", async ({ page }) => {
    test.skip(!!process.env.CI, "Snapshot baselines are not committed; run locally to generate.");
    await page.goto("/tuner");
    await freezeAnimations(page);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("tuner-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  // ── 9. Home page shows UI Showcase link ───────────────────────────────────

  test("home page has UI Showcase link", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /UI Showcase/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/demo/);
  });
});
