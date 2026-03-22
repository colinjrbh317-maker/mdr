import { test, expect } from "@playwright/test";

test.describe("CRO Features", () => {
  test("exit-intent popup renders on desktop", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Clear sessionStorage to ensure popup can show
    await page.evaluate(() => {
      sessionStorage.removeItem("exit_popup_shown");
      sessionStorage.removeItem("form_submitted");
    });

    // Wait for the 10s delay to pass, then simulate mouse leaving viewport
    await page.waitForTimeout(11000);
    await page.mouse.move(500, 0);
    await page.evaluate(() => {
      document.documentElement.dispatchEvent(
        new MouseEvent("mouseleave", { clientY: -10, bubbles: true })
      );
    });

    // Check popup appeared
    const popup = page.locator('[aria-label="Special offer"]');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Dismiss with close button
    await page.locator('[aria-label="Close"]').first().click();
    await expect(popup).not.toBeVisible();
  });

  test("exit-intent popup respects session cap", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Set session flag as if already shown
    await page.evaluate(() => {
      sessionStorage.setItem("exit_popup_shown", "1");
    });

    // Even after delay, popup should not show
    await page.waitForTimeout(11000);
    await page.evaluate(() => {
      document.documentElement.dispatchEvent(
        new MouseEvent("mouseleave", { clientY: -10, bubbles: true })
      );
    });

    const popup = page.locator('[aria-label="Special offer"]');
    await expect(popup).not.toBeVisible();
  });

  test("scroll popup renders after 50% scroll and 15s delay", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Clear session
    await page.evaluate(() => {
      sessionStorage.removeItem("scroll_popup_shown");
      sessionStorage.removeItem("form_submitted");
    });

    // Wait for time gate
    await page.waitForTimeout(16000);

    // Scroll past 50%
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });

    // Wait a bit for the scroll handler to fire
    await page.waitForTimeout(500);

    const popup = page.locator('[aria-label="Financing offer"]');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Dismiss with Escape
    await page.keyboard.press("Escape");
    await expect(popup).not.toBeVisible();
  });

  test("gallery page loads and has category filters", async ({ page }) => {
    await page.goto("/gallery", { waitUntil: "domcontentloaded" });

    // Page should have title
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Gallery");

    // Category filters should exist
    const filters = page.locator(".gallery-filter");
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("privacy page loads with required content", async ({ page }) => {
    await page.goto("/privacy", { waitUntil: "domcontentloaded" });

    const h1 = page.locator("h1");
    await expect(h1).toContainText("Privacy Policy");

    // Should have key sections
    const content = await page.textContent("main");
    expect(content).toContain("Information We Collect");
    expect(content).toContain("Cookies");
    expect(content).toContain("Data Security");
  });

  test("terms page loads with required content", async ({ page }) => {
    await page.goto("/terms", { waitUntil: "domcontentloaded" });

    const h1 = page.locator("h1");
    await expect(h1).toContainText("Terms of Service");

    // Should have key sections
    const content = await page.textContent("main");
    expect(content).toContain("Acceptance of Terms");
    expect(content).toContain("Warranties");
    expect(content).toContain("Governing Law");
  });
});
