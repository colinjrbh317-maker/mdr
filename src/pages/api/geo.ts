import type { APIRoute } from "astro";

export const prerender = false;

// Only return a city if it's in Alicia's actual service area. IP geolocation
// is often wildly wrong for mobile traffic (Verizon/AT&T routes through
// Ashburn/Leesburg), so whitelisting prevents showing a city we don't serve.
// For PPC traffic, the Google Ads `?city={LOCATION(City)}` ValueTrack param
// is always the source of truth and overrides this fallback.
const SERVICE_AREA_CITIES = new Set([
  "christiansburg",
  "blacksburg",
  "radford",
  "roanoke",
  "salem",
  "vinton",
  "bedford",
  "troutville",
  "daleville",
  "hollins",
  "cave spring",
  "floyd",
  "pulaski",
  "dublin",
  "lexington",
  "covington",
  "wytheville",
  "smith mountain lake",
  "moneta",
  "rocky mount",
  "fincastle",
  "buchanan",
  "new river valley",
]);

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export const GET: APIRoute = ({ request }) => {
  const rawCity = request.headers.get("x-vercel-ip-city") || "";
  const region = request.headers.get("x-vercel-ip-country-region") || "";
  const country = request.headers.get("x-vercel-ip-country") || "";

  const decoded = rawCity ? decodeURIComponent(rawCity) : "";
  const sanitized = decoded.replace(/[^a-zA-Z .'-]/g, "").trim().slice(0, 40);
  const normalized = normalize(sanitized);

  // Only return the city if it's in Virginia AND in our service area
  const inServiceArea = SERVICE_AREA_CITIES.has(normalized);
  const isVirginia = region === "VA" || country === "US";

  const city = inServiceArea && isVirginia ? sanitized : "";

  return new Response(
    JSON.stringify({
      city,
      region,
      country,
      // Debug info (safe to expose; no PII)
      detected: sanitized || null,
      inServiceArea,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Short cache so geo updates quickly if user moves
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
};
