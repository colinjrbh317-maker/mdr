import { useState } from "react";

type Step = 1 | 2 | 3 | 4 | "result" | "form" | "success";

interface Answers {
  reason: string;
  age: string;
  type: string;
  city: string;
}

const SERVICE_CITIES = [
  "Christiansburg",
  "Blacksburg",
  "Radford",
  "Salem",
  "Roanoke",
  "Floyd",
  "Dublin",
  "Pulaski",
  "Wytheville",
  "Bedford",
  "Lexington",
  "Covington",
  "Other / Not Listed",
];

function getRecommendation(answers: Answers): { headline: string; body: string; service: string } {
  const { reason, age } = answers;

  if (reason === "storm") {
    return {
      headline: "Storm Damage? We've Got You Covered.",
      body: "Our team specializes in insurance claim assistance. We'll inspect your roof for free, document all damage, and work directly with your insurance company.",
      service: "Storm Damage",
    };
  }

  if (reason === "leak") {
    return {
      headline: "Let's Stop That Leak — Fast.",
      body: "Active leaks need immediate attention. We'll send a crew for a free emergency inspection and get you a repair plan within 24 hours.",
      service: "Roof Repair",
    };
  }

  if (age === "20-30" || age === "30+") {
    return {
      headline: "Your Roof May Be Nearing End of Life.",
      body: "Roofs over 20 years old often have hidden issues. A free inspection can identify problems before they become emergencies — and we offer $0 down financing.",
      service: "Roof Replacement",
    };
  }

  if (age === "10-20") {
    return {
      headline: "Good News — A Checkup Could Save You Thousands.",
      body: "Your roof is at the age where small repairs can prevent major replacements. Our free inspection catches issues early.",
      service: "Roof Inspection",
    };
  }

  return {
    headline: "Let's Make Sure Your Roof Is in Great Shape.",
    body: "Whether you're exploring options or planning ahead, a free inspection gives you peace of mind and a clear picture of your roof's condition.",
    service: "Roof Inspection",
  };
}

export default function RoofQuiz() {
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<Answers>({ reason: "", age: "", type: "", city: "" });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const recommendation = getRecommendation(answers);

  function selectAnswer(key: keyof Answers, value: string) {
    setAnswers({ ...answers, [key]: value });
    if (key === "city") {
      setStep("result");
    } else {
      setStep(((step as number) + 1) as Step);
    }
  }

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
          service: recommendation.service,
          message: `Quiz answers: ${answers.reason}, ${answers.age} years, ${answers.type}, ${answers.city}`,
          source: "roof-quiz",
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
            event_label: "roof-quiz",
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: "roof-quiz" });
        }
        const ph = (window as any).posthog;
        if (ph?.capture) {
          ph.identify(form.phone.trim(), {
            name: form.name.trim(),
            phone: form.phone.trim(),
          });
          ph.capture("form_submitted", {
            source: "roof-quiz",
            service: recommendation.service,
            quiz_city: answers.city,
            quiz_roof_age: answers.age,
            landing_page: sessionStorage.getItem("landing_page") || "",
          });
        }
      }
    } catch {
      // Silently fail
    }
    setSubmitting(false);
  }

  const progressPercent =
    step === "result" || step === "form" || step === "success"
      ? 100
      : ((step as number) / 4) * 100;

  const optionClass =
    "w-full text-left px-5 py-4 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-text-primary font-medium";

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      {step !== "success" && (
        <div className="h-1.5 bg-bg-light rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">What brought you here today?</h2>
          <p className="text-text-muted mb-6">This helps us give you the most relevant recommendation.</p>
          <div className="space-y-3">
            <button className={optionClass} onClick={() => selectAnswer("reason", "leak")}>
              🚨 Active leak or damage
            </button>
            <button className={optionClass} onClick={() => selectAnswer("reason", "aging")}>
              🏠 My roof is getting old
            </button>
            <button className={optionClass} onClick={() => selectAnswer("reason", "storm")}>
              ⛈️ Recent storm damage
            </button>
            <button className={optionClass} onClick={() => selectAnswer("reason", "exploring")}>
              🔍 Just exploring options
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">How old is your current roof?</h2>
          <p className="text-text-muted mb-6">Roof age helps us assess what you might need.</p>
          <div className="space-y-3">
            <button className={optionClass} onClick={() => selectAnswer("age", "0-10")}>
              0–10 years
            </button>
            <button className={optionClass} onClick={() => selectAnswer("age", "10-20")}>
              10–20 years
            </button>
            <button className={optionClass} onClick={() => selectAnswer("age", "20-30")}>
              20–30 years
            </button>
            <button className={optionClass} onClick={() => selectAnswer("age", "30+")}>
              30+ years
            </button>
            <button className={optionClass} onClick={() => selectAnswer("age", "unknown")}>
              Not sure
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">What type of roof do you have?</h2>
          <p className="text-text-muted mb-6">Different materials need different approaches.</p>
          <div className="space-y-3">
            <button className={optionClass} onClick={() => selectAnswer("type", "asphalt")}>
              Asphalt Shingles
            </button>
            <button className={optionClass} onClick={() => selectAnswer("type", "metal")}>
              Metal
            </button>
            <button className={optionClass} onClick={() => selectAnswer("type", "comparing")}>
              Comparing Both (Shingles &amp; Metal)
            </button>
            <button className={optionClass} onClick={() => selectAnswer("type", "flat")}>
              Flat / Low-Slope
            </button>
            <button className={optionClass} onClick={() => selectAnswer("type", "unknown")}>
              Not sure
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Where is your property?</h2>
          <p className="text-text-muted mb-6">We serve the New River Valley and Roanoke areas.</p>
          <div className="space-y-2">
            {SERVICE_CITIES.map((city) => (
              <button key={city} className={optionClass} onClick={() => selectAnswer("city", city)}>
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-3">{recommendation.headline}</h2>
          <p className="text-text-muted mb-6">{recommendation.body}</p>

          <button
            onClick={() => setStep("form")}
            className="w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors"
          >
            Get My Free Inspection
          </button>
        </div>
      )}

      {step === "form" && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2 text-center">Almost there!</h2>
          <p className="text-text-muted mb-6 text-center">We'll call to schedule your free {recommendation.service.toLowerCase()} inspection.</p>

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
              {submitting ? "Sending..." : "Schedule My Inspection"}
            </button>
          </form>

          <p className="text-[10px] text-text-dim mt-3 leading-relaxed text-center">
            By submitting, I authorize Modern Day Roofing to contact me.{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">You're All Set!</h2>
          <p className="text-text-muted">
            Our team will call you within 24 hours to schedule your free inspection.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors"
          >
            Back to Home
          </a>
        </div>
      )}
    </div>
  );
}
