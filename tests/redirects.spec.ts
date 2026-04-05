import { test, expect } from "@playwright/test";

/**
 * WordPress → Astro 301 redirect tests.
 * These verify vercel.json redirects resolve correctly.
 * Note: Redirects are handled by Vercel at the edge, so these tests
 * should be run against the deployed preview/production URL.
 * Locally they verify the redirect config is parseable.
 */

const redirects = [
  { from: "/home/", to: "/" },
  { from: "/contact-us/", to: "/contact" },
  { from: "/services/", to: "/services" },
  { from: "/roof-replacement/", to: "/services/roof-replacement" },
  { from: "/roof-repair/", to: "/services/roof-repair" },
  { from: "/roof-inspections-and-safety/", to: "/services/roof-maintenance" },
  { from: "/blog/", to: "/blog" },
  { from: "/faqs/", to: "/" },
  { from: "/local-roofing-services/", to: "/areas" },
  { from: "/roanoke/", to: "/areas/roanoke" },
  { from: "/radford/", to: "/areas/radford" },
  { from: "/pulaski/", to: "/areas/pulaski" },
  { from: "/christiansburg-roofing-company/", to: "/areas/christiansburg" },
  { from: "/blacksburg-roofing-company/", to: "/areas/blacksburg" },
  { from: "/salem-roofing-company/", to: "/areas/salem" },
  { from: "/floyd-roofing-company/", to: "/areas/floyd" },
  { from: "/wytheville-roofing-company/", to: "/areas/wytheville" },
  { from: "/troutville-roofing-company/", to: "/areas/troutville" },
  { from: "/smith-mountain-lake-roofing-company/", to: "/areas/smith-mountain-lake" },
  { from: "/privacy-policy/", to: "/privacy" },
  { from: "/sitemap/", to: "/sitemap-index.xml" },
  { from: "/referral-program/", to: "/" },
  { from: "/roofgiveaway2026/", to: "/" },
  { from: "/roanokehomeandgardengiveaway/", to: "/" },
  { from: "/feed/", to: "/" },
  { from: "/comments/feed/", to: "/" },
  { from: "/testimonials/", to: "/reviews" },
];

test.describe("301 Redirects - vercel.json config", () => {
  test("vercel.json contains all required redirects", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve("vercel.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config.redirects).toBeDefined();
    expect(Array.isArray(config.redirects)).toBe(true);

    for (const redirect of redirects) {
      const match = config.redirects.find(
        (r: any) => r.source === redirect.from && r.destination === redirect.to
      );
      expect(match, `Missing redirect: ${redirect.from} → ${redirect.to}`).toBeTruthy();
      expect(match.permanent).toBe(true);
    }
  });

  test("wildcard redirect for custom-testimonial pages", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve("vercel.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const wildcard = config.redirects.find(
      (r: any) => r.source === "/custom-testimonial/:path*"
    );
    expect(wildcard, "Missing wildcard redirect for /custom-testimonial/*").toBeTruthy();
    expect(wildcard.destination).toBe("/");
    expect(wildcard.permanent).toBe(true);
  });

  test("WordPress infrastructure wildcard redirects in vercel.json", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve("vercel.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const wpRedirects = [
      { source: "/wp-login.php", destination: "/" },
      { source: "/wp-admin/:path*", destination: "/" },
      { source: "/wp-includes/:path*", destination: "/" },
      { source: "/wp-content/:path*", destination: "/" },
      { source: "/xmlrpc.php", destination: "/" },
    ];

    for (const expected of wpRedirects) {
      const match = config.redirects.find(
        (r: any) => r.source === expected.source && r.destination === expected.destination
      );
      expect(match, `Missing WP redirect: ${expected.source} → ${expected.destination}`).toBeTruthy();
      expect(match.permanent).toBe(true);
    }
  });

  test("pagination pattern redirect exists in vercel.json", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve("vercel.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const pagination = config.redirects.find(
      (r: any) => r.source.includes("page/") && r.source.includes(":num")
    );
    expect(pagination, "Missing pagination redirect pattern").toBeTruthy();
    expect(pagination.permanent).toBe(true);
  });

  test("query parameter middleware file exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const middlewarePath = path.resolve("src/middleware.ts");
    expect(fs.existsSync(middlewarePath), "src/middleware.ts should exist").toBe(true);
    const content = fs.readFileSync(middlewarePath, "utf-8");
    expect(content).toContain("searchParams");
    expect(content).toContain("redirect");
  });
});
