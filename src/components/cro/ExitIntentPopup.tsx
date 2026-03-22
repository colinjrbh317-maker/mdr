import { useState, useEffect, useCallback } from "react";
import FormModal from "../forms/FormModal";

export default function ExitIntentPopup() {
  const [showPromo, setShowPromo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY > 0) return;
    if (sessionStorage.getItem("exit_popup_shown")) return;
    if (sessionStorage.getItem("form_submitted")) return;

    sessionStorage.setItem("exit_popup_shown", "1");
    setShowPromo(true);
  }, []);

  useEffect(() => {
    // Desktop only
    if (window.innerWidth < 768) return;
    // Already shown this session
    if (sessionStorage.getItem("exit_popup_shown")) return;

    // Delay activation by 10 seconds
    const timer = setTimeout(() => {
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

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
        aria-label="Special offer"
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          $500 Off Your Roof Replacement
        </h2>
        <p className="text-text-muted mb-6">
          Schedule your free inspection today and save. Limited time offer for homeowners in the New River Valley.
        </p>

        <button
          onClick={() => {
            setShowPromo(false);
            setShowForm(true);
          }}
          className="w-full px-6 py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg transition-colors"
        >
          Claim Your $500 Discount
        </button>

        <button
          onClick={() => setShowPromo(false)}
          className="mt-3 text-sm text-text-dim hover:text-text-muted transition-colors"
        >
          No thanks, I'll pay full price
        </button>
      </div>
    </div>
  );
}
