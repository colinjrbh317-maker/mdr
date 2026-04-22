import type { APIRoute } from "astro";

/**
 * Returns the number of inspection slots remaining this week.
 *
 * Uses a time-of-week decay so the number looks real without external queries.
 * Cached 10 minutes in-memory per edge instance.
 */

export const prerender = false;

const CAPACITY_PER_WEEK = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CapacityResult {
  slots_left: number;
  display: string;
  urgency: "low" | "medium" | "high";
  source: "fallback" | "cache";
}

let cache: { result: CapacityResult; cached_at: number } | null = null;

function getIsoWeekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function fallbackSlotsLeft(): number {
  const weekStart = getIsoWeekStart();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - weekStart.getTime();
  const fractionUsed = Math.min(1, Math.max(0, elapsed / weekMs));
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

  const result = buildResult(fallbackSlotsLeft(), "fallback");
  cache = { result, cached_at: Date.now() };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=1800",
    },
  });
};
