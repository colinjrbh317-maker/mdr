import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Lender config                                                      */
/* ------------------------------------------------------------------ */
const HEARTH = {
  name: "Hearth",
  url: "https://app.gethearth.com/partners/modern-day-roofing/alicia-alex/apply",
  description: "Rates from 12+ lenders \u2022 Terms 2\u201312 years \u2022 Loans up to $250K",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Step = 1 | 2 | 3 | "results";
type SubStep2 = "2a" | "2b" | "2c" | "2d" | "2e";

interface FormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  address: string;
  budget: string;
  timeline: string;
  homeowner: string;
  propertyType: string;
  credit: string;
  income: string;
  employment: string;
  website: string; // honeypot
  skipped: boolean;
}

type QualTier = "excellent" | "good" | "fair" | "needs-review" | "call-us";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function computeTier(data: FormData): QualTier {
  if (data.skipped || data.credit === "Not Sure") return "call-us";

  const creditScores: Record<string, number> = {
    "Excellent 720+": 4,
    "Good 660-719": 3,
    "Fair 580-659": 2,
    "Below 580": 1,
  };
  const incomeScores: Record<string, number> = {
    "$125K+": 4,
    "$75K-$125K": 3,
    "$40K-$75K": 2,
    "Under $40K": 1,
  };

  const creditScore = creditScores[data.credit] || 0;
  const incomeScore = incomeScores[data.income] || 0;
  const total = creditScore + incomeScore;

  if (total >= 7) return "excellent";
  if (total >= 5) return "good";
  if (total >= 3) return "fair";
  return "needs-review";
}

function fireGA4(event: string, params?: Record<string, string>) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, params || {});
  }
}

function fireMeta(event: string, params?: Record<string, string>) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, params || {});
  }
}

/* ------------------------------------------------------------------ */
/*  Shared styles (matches RoofQuiz + LeadCaptureForm)                 */
/* ------------------------------------------------------------------ */
const optionClass =
  "w-full text-left px-5 py-4 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-text-primary font-medium";

const inputClass =
  "w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm";

