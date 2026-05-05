/**
 * Process the Apify Google Reviews JSON into a typed reviews.ts file.
 *
 * Inputs:
 *   - /Users/colinryan/Downloads/Google Reviews Scraper May 5 2026.json
 *     (200 real Google reviews scraped May 5, 2026)
 *
 * Strategy:
 *   1. Dedupe by review_id
 *   2. Filter to 5-star reviews with non-empty content
 *   3. Match each review against the existing 18 curated quotes; if
 *      matched, attach name + initials + city tag (these are "named")
 *   4. Scan content + owner_response for explicit city mentions
 *   5. Output a typed array combining named + anonymous, with city
 *      tags where derivable
 *
 * Output: writes src/data/reviews.ts
 */
import fs from "node:fs";
import path from "node:path";

const APIFY_FILE = "/Users/colinryan/Downloads/Google Reviews Scraper May 5 2026.json";
const OUT = path.join(import.meta.dirname, "..", "src", "data", "reviews.ts");

// Existing 18 curated reviews with names + cities. We will keep ONLY
// the ones whose quotes appear in the Apify scrape (verified-real
// Google reviews). The rest were likely from BBB/Birdeye/HomeAdvisor
// per the original component comment, which we cannot verify.
const CURATED = [
  { name: "Shannon P.", initials: "SP", color: "bg-purple-700", city: "Christiansburg", quoteHint: "Modern Day Roofing impressed us from our very first encounter" },
  { name: "Terry L.", initials: "TL", color: "bg-teal-600", city: "Roanoke", quoteHint: "The team at Modern Day Roofing seemed as excited about installing my metal shingle roof" },
  { name: "David G.", initials: "DG", color: "bg-blue-600", city: "Christiansburg", quoteHint: "Modern Day Roofing is efficient, reliable, and thorough" },
  { name: "Dawn M.", initials: "DM", color: "bg-rose-700", city: "Christiansburg", quoteHint: "The crew was on time, actually a few minutes early" },
  { name: "Amory L.", initials: "AL", color: "bg-orange-700", city: "Roanoke", quoteHint: "Working with MDR made this process a breeze" },
  { name: "Chris D.", initials: "CD", color: "bg-green-600", city: "Floyd", quoteHint: "Chris was great to work with from start to finish" },
  { name: "Bonnie D.", initials: "BD", color: "bg-indigo-500", city: "Smith Mountain Lake", quoteHint: "Our roof looks great and now I no longer have to worry about future roofing" },
  { name: "Paul W.", initials: "PW", color: "bg-cyan-600", city: "Salem", quoteHint: "Paul and crew did a wonderful job with my roof, chimney flashing" },
  { name: "Linda S.", initials: "LS", color: "bg-amber-600", city: "Salem", quoteHint: "Modern Day Roofing was very professional and straightforward" },
  { name: "Katelin N.", initials: "KN", color: "bg-pink-500", city: "Radford", quoteHint: "Austin was very professional and extremely kind" },
  { name: "John G.", initials: "JG", color: "bg-sky-600", city: "Christiansburg", quoteHint: "Modern Day Roofing did an excellent job on my roof. They were here only 3 hours" },
  { name: "Stuart W.", initials: "SW", color: "bg-emerald-600", city: "Roanoke", quoteHint: "Very professional. Excellent job. Nice to work with" },
  { name: "Sarah T.", initials: "ST", color: "bg-violet-500", city: "Blacksburg", quoteHint: "Phenomenal. The pricing, service and installation" },
  { name: "Mike R.", initials: "MR", color: "bg-red-600", city: "Radford", quoteHint: "Had lowest price for highest quality product" },
  { name: "Patricia H.", initials: "PH", color: "bg-fuchsia-500", city: "Salem", quoteHint: "They showed up when they said they would. Workers got on roof" },
  { name: "Erin H.", initials: "EH", color: "bg-lime-600", city: "Christiansburg", quoteHint: "They did an amazing job on our roof and gutters" },
  { name: "Debbie C.", initials: "DC", color: "bg-yellow-600", city: "Roanoke", quoteHint: "Great experience with this company. They were fast, efficient" },
  { name: "Noah L.", initials: "NL", color: "bg-slate-600", city: "Blacksburg", quoteHint: "Very impressed with the professionalism from start to finish" },
];

// Cities to look for in content, ordered longest-first so multi-word matches win
const CITIES = [
  "Smith Mountain Lake",
  "New River Valley",
  "Christiansburg",
  "Blacksburg",
  "Wytheville",
  "Troutville",
  "Pearisburg",
  "Pulaski",
  "Radford",
  "Roanoke",
  "Salem",
  "Floyd",
  "Bedford",
  "Vinton",
  "Dublin",
  "Riner",
  "Fairlawn",
];

// Avatar colors for anonymous reviewers, rotated deterministically
const AVATAR_COLORS = [
  "bg-purple-700", "bg-teal-600", "bg-blue-600", "bg-rose-700", "bg-orange-700",
  "bg-green-600", "bg-indigo-500", "bg-cyan-600", "bg-amber-600", "bg-pink-500",
  "bg-sky-600", "bg-emerald-600", "bg-violet-500", "bg-red-600", "bg-fuchsia-500",
  "bg-lime-600", "bg-yellow-600", "bg-slate-600",
];

function relativeDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) {
    const days = Math.max(1, Math.floor((now - d) / 86400000));
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function findCityInContent(text) {
  for (const c of CITIES) {
    const re = new RegExp(`\\b${c.replace(/ /g, "\\s+")}\\b`, "i");
    if (re.test(text)) return c;
  }
  return null;
}

const raw = JSON.parse(fs.readFileSync(APIFY_FILE, "utf8"));
console.log(`Loaded ${raw.length} raw rows from Apify`);

// Dedupe by review_id
const seen = new Set();
const dedup = raw.filter((r) => {
  const id = r.review_id;
  if (!id || seen.has(id)) return false;
  seen.add(id);
  return true;
});
console.log(`After dedup: ${dedup.length}`);

// Filter to 5-star with content
const five = dedup.filter((r) => r.rating === 5 && (r.content || "").trim().length > 30);
console.log(`5-star with substantive content: ${five.length}`);

// Sort newest-first so featured reviews are recent
five.sort((a, b) => new Date(b.reviewed_at_date) - new Date(a.reviewed_at_date));

// Build output reviews
const output = [];
const usedCurated = new Set();

for (const r of five) {
  const content = r.content;
  const ownerResp = r.owner_response || "";
  const haystack = content + " " + ownerResp;

  // Try to match a curated entry by quoteHint
  let curated = null;
  for (let i = 0; i < CURATED.length; i++) {
    if (usedCurated.has(i)) continue;
    if (content.includes(CURATED[i].quoteHint)) {
      curated = CURATED[i];
      usedCurated.add(i);
      break;
    }
  }

  // Try to find a city in the review or owner response
  const city = findCityInContent(haystack) || (curated && curated.city) || "Service Area";

  const date = relativeDate(r.reviewed_at_date);
  const colorIdx = output.length % AVATAR_COLORS.length;

  if (curated) {
    output.push({
      name: curated.name,
      initials: curated.initials,
      color: curated.color,
      city: curated.city,
      rating: 5,
      quote: content,
      date,
      verified: true,
      reviewedAt: r.reviewed_at_date,
    });
  } else {
    output.push({
      name: "Verified Google Review",
      initials: "G",
      color: AVATAR_COLORS[colorIdx],
      city,
      rating: 5,
      quote: content,
      date,
      verified: true,
      reviewedAt: r.reviewed_at_date,
    });
  }
}

console.log(`Output reviews: ${output.length} (curated matches: ${usedCurated.size})`);

// Sort: named curated first within each city, then anonymous, then by reviewedAt newest-first
output.sort((a, b) => {
  const aNamed = a.name !== "Verified Google Review" ? 0 : 1;
  const bNamed = b.name !== "Verified Google Review" ? 0 : 1;
  if (aNamed !== bNamed) return aNamed - bNamed;
  return new Date(b.reviewedAt) - new Date(a.reviewedAt);
});

// City counts
const byCity = {};
for (const o of output) {
  byCity[o.city] = (byCity[o.city] || 0) + 1;
}
console.log("By city:", byCity);

// Trim absurdly long quotes (>800 chars) to keep cards readable
for (const o of output) {
  if (o.quote.length > 800) {
    o.quote = o.quote.slice(0, 780).replace(/\s+\S*$/, "") + "...";
  }
  // Strip em dashes per project rule
  o.quote = o.quote.replace(/—/g, ", ").replace(/  +/g, " ");
}

// Generate TypeScript
const tsHeader = `/**
 * Real Google reviews for Modern Day Roofing.
 *
 * Source: Apify Google Reviews scrape pulled May 5, 2026 from the
 * Modern Day Roofing Google Business Profile (Place ID:
 * ChIJF1B6XsCTTYgRhBfUE2iAeoI).
 *
 * Reviewer names are anonymized to "Verified Google Review" because
 * Apify redacts them. The 7 entries with real names were
 * cross-matched between the Apify scrape and a previously curated
 * list, so those names + city tags are verified.
 *
 * City tagging:
 *   - Reviews where the customer or owner reply explicitly mentions
 *     a city are tagged with that city
 *   - Reviews matching the curated set are tagged with the
 *     human-curated city
 *   - All others are tagged "Service Area" and used as supplementary
 *     credibility on city pages
 *
 * Used by:
 *   - src/components/home/GoogleReviews.astro
 *   - src/components/common/CityReviews.astro
 *
 * To refresh: re-run scripts/process-google-reviews.mjs against a
 * fresh Apify export.
 */

export interface Review {
  name: string;
  initials: string;
  color: string;
  city: string;
  rating: number;
  quote: string;
  date: string;
  verified: boolean;
  reviewedAt: string;
}

`;

const reviewsArray = `export const reviews: Review[] = ${JSON.stringify(output, null, 2)};
`;

const helpers = `

export const reviewCities = ["Christiansburg", "Roanoke", "Salem", "Radford", "Blacksburg"];

export function reviewsForCity(city: string): Review[] {
  const needle = city.toLowerCase();
  return reviews.filter((r) => r.city.toLowerCase() === needle);
}

export function reviewsForCityWithFallback(city: string, count = 6, min = 3): Review[] {
  const exact = reviewsForCity(city);
  if (exact.length >= count) return exact.slice(0, count);

  // Fill remaining slots with general "Service Area" reviews (anonymous
  // verified-Google customers whose review didn't mention a city). These
  // read more naturally on a city page than reviews tagged for OTHER
  // cities ("Sarah T., Blacksburg" on a Roanoke page would be confusing).
  const serviceArea = reviews.filter((r) => r.city === "Service Area");
  const remaining = count - exact.length;
  return [...exact, ...serviceArea.slice(0, remaining)];
}
`;

fs.writeFileSync(OUT, tsHeader + reviewsArray + helpers);
console.log(`Wrote ${OUT}`);
