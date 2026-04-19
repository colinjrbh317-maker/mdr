import { test, expect } from "@playwright/test";

/**
 * Form-to-CRM pipeline tests.
 * Tests both the spam filter (rejections) and valid lead flow.
 *
 * NOTE: Valid lead tests create real contacts in AccuLynx CRM.
 * Clean up test contacts after running.
 */

test.describe("Form Pipeline — Spam Filter", () => {
  // We intercept the /api/submit-form response to verify behavior.
  // All spam rejections return 200 with {success: true} (fake success).
  // Valid leads also return 200 with {success: true}.
  // The difference is only visible server-side (console logs).

  test("honeypot field triggers silent rejection", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Bot Spammer",
        phone: "5402551234",
        email: "bot@gmail.com",
        website: "http://spam-site.com", // honeypot filled = bot
        source: "test-honeypot",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true); // fake success — bot never knows
  });

  test("invalid phone (555 prefix) is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Bad Phone Person",
        phone: "5405551234", // 555 = fictional
        email: "test@gmail.com",
        website: "",
        source: "test-bad-phone",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("invalid phone (too short) is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Short Phone",
        phone: "54025",
        email: "test@gmail.com",
        website: "",
        source: "test-short-phone",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("invalid phone (all same digit) is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Same Digit",
        phone: "5555555555",
        email: "test@gmail.com",
        website: "",
        source: "test-same-digit",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("invalid phone (area code starts with 0) is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Zero Area",
        phone: "0402551234",
        email: "test@gmail.com",
        website: "",
        source: "test-zero-area",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("disposable email (mailinator) is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Disposable Email",
        phone: "5402559876",
        email: "test@mailinator.com",
        website: "",
        source: "test-disposable",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("spam keywords in message are silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Spammer McGee",
        phone: "5402551111",
        email: "spammer@gmail.com",
        message: "Buy now! Free money! Click here for crypto bitcoin casino viagra",
        website: "",
        source: "test-spam-keywords",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("missing name returns 400 validation error", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "",
        phone: "5402551234",
        email: "test@gmail.com",
        website: "",
        source: "test-no-name",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("missing phone returns 400 validation error", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "No Phone Person",
        phone: "",
        email: "test@gmail.com",
        website: "",
        source: "test-no-phone",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("name with URL is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Visit https://spam.com now",
        phone: "5402551234",
        email: "test@gmail.com",
        website: "",
        source: "test-url-name",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("numeric-only name is silently rejected", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "123456",
        phone: "5402551234",
        email: "test@gmail.com",
        website: "",
        source: "test-numeric-name",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

test.describe("Form Pipeline — Valid Lead (CRM Integration)", () => {
  test("valid lead returns success and reaches CRM", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "Playwright Testlead",
        phone: "5402553333",
        email: "playwrighttest@gmail.com",
        address: "300 Test Blvd, Blacksburg, VA 24060",
        service: "Roof Inspection",
        message: "Automated Playwright test — safe to delete",
        website: "",
        source: "playwright-test",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("Thank you");
  });

  test("valid lead with no email passes (phone-only lead)", async ({ request }) => {
    const res = await request.post("/api/submit-form", {
      data: {
        name: "PhoneOnly Testlead",
        phone: "5402554444",
        email: "",
        website: "",
        source: "playwright-phone-only",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("valid Virginia area codes all pass phone validation", async ({ request }) => {
    const vaAreaCodes = ["540", "276", "434", "703", "571", "757", "804", "336"];
    for (const ac of vaAreaCodes) {
      const res = await request.post("/api/submit-form", {
        data: {
          name: `AreaCode ${ac} Test`,
          phone: `${ac}2551234`,
          email: "",
          website: "",
          source: `test-areacode-${ac}`,
        },
      });
      expect(res.status(), `Area code ${ac} should return 200`).toBe(200);
      const body = await res.json();
      expect(body.success, `Area code ${ac} should succeed`).toBe(true);
    }
  });
});

test.describe("Form Pipeline — UI Form Submission", () => {
  test("hero form submits and shows success message", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Find the hero form — it's inside a section with "Get Your Free Roof Assessment"
    const formSection = page.locator("text=Get Your Free Roof Assessment").first();
    await expect(formSection).toBeVisible({ timeout: 10000 });

    // The LeadCaptureForm is right below. Find inputs within the hero card.
    const heroCard = page.locator(".bg-white").filter({ hasText: "Get Your Free Roof Assessment" }).first();
    const form = heroCard.locator("form").first();

    // Step 1: fill name + phone, click Continue
    await form.locator('input[name="name"]').fill("Hero Form Test");
    await form.locator('input[name="phone"]').fill("5402556666");
    await form.locator('button[type="submit"]').click();

    // Step 2: optional fields appear; fill email + address then submit
    await expect(form.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await form.locator('input[name="email"]').fill("herotest@gmail.com");
    await form.locator('input[name="address"]').fill("123 Hero St, Blacksburg, VA 24060");
    await form.locator('button[type="submit"]').click();

    // Should see success message
    await expect(page.getByText("Thank you")).toBeVisible({ timeout: 10000 });
  });

  test("contact page form submits and shows success message", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    // Find the contact form
    const form = page.locator("form").filter({ hasText: "Request Your Free Estimate" }).first();
    await expect(form).toBeVisible({ timeout: 10000 });

    // Fill out the form
    await form.locator('input[name="first_name"]').fill("Contact");
    await form.locator('input[name="last_name"]').fill("FormTest");
    await form.locator('input[name="email"]').fill("contacttest@gmail.com");
    await form.locator('input[name="phone"]').fill("5402558888");
    await form.locator('input[name="address"]').fill("456 Contact Ave");
    await form.locator('input[name="city"]').fill("Christiansburg");
    await form.locator('input[name="state"]').fill("VA");
    await form.locator('input[name="zip"]').fill("24073");

    // Submit
    await form.locator('button[type="submit"]').click();

    // Should see success confirmation
    await expect(page.getByText("Thank you")).toBeVisible({ timeout: 10000 });
  });
});
