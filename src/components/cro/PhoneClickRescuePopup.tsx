import { useState, useEffect, useCallback } from "react";
import { getBusinessHoursInfo } from "@/lib/business-hours";
import { track } from "@/lib/track-events";
import { recordFormStarted } from "@/lib/intent-tier";

/**
 * Fires 90s after a user taps a tel: link without completing a form.
 * Assumption: if they clicked-to-call and haven't filled anything out, they
 * either couldn't get through or got stuck in voicemail — either way they're
 * a hot lead. Rescue them with a speedy callback promise.
 *
 * Business-hours aware — "call you in 10 minutes" (open) vs "first thing
 * Monday morning" (closed).
 *
 * Mobile gets a full-width bottom sheet; desktop gets a centered modal.
 * 24h localStorage cooldown — we don't re-prompt on every page.
 */

const COOLDOWN_KEY = "mdr_phone_rescue_last";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DELAY_MS = 90_000;

export default function PhoneClickRescuePopup() {
  const [visible, setVisible] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [callbackPhrase, setCallbackPhrase] = useState("a few minutes");

  const dismiss = useCallback(() => {
    setVisible(false);
    track("phone_rescue_dismissed", {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rescueTimer: ReturnType<typeof setTimeout> | null = null;

    function shouldShow(): boolean {
      if (sessionStorage.getItem("form_submitted")) return false;
      if (sessionStorage.getItem("phone_rescue_shown")) return false;
      const last = localStorage.getItem(COOLDOWN_KEY);
      if (last && Date.now() - Number(last) < COOLDOWN_MS) return false;
      return true;
    }

    function armTimer() {
      if (rescueTimer) return;
      rescueTimer = setTimeout(() => {
        if (!shouldShow()) return;
        const hours = getBusinessHoursInfo();
        setCallbackPhrase(
          hours.isOpen ? "in about 10 minutes" : `first thing ${hours.callbackPhrase}`
        );
        sessionStorage.setItem("phone_rescue_shown", "1");
        try {
          localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch {
          // non-fatal
        }
        setVisible(true);
        track("phone_rescue_shown", {
          is_open: hours.isOpen,
          path: location.pathname,
        });
      }, DELAY_MS);
    }

    function handlePhoneClick(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href^="tel:"]');
      if (!anchor) return;
      if (!shouldShow()) return;
      sessionStorage.setItem("mdr_phone_clicked_at", String(Date.now()));
      armTimer();
    }

    document.addEventListener("click", handlePhoneClick, { capture: true, passive: true });

    return () => {
      if (rescueTimer) clearTimeout(rescueTimer);
      document.removeEventListener("click", handlePhoneClick, { capture: true } as any);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible, dismiss]);

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
          source: "phone-click-rescue",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });
      if (res.ok) {
        sessionStorage.setItem("form_submitted", "1");
        setSuccess(true);
        track("phone_rescue_submitted", { path: location.pathname });
        (window as any).hj?.('identify', form.phone.trim(), { name: form.name.trim(), phone: form.phone.trim() });
      }
    } catch {
      // non-fatal
    }
    setSubmitting(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request callback"
        className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white sm:rounded-2xl rounded-t-2xl p-6 sm:p-8 shadow-2xl animate-slide-up"
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-text-dim hover:text-text-primary transition-colors p-1"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {!success ? (
          <>
            <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Didn't Get Through?
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-2">
              We'll call you back
            </h2>
            <p className="text-text-muted text-sm mb-6 leading-relaxed">
              Drop your name and number — one of our guys will reach out {callbackPhrase}. No voicemail tag.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={form.name}
                onFocus={() => recordFormStarted("phone-click-rescue")}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                required
                value={form.phone}
                onFocus={() => recordFormStarted("phone-click-rescue")}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Request Callback"}
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
            <h2 className="text-xl font-bold text-text-primary mb-2">On it.</h2>
            <p className="text-text-muted text-sm">
              We'll call you {callbackPhrase}. Keep your phone close.
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
