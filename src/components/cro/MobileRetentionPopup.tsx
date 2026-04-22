import { useState, useEffect } from "react";
import { recordFormStarted } from "@/lib/intent-tier";

/**
 * Mobile exit-intent alternative using inactivity + tab-switch detection.
 * Bottom-sheet style with 2-field mini-form (name + phone).
 * 24hr cooldown via localStorage.
 */
export default function MobileRetentionPopup() {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Mobile only
    if (window.innerWidth >= 768) return;
    if (sessionStorage.getItem("form_submitted")) return;

    // 24hr cooldown
    const lastShown = localStorage.getItem("mdr_mobile_popup_last");
    if (lastShown && Date.now() - parseInt(lastShown) < 86400000) return;

    const pageLoadTime = Date.now();
    let triggered = false;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let hasBeenOnPageLongEnough = false;

    // Mark when user has been on page for 30s
    const pageTimer = setTimeout(() => {
      hasBeenOnPageLongEnough = true;
      startInactivityTimer();
    }, 30000);

    function show() {
      if (triggered) return;
      if (sessionStorage.getItem("form_submitted")) return;
      triggered = true;
      localStorage.setItem("mdr_mobile_popup_last", Date.now().toString());
      setVisible(true);
    }

    function startInactivityTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => show(), 45000);
    }

    function resetInactivity() {
      if (!hasBeenOnPageLongEnough || triggered) return;
      startInactivityTimer();
    }

    // Reset inactivity on scroll/touch
    window.addEventListener("scroll", resetInactivity, { passive: true });
    window.addEventListener("touchstart", resetInactivity, { passive: true });

    // Tab visibility change — show on return
    function handleVisibility() {
      if (document.visibilityState === "visible" && !triggered) {
        const timeOnPage = Date.now() - pageLoadTime;
        if (timeOnPage > 30000) {
          show();
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(pageTimer);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      window.removeEventListener("scroll", resetInactivity);
      window.removeEventListener("touchstart", resetInactivity);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

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
          source: "mobile-retention",
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
            event_label: "mobile-retention",
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: "mobile-retention" });
        }
        (window as any).hj?.('identify', form.phone.trim(), { name: form.name.trim(), phone: form.phone.trim() });
        (window as any).hj?.('event', 'form_submitted');
      }
    } catch {
      // Silently fail
    }
    setSubmitting(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Special offer"
        className="relative w-full bg-white rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slide-up shadow-2xl"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

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
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-text-primary mt-2">Free Roof Inspection</h2>
              <p className="text-sm text-text-muted mt-1">
                20 minutes, no obligation. We'll be in and out.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={form.name}
                onFocus={() => recordFormStarted("mobile-retention")}
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
                {submitting ? "Sending..." : "Book My Free Inspection"}
              </button>
            </form>

            <p className="text-[10px] text-text-dim mt-3 leading-relaxed text-center">
              By submitting, I authorize Modern Day Roofing to contact me.{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">You're All Set!</h2>
            <p className="text-text-muted text-sm">
              We'll call within 24 hours to schedule your free inspection.
            </p>
            <button
              onClick={() => setVisible(false)}
              className="mt-4 px-6 py-2 bg-accent text-white font-semibold rounded-lg"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
