import { useState, type FormEvent } from "react";

interface LeadCaptureFormProps {
  source: string;
  compact?: boolean;
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function LeadCaptureForm({ source, compact = false }: LeadCaptureFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const name = data.get("name") as string;
    const phone = data.get("phone") as string;
    const email = data.get("email") as string;
    const service = data.get("service") as string;
    const address = data.get("address") as string;
    const message = data.get("message") as string;
    const website = data.get("website") as string; // honeypot

    if (!name.trim() || !phone.trim()) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          service: service?.trim() || "",
          address: address?.trim() || "",
          message: message?.trim() || "",
          website,
          source,
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        setState("success");
        form.reset();

        // Fire GA4 conversion event
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: source,
          });
        }

        // Fire Meta Pixel conversion event
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "Lead", { content_name: source });
        }
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

  if (state === "success") {
    return (
      <div className={`text-center ${compact ? "py-6" : "py-10"}`}>
        <div className="text-3xl mb-3">&#10003;</div>
        <p className="text-xl font-bold text-text-primary mb-2">Thank you!</p>
        <p className="text-text-muted">We'll be in touch shortly.</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {/* Honeypot — hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor={`website-${source}`}>Website</label>
        <input type="text" id={`website-${source}`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={compact ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        <div>
          <label htmlFor={`name-${source}`} className="block text-sm font-medium text-text-muted mb-1">
            Name *
          </label>
          <input
            type="text"
            id={`name-${source}`}
            name="name"
            required
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor={`phone-${source}`} className="block text-sm font-medium text-text-muted mb-1">
            Phone *
          </label>
          <input
            type="tel"
            id={`phone-${source}`}
            name="phone"
            required
            className={inputClass}
            placeholder="(540) 555-0123"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`email-${source}`} className="block text-sm font-medium text-text-muted mb-1">
          Email
        </label>
        <input
          type="email"
          id={`email-${source}`}
          name="email"
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      {!compact && (
        <>
          <div>
            <label htmlFor={`service-${source}`} className="block text-sm font-medium text-text-muted mb-1">
              Service Needed
            </label>
            <select
              id={`service-${source}`}
              name="service"
              className={inputClass}
            >
              <option value="">Select a service...</option>
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
            <label htmlFor={`address-${source}`} className="block text-sm font-medium text-text-muted mb-1">
              Property Address
            </label>
            <input
              type="text"
              id={`address-${source}`}
              name="address"
              className={inputClass}
              placeholder="123 Main St, Christiansburg, VA"
            />
          </div>

          <div>
            <label htmlFor={`message-${source}`} className="block text-sm font-medium text-text-muted mb-1">
              Additional Details
            </label>
            <textarea
              id={`message-${source}`}
              name="message"
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Anything else we should know?"
            />
          </div>
        </>
      )}

      {state === "error" && (
        <p className="text-accent-light text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full px-6 py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === "submitting" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Get Your Free Estimate"
        )}
      </button>
    </form>
  );
}
