/**
 * Visitor intent tier resolver — classifies every session as cold | warm | hot.
 *
 * The tier controls which CRO offer is shown:
 *   - hot  → $500 discount (close the deal)
 *   - warm → free quote / inspection (reduce friction)
 *   - cold → financing or nothing (don't cheapen the anchor)
 *
 * Signals come from pageviews, clicks, form interactions, and prior sessions.
 * Tier is written to sessionStorage so every consumer (popups, sticky CTA,
 * chat widget) reads from the same source.
 *
 * Designed for the roofing vertical: someone viewing two service pages OR
 * clicking the phone OR starting a form is shopping, not browsing.
 */

import { track } from "./track-events";

export type Tier = "cold" | "warm" | "hot";

interface SessionState {
  started_at: number;
  pages_viewed: number;
  service_pages: Set<string>;
  area_pages: Set<string>;
  phone_clicks: number;
  form_started: boolean;
  visited_offers: boolean;
  visited_financing: boolean;
  max_time_on_service_ms: number;
  current_page_entered_at: number;
  current_path: string;
}

const SESSION_KEY = "mdr_session_state";
const TIER_KEY = "mdr_intent_tier";
const HISTORY_KEY = "mdr_visitor_history"; // Phase 5 will populate

let state: SessionState | null = null;
let initialized = false;

function loadState(): SessionState {
  if (state) return state;
  const raw = sessionStorage.getItem(SESSION_KEY);
  const now = Date.now();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state = {
        started_at: parsed.started_at ?? now,
        pages_viewed: parsed.pages_viewed ?? 0,
        service_pages: new Set(parsed.service_pages ?? []),
        area_pages: new Set(parsed.area_pages ?? []),
        phone_clicks: parsed.phone_clicks ?? 0,
        form_started: parsed.form_started ?? false,
        visited_offers: parsed.visited_offers ?? false,
        visited_financing: parsed.visited_financing ?? false,
        max_time_on_service_ms: parsed.max_time_on_service_ms ?? 0,
        current_page_entered_at: now,
        current_path: location.pathname,
      };
      return state;
    } catch {
      // fall through to fresh state
    }
  }
  state = {
    started_at: now,
    pages_viewed: 0,
    service_pages: new Set(),
    area_pages: new Set(),
    phone_clicks: 0,
    form_started: false,
    visited_offers: false,
    visited_financing: false,
    max_time_on_service_ms: 0,
    current_page_entered_at: now,
    current_path: location.pathname,
  };
  return state;
}

function persist(): void {
  if (!state) return;
  const serializable = {
    ...state,
    service_pages: Array.from(state.service_pages),
    area_pages: Array.from(state.area_pages),
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // quota / private mode — non-fatal
  }
}

function readPriorSessionEarnedHot(): boolean {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.earned_tier === "hot";
  } catch {
    return false;
  }
}

function resolveTier(): Tier {
  const s = loadState();

  // HOT signals
  if (s.phone_clicks > 0) return "hot";
  if (s.form_started) return "hot";
  if (s.visited_offers) return "hot";
  if (readPriorSessionEarnedHot()) return "hot";

  // WARM signals
  if (s.service_pages.size >= 2) return "warm";
  if (s.area_pages.size >= 2) return "warm";
  if (s.service_pages.size + s.area_pages.size >= 2) return "warm";
  if (s.max_time_on_service_ms >= 90_000) return "warm";
  if (s.visited_financing) return "warm";

  // COLD default
  return "cold";
}

function commitTier(reason: string): Tier {
  const tier = resolveTier();
  const prior = sessionStorage.getItem(TIER_KEY);
  try {
    sessionStorage.setItem(TIER_KEY, tier);
  } catch {
    // non-fatal
  }
  if (prior !== tier) {
    track("intent_tier_resolved", {
      tier,
      reason,
      previous_tier: prior || "none",
      path: location.pathname,
    });
  }
  return tier;
}

/**
 * Currently-resolved tier. Safe to call any time after init.
 * Returns "cold" on SSR.
 */
export function getTier(): Tier {
  if (typeof window === "undefined") return "cold";
  const stored = sessionStorage.getItem(TIER_KEY);
  if (stored === "hot" || stored === "warm" || stored === "cold") return stored;
  return "cold";
}

/** Record a phone-number click. Escalates tier to hot. */
export function recordPhoneClick(source: string = "unknown"): void {
  if (typeof window === "undefined") return;
  const s = loadState();
  s.phone_clicks += 1;
  persist();
  track("phone_click", { source, path: location.pathname });
  commitTier("phone_click");
}

/** Record that a user focused a form field (first time per session). */
export function recordFormStarted(formId: string): void {
  if (typeof window === "undefined") return;
  const s = loadState();
  if (s.form_started) return;
  s.form_started = true;
  persist();
  track("form_started", { form_id: formId, path: location.pathname });
  commitTier("form_started");
}

/**
 * Initialize on pageview. Idempotent across hot-reloads; safe to call once
 * per page from the Astro layout.
 */
export function initIntentTracking(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;

  const s = loadState();
  const path = location.pathname;

  // Record the pageview
  s.pages_viewed += 1;
  s.current_path = path;
  s.current_page_entered_at = Date.now();

  if (path.startsWith("/services/")) s.service_pages.add(path);
  if (path.startsWith("/areas/")) s.area_pages.add(path);
  if (path.startsWith("/offers/")) s.visited_offers = true;
  if (path === "/financing" || path.startsWith("/financing/")) s.visited_financing = true;

  persist();

  // Time-on-service tracker — fires tier re-check at 90s on a service page
  const isServiceLike = path.startsWith("/services/") || path.startsWith("/areas/");
  if (isServiceLike) {
    const checkpoint = setTimeout(() => {
      const now = Date.now();
      const st = loadState();
      const delta = now - st.current_page_entered_at;
      if (delta > st.max_time_on_service_ms) {
        st.max_time_on_service_ms = delta;
        persist();
        commitTier("service_90s");
      }
    }, 90_000);

    // Update max-time when leaving the page
    const finalize = () => {
      clearTimeout(checkpoint);
      const now = Date.now();
      const st = loadState();
      const delta = now - st.current_page_entered_at;
      if (delta > st.max_time_on_service_ms) {
        st.max_time_on_service_ms = delta;
        persist();
      }
    };
    window.addEventListener("beforeunload", finalize, { once: true });
    window.addEventListener("pagehide", finalize, { once: true });
  }

  // Global phone-click delegation — catches every tel: link on the page
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const source = anchor.getAttribute("data-source") || anchor.closest("[data-source]")?.getAttribute("data-source") || "page";
      recordPhoneClick(source);
    },
    { capture: true, passive: true }
  );

  commitTier("pageview");
}
