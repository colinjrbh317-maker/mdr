import { useState, useEffect, useRef } from "react";

/**
 * Time + intent-based popup — fires after 5 minutes AND engagement signals.
 * Engagement signals: 3+ clicks OR scrolled past 50% of page.
 * Works on both desktop and mobile (complements exit-intent which is desktop-only).
 * Shows $500 off offer — same conversion goal as exit intent.
 *
 * Session keys used:
 *   - form_submitted: set by any form → suppresses this popup
 *   - exit_popup_shown: set by ExitIntentPopup → suppresses this popup (don't show two)
 *   - engagement_popup_shown: set when this popup fires → prevents repeat
 */

export default function EngagementPopup() {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
      sessionStorage.setItem("engagement_popup_shown", "1");
      setVisible(true);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: "",
          service: "General",
          source: "engagement-popup",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        sessionStorage.setItem("form_submitted", "1");
        setSuccess(true);

        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: "engagement-popup",
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: "engagement-popup" });
        }
      }
    } catch {
      // Silently fail
    }
    setSubmitting(false);
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
        aria-label="Special limited-time offer"
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

        {!success ? (
          <>
            {/* Offer badge */}
            <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Limited-Time Offer
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-2">
              $500 Off Any Roofing Project
            </h2>
            <p className="text-text-muted text-sm mb-6 leading-relaxed">
              You've been doing your research — get a free inspection and lock in your $500 discount before it expires.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Claim $500 Off"}
              </button>
            </form>

            <p className="text-[10px] text-text-dim mt-3 leading-relaxed text-center">
              By submitting, I authorize Modern Day Roofing to contact me.{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>

            <button
              onClick={() => setVisible(false)}
              className="w-full mt-2 text-xs text-text-dim hover:text-text-muted transition-colors py-1"
            >
              No thanks
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">You're all set!</h2>
            <p className="text-text-muted text-sm">
              We'll call within 24 hours to schedule your free inspection and apply your $500 discount.
            </p>
            <button
              onClick={() => setVisible(false)}
              className="mt-4 px-6 py-2 bg-accent text-white font-semibold rounded-lg text-sm"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
