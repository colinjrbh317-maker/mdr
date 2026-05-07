import { test, expect, Page } from "@playwright/test";

// Comprehensive audit of Alicia's review changes. Each test is independent so
// failures pinpoint exactly which change regressed.

const BASE = "http://127.0.0.1:4321";

async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).toLowerCase();
}

test.describe("Reviews + rating", () => {
  test("homepage shows 270+ reviews and 5.0 rating, no 231 / 4.9", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const html = await page.content();
    expect(html).not.toMatch(/231\+|231 Five-Star|231 reviews|231 homeowners/);
    expect(html).not.toMatch(/4\.9 Rating|4\.9 out of 5|4\.9-Star/);
    expect(html).toMatch(/270\+|270 Five-Star|270 reviews/);
    expect(html).toMatch(/5\.0/);
  });

  test("about page reads 270+ Five-Star Reviews not 1,000+ Roofs Completed", async ({ page }) => {
    await page.goto(`${BASE}/about`);
    const text = await bodyText(page);
    expect(text).toContain("270+");
    expect(text).toContain("five-star reviews");
    expect(text).not.toContain("1,000+");
    expect(text).not.toContain("roofs completed");
  });

  test("reviews page shows 270 not 231", async ({ page }) => {
    await page.goto(`${BASE}/reviews`);
    const text = await bodyText(page);
    expect(text).toContain("270");
    expect(text).not.toMatch(/\b231\b/);
  });

  test("offers/500-off updated", async ({ page }) => {
    await page.goto(`${BASE}/offers/500-off`);
    const text = await bodyText(page);
    expect(text).toContain("270+");
    expect(text).toContain("5.0");
    expect(text).not.toContain("4.9");
  });
});

test.describe("Stats removed (no 1,000+ roofs / 10,000+ squares)", () => {
  test("homepage TrustBar has new tiles and no Roofs/Squares", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const text = await bodyText(page);
    expect(text).toContain("gaf master elite");
    expect(text).toContain("lifetime warranty");
    expect(text).not.toContain("1,000+ roofs");
    expect(text).not.toContain("10,000+ squares");
  });

  test("homepage hero tagline has new GAF copy not 1,000+ roofs", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const text = await bodyText(page);
    expect(text).toMatch(/127 contractors|3-star president'?s club|gaf master elite . 270/i);
    expect(text).not.toContain("1,000+ roofs");
  });

  test("StatsCounter shows Five-Star Reviews + Top 2%", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const text = await bodyText(page);
    expect(text).toContain("five-star reviews");
    expect(text).toContain("top of roofers nationwide");
  });
});

test.describe("GAF copy clarified", () => {
  test("homepage FAQ explains Master Elite + 3-Star together", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Use raw HTML; the FAQ answer lives inside <details> blocks whose body
    // is collapsed by default and not returned by innerText().
    const html = await page.content();
    expect(html).toMatch(/top 2% of roofing contractors/i);
    expect(html).toMatch(/127 contractors/i);
    expect(html).not.toContain("only the top 1% of roofing contractors");
  });

  test("about page mentions 127 contractors instead of top 1%", async ({ page }) => {
    await page.goto(`${BASE}/about`);
    const text = await bodyText(page);
    expect(text).toMatch(/127 contractors/i);
  });
});

test.describe("Service areas restructured", () => {
  test("areas index lists Hollins, Cave Spring, Pearisburg", async ({ page }) => {
    await page.goto(`${BASE}/areas`);
    const text = await bodyText(page);
    expect(text).toContain("hollins");
    expect(text).toContain("cave spring");
    expect(text).toContain("pearisburg");
  });

  test("areas index does NOT list Lexington or Covington", async ({ page }) => {
    await page.goto(`${BASE}/areas`);
    const text = await bodyText(page);
    expect(text).not.toContain("lexington");
    expect(text).not.toContain("covington");
  });

  test("Lexington area page returns 404", async ({ page }) => {
    const res = await page.goto(`${BASE}/areas/lexington`);
    expect(res?.status()).toBe(404);
  });

  test("Covington area page returns 404", async ({ page }) => {
    const res = await page.goto(`${BASE}/areas/covington`);
    expect(res?.status()).toBe(404);
  });

  test("Hollins area page renders with hero photo", async ({ page }) => {
    const res = await page.goto(`${BASE}/areas/hollins`);
    expect(res?.status()).toBe(200);
    const heroImg = page.locator("section img").first();
    await expect(heroImg).toBeVisible();
  });

  test("Cave Spring area page renders", async ({ page }) => {
    const res = await page.goto(`${BASE}/areas/cave-spring`);
    expect(res?.status()).toBe(200);
  });

  test("Pearisburg area page renders", async ({ page }) => {
    const res = await page.goto(`${BASE}/areas/pearisburg`);
    expect(res?.status()).toBe(200);
  });
});

