import { useState, type FormEvent } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const firstName = data.get("first_name") as string;
    const lastName = data.get("last_name") as string;
    const email = data.get("email") as string;
    const phone = data.get("phone") as string;
    const address = data.get("address") as string;
    const city = data.get("city") as string;
    const state_ = data.get("state") as string;
    const zip = data.get("zip") as string;
    const message = data.get("message") as string;
    const website = data.get("website") as string; // honeypot

    if (!firstName.trim() || !phone.trim()) return;

    const fullAddress = [address, city, state_, zip].filter(Boolean).join(", ");
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          phone: phone.trim(),
          address: fullAddress,
          service: "",
          message: message?.trim() || "",
          website,
          source: "contact-page",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        setState("success");
        form.reset();
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "generate_lead", { event_category: "form", event_label: "contact-page" });
        }
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "Lead", { content_name: "contact-page" });
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
      <div className="text-center py-12">
        <div className="text-4xl mb-4 text-green-600">✓</div>
        <p className="text-2xl font-bold text-text-primary mb-2">Thank you!</p>
        <p className="text-text-muted">We'll contact you within 24 hours to schedule your free inspection.</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {/* First Name + Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-text-body mb-1">First name</label>
          <input type="text" id="first_name" name="first_name" required className={inputClass} placeholder="First name" />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-text-body mb-1">Last name</label>
          <input type="text" id="last_name" name="last_name" className={inputClass} placeholder="Last name" />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-text-body mb-1">Email</label>
          <input type="email" id="contact_email" name="email" required className={inputClass} placeholder="your@email.com" />
        </div>
        <div>
          <label htmlFor="contact_phone" className="block text-sm font-medium text-text-body mb-1">Phone</label>
          <input type="tel" id="contact_phone" name="phone" required className={inputClass} placeholder="(540) 555-0123" />
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="contact_address" className="block text-sm font-medium text-text-body mb-1">Address</label>
        <input type="text" id="contact_address" name="address" className={inputClass} placeholder="123 Main St" />
      </div>

      {/* City + State + Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 sm:col-span-1" style={{ gridColumn: "span 1 / span 1" }}>
          <label htmlFor="contact_city" className="block text-sm font-medium text-text-body mb-1">City</label>
          <input type="text" id="contact_city" name="city" className={inputClass} placeholder="Christiansburg" />
        </div>
        <div>
          <label htmlFor="contact_state" className="block text-sm font-medium text-text-body mb-1">State</label>
          <input type="text" id="contact_state" name="state" className={inputClass} placeholder="VA" maxLength={2} />
        </div>
        <div>
          <label htmlFor="contact_zip" className="block text-sm font-medium text-text-body mb-1">Zip</label>
          <input type="text" id="contact_zip" name="zip" className={inputClass} placeholder="24073" />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact_message" className="block text-sm font-medium text-text-body mb-1">Message</label>
        <textarea
          id="contact_message"
          name="message"
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder="Tell us about your project..."
        />
      </div>

      {state === "error" && (
        <p className="text-accent-light text-sm">{errorMsg}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full px-6 py-4 bg-accent hover:bg-accent-dark text-white font-bold text-base uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {state === "submitting" ? "Submitting..." : "Request Your Free Estimate!"}
      </button>

      {/* Consent */}
      <p className="text-[11px] text-text-dim leading-relaxed text-center">
        By clicking submit, you authorize Modern Day Roofing to contact you via phone calls, texts, or email regarding
        your project. We will never share your personal information with third parties.{" "}
        <a href="/terms" className="underline hover:text-text-muted">Terms</a> &amp;{" "}
        <a href="/privacy" className="underline hover:text-text-muted">Privacy Policy</a>.
      </p>
    </form>
  );
}
