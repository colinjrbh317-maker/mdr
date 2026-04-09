import { useState, type FormEvent } from "react";

interface Props {
  source: string;
  ctaText?: string;
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function LeadCaptureFormMini({ source, ctaText = "Get A Free Quote" }: Props) {
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const name = data.get("name") as string;
    const phone = data.get("phone") as string;
    const website = data.get("website") as string; // honeypot

    if (!name.trim() || !phone.trim()) return;

    setState("submitting");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: "",
          website,
          source,
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        setState("success");
        sessionStorage.setItem("form_submitted", "1");
        form.reset();

        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: source,
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: source });
        }
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">&#10003;</div>
        <p className="text-xl font-bold text-text-primary mb-2">You're All Set!</p>
        <p className="text-text-muted text-sm">We'll call within 24 hours to schedule your free inspection and apply your $500 discount.</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Honeypot */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor={`website-${source}`}>Website</label>
        <input type="text" id={`website-${source}`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor={`mini-name-${source}`} className="sr-only">Your Name</label>
      <input
        type="text"
        id={`mini-name-${source}`}
        name="name"
        required
        className={inputClass}
        placeholder="Your Name"
      />

      <label htmlFor={`mini-phone-${source}`} className="sr-only">Phone Number</label>
      <input
        type="tel"
        id={`mini-phone-${source}`}
        name="phone"
        required
        className={inputClass}
        placeholder="Phone Number"
      />

      {state === "error" && (
        <p className="text-accent text-sm">Something went wrong. Please try again.</p>
      )}

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
          ctaText
        )}
      </button>

      <p className="text-[10px] text-text-dim leading-relaxed text-center">
        By submitting, I authorize Modern Day Roofing to contact me via phone and text.{" "}
        <a href="/privacy" className="underline hover:text-text-muted transition-colors">Privacy Policy</a>
      </p>
    </form>
  );
}