test.describe("Pinparrot map widget on location pages", () => {
  test("Christiansburg page contains Pinparrot widget script and section", async ({ page }) => {
    await page.goto(`${BASE}/areas/christiansburg`);
    const text = await bodyText(page);
    expect(text).toContain("recent christiansburg projects on the map");
    const script = page.locator('script#gb_widget_script');
    await expect(script).toHaveCount(1);
  });

  test("Pinparrot widget mount has no oversized whitespace before script", async ({ page }) => {
    await page.goto(`${BASE}/areas/christiansburg`);
    // The fix ensures no empty placeholder div with min-height before the script
    const placeholder = page.locator('div#gb-widget-mount');
    await expect(placeholder).toHaveCount(0);
  });

  test("Roanoke + Salem + Bedford each have the widget", async ({ page }) => {
    for (const slug of ["roanoke", "salem", "bedford"]) {
      await page.goto(`${BASE}/areas/${slug}`);
      const text = await bodyText(page);
      expect(text).toContain(`recent ${slug.replace("-", " ")} projects on the map`);
    }
  });
});

test.describe("Invisible buttons fix at bottom of /areas/[slug]", () => {
  test("Sibling-area pills on Blacksburg use white text on dark surface", async ({ page }) => {
    await page.goto(`${BASE}/areas/blacksburg`);
    // Find a sibling pill (link inside dark section)
    const pill = page.locator('a.rounded-full').filter({ hasText: /christiansburg|radford|pulaski|dublin|floyd|wytheville|pearisburg/i }).first();
    await expect(pill).toBeVisible();
    // Computed color must contain rgb white-ish, not text-text-muted gray
    const color = await pill.evaluate((el) => getComputedStyle(el).color);
    expect(color).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/i);
  });
});

test.describe("TimberSteel rename (was Timber Seal)", () => {
  test("Roof replacement page shows TimberSteel (Metal Shingle) child card", async ({ page }) => {
    await page.goto(`${BASE}/services/roof-replacement`);
    const text = await bodyText(page);
    expect(text).toContain("timbersteel (metal shingle)");
  });

  test("Service detail page H1 reads TimberSteel (Metal Shingle)", async ({ page }) => {
    // The legacy MobileMenu.astro file is not actually imported anywhere
    // (Navigation.astro has its own mobile-menu integration). The service
    // page itself is the authoritative place to verify the rename.
    await page.goto(`${BASE}/services/timber-seal`);
    const html = await page.content();
    expect(html).toContain("TimberSteel (Metal Shingle)");
  });

  test("Service detail page title reads TimberSteel", async ({ page }) => {
    await page.goto(`${BASE}/services/timber-seal`);
    const text = await bodyText(page);
    expect(text).toContain("timbersteel");
  });
});

test.describe("Storm + gutter photos use new Drive uploads", () => {
  test("storm-damage page uses new hail-storm-damage.webp", async ({ page }) => {
    await page.goto(`${BASE}/services/storm-damage`);
    const html = await page.content();
    expect(html).toMatch(/storm-damage\/hail-storm-damage\.webp|storm-damage\/hail-storm-damage\.png/);
  });

  test("gutters page uses new gutters-1.webp", async ({ page }) => {
    await page.goto(`${BASE}/services/gutters`);
    const html = await page.content();
    expect(html).toMatch(/gutters\/gutters-1\.webp|gutters\/gutters-1\.jpg/);
  });

  test("seamless-gutters uses gutters-2", async ({ page }) => {
    await page.goto(`${BASE}/services/seamless-gutters`);
    const html = await page.content();
    expect(html).toMatch(/gutters\/gutters-2\.webp|gutters\/gutters-2\.jpg/);
  });

  test("gutter-guards uses gutters-3", async ({ page }) => {
    await page.goto(`${BASE}/services/gutter-guards`);
    const html = await page.content();
    expect(html).toMatch(/gutters\/gutters-3\.webp|gutters\/gutters-3\.jpg/);
  });

  test("wind-damage-repair uses wind-damage.webp", async ({ page }) => {
    await page.goto(`${BASE}/services/wind-damage-repair`);
    const html = await page.content();
    expect(html).toMatch(/storm-damage\/wind-damage\.webp/);
  });

  test("hail-damage-repair uses hail-damage.webp", async ({ page }) => {
    await page.goto(`${BASE}/services/hail-damage-repair`);
    const html = await page.content();
    expect(html).toMatch(/storm-damage\/hail-damage\.webp/);
  });

  test("insurance-claims-help uses insurance-claim-help.webp", async ({ page }) => {
    await page.goto(`${BASE}/services/insurance-claims-help`);
    const html = await page.content();
    expect(html).toMatch(/storm-damage\/insurance-claim-help\.webp/);
  });
});

