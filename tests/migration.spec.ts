import { test, expect } from "@playwright/test";

const BASE = "http://localhost:4321";

const keyPages = [
  "/",
  "/services",
  "/services/roof-replacement",
  "/areas",
  "/areas/christiansburg",
  "/blog",
  "/financing",
  "/contact",
  "/gallery",
];

test.describe("Migration readiness checks", () => {
  for (const path of keyPages) {
    test(`${path} has no noindex meta tag`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count();
      expect(noindex, `${path} has noindex tag`).toBe(0);
    });
  }

  for (const path of keyPages) {
    test(`${path} has self-referencing canonical URL`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toBeTruthy();
      // Canonical should end with the current path (or be the full URL)
      const url = new URL(canonical!);
      expect(url.pathname).toBe(path === "/" ? "/" : path);
    });
  }

  for (const path of keyPages) {
    test(`${path} has valid parseable JSON-LD`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(scripts.length, `${path} should have at least one JSON-LD block`).toBeGreaterThan(0);
      for (const script of scripts) {
        expect(() => JSON.parse(script)).not.toThrow();
      }
    });
  }

  test("404 page returns HTTP 404 status code", async ({ page }) => {
    const response = await page.goto(`${BASE}/this-page-does-not-exist-abc123`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
  });
});
