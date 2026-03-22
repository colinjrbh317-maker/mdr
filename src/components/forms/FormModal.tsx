import { useEffect, useRef } from "react";
import LeadCaptureForm from "./LeadCaptureForm";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FormModal({ isOpen, onClose }: FormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Trap focus inside modal
    const modal = modalRef.current;
    if (modal) {
      const firstInput = modal.querySelector<HTMLElement>("input, button, textarea");
      firstInput?.focus();
    }

    // Close on Escape
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    // Prevent body scroll
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Request a quote"
        className="relative w-full md:max-w-md bg-white border border-border rounded-t-2xl md:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Get Your Free Estimate</h2>
            <p className="text-text-muted text-sm">Free inspection. No obligation.</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-primary transition-colors p-1"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <LeadCaptureForm compact source="mobile-sticky-cta" />
      </div>
    </div>
  );
}
