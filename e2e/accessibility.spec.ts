import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * M3.11 — Accessibility audit using axe-core
 *
 * Scans key pages/states for WCAG violations.
 * We exclude colour-contrast rules since we deliberately use a dark theme
 * that axe sometimes flags as insufficient — those are design decisions
 * reviewed separately.
 */

const AXE_OPTIONS = {
  // Exclude colour contrast — dark theme is intentional
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
  },
  rules: {
    "color-contrast": { enabled: false },
  },
};

test.describe("Accessibility", () => {
  test("landing page has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("session init screen has no axe violations", async ({ page }) => {
    await page.goto("/session");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("session idle/difficulty screen has no axe violations", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("fretboard (awaiting phase) has no axe violations", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /play/i }).click();

    // Wait for fretboard to become active
    await expect(page.getByRole("gridcell").first()).not.toHaveAttribute(
      "aria-disabled",
      "true",
      { timeout: 8000 }
    );

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("feedback phase has no axe violations", async ({ page }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /play/i }).click();

    // Tap a cell to reach feedback phase
    const cell = page.getByRole("gridcell").first();
    await expect(cell).not.toHaveAttribute("aria-disabled", "true", { timeout: 8000 });
    await cell.click();
    await expect(
      page.getByText(/correct!/i).or(page.getByText(/not quite/i))
    ).toBeVisible({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
