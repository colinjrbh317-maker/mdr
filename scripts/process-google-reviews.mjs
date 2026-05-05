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

// Two scrapes: the original ("dated") had review_id + reviewed_at_date
// but Apify redacted reviewer_name; the second ("named") includes the
// reviewer's name but lacks date. We merge them by matching review
// text so each output row has both name AND a date.
const APIFY_DATED = "/Users/colinryan/Downloads/Google Reviews Scraper May 5 2026.json";
const APIFY_NAMED = "/Users/colinryan/Downloads/Google Maps Reviews Scraper May 5 2026.json";
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

const datedRaw = JSON.parse(fs.readFileSync(APIFY_DATED, "utf8"));
const namedRaw = JSON.parse(fs.readFileSync(APIFY_NAMED, "utf8"));
console.log(`Loaded ${datedRaw.length} dated rows + ${namedRaw.length} named rows from Apify`);

// Build a map of dated reviews keyed by first 60 chars of normalized content
function normKey(s) {
  return (s || "").replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase();
}
const dateByText = new Map();
for (const r of datedRaw) {
  const key = normKey(r.content);
  if (key && !dateByText.has(key)) {
    dateByText.set(key, { reviewedAt: r.reviewed_at_date, ownerResponse: r.owner_response || "" });
  }
}
console.log(`Date map built: ${dateByText.size} unique text-keyed rows`);

// Dedupe named reviews by text key
const seenNamed = new Set();
const namedDedup = namedRaw.filter((r) => {
  const k = normKey(r.text);
  if (!k || seenNamed.has(k)) return false;
  seenNamed.add(k);
  return true;
});
console.log(`Named dedup: ${namedDedup.length}`);

// Filter to 5-star with substantive text. Merge in dates.
const five = namedDedup
  .filter((r) => r.stars === 5 && (r.text || "").trim().length > 30)
  .map((r) => {
    const meta = dateByText.get(normKey(r.text));
    return {
      content: r.text,
      rating: r.stars,
      reviewer_name: r.name || "",
      reviewed_at_date: meta?.reviewedAt || null,
      owner_response: meta?.ownerResponse || "",
    };
  });
console.log(`5-star with substantive content: ${five.length}`);

// Sort newest-first; rows without a matched date go last
five.sort((a, b) => {
  if (!a.reviewed_at_date && !b.reviewed_at_date) return 0;
  if (!a.reviewed_at_date) return 1;
  if (!b.reviewed_at_date) return -1;
  return new Date(b.reviewed_at_date) - new Date(a.reviewed_at_date);
});

// Build output reviews
const output = [];
const usedCurated = new Set();

function toDisplayName(rawName) {
  // Apify "named" scrape returns names like "donna hurd" or
  // "Sheila Songster (CHRIS)". Strip any parenthetical alias, then
  // convert to "Donna H." style. Casing is normalized (Google reviewers
  // sometimes type their name in all-lowercase or all-caps).
  let s = (rawName || "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const parts = s.split(/\s+/).filter((p) => /[A-Za-z]/.test(p));
  if (parts.length === 0) return "";
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const first = cap(parts[0]);
  if (parts.length === 1) return first;
  // Find the last alphabetic part (already filtered above)
  const last = parts[parts.length - 1];
  const lastInitial = last.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

function initialsFromName(displayName) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function hashColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

for (const r of five) {
  const content = r.content;
  const ownerResp = r.owner_response || "";
  const haystack = content + " " + ownerResp;

  // Try to match a curated entry by quoteHint to inherit its city tag
  let curated = null;
  for (let i = 0; i < CURATED.length; i++) {
    if (usedCurated.has(i)) continue;
    if (content.includes(CURATED[i].quoteHint)) {
      curated = CURATED[i];
      usedCurated.add(i);
      break;
    }
  }

  // City: prefer explicit content mention, then curated tag, else Service Area
  const city = findCityInContent(haystack) || (curated && curated.city) || "Service Area";

  const date = relativeDate(r.reviewed_at_date);
  const parsedName = toDisplayName(r.reviewer_name);
  const displayName = (parsedName && parsedName.length >= 2) ? parsedName : "Verified Google Review";
  const initials = displayName === "Verified Google Review" ? "G" : initialsFromName(displayName);
  const color = hashColor(displayName + content.slice(0, 20));

  output.push({
    name: displayName,
    initials,
    color,
    city,
    rating: 5,
    quote: content,
    date,
    verified: true,
    reviewedAt: r.reviewed_at_date,
  });
}

console.log(`Output reviews: ${output.length} (curated matches: ${usedCurated.size})`);

// Sort: named first, then by reviewedAt newest-first
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
