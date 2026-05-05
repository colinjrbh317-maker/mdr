/**
 * Scrape Google Business Profile reviews for Modern Day Roofing.
 *
 * Uses the Google "search/local/reviews" deep-link which opens a
 * dedicated reviews page for a given Place ID, bypassing the
 * full Maps UI.
 *
 * Place ID: ChIJF1B6XsCTTYgRhBfUE2iAeoI
 *
 * Output: scripts/google-reviews.json
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PLACE_ID = "ChIJF1B6XsCTTYgRhBfUE2iAeoI";
const REVIEWS_URL = `https://search.google.com/local/reviews?placeid=${PLACE_ID}&hl=en&gl=US&sortBy=newestFirst`;
const OUTPUT = path.join(import.meta.dirname, "google-reviews.json");
const DEBUG_HTML = path.join(import.meta.dirname, "google-reviews-debug.html");
const DEBUG_SCREENSHOT = path.join(import.meta.dirname, "google-reviews-debug.png");
const TARGET_REVIEWS = 250;
const SCROLL_PASSES = 200;

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
    viewport: { width: 1400, height: 1000 },
  });

  const page = await context.newPage();

  console.log(`[1/4] navigating to ${REVIEWS_URL}`);
  await page.goto(REVIEWS_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);

  // Dismiss consent
  try {
    const consent = page.locator('button:has-text("Accept all"), button:has-text("I agree"), button[aria-label*="ccept"]').first();
    if (await consent.isVisible({ timeout: 2000 })) {
      console.log("[1/4] dismissed consent");
      await consent.click();
      await page.waitForTimeout(1500);
    }
  } catch {}

  await page.screenshot({ path: DEBUG_SCREENSHOT });

  console.log("[2/4] looking for review nodes");
  const initial = await page.evaluate(() => {
    return {
      reviewCount: document.querySelectorAll('[data-review-id], [jscontroller="e6Mltc"], div[data-hveid]').length,
      bodyTextStart: document.body.innerText.slice(0, 500),
    };
  });
  console.log(`[2/4] body starts: ${initial.bodyTextStart.slice(0, 200)}...`);
  console.log(`[2/4] candidate review nodes: ${initial.reviewCount}`);

  // Scroll the body / window to load more
  console.log(`[3/4] scrolling (target ~${TARGET_REVIEWS})`);
  let last = 0;
  let stable = 0;
  for (let i = 0; i < SCROLL_PASSES; i++) {
    await page.evaluate(() => {
      // Find scrollable element with reviews
      const candidates = document.querySelectorAll("div");
      for (const c of candidates) {
        const cs = getComputedStyle(c);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && c.scrollHeight > c.clientHeight + 200) {
          c.scrollBy(0, 2000);
          return;
        }
      }
      window.scrollBy(0, 2000);
    });
    await page.waitForTimeout(700);

    const count = await page.evaluate(() => document.querySelectorAll('span.A5yTVb, [data-review-id]').length);
    if (count >= TARGET_REVIEWS) {
      console.log(`[3/4] hit ${count}, stopping`);
      break;
    }
    if (count === last) {
      stable++;
      if (stable >= 8) {
        console.log(`[3/4] stable at ${count}, stopping`);
        break;
      }
    } else {
      stable = 0;
    }
    last = count;
    if (i % 5 === 0) console.log(`  pass ${i}: ${count} reviews`);
  }

  // Click any "More" buttons to expand truncated text
  console.log("[3/4] expanding truncated text");
  for (let i = 0; i < 4; i++) {
    const expanded = await page.evaluate(() => {
      let n = 0;
      // Common "More" expand button signatures
      document.querySelectorAll('button[aria-expanded="false"], a[aria-expanded="false"]').forEach((b) => {
        const t = b.textContent?.trim() || "";
        if (t === "More" || t === "Show more" || t === "See more") {
          try { b.click(); n++; } catch {}
        }
      });
      document.querySelectorAll('button').forEach((b) => {
        if (b.textContent?.trim() === "More" || b.textContent?.trim() === "Show more") {
          try { b.click(); n++; } catch {}
        }
      });
      return n;
    });
    if (expanded === 0) break;
    console.log(`  expanded ${expanded}`);
    await page.waitForTimeout(1000);
  }

  console.log("[4/4] extracting structured data");
  const reviews = await page.evaluate(() => {
    const out = [];
    // Each review's body text lives in span.A5yTVb. We walk up to a
    // common parent that also holds the reviewer name + rating + date.
    const textNodes = document.querySelectorAll("span.A5yTVb");
    textNodes.forEach((textEl) => {
      const text = textEl.textContent?.trim() || "";
      if (!text || text.length < 15) return;

      // Walk up to find a container that also has name + rating + date
      let container = textEl.parentElement;
      let walks = 0;
      while (container && walks < 8) {
        const hasName = container.querySelector('a[href*="contrib"], div.TSUbDb, span.Vpc5Fe, [class*="TSUbDb"]');
        const hasDate = container.querySelector('span.Ufkx2c, span[class*="dehysf"]') || /\d+\s+(month|year|week|day)s?\s+ago/.test(container.textContent || "");
        if (hasName && hasDate) break;
        container = container.parentElement;
        walks++;
      }
      if (!container) container = textEl.parentElement;

      // Reviewer name
      let name = "";
      const nameLink = container.querySelector('a[href*="contrib"]');
      if (nameLink) name = nameLink.textContent?.trim() || "";
      if (!name) {
        const nameEl = container.querySelector('div.TSUbDb, span.Vpc5Fe, [class*="TSUbDb"]');
        name = nameEl?.textContent?.trim() || "";
      }

      // Rating from "Rated X out of 5"
      let rating = null;
      const containerHTML = container.outerHTML;
      const ratedMatch = containerHTML.match(/Rated\s+(\d(?:\.\d)?)\s+out\s+of\s+5/i);
      if (ratedMatch) rating = parseFloat(ratedMatch[1]);

      // Date "X months ago"
      let date = "";
      const dateMatch = (container.textContent || "").match(/(\d+\s+(?:month|year|week|day)s?\s+ago|a\s+(?:month|year|week|day)\s+ago)/);
      if (dateMatch) date = dateMatch[1];

      out.push({ name, rating, date, text });
    });
    // Dedupe by text
    const seen = new Set();
    return out.filter((r) => {
      const key = r.text.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  console.log(`[4/4] extracted ${reviews.length} reviews`);
  if (reviews.length === 0) {
    console.log("[4/4] no reviews extracted, dumping debug HTML");
    fs.writeFileSync(DEBUG_HTML, await page.content());
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(reviews, null, 2));
  console.log(`saved to ${OUTPUT}`);

  await browser.close();
}

main().catch(async (err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
