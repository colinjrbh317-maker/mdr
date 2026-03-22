import { useState, useEffect } from "react";
import FormModal from "../forms/FormModal";

export default function ScrollPopup() {
  const [showPromo, setShowPromo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("scroll_popup_shown")) return;
    if (sessionStorage.getItem("form_submitted")) return;

    const pageLoadTime = Date.now();
    let triggered = false;

    function handleScroll() {
      if (triggered) return;
      // Must be on page for at least 15 seconds
      if (Date.now() - pageLoadTime < 15000) return;

      const scrollPercent =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

      if (scrollPercent >= 0.5) {
        triggered = true;
        sessionStorage.setItem("scroll_popup_shown", "1");
        setShowPromo(true);
        window.removeEventListener("scroll", handleScroll);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!showPromo) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPromo(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPromo]);

  if (!showPromo && !showForm) return null;

  if (showForm) {
    return <FormModal isOpen={true} onClose={() => setShowForm(false)} />;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowPromo(false);
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Financing offer"
        className="relative w-full max-w-md mx-4 bg-white border border-border rounded-2xl p-8 animate-slide-up text-center shadow-2xl"
      >
        <button
          onClick={() => setShowPromo(false)}
          className="absolute top-4 right-4 text-text-dim hover:text-text-primary transition-colors p-1"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          0% Financing Available
        </h2>
        <p className="text-text-muted mb-6">
          Get a new roof with $0 down and low monthly payments. Check your rate in minutes — no impact to your credit score.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="/financing"
            className="w-full px-6 py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg transition-colors inline-block"
          >
            View Financing Options
          </a>
          <button
            onClick={() => {
              setShowPromo(false);
              setShowForm(true);
            }}
            className="w-full px-6 py-3 border border-border text-text-primary hover:bg-bg-card font-semibold rounded-lg transition-colors"
          >
            Get a Free Estimate
          </button>
        </div>

        <button
          onClick={() => setShowPromo(false)}
          className="mt-3 text-sm text-text-dim hover:text-text-muted transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
