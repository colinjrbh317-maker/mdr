import { useState, useEffect, useRef } from "react";
import { getTier } from "@/lib/intent-tier";
import { track } from "@/lib/track-events";

/**
 * Time + intent-based popup — fires after 5 minutes AND engagement signals.
 * Engagement signals: 3+ clicks OR scrolled past 50% of page.
 * Works on both desktop and mobile (complements exit-intent which is desktop-only).
 *
 * Tier-aware:
 *   - cold / warm → financing interstitial (0% down, $89/mo)
 *   - hot         → "$500 off if you book today" (they've already earned intent)
 *
 * Session keys used:
 *   - form_submitted: set by any form → suppresses this popup
 *   - exit_popup_shown: set by ExitIntentPopup → suppresses this popup (don't show two)
 *   - engagement_popup_shown: set when this popup fires → prevents repeat
 */

type Variant = "financing" | "promo";

export default function EngagementPopup() {
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<Variant>("financing");

  const clickCount = useRef(0);
  const scrolledDeep = useRef(false);
  const readyToShow = useRef(false); // 5-min gate

  useEffect(() => {
    // Guard: already shown or form submitted
    if (sessionStorage.getItem("form_submitted")) return;
    if (sessionStorage.getItem("engagement_popup_shown")) return;
    if (sessionStorage.getItem("exit_popup_shown")) return;

    let triggered = false;

    function maybeShow() {
      if (triggered) return;
      if (!readyToShow.current) return;
      if (sessionStorage.getItem("form_submitted")) return;
      if (sessionStorage.getItem("exit_popup_shown")) return;

      const hasEngagement = clickCount.current >= 3 || scrolledDeep.current;
      if (!hasEngagement) return;

      triggered = true;
      const tier = getTier();
      const chosen: Variant = tier === "hot" ? "promo" : "financing";
      setVariant(chosen);
      sessionStorage.setItem("engagement_popup_shown", "1");
      setVisible(true);

      track("engagement_popup_shown", {
        variant: chosen,
        tier,
        trigger: clickCount.current >= 3 ? "clicks" : "scroll",
        landing_page: sessionStorage.getItem("landing_page") || "",
      });
    }

    // 5-minute gate
    const timer = setTimeout(() => {
      readyToShow.current = true;
      maybeShow();
    }, 300_000);

    // Click signal
    function handleClick() {
      clickCount.current += 1;
      maybeShow();
    }

    // Scroll signal — 50% depth
    function handleScroll() {
      if (scrolledDeep.current) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled / total >= 0.5) {
        scrolledDeep.current = true;
        maybeShow();
      }
    }

    document.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Keyboard close
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setVisible(false);
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible]);

  function trackClick(label: string) {
    track("engagement_popup_click", { cta: label, variant });
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Financing options"
        className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white sm:rounded-2xl rounded-t-2xl p-6 sm:p-8 shadow-2xl animate-slide-up"
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-text-dim hover:text-text-primary transition-colors p-1"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          {variant === "promo" ? "Limited-Time Offer" : "0% Down Financing"}
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {variant === "promo" ? "$500 Off If You Book Today" : "Payments from $89/mo"}
        </h2>
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {variant === "promo"
            ? "You've been doing your research — let's close the loop. Free inspection, $500 off your project."
            : "A new roof doesn't have to wait. See if you qualify in 60 seconds — no credit impact, no pressure."}
        </p>

        <a
          href={variant === "promo" ? "/offers/500-off" : "/financing"}
          onClick={() => trackClick(variant === "promo" ? "claim_500" : "see_if_you_qualify")}
          className="block w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors text-center"
        >
          {variant === "promo" ? "Claim $500 Off" : "See If You Qualify"}
        </a>

        <button
          onClick={() => {
            trackClick("dismiss");
            setVisible(false);
          }}
          className="w-full mt-3 text-xs text-text-dim hover:text-text-muted transition-colors py-1"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
