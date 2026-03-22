import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("main nav links resolve without 404", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Get all nav links from the header
    const navLinks = await page
      .locator("header nav a[href]")
      .evaluateAll((links) =>
        links
          .map((a) => a.getAttribute("href"))
          .filter((href): href is string => !!href && href.startsWith("/"))
      );

    expect(navLinks.length).toBeGreaterThan(0);

    for (const href of navLinks) {
      const response = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(
        response?.status(),
        `Nav link ${href} should not be 404`
      ).not.toBe(404);
    }
  });

  test("footer links resolve without 404", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const footerLinks = await page
      .locator("footer a[href]")
      .evaluateAll((links) =>
        links
          .map((a) => a.getAttribute("href"))
          .filter(
            (href): href is string =>
              !!href &&
              href.startsWith("/") &&
              !href.startsWith("/studio") &&
              !href.startsWith("/sitemap") // XML sitemap, not HTML
          )
      );

    for (const href of footerLinks) {
      const response = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(
        response?.status(),
        `Footer link ${href} should not be 404`
      ).not.toBe(404);
    }
  });

  test("breadcrumb links work on service page", async ({ page }) => {
    await page.goto("/services/roof-replacement", { waitUntil: "domcontentloaded" });

    const breadcrumbLinks = await page
      .locator('nav[aria-label="Breadcrumb"] a[href]')
      .evaluateAll((links) =>
        links
          .map((a) => a.getAttribute("href"))
          .filter((href): href is string => !!href)
      );

    for (const href of breadcrumbLinks) {
      const response = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(
        response?.status(),
        `Breadcrumb link ${href} should not be 404`
      ).not.toBe(404);
    }
  });

  test("breadcrumb links work on area page", async ({ page }) => {
    await page.goto("/areas/christiansburg", { waitUntil: "domcontentloaded" });

    const breadcrumbLinks = await page
      .locator('nav[aria-label="Breadcrumb"] a[href]')
      .evaluateAll((links) =>
        links
          .map((a) => a.getAttribute("href"))
          .filter((href): href is string => !!href)
      );

    for (const href of breadcrumbLinks) {
      const response = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(
        response?.status(),
        `Breadcrumb link ${href} should not be 404`
      ).not.toBe(404);
    }
  });
});
