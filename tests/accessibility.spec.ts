import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", name: "Homepage" },
  { path: "/services/roof-replacement", name: "Service detail" },
  { path: "/areas/christiansburg", name: "Area detail" },
  { path: "/contact", name: "Contact" },
];

test.describe("Accessibility", () => {
  for (const page of pages) {
    test(`${page.name} - skip-to-content link works`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: "domcontentloaded" });

      const skipLink = p.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);

      const mainContent = p.locator("#main-content");
      await expect(mainContent).toHaveCount(1);
    });

    test(`${page.name} - all images have alt text`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: "domcontentloaded" });

      const images = p.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute("alt");
        const src = await img.getAttribute("src");
        // alt can be empty string (decorative) but must be present
        expect(
          alt !== null,
          `Image ${src} should have alt attribute`
        ).toBe(true);
      }
    });
  }

  test("Contact form has proper labels", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    // Every input/textarea inside a form should have an associated label
    const inputs = page.locator("form input:not([type='hidden']):not([aria-hidden='true']), form textarea");
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelCount = await label.count();
        expect(
          labelCount,
          `Input #${id} should have an associated label`
        ).toBeGreaterThan(0);
      }
    }
  });

  test("Homepage - keyboard tab order includes main interactive elements", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab through and verify we can reach key elements
    await page.keyboard.press("Tab"); // skip link
    const skipLink = page.locator(":focus");
    const href = await skipLink.getAttribute("href");
    expect(href).toBe("#main-content");
  });
});
