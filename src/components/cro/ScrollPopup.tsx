import { useState, useEffect } from "react";

/**
 * Redesigned scroll popup — slide-in toast from bottom-right instead of
 * full-screen modal. Social proof messaging, less interruptive.
 * Coordinated with exit-intent: won't show if exit popup already appeared.
 */
export default function ScrollPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("scroll_popup_shown")) return;
    if (sessionStorage.getItem("form_submitted")) return;
    // Coordination: skip if exit popup already shown
    if (sessionStorage.getItem("exit_popup_shown")) return;

    const pageLoadTime = Date.now();
    let triggered = false;

    function handleScroll() {
      if (triggered) return;
      if (Date.now() - pageLoadTime < 15000) return;

      const scrollPercent =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

      if (scrollPercent >= 0.5) {
        triggered = true;
        sessionStorage.setItem("scroll_popup_shown", "1");
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setVisible(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-border overflow-hidden animate-slide-up"
      role="complementary"
      aria-label="Special offer"
    >
      {/* Accent top stripe */}
      <div className="h-1 bg-accent" />

      <div className="p-5">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-text-dim hover:text-text-primary transition-colors p-1"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-1.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-sm">★</span>
            ))}
          </div>
          <span className="text-xs font-semibold text-text-muted">231 Reviews</span>
        </div>

        <h3 className="text-lg font-bold text-text-primary leading-tight mb-1">
          Join 600+ Homeowners Who Trust Modern Day Roofing
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Free inspections. GAF Golden Pledge warranty. $0 down financing available.
        </p>

        <a
          href="/contact"
          className="block w-full px-5 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors text-center"
          onClick={() => {
            if (typeof (window as any).gtag === "function") {
              (window as any).gtag("event", "scroll_popup_click", {
                event_category: "cro",
                event_label: "get_free_inspection",
              });
            }
          }}
        >
          Get Your Free Inspection
        </a>

        <button
          onClick={() => setVisible(false)}
          className="mt-2 w-full text-xs text-text-dim hover:text-text-muted transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
