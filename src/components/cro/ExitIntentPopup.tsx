import { useState, useEffect, useCallback } from "react";

/**
 * Desktop exit-intent popup — straight to $500 off offer + mini-form.
 *
 * Gated to high-intent pages only: homepage, /services/*, /areas/*, /gallery,
 * /contact, /offers/*, /lp/*. Blog, FAQ, about, warranty, etc. don't mount
 * this popup — those visitors are researching, not shopping.
 *
 * Mobile uses MobileRetentionPopup (free-inspection messaging, no $500).
 */

type Step = "offer" | "success";

interface MiniFormState {
  name: string;
  phone: string;
}

const HIGH_INTENT_PREFIXES = [
  "/services/",
  "/areas/",
  "/offers/",
  "/lp/",
];

const HIGH_INTENT_EXACT = new Set([
  "/",
  "/gallery",
  "/contact",
]);

function pageIsHighIntent(path: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (HIGH_INTENT_EXACT.has(normalized)) return true;
  return HIGH_INTENT_PREFIXES.some((p) => path.startsWith(p));
}

export default function ExitIntentPopup({ currentPage = "/" }: { currentPage?: string }) {
  const [step, setStep] = useState<Step>("offer");
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState<MiniFormState>({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY > 0) return;
    if (sessionStorage.getItem("exit_popup_shown")) return;
    if (sessionStorage.getItem("form_submitted")) return;

    sessionStorage.setItem("exit_popup_shown", "1");
    setVisible(true);
  }, []);

  useEffect(() => {
    // Desktop only
    if (window.innerWidth < 768) return;
    // Page gate: only mount on high-intent pages
    if (!pageIsHighIntent(currentPage)) return;
    if (sessionStorage.getItem("exit_popup_shown")) return;
    if (sessionStorage.getItem("form_submitted")) return;

    // 20s delay before activation
    const timer = setTimeout(() => {
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }, 20000);

    return () => {
      clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave, currentPage]);

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
          source: "exit-intent-popup",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        sessionStorage.setItem("form_submitted", "1");
        setStep("success");

        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: "exit-intent-popup",
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: "exit-intent-popup" });
        }
        const ph = (window as any).posthog;
        if (ph?.capture) {
          ph.identify(form.phone.trim(), {
            name: form.name.trim(),
            phone: form.phone.trim(),
          });
          ph.capture("form_submitted", {
            source: "exit-intent-popup",
            has_email: false,
            landing_page: sessionStorage.getItem("landing_page") || "",
          });
        }
      }
    } catch {
      // Silently fail — don't block user
    }
    setSubmitting(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="$500 off special offer"
        className="relative w-full max-w-md mx-4 bg-white border border-border rounded-2xl p-8 animate-slide-up text-center shadow-2xl"
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-text-dim hover:text-text-primary transition-colors p-1"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {step === "offer" && (
          <>
            <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Limited-Time Offer
            </div>

            <h2 className="text-3xl font-extrabold text-text-primary mb-2 leading-tight">
              $500 Off Your Roof
            </h2>
            <p className="text-text-muted mb-6">
              Book a free inspection and we'll take $500 off your project. No pressure, no hidden fees.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
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
                className="w-full px-6 py-3 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Claim $500 Off"}
              </button>
            </form>

            <p className="text-[10px] text-text-dim mt-3 leading-relaxed">
              By submitting, I authorize Modern Day Roofing to contact me via phone and text.{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>

            <button
              onClick={() => setVisible(false)}
              className="mt-3 text-sm text-text-dim hover:text-text-muted transition-colors"
            >
              No thanks
            </button>
          </>
        )}

        {step === "success" && (
          <div className="py-4">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">You're All Set!</h2>
            <p className="text-text-muted">
              We'll call you within 24 hours to schedule your free inspection and apply your $500 discount.
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
