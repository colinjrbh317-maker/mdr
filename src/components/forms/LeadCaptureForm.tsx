import { useState, type FormEvent } from "react";
import { recordFormStarted } from "@/lib/intent-tier";

interface LeadCaptureFormProps {
  source: string;
  compact?: boolean;
  channel?: "google" | "meta" | "direct";
}

type FormState = "idle" | "submitting" | "success" | "error";
type Step = 1 | 2;

export default function LeadCaptureForm({ source, compact = false, channel = "direct" }: LeadCaptureFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  async function submitLead() {
    if (!name.trim() || !phone.trim() || !smsConsent) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          service: service.trim(),
          message: message.trim(),
          website,
          source,
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        setState("success");

        // Determine thank-you destination: explicit channel prop, or URL ?channel=, or default.
        let dest: string = "/thank-you";
        try {
          const urlChannel = new URLSearchParams(window.location.search).get("channel");
          const resolved = (urlChannel || channel) as string;
          if (resolved === "google") dest = "/thank-you/google";
          else if (resolved === "meta") dest = "/thank-you/meta";
        } catch {}

        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: source,
          });

          const conv = (window as any).__GADS_LEAD_CONVERSION__;
          if (conv) {
            (window as any).gtag("event", "conversion", {
              send_to: conv,
              value: 1.0,
              currency: "USD",
            });
          }
        }

        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "Lead", { content_name: source });
        }

        (window as any).hj?.('identify', email.trim() || phone.trim(), {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
          city: address.trim() || undefined,
        });
        (window as any).hj?.('event', 'form_submitted');

        // Redirect to channel-specific thank-you page for Brian's conversion tracking
        const firstName = name.trim().split(/\s+/)[0] || "";
        const url = `${dest}?name=${encodeURIComponent(firstName)}`;
        // Small delay so pixel/conversion events fire before navigation
        setTimeout(() => {
          window.location.href = url;
        }, 400);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !smsConsent) return;

    (window as any).hj?.('event', 'form_step_1_completed');
    setStep(2);
  }

  function handleFinalSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submitLead();
  }

  function handleSkip() {
    void submitLead();
  }

  if (state === "success") {
    return (
      <div className={`text-center ${compact ? "py-6" : "py-10"}`}>
        <div className="text-3xl mb-3">&#10003;</div>
        <p className="text-xl font-bold text-text-primary mb-2">Thank you!</p>
        <p className="text-text-muted">We'll be in touch shortly.</p>
      </div>
    );
  }

  // iOS Safari auto-zooms on inputs under 16px, so force 16px on mobile (text-base) and restore tighter styling at md+.
  const inputClass =
    "w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-base md:text-sm";

  const honeypot = (
    <div className="absolute -left-[9999px]" aria-hidden="true">
      <label htmlFor={`website-${source}`}>Website</label>
      <input
        type="text"
        id={`website-${source}`}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
    </div>
  );

  if (step === 1) {
    return (
      <form onSubmit={handleContinue} className="flex flex-col gap-3">
        {honeypot}

        <div>
          <label htmlFor={`name-${source}`} className="sr-only">Full Name</label>
          <input
            type="text"
            id={`name-${source}`}
            name="name"
            required
            autoComplete="name"
            inputMode="text"
            className={inputClass}
            placeholder="Full Name"
            value={name}
            onFocus={() => recordFormStarted(source)}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor={`phone-${source}`} className="sr-only">Phone Number</label>
          <input
            type="tel"
            id={`phone-${source}`}
            name="phone"
            required
            autoComplete="tel"
            inputMode="tel"
            className={inputClass}
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <label htmlFor={`sms-consent-${source}`} className="flex items-start gap-2 text-sm text-text-muted leading-snug cursor-pointer select-none">
          <input
            type="checkbox"
            id={`sms-consent-${source}`}
            name="sms_consent"
            required
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-accent"
          />
          <span>
            Text me to schedule. Reply STOP anytime.{" "}
            <a href="/privacy" className="underline hover:text-text-primary">Privacy</a>
            {" · "}
            <a href="/terms" className="underline hover:text-text-primary">Terms</a>.
            <details className="mt-1 text-xs text-text-dim">
              <summary className="cursor-pointer hover:text-text-muted">Full disclosure</summary>
              <span className="block mt-1">
                I agree to receive text messages from Modern Day Roofing at the number provided — appointment confirmations, inspection scheduling, estimate follow-ups, service updates. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.
              </span>
            </details>
          </span>
        </label>

        <button
          type="submit"
          disabled={!smsConsent}
          className="w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Continue →
        </button>

        <p className="text-center text-xs text-text-dim mt-1">
          Or text us at{" "}
          <a href="tel:5405536007" className="underline hover:text-accent transition-colors font-semibold">
            (540) 553-6007
          </a>
        </p>
      </form>
    );
  }

  // Step 2
  return (
    <form onSubmit={handleFinalSubmit} className="flex flex-col gap-3">
      {honeypot}

      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
          aria-label="Back to step 1"
        >
          ← Back
        </button>
        <span className="text-xs font-semibold text-text-dim uppercase tracking-wide">Step 2 of 2</span>
      </div>

      <p className="text-sm text-text-muted mb-1">
        Almost done. A few optional details help us respond faster.
      </p>

      <div>
        <label htmlFor={`email-${source}`} className="sr-only">Email Address</label>
        <input
          type="email"
          id={`email-${source}`}
          name="email"
          autoComplete="email"
          inputMode="email"
          className={inputClass}
          placeholder="Email Address (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`address-${source}`} className="sr-only">Full Address</label>
        <input
          type="text"
          id={`address-${source}`}
          name="address"
          autoComplete="street-address"
          className={inputClass}
          placeholder="Full Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`service-${source}`} className="sr-only">Project Type</label>
        <select
          id={`service-${source}`}
          name="service"
          className={inputClass}
          aria-label="Project Type"
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">Project Type (optional)</option>
          <option value="Roof Replacement">Roof Replacement</option>
          <option value="Roof Repair">Roof Repair</option>
          <option value="Storm Damage">Storm Damage</option>
          <option value="Metal Roofing">Metal Roofing</option>
          <option value="Gutters">Gutters</option>
          <option value="Roof Inspection">Roof Inspection</option>
          <option value="Other">Other / Not Sure</option>
        </select>
      </div>

      <div>
        <label htmlFor={`message-${source}`} className="sr-only">Project Description</label>
        <textarea
          id={`message-${source}`}
          name="message"
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Project Description (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {state === "error" && <p className="text-accent-light text-sm">{errorMsg}</p>}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === "submitting" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Get My Free Quote"
        )}
      </button>

      <button
        type="button"
        onClick={handleSkip}
        disabled={state === "submitting"}
        className="text-center text-sm text-text-muted hover:text-accent transition-colors underline disabled:opacity-60"
      >
        Skip &amp; submit now →
      </button>
    </form>
  );
}
