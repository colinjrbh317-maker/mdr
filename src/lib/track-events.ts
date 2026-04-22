/**
 * Unified event tracker — fans events out to Hotjar, GA4, and Meta Pixel.
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

  // Hotjar — primary event store (events only; no property payloads in Hotjar)
  try {
    if ((window as any).hj) {
      (window as any).hj('event', event);
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

/** Stub — feature flags were PostHog-specific. Always returns null. */
export function getFlag(_key: string): string | boolean | null {
  return null;
}
