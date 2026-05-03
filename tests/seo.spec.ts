import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", name: "Homepage" },
  { path: "/services", name: "Services listing" },
  { path: "/services/roof-replacement", name: "Service detail" },
  { path: "/areas", name: "Areas listing" },
  { path: "/areas/christiansburg", name: "Area detail" },
  { path: "/blog", name: "Blog listing" },
  { path: "/contact", name: "Contact" },
  { path: "/gallery", name: "Gallery" },
  { path: "/privacy", name: "Privacy Policy" },
  { path: "/terms", name: "Terms of Service" },
];

test.describe("SEO essentials", () => {
  for (const page of pages) {
    test(`${page.name} (${page.path}) has required SEO tags`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: "domcontentloaded" });

      // <title> tag exists and is non-empty
      const title = await p.title();
      expect(title.length, `${page.path} should have a <title>`).toBeGreaterThan(0);

      // <meta name="description"> exists
      const desc = p.locator('meta[name="description"]');
      await expect(desc).toHaveCount(1);
      const descContent = await desc.getAttribute("content");
      expect(descContent?.length, `${page.path} should have meta description`).toBeGreaterThan(0);

      // <link rel="canonical"> exists
      const canonical = p.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);

      // og:image meta tag exists
      const ogImage = p.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveCount(1);
      const ogImageContent = await ogImage.getAttribute("content");
      expect(ogImageContent?.length, `${page.path} should have og:image`).toBeGreaterThan(0);

      // At least one H1 (CMS content blocks may add additional headings)
      const h1Count = await p.locator("h1").count();
      expect(h1Count, `${page.path} should have at least one H1`).toBeGreaterThanOrEqual(1);
    });
  }

  test("Homepage has Organization JSON-LD", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasOrg = scripts.some((s) => {
      const data = JSON.parse(s);
      const types = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
      return types.includes("Organization") || types.includes("RoofingContractor");
    });
    expect(hasOrg, "Homepage should have Organization JSON-LD").toBe(true);
  });

  test("Service detail page has Service JSON-LD", async ({ page }) => {
    await page.goto("/services/roof-replacement", { waitUntil: "domcontentloaded" });
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasService = scripts.some((s) => {
      const data = JSON.parse(s);
      return data["@type"] === "Service";
    });
    expect(hasService, "Service page should have Service JSON-LD").toBe(true);
  });

  test("Area detail page has LocalBusiness JSON-LD", async ({ page }) => {
    await page.goto("/areas/christiansburg", { waitUntil: "domcontentloaded" });
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasLocal = scripts.some((s) => {
      const data = JSON.parse(s);
      const types = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
      return types.includes("LocalBusiness");
    });
    expect(hasLocal, "Area page should have LocalBusiness JSON-LD").toBe(true);
  });
});

test.describe("Favicon", () => {
  test("Homepage has favicon link tags with correct sizes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const icon48 = page.locator('link[rel="icon"][sizes="48x48"]');
    await expect(icon48).toHaveCount(1);
    const href48 = await icon48.getAttribute("href");
    expect(href48).toBe("/favicon-48x48.png");

    const icon90 = page.locator('link[rel="icon"][sizes="90x90"]');
    await expect(icon90).toHaveCount(1);

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveCount(1);
    const appleHref = await appleIcon.getAttribute("href");
    expect(appleHref).toBe("/favicon-150x150.png");
  });

  test("Favicon PNG files return HTTP 200", async ({ request }) => {
    const r48 = await request.get("/favicon-48x48.png");
    expect(r48.status()).toBe(200);

    const r90 = await request.get("/favicon-90x90.png");
    expect(r90.status()).toBe(200);

    const r150 = await request.get("/favicon-150x150.png");
    expect(r150.status()).toBe(200);
  });
});

test.describe("Sitemap & robots.txt", () => {
  test("robots.txt is accessible and references sitemap", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const text = await page.textContent("body");
    expect(text).toContain("Sitemap:");
    expect(text).toContain("sitemap-index.xml");
  });

  test("sitemap-index.xml was generated at build time", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const sitemapPath = path.resolve("dist/client/sitemap-index.xml");
    expect(fs.existsSync(sitemapPath), "sitemap-index.xml should exist in build output").toBe(true);
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("sitemap");
  });
});
