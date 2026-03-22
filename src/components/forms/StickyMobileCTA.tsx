import { useState } from "react";
import FormModal from "./FormModal";

interface StickyMobileCTAProps {
  phone?: string;
}

export default function StickyMobileCTA({ phone = "5405536007" }: StickyMobileCTAProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const formattedPhone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-darker border-t border-border px-4 py-3">
        <div className="flex gap-3">
          <a
            href={`tel:${phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary font-semibold transition-colors hover:bg-bg-card-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call Now
          </a>
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Get Quote
          </button>
        </div>
      </div>

      <FormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
