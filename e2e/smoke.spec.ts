import { test, expect } from "@playwright/test";

test.describe("smoke tests", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    // Should have a root element
    await expect(page.locator("body")).toBeVisible();
  });
});
