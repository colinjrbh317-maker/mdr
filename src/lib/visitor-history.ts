/**
 * Cross-session visitor history for return-visitor tiering.
 *
 * At the end of each session (pagehide / beforeunload) we snapshot the
 * session's engagement depth and derive an "earned_tier". The next session
 * reads that tier from localStorage and uses it to unlock offers.
 *
 * Key idea: "return visitor" is not enough. A bounce returning once is
 * still cold. Earned-hot requires at least one prior-session signal that
 * actually looks like shopping intent.
 *
 * Earned HOT on return if the PRIOR session had any of:
 *   - Viewed 2+ service pages
 *   - Viewed 2+ area pages (or 2+ service+area combined)
 *   - Clicked a tel: link
 *   - Started a form (focused any field)
 *   - Spent 180s+ on a service or area page
 *   - Visited /offers/* or /financing
 */

const HISTORY_KEY = "mdr_visitor_history";
const SESSION_KEY = "mdr_session_state";
const MAX_SESSIONS = 5;

interface StoredSession {
  started_at: number;
  ended_at: number;
  pages_viewed: number;
  service_pages: string[];
  area_pages: string[];
  phone_clicks: number;
  form_started: boolean;
  visited_offers: boolean;
  visited_financing: boolean;
  max_time_on_service_ms: number;
}

interface History {
  sessions: StoredSession[];
  earned_tier: "cold" | "warm" | "hot";
  last_seen_at: number;
}

function readHistory(): History {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { sessions: [], earned_tier: "cold", last_seen_at: 0 };
    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      earned_tier:
        parsed.earned_tier === "hot" || parsed.earned_tier === "warm" ? parsed.earned_tier : "cold",
      last_seen_at: Number(parsed.last_seen_at) || 0,
    };
  } catch {
    return { sessions: [], earned_tier: "cold", last_seen_at: 0 };
  }
}

function sessionQualifiesHot(s: StoredSession): boolean {
  if (s.phone_clicks > 0) return true;
  if (s.form_started) return true;
  if (s.visited_offers) return true;
  if (s.service_pages.length >= 2) return true;
  if (s.area_pages.length >= 2) return true;
  if (s.service_pages.length + s.area_pages.length >= 2) return true;
  if (s.max_time_on_service_ms >= 180_000) return true;
  if (s.visited_financing && s.pages_viewed >= 2) return true;
  return false;
}

function sessionQualifiesWarm(s: StoredSession): boolean {
  if (s.pages_viewed >= 3) return true;
  if (s.visited_financing) return true;
  if (s.max_time_on_service_ms >= 60_000) return true;
  return false;
}

/** Snapshot the current sessionStorage state into localStorage history. */
export function snapshotSession(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const snapshot: StoredSession = {
      started_at: s.started_at || Date.now(),
      ended_at: Date.now(),
      pages_viewed: s.pages_viewed || 0,
      service_pages: Array.isArray(s.service_pages) ? s.service_pages : [],
      area_pages: Array.isArray(s.area_pages) ? s.area_pages : [],
      phone_clicks: s.phone_clicks || 0,
      form_started: !!s.form_started,
      visited_offers: !!s.visited_offers,
      visited_financing: !!s.visited_financing,
      max_time_on_service_ms: s.max_time_on_service_ms || 0,
    };

    // Discard empty/bounce sessions (no pageview events recorded)
    if (snapshot.pages_viewed === 0) return;

    const history = readHistory();
    history.sessions.push(snapshot);
    if (history.sessions.length > MAX_SESSIONS) {
      history.sessions = history.sessions.slice(-MAX_SESSIONS);
    }
    history.last_seen_at = snapshot.ended_at;

    // Recompute earned tier from the most recent session
    if (sessionQualifiesHot(snapshot)) history.earned_tier = "hot";
    else if (history.earned_tier !== "hot" && sessionQualifiesWarm(snapshot))
      history.earned_tier = "warm";
    // Never downgrade earned_tier within the retention window

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Quota exhausted / private mode — non-fatal
  }
}

/** Read the visitor's earned tier from prior sessions. */
export function getEarnedTier(): "cold" | "warm" | "hot" {
  if (typeof window === "undefined") return "cold";
  return readHistory().earned_tier;
}

/** Has this visitor been here before (any prior session recorded). */
export function isReturningVisitor(): boolean {
  if (typeof window === "undefined") return false;
  return readHistory().sessions.length > 0;
}

/**
 * Install the snapshot listener. Runs once per page. Snapshots fire on
 * pagehide (mobile-friendly) and beforeunload (desktop fallback).
 */
export function installSessionSnapshot(): void {
  if (typeof window === "undefined") return;
  let snapped = false;
  const snap = () => {
    if (snapped) return;
    snapped = true;
    snapshotSession();
  };
  window.addEventListener("pagehide", snap, { once: true });
  window.addEventListener("beforeunload", snap, { once: true });
}