test.describe("Christiansburg uses the new (non-AI-other-company) hero photo", () => {
  test("Christiansburg references new local hero file", async ({ page }) => {
    await page.goto(`${BASE}/areas/christiansburg`);
    const html = await page.content();
    expect(html).toMatch(/areas\/christiansburg-hero\.webp|areas\/christiansburg-hero\.png/);
  });
});

test.describe("Facebook live feed on homepage", () => {
  test("homepage embeds the FB Page Plugin for moderndayroof", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const fbPage = page.locator('div.fb-page[data-href*="moderndayroof"]');
    await expect(fbPage).toHaveCount(1);
    // Astro dev mode can inject the SDK script twice (one in HTML, one re-run by HMR);
    // production build is 1. Either is acceptable.
    const sdk = page.locator('script[src*="connect.facebook.net"]');
    const count = await sdk.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });

  test("homepage shows 'Latest on Facebook' section heading", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const text = await bodyText(page);
    expect(text).toContain("latest on facebook");
  });
});

test.describe("Phone number consistency (source HTML, pre-CallRail-swap)", () => {
  // CallRail's swap.js dynamically replaces tel: links with tracking numbers
  // at runtime in the browser. Per Colin: that backend tracking is intentional.
  // We only audit the source HTML to ensure the canonical 540-553-6007 is
  // what ships from the server before any swap happens.
  const pages = ["/", "/about", "/contact", "/services/roof-replacement", "/areas/christiansburg"];
  for (const p of pages) {
    test(`${p} source HTML has only (540) 553-6007`, async ({ request }) => {
      const res = await request.get(`${BASE}${p}`);
      const html = await res.text();
      // Only match phone-FORMATTED strings (parens, dashes, dots, or tel: prefix).
      // Excludes raw 10-digit numeric strings like DJI image-filename timestamps.
      const phones = Array.from(
        html.matchAll(/\(\d{3}\)\s?\d{3}[-.\s]\d{4}|\b\d{3}-\d{3}-\d{4}\b|\b\d{3}\.\d{3}\.\d{4}\b|tel:\+?1?(\d{10})/g)
      ).map((m) => m[1] ? m[1] : m[0]);
      const distinct = [...new Set(phones)];
      const allowed = new Set([
        "(540) 553-6007",
        "540-553-6007",
        "5405536007",
        "540.553.6007",
        // form input placeholders
        "(540) 555-0123",
        "(540) 555-1234",
      ]);
      const stranger = distinct.filter((d) => !allowed.has(d));
      expect(stranger).toEqual([]);
    });
  }
});

test.describe("Mobile responsiveness spot checks", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("homepage hero + TrustBar render on iPhone 12 viewport", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const trustBar = page.locator("div").filter({ hasText: /5\.0 Rating/i }).first();
    await expect(trustBar).toBeVisible();
  });

  test("Christiansburg mobile: Pinparrot section appears", async ({ page }) => {
    await page.goto(`${BASE}/areas/christiansburg`);
    const heading = page.getByRole("heading", { name: /Recent Christiansburg Projects on the Map/i });
    await expect(heading).toBeVisible();
  });

  test("Blacksburg mobile: sibling pills are visible white-on-dark", async ({ page }) => {
    await page.goto(`${BASE}/areas/blacksburg`);
    const pill = page.locator('a.rounded-full').filter({ hasText: /christiansburg|radford/i }).first();
    await expect(pill).toBeVisible();
  });
});
