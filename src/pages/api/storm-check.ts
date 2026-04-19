import type { APIRoute } from "astro";

/**
 * Storm proximity check — returns whether hail or damaging wind has hit
 * near the visitor's location in the last 14 days.
 *
 * Used by AnnouncementBar, ExitIntentPopup, and the hero to surface
 * emergency inspection messaging for genuinely affected visitors only.
 *
 * Data source: NOAA Storm Prediction Center daily archive (free, no key).
 * The SPC CSV archive is daily; we query the past 14 days and filter for
 * hail ≥1" or wind ≥58mph within ~50 miles of the visitor's city.
 *
 * Location: read from Vercel's x-vercel-ip-city / x-vercel-ip-latitude /
 * x-vercel-ip-longitude headers. Falls back to a static map of MDR's
 * core service areas when those aren't present (dev, non-US IPs).
 *
 * Caching: in-memory LRU per edge instance, 6h TTL. A cold fetch takes
 * ~1-2s; cached hits are instant.
 */

export const prerender = false;

interface StormResult {
  recent_storm: boolean;
  event_type?: "hail" | "wind" | "tornado";
  date?: string;
  severity?: string;
  location?: string;
  visitor_city?: string;
}

interface CacheEntry {
  result: StormResult;
  cached_at: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, CacheEntry>();

const SERVICE_AREA_FALLBACK: Record<string, { lat: number; lng: number; state: string }> = {
  christiansburg: { lat: 37.1299, lng: -80.409, state: "VA" },
  blacksburg: { lat: 37.2296, lng: -80.4139, state: "VA" },
  roanoke: { lat: 37.271, lng: -79.9414, state: "VA" },
  salem: { lat: 37.293, lng: -80.0548, state: "VA" },
  radford: { lat: 37.1318, lng: -80.5764, state: "VA" },
  floyd: { lat: 36.9114, lng: -80.3198, state: "VA" },
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDate(d: Date): string {
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${yr}${mo}${day}`;
}

function friendlyDate(dateStr: string): string {
  // dateStr format: YYYYMMDD
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

async function fetchSpcCsv(dateStr: string, type: "hail" | "wind" | "torn"): Promise<string | null> {
  const url = `https://www.spc.noaa.gov/climo/reports/${dateStr.slice(2)}_rpts_${type}.csv`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MDR-Site/1.0 (roofing storm alert)" },
      // Astro SSR fetch — no next revalidate opt but 6h in-memory cache above covers it
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

interface StormRow {
  size: number;
  lat: number;
  lng: number;
  comments: string;
}

function parseSpcRows(csv: string): StormRow[] {
  const lines = csv.split("\n").slice(1); // skip header
  const rows: StormRow[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    // SPC column order: Time, Size/Speed/F_Scale, Location, County, State, Lat, Lon, Comments
    if (cols.length < 7) continue;
    const size = Number(cols[1]);
    const lat = Number(cols[5]);
    const lng = Number(cols[6]);
    if (!Number.isFinite(size) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    rows.push({ size, lat, lng, comments: cols.slice(7).join(",") });
  }
  return rows;
}

async function findRecentStorm(lat: number, lng: number): Promise<StormResult> {
  const daysBack = 14;
  const now = new Date();

  const hailMinSize = 1.0; // inches
  const windMinMph = 58;
  const radiusMiles = 50;

  for (let d = 0; d < daysBack; d++) {
    const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = formatDate(day);

    // Try hail first — it's the most damaging for roofs
    const hailCsv = await fetchSpcCsv(dateStr, "hail");
    if (hailCsv) {
      const rows = parseSpcRows(hailCsv);
      for (const r of rows) {
        // SPC hail "size" column is tenths of an inch (e.g., 100 = 1.00")
        const inches = r.size / 100;
        if (inches < hailMinSize) continue;
        const dist = haversineMiles(lat, lng, r.lat, r.lng);
        if (dist <= radiusMiles) {
          return {
            recent_storm: true,
            event_type: "hail",
            date: dateStr,
            severity: `${inches.toFixed(2)}" hail`,
            location: r.comments.slice(0, 60).trim(),
          };
        }
      }
    }

    const windCsv = await fetchSpcCsv(dateStr, "wind");
    if (windCsv) {
      const rows = parseSpcRows(windCsv);
      for (const r of rows) {
        if (r.size < windMinMph) continue;
        const dist = haversineMiles(lat, lng, r.lat, r.lng);
        if (dist <= radiusMiles) {
          return {
            recent_storm: true,
            event_type: "wind",
            date: dateStr,
            severity: `${r.size}mph wind`,
            location: r.comments.slice(0, 60).trim(),
          };
        }
      }
    }
  }

  return { recent_storm: false };
}

export const GET: APIRoute = async ({ request, url }) => {
  // Dev override: ?storm=hail&city=Roanoke forces an alert for testing
  const forceStorm = url.searchParams.get("storm");
  const forceCity = url.searchParams.get("city");
  if (forceStorm) {
    return new Response(
      JSON.stringify({
        recent_storm: true,
        event_type: forceStorm === "wind" ? "wind" : "hail",
        date: formatDate(new Date()),
        severity: forceStorm === "wind" ? "65mph wind" : '1.25" hail',
        location: forceCity || "Christiansburg",
        visitor_city: forceCity || "Christiansburg",
      } as StormResult),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  // Try Vercel geo headers first
  const vercelCity = request.headers.get("x-vercel-ip-city") || "";
  const vercelLat = Number(request.headers.get("x-vercel-ip-latitude") || "");
  const vercelLng = Number(request.headers.get("x-vercel-ip-longitude") || "");

  let lat = 0;
  let lng = 0;
  let city = "";

  if (Number.isFinite(vercelLat) && Number.isFinite(vercelLng) && vercelLat !== 0) {
    lat = vercelLat;
    lng = vercelLng;
    city = decodeURIComponent(vercelCity || "").trim();
  } else {
    // Fallback: use Christiansburg as the default MDR home base
    const fallbackKey = (decodeURIComponent(vercelCity || "christiansburg").toLowerCase().trim()) || "christiansburg";
    const fallback = SERVICE_AREA_FALLBACK[fallbackKey] ?? SERVICE_AREA_FALLBACK.christiansburg;
    lat = fallback.lat;
    lng = fallback.lng;
    city = fallbackKey.charAt(0).toUpperCase() + fallbackKey.slice(1);
  }

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
    return new Response(
      JSON.stringify({ ...cached.result, visitor_city: city, cached: true }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  let result: StormResult;
  try {
    result = await findRecentStorm(lat, lng);
  } catch (e) {
    result = { recent_storm: false };
  }

  result.visitor_city = city;
  cache.set(cacheKey, { result, cached_at: Date.now() });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Let CDN cache successful responses for an hour
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=21600",
    },
  });
};
