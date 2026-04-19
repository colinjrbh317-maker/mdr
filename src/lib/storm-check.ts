/**
 * Client helper that fetches /api/storm-check and caches the result in
 * sessionStorage. Safe to call multiple times — only one fetch per session.
 */

import { track } from "./track-events";

export interface StormAlert {
  recent_storm: boolean;
  event_type?: "hail" | "wind" | "tornado";
  date?: string;
  severity?: string;
  location?: string;
  visitor_city?: string;
}

const CACHE_KEY = "mdr_storm_alert";
const FETCH_FLAG = "mdr_storm_fetching";

let inflight: Promise<StormAlert> | null = null;

export function readCachedAlert(): StormAlert | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StormAlert;
  } catch {
    return null;
  }
}

export async function fetchStormAlert(forceUrl?: string): Promise<StormAlert> {
  if (typeof window === "undefined") return { recent_storm: false };

  const cached = readCachedAlert();
  if (cached) return cached;
  if (inflight) return inflight;

  const fetchUrl = forceUrl || "/api/storm-check";

  inflight = (async () => {
    try {
      sessionStorage.setItem(FETCH_FLAG, "1");
      const res = await fetch(fetchUrl, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error("storm-check request failed");
      const data = (await res.json()) as StormAlert;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        // non-fatal
      }
      if (data.recent_storm) {
        track("storm_alert_detected", {
          event_type: data.event_type,
          severity: data.severity,
          city: data.visitor_city || "",
        });
      }
      return data;
    } catch {
      const empty: StormAlert = { recent_storm: false };
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(empty));
      } catch {
        // non-fatal
      }
      return empty;
    } finally {
      sessionStorage.removeItem(FETCH_FLAG);
      inflight = null;
    }
  })();

  return inflight;
}

/** Format a YYYYMMDD date string as a short "Mon D" label. */
export function formatStormDate(dateStr?: string): string {
  if (!dateStr || dateStr.length !== 8) return "";
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
