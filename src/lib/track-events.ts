/**
 * Unified event tracker — fans events out to PostHog, GA4, and Meta Pixel.
 *
 * Client-only. Safe to import at module top-level; all methods no-op on SSR
 * and when the target analytics library is unavailable.
 *
 * Usage:
 *   import { track } from "@/lib/track-events";
 *   track("phone_click", { source: "header" });
 */

type EventProps = Record<string, string | number | boolean | null | undefined>;

const GA4_CATEGORY_MAP: Record<string, string> = {
  phone_click: "cro",
  form_started: "form",
  form_field_focus: "form",
  form_abandoned: "form",
  intent_tier_resolved: "cro",
  engagement_popup_shown: "cro",
  engagement_popup_click: "cro",
  exit_popup_shown: "cro",
  phone_rescue_shown: "cro",
  phone_rescue_submitted: "cro",
  storm_alert_shown: "cro",
  welcome_back_shown: "cro",
};

const META_PIXEL_CUSTOM_EVENTS = new Set([
  "phone_click",
  "form_started",
  "phone_rescue_shown",
]);

export function track(event: string, props: EventProps = {}): void {
  if (typeof window === "undefined") return;

  // PostHog — primary event store
  try {
    const ph = (window as any).posthog;
    if (ph?.capture) {
      ph.capture(event, props);
    }
  } catch {
    // non-fatal
  }

  // GA4 — mirror key events for reporting
  try {
    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      const category = GA4_CATEGORY_MAP[event] || "cro";
      gtag("event", event, {
        event_category: category,
        ...props,
      });
    }
  } catch {
    // non-fatal
  }

  // Meta Pixel — only a few high-signal events
  try {
    const fbq = (window as any).fbq;
    if (typeof fbq === "function" && META_PIXEL_CUSTOM_EVENTS.has(event)) {
      fbq("trackCustom", event, props);
    }
  } catch {
    // non-fatal
  }
}

/**
 * Read a PostHog feature flag. Returns null if PostHog isn't ready yet.
 * Intended for CRO A/B tests (e.g., tier-threshold experiments).
 */
export function getFlag(key: string): string | boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const ph = (window as any).posthog;
    if (ph?.getFeatureFlag) {
      const v = ph.getFeatureFlag(key);
      return v ?? null;
    }
  } catch {
    // non-fatal
  }
  return null;
}
