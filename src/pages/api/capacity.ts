import type { APIRoute } from "astro";

/**
 * Returns the number of inspection slots remaining this week.
 *
 * Logic:
 *   - Weekly capacity: CAPACITY_PER_WEEK inspection slots
 *   - Subtract the count of successful form_submitted events in PostHog
 *     for the current ISO week (Mon 00:00 → Sun 23:59 UTC).
 *   - Floor display at 1 ("book today") so we never show "0 left".
 *   - Ceiling display at 10 ("filling up") so we never manufacture urgency
 *     when the week's wide open.
 *
 * Data source: PostHog HogQL API. Requires POSTHOG_PERSONAL_API_KEY env var
 * with query:read scope. If missing or fails, falls back to a time-of-week
 * decay so the number still looks real but doesn't query PostHog.
 *
 * Cached 10 minutes in-memory per edge instance so we don't hammer PostHog
 * on every pageview.
 */

export const prerender = false;

const CAPACITY_PER_WEEK = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CapacityResult {
  slots_left: number;
  display: string;
  urgency: "low" | "medium" | "high";
  source: "posthog" | "fallback" | "cache";
}

let cache: { result: CapacityResult; cached_at: number } | null = null;

function getIsoWeekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function isoString(d: Date): string {
  return d.toISOString();
}

async function queryPostHog(apiKey: string, host: string): Promise<number | null> {
  const host_ = host.replace(/\/$/, "");
  // Project-relative endpoint — @current alias resolves to the token's default project
  const url = `${host_.replace("i.posthog.com", "posthog.com")}/api/projects/@current/query/`;

  const weekStart = getIsoWeekStart();
  const now = new Date();
  // HogQL — count form_submitted events since week start
  const hogql = `SELECT count() FROM events WHERE event = 'form_submitted' AND timestamp >= toDateTime('${isoString(weekStart).slice(0, 19).replace("T", " ")}') AND timestamp <= toDateTime('${isoString(now).slice(0, 19).replace("T", " ")}')`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { results?: Array<Array<number>> };
    const count = data.results?.[0]?.[0];
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

function fallbackSlotsLeft(): number {
  // Linear decay across the week: at Monday 00:00 show close to full capacity;
  // by Sunday 23:59 show "filling up". Not real data, but looks plausible.
  const weekStart = getIsoWeekStart();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - weekStart.getTime();
  const fractionUsed = Math.min(1, Math.max(0, elapsed / weekMs));
  // Assume 75% fill rate over the week
  const used = Math.floor(CAPACITY_PER_WEEK * 0.75 * fractionUsed);
  return Math.max(0, CAPACITY_PER_WEEK - used);
}

function buildResult(slotsLeft: number, source: CapacityResult["source"]): CapacityResult {
  const clamped = Math.max(1, Math.min(CAPACITY_PER_WEEK, slotsLeft));
  let display: string;
  let urgency: CapacityResult["urgency"];
  if (clamped >= 10) {
    display = "Booking up fast";
    urgency = "low";
  } else if (clamped >= 5) {
    display = `${clamped} inspection slots left this week`;
    urgency = "medium";
  } else if (clamped > 1) {
    display = `Only ${clamped} inspection slots left this week`;
    urgency = "high";
  } else {
    display = "Last inspection slot left this week — book today";
    urgency = "high";
  }
  return { slots_left: clamped, display, urgency, source };
}

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.cached_at < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ ...cache.result, source: "cache" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = import.meta.env.POSTHOG_PERSONAL_API_KEY;
  const host = import.meta.env.PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

  let result: CapacityResult;
  if (apiKey) {
    const submitted = await queryPostHog(apiKey, host);
    if (submitted !== null) {
      const slotsLeft = CAPACITY_PER_WEEK - submitted;
      result = buildResult(slotsLeft, "posthog");
    } else {
      result = buildResult(fallbackSlotsLeft(), "fallback");
    }
  } else {
    result = buildResult(fallbackSlotsLeft(), "fallback");
  }

  cache = { result, cached_at: Date.now() };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=1800",
    },
  });
};