const primaryBtn =
  "w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const SERVICE_TYPES = [
  "Roof Replacement",
  "Repair",
  "Storm Damage",
  "Metal Roofing",
  "Gutters",
  "Siding",
  "Other",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function FinancingFunnel() {
  const [step, setStep] = useState<Step>(1);
  const [subStep2, setSubStep2] = useState<SubStep2>("2a");
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState<QualTier>("call-us");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    service: "",
    address: "",
    budget: "",
    timeline: "",
    homeowner: "",
    propertyType: "",
    credit: "",
    income: "",
    employment: "",
    website: "",
    skipped: false,
  });

  const [showHomeownerNote, setShowHomeownerNote] = useState(false);

  /* ---- field helpers ---- */
  function update(key: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  /* ---- step 2 auto-advance ---- */
  function selectStep2(key: keyof FormData, value: string, next: SubStep2 | "done") {
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (key === "homeowner" && value === "No") {
      setShowHomeownerNote(true);
      setTimeout(() => {
        setShowHomeownerNote(false);
        if (next === "done") {
          fireGA4("financing_step_2_complete");
          setStep(3);
        } else {
          setSubStep2(next);
        }
      }, 1500);
      return;
    }

    if (next === "done") {
      fireGA4("financing_step_2_complete");
      setStep(3);
    } else {
      setSubStep2(next);
    }
  }

  /* ---- submit ---- */
  async function handleSubmit(skipped = false) {
    const data = { ...formData, skipped };
    setFormData(data);
    setSubmitting(true);

    const computedTier = computeTier(data);
    setTier(computedTier);

    // Fire step 3 event
    fireGA4(skipped ? "financing_step_3_skipped" : "financing_step_3_complete");

    // Build profile JSON for message field
    const profile = {
      address: data.address,
      budget: data.budget,
      timeline: data.timeline,
      homeowner: data.homeowner,
      propertyType: data.propertyType,
      credit: skipped ? "Skipped" : data.credit,
      income: skipped ? "Skipped" : data.income,
      employment: skipped ? "Skipped" : data.employment,
      qualificationTier: computedTier,
    };

    // Fire-and-forget lead submission
    try {
      await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email.trim(),
          address: data.address.trim(),
          service: data.service || "Financing Inquiry",
          message: `Financing funnel profile: ${JSON.stringify(profile)}`,
          website: data.website, // honeypot
          source: "financing-funnel",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });
    } catch {
      // Silently fail — lead is best-effort
    }

    // Post-submission tracking
    sessionStorage.setItem("form_submitted", "1");
    sessionStorage.setItem("financing_lead", "1");

    fireGA4("financing_funnel_complete", {
      tier: computedTier,
      lender: "hearth",
    });
    fireMeta("Lead", { content_name: "financing-funnel" });

    (window as any).hj?.('identify', data.email.trim() || data.phone.trim(), {
      name: data.name.trim(),
      email: data.email.trim() || undefined,
      phone: data.phone.trim(),
      city: data.address.trim() || undefined,
    });
    (window as any).hj?.('event', 'form_submitted');

    setSubmitting(false);
    setStep("results");
  }

  function resetFunnel() {
    setStep(1);
    setSubStep2("2a");
    setTier("call-us");
    setShowHomeownerNote(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      service: "",
      address: "",
      budget: "",
      timeline: "",
      homeowner: "",
      propertyType: "",
      credit: "",
      income: "",
      employment: "",
      website: "",
      skipped: false,
    });
  }

  /* ---- progress ---- */
  const stepNumber = step === "results" ? 3 : (step as number);
  const progressPercent = step === "results" ? 100 : ((stepNumber - 1) / 3) * 100 + (step === 2 ? (["2a", "2b", "2c", "2d", "2e"].indexOf(subStep2) / 5) * 33 : 0);
  const stepLabels = ["Your Info", "Property", "Finances"];

  /* ---- validate step 1 ---- */
  const step1Valid = formData.name.trim() && formData.phone.trim() && formData.email.trim();

  return (
    <div className="max-w-lg mx-auto bg-bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Trust strip */}
      {step !== "results" && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 bg-bg-light border-b border-border text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            No credit impact
          </span>
          <span>256-bit encrypted</span>
          <span>Takes ~3 min</span>
        </div>
      )}

      <div className="p-6">
        {/* Progress bar + step labels */}
        {step !== "results" && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {stepLabels.map((label, i) => (
                <span
                  key={label}
                  className={`text-xs font-medium ${i + 1 <= stepNumber ? "text-accent" : "text-text-dim"}`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-bg-light rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
              />
            </div>
            <p className="text-xs text-text-dim mt-2">Step {stepNumber} of 3</p>
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 1 — Contact Info                                       */}
        {/* ============================================================ */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Check Your Rate</h2>
            <p className="text-text-muted mb-5 text-sm">Tell us a bit about yourself to see your financing options.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!step1Valid) return;
                fireGA4("financing_step_1_complete");
                setStep(2);
              }}
              className="flex flex-col gap-3"
            >
              {/* Honeypot */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website-financing">Website</label>
                <input
                  type="text"
                  id="website-financing"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>

              <input
                type="text"
                placeholder="Full Name"
                required
                autoFocus
                autoComplete="name"
                className={inputClass}
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                required
                inputMode="tel"
                autoComplete="tel"
                className={inputClass}
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                inputMode="email"
                autoComplete="email"
                className={inputClass}
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
              />

              {/* Service type grid */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">What do you need?</p>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_TYPES.map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => update("service", svc)}
                      className={`px-3 py-2.5 text-sm border rounded-lg transition-all font-medium ${
                        formData.service === svc
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-text-primary hover:border-accent hover:bg-accent/5"
                      }`}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={!step1Valid} className={primaryBtn}>
                Continue
              </button>
            </form>

            <p className="text-[10px] text-text-dim mt-3 text-center leading-relaxed">
              We'll never share your info.{" "}
              <a href="/privacy" className="underline hover:text-text-muted transition-colors">
                See our Privacy Policy
              </a>.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 2 — Property & Project (auto-advance sub-steps)        */}
        {/* ============================================================ */}
        {step === 2 && (
          <div>
            {/* 2a — Address */}
            {subStep2 === "2a" && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Where is your property?</h2>
                <p className="text-text-muted mb-5 text-sm">Address or zip code so we can check local options.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formData.address.trim()) setSubStep2("2b");
                  }}
                  className="flex flex-col gap-3"
                >
                  <input
                    type="text"
                    placeholder="Address or Zip Code"
                    autoFocus
                    autoComplete="street-address"
                    className={inputClass}
                    value={formData.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                  <button type="submit" disabled={!formData.address.trim()} className={primaryBtn}>
                    Continue
                  </button>
                </form>
              </div>
            )}

            {/* 2b — Budget */}
            {subStep2 === "2b" && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Estimated budget?</h2>
                <p className="text-text-muted mb-5 text-sm">This helps us match the right financing terms.</p>
                <div className="space-y-3">
                  {["Under $5K", "$5K-$10K", "$10K-$20K", "$20K-$40K", "$40K+"].map((opt) => (
                    <button key={opt} className={optionClass} onClick={() => selectStep2("budget", opt, "2c")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2c — Timeline */}
            {subStep2 === "2c" && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">When do you need this done?</h2>
                <p className="text-text-muted mb-5 text-sm">Helps us prioritize your request.</p>
                <div className="space-y-3">
                  {["ASAP", "Within 1 month", "1-3 months", "Just researching"].map((opt) => (
                    <button key={opt} className={optionClass} onClick={() => selectStep2("timeline", opt, "2d")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2d — Homeowner */}
            {subStep2 === "2d" && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Are you the homeowner?</h2>
                <p className="text-text-muted mb-5 text-sm">Financing options vary by ownership.</p>
                <div className="space-y-3">
                  <button className={optionClass} onClick={() => selectStep2("homeowner", "Yes", "2e")}>
                    Yes
                  </button>
                  <button className={optionClass} onClick={() => selectStep2("homeowner", "No", "2e")}>
                    No
                  </button>
                </div>
                {showHomeownerNote && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Financing typically requires the homeowner to apply. We can still help — let's find the right option.
                  </div>
                )}
              </div>
            )}

            {/* 2e — Property type */}
            {subStep2 === "2e" && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">What type of property?</h2>
                <p className="text-text-muted mb-5 text-sm">Almost done with this section.</p>
                <div className="space-y-3">
                  {["Single Family", "Townhouse", "Condo", "Multi-Family"].map((opt) => (
                    <button key={opt} className={optionClass} onClick={() => selectStep2("propertyType", opt, "done")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 3 — Financial Profile                                  */}
        {/* ============================================================ */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Almost done!</h2>
            <p className="text-text-muted mb-1 text-sm">This helps us match you with the best rate.</p>
            <p className="text-xs text-accent font-medium mb-5">This is NOT a credit check. Your score won't be affected.</p>

            {/* Credit range */}
            <div className="mb-5">
              <p className="text-sm font-medium text-text-primary mb-2">Estimated credit score</p>
              <div className="space-y-2">
                {["Excellent 720+", "Good 660-719", "Fair 580-659", "Below 580", "Not Sure"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update("credit", opt)}
                    className={`${optionClass} ${formData.credit === opt ? "border-accent bg-accent/10" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Income range */}
            <div className="mb-5">
              <p className="text-sm font-medium text-text-primary mb-2">Annual household income</p>
              <div className="space-y-2">
                {["Under $40K", "$40K-$75K", "$75K-$125K", "$125K+"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update("income", opt)}
                    className={`${optionClass} ${formData.income === opt ? "border-accent bg-accent/10" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Employment */}
            <div className="mb-6">
              <p className="text-sm font-medium text-text-primary mb-2">Employment status</p>
              <div className="grid grid-cols-2 gap-2">
                {["Employed", "Self-Employed", "Retired", "Other"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update("employment", opt)}
                    className={`px-3 py-2.5 text-sm border rounded-lg transition-all font-medium ${
                      formData.employment === opt
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-primary hover:border-accent hover:bg-accent/5"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className={primaryBtn}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "See My Options \u2192"
              )}
            </button>

            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full mt-3 text-sm text-text-muted hover:text-accent transition-colors underline"
            >
              Skip — Just Call Me Instead
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/*  RESULTS — fully distinct experience per tier                  */}
        {/* ============================================================ */}
        {step === "results" && (
          <div>
            {/* ---- Confirmation banner (all tiers) ---- */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800 text-sm">Thanks, {formData.name.split(" ")[0]}! Your info has been received.</p>
                  <p className="text-xs text-green-700 mt-0.5">A financing specialist will be in touch within 1 business day.</p>
                </div>
              </div>
            </div>

            {/* ---- Your Profile Summary ---- */}
            <div className="bg-bg-light rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-text-primary mb-3">Your Profile Summary</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {formData.service && (
                  <>
                    <span className="text-text-muted">Project</span>
                    <span className="text-text-primary font-medium">{formData.service}</span>
                  </>
                )}
                {formData.budget && (
                  <>
                    <span className="text-text-muted">Budget</span>
                    <span className="text-text-primary font-medium">{formData.budget}</span>
                  </>
                )}
                {formData.timeline && (
                  <>
                    <span className="text-text-muted">Timeline</span>
                    <span className="text-text-primary font-medium">{formData.timeline}</span>
                  </>
                )}
                {formData.propertyType && (
                  <>
                    <span className="text-text-muted">Property</span>
                    <span className="text-text-primary font-medium">{formData.propertyType}</span>
                  </>
                )}
                {formData.address && (
                  <>
                    <span className="text-text-muted">Location</span>
                    <span className="text-text-primary font-medium">{formData.address}</span>
                  </>
                )}
                {!formData.skipped && formData.credit && (
                  <>
                    <span className="text-text-muted">Credit</span>
                    <span className="text-text-primary font-medium">{formData.credit}</span>
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* TIER: EXCELLENT / GOOD — "You're a strong candidate"         */}
            {/* ============================================================ */}
            {(tier === "excellent" || tier === "good") && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                    </svg>
                    Strong Candidate
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-1">Great news — you likely qualify for low-rate financing!</h2>
                  <p className="text-sm text-text-muted">Based on your profile, you're a strong candidate for our best rates and terms.</p>
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-3">Recommended Lender</h3>
                <div className="space-y-3 mb-5">
                  <a href={HEARTH.url} target="_blank" rel="noopener noreferrer"
                    className="block p-4 border-2 border-green-200 bg-green-50/50 rounded-xl hover:border-green-400 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-text-primary">{HEARTH.name}</p>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Best Match</span>
                    </div>
                    <p className="text-sm text-text-muted mb-2">{HEARTH.description}</p>
                    <p className="text-xs text-accent font-medium">Apply Now →</p>
                  </a>
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-3">Your Next Steps</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">1</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Apply with Hearth above</p>
                      <p className="text-xs text-text-muted">Quick online application — most get a decision the same day.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">2</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">We'll schedule your free inspection</p>
                      <p className="text-xs text-text-muted">Our team will call to schedule a no-obligation roof assessment.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">3</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Project begins — $0 out of pocket</p>
                      <p className="text-xs text-text-muted">Once approved, we get to work. You make easy monthly payments.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TIER: FAIR — "Options available, let us guide you"           */}
            {/* ============================================================ */}
            {tier === "fair" && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Options Available
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-1">You may still qualify — and it won't affect your credit.</h2>
                  <p className="text-sm text-text-muted">No credit effect until you're funded through Hearth — not even a soft pull. Lenders with flexible credit requirements could work for you.</p>
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-3">Recommended Lender</h3>
                <a href={HEARTH.url} target="_blank" rel="noopener noreferrer"
                  className="block p-4 border-2 border-amber-200 bg-amber-50/50 rounded-xl hover:border-amber-400 transition-all mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-text-primary">{HEARTH.name}</p>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Recommended</span>
                  </div>
                  <p className="text-sm text-text-muted mb-2">{HEARTH.description}</p>
                  <p className="text-xs text-accent font-medium">Apply Now →</p>
                </a>

                <h3 className="text-sm font-bold text-text-primary mb-3">Your Next Steps</h3>
                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">1</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Our team will call you</p>
                      <p className="text-xs text-text-muted">We'll discuss your situation and help you choose the right approach.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">2</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">We'll help you apply with Hearth</p>
                      <p className="text-xs text-text-muted">Hearth connects you with 12+ lenders with flexible requirements — many homeowners in similar situations get approved.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">3</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Free inspection while you apply</p>
                      <p className="text-xs text-text-muted">We'll assess your roof so you have a clear picture of the project scope and cost.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-light rounded-xl p-4 mb-5">
                  <p className="text-sm text-text-primary font-medium mb-1">Want to talk it through?</p>
                  <p className="text-xs text-text-muted mb-3">Our financing specialist can answer your questions and walk you through the process.</p>
                  <a href="tel:+15405536007" className={primaryBtn + " inline-block text-center w-full"}>
                    Call (540) 553-6007
                  </a>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TIER: NEEDS-REVIEW — "Let's explore together"                */}
            {/* ============================================================ */}
            {tier === "needs-review" && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Personal Review
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-1">Let's find the right path for you.</h2>
                  <p className="text-sm text-text-muted">Every situation is different. Our team has helped homeowners in all kinds of credit situations find a way forward.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-blue-900 mb-2">Here's what we can do:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Explore alternative financing options through Hearth's 12+ lending partners
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Discuss payment plans tailored to your budget
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Help with insurance claims if storm damage is involved
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Phase your project to make it more affordable
                    </li>
                  </ul>
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-3">Your Next Steps</h3>
                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">1</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Our specialist calls you</p>
                      <p className="text-xs text-text-muted">We'll review your situation privately and find options that work.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">2</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">Free roof inspection</p>
                      <p className="text-xs text-text-muted">Understanding the scope helps us find the most affordable path forward.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">3</div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">We build a custom plan together</p>
                      <p className="text-xs text-text-muted">Whether it's financing, insurance, or phased work — we'll figure it out.</p>
                    </div>
                  </div>
                </div>

                <a href="tel:+15405536007" className={primaryBtn + " block text-center mb-3"}>
                  Call (540) 553-6007
                </a>
                <a href="/contact" className="block w-full px-6 py-3 border border-border text-text-primary font-semibold text-sm rounded-lg hover:border-accent transition-colors text-center">
                  Schedule a Consultation
                </a>
              </div>
            )}

            {/* ============================================================ */}
            {/* TIER: CALL-US — "We'll handle everything by phone"           */}
            {/* ============================================================ */}
            {tier === "call-us" && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Personal Consultation
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-1">We'll match you with the right option.</h2>
                  <p className="text-sm text-text-muted">Our financing team works one-on-one with homeowners to find the best path — often uncovering options you didn't know existed.</p>
                </div>

                <div className="bg-bg-light rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-text-primary mb-3">What we'll cover on the call:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">1</div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">Review your project needs</p>
                        <p className="text-xs text-text-muted">Understand exactly what work needs to be done and the expected cost.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">2</div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">Explore all available options</p>
                        <p className="text-xs text-text-muted">Financing, insurance claims, payment plans, phased work — we'll find what fits.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">3</div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">Build your custom plan</p>
                        <p className="text-xs text-text-muted">No cookie-cutter solutions. We'll design something that works for your budget.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <a href="tel:+15405536007" className={primaryBtn + " block text-center mb-3"}>
                  Call (540) 553-6007
                </a>
                <a href="/contact" className="block w-full px-6 py-3 border border-border text-text-primary font-semibold text-sm rounded-lg hover:border-accent transition-colors text-center">
                  Schedule a Consultation
                </a>
              </div>
            )}

            {/* ---- Shared footer (all tiers) ---- */}
            <div className="mt-6 pt-4 border-t border-border text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex -space-x-1">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-text-dim">Trusted by 231+ homeowners</p>
              </div>
              <button onClick={resetFunnel} className="text-xs text-text-dim hover:text-accent transition-colors underline">
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
