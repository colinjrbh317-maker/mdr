import { useState, type FormEvent } from "react";

type Tab = "referring" | "referred";
type FormState = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm";
const submitClass =
  "w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60";

declare const gtag: (...args: unknown[]) => void;
declare const fbq: (...args: unknown[]) => void;

function fireAnalytics(source: string, identity?: { name?: string; phone?: string; email?: string }) {
  try {
    if (typeof gtag === "function") {
      gtag("event", "generate_lead", {
        event_category: "form",
        event_label: source,
      });
    }
  } catch {}
  try {
    if (typeof fbq === "function") {
      fbq("track", "Lead", { content_name: source });
    }
  } catch {}
  try {
    if (identity?.email || identity?.phone) {
      (window as any).hj?.('identify', identity.email || identity.phone, {
        name: identity.name,
        email: identity.email || undefined,
        phone: identity.phone,
      });
    }
    (window as any).hj?.('event', 'form_submitted');
  } catch {}
}

export default function ReferralForm() {
  const [tab, setTab] = useState<Tab>("referring");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [referringConsent, setReferringConsent] = useState(false);
  const [referredConsent, setReferredConsent] = useState(false);

  async function handleReferringSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const referrer_name = (data.get("referrer_name") as string).trim();
    const referrer_phone = (data.get("referrer_phone") as string).trim();
    const name = (data.get("name") as string).trim();
    const phone = (data.get("phone") as string).trim();
    const message = (data.get("message") as string || "").trim();
    const website = data.get("website") as string;

    if (!referrer_name || !referrer_phone || !name || !phone || !referringConsent) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          message,
          referrer_name,
          referrer_phone,
          website,
          source: "referral-outbound",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (!res.ok) throw new Error("Submission failed");

      setState("success");
      sessionStorage.setItem("form_submitted", "1");
      fireAnalytics("referral-outbound", { name, phone });
    } catch {
      setState("error");
      setErrorMsg("Something went wrong. Please try again or call us directly.");
    }
  }

  async function handleReferredSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const name = (data.get("name") as string).trim();
    const phone = (data.get("phone") as string).trim();
    const email = (data.get("email") as string || "").trim();
    const referrer_name = (data.get("referrer_name") as string).trim();
    const address = (data.get("address") as string || "").trim();
    const website = data.get("website") as string;

    if (!name || !phone || !referrer_name || !referredConsent) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          address,
          referrer_name,
          website,
          source: "referral-inbound",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (!res.ok) throw new Error("Submission failed");

      setState("success");
      sessionStorage.setItem("form_submitted", "1");
      fireAnalytics("referral-inbound", { name, phone, email });
    } catch {
      setState("error");
      setErrorMsg("Something went wrong. Please try again or call us directly.");
    }
  }

  if (state === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Thank You!</h3>
        <p className="text-text-muted text-sm max-w-md mx-auto">
          {tab === "referring"
            ? "We've received your referral and will reach out to them shortly. We'll keep you updated on their project status."
            : "We've received your information and will be in touch soon to schedule your free inspection."}
        </p>
      </div>
    );
  }

  const tabButtonClass = (active: boolean) =>
    active
      ? "px-6 py-2.5 text-sm font-semibold rounded-lg bg-accent text-white transition-colors"
      : "px-6 py-2.5 text-sm font-semibold rounded-lg bg-bg-card border border-border text-text-muted hover:border-accent/30 transition-colors";

  return (
    <div>
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className={tabButtonClass(tab === "referring")}
          onClick={() => { setTab("referring"); setState("idle"); setErrorMsg(""); }}
        >
          I'm Referring Someone
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === "referred")}
          onClick={() => { setTab("referred"); setState("idle"); setErrorMsg(""); }}
        >
          I Was Referred
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Tab 1: I'm Referring Someone */}
      {tab === "referring" && (
        <form onSubmit={handleReferringSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Your Name *</label>
              <input type="text" name="referrer_name" required placeholder="Your full name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Your Phone *</label>
              <input type="tel" name="referrer_phone" required placeholder="(540) 555-0123" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Person Being Referred - Name *</label>
              <input type="text" name="name" required placeholder="Their full name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Person Being Referred - Phone *</label>
              <input type="tel" name="phone" required placeholder="Their phone number" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Message (optional)</label>
            <textarea name="message" rows={3} placeholder="Any details about their roofing needs..." className={inputClass} />
          </div>
          {/* Honeypot */}
          <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <label htmlFor="referring-sms-consent" className="flex items-start gap-2 text-xs text-text-dim leading-relaxed cursor-pointer select-none">
            <input
              type="checkbox"
              id="referring-sms-consent"
              name="sms_consent"
              required
              checked={referringConsent}
              onChange={(e) => setReferringConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
            />
            <span>
              I agree to receive text messages from Modern Day Roofing at the phone number provided, including referral status updates. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See{" "}
              <a href="/privacy" className="underline hover:text-accent">Privacy Policy</a>
              {" "}and{" "}
              <a href="/terms" className="underline hover:text-accent">Terms</a>.
            </span>
          </label>
          <button type="submit" disabled={state === "submitting" || !referringConsent} className={submitClass}>
            {state === "submitting" ? "Submitting..." : "Submit My Referral"}
          </button>
        </form>
      )}

      {/* Tab 2: I Was Referred */}
      {tab === "referred" && (
        <form onSubmit={handleReferredSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">My Name *</label>
              <input type="text" name="name" required placeholder="Your full name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">My Phone *</label>
              <input type="tel" name="phone" required placeholder="(540) 555-0123" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">My Email (optional)</label>
              <input type="email" name="email" placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Who Referred Me - Name *</label>
              <input type="text" name="referrer_name" required placeholder="Their full name" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Address (optional)</label>
            <input type="text" name="address" placeholder="Your street address" className={inputClass} />
          </div>
          {/* Honeypot */}
          <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <label htmlFor="referred-sms-consent" className="flex items-start gap-2 text-xs text-text-dim leading-relaxed cursor-pointer select-none">
            <input
              type="checkbox"
              id="referred-sms-consent"
              name="sms_consent"
              required
              checked={referredConsent}
              onChange={(e) => setReferredConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
            />
            <span>
              I agree to receive text messages from Modern Day Roofing at the phone number provided, including appointment confirmations, estimate follow-ups, and service updates. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See{" "}
              <a href="/privacy" className="underline hover:text-accent">Privacy Policy</a>
              {" "}and{" "}
              <a href="/terms" className="underline hover:text-accent">Terms</a>.
            </span>
          </label>
          <button type="submit" disabled={state === "submitting" || !referredConsent} className={submitClass}>
            {state === "submitting" ? "Submitting..." : "Get My Free Inspection"}
          </button>
        </form>
      )}
    </div>
  );
}
