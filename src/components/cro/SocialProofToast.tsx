import { useState, useEffect, useCallback } from "react";

const PROOF_ENTRIES = [
  { name: "Shannon P.", city: "Christiansburg", action: "booked a free inspection" },
  { name: "Marcus T.", city: "Blacksburg", action: "scheduled a roof replacement" },
  { name: "Jennifer L.", city: "Roanoke", action: "booked a free inspection" },
  { name: "David W.", city: "Salem", action: "requested a storm damage assessment" },
  { name: "Amanda R.", city: "Radford", action: "booked a free inspection" },
  { name: "Chris M.", city: "Christiansburg", action: "got a financing pre-approval" },
  { name: "Lisa K.", city: "Floyd", action: "booked a free inspection" },
  { name: "Robert H.", city: "Blacksburg", action: "scheduled a free estimate" },
];

function getTimeAgo(): string {
  const minutes = Math.floor(Math.random() * 180) + 10; // 10 min to 3 hours
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}

export default function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [entry, setEntry] = useState<(typeof PROOF_ENTRIES)[0] | null>(null);
  const [timeAgo, setTimeAgo] = useState("");
  const [showCount, setShowCount] = useState(0);

  const showToast = useCallback(() => {
    if (showCount >= 3) return;
    if (sessionStorage.getItem("form_submitted")) return;

    const randomEntry = PROOF_ENTRIES[Math.floor(Math.random() * PROOF_ENTRIES.length)];
    setEntry(randomEntry);
    setTimeAgo(getTimeAgo());
    setVisible(true);
    setShowCount((c) => c + 1);

    // Auto-dismiss after 5s
    setTimeout(() => setVisible(false), 5000);
  }, [showCount]);

  useEffect(() => {
    // Desktop only
    if (window.innerWidth < 1024) return;

    // First toast at 25s
    const firstTimer = setTimeout(() => showToast(), 25000);

    // Subsequent toasts every 45s
    const interval = setInterval(() => showToast(), 45000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [showToast]);

  if (!visible || !entry) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-50 max-w-[300px] bg-white rounded-xl shadow-2xl border border-border p-4 animate-slide-up cursor-pointer"
      onClick={() => {
        const form = document.getElementById("hero-form");
        if (form) {
          form.scrollIntoView({ behavior: "smooth" });
        }
        setVisible(false);
      }}
      role="status"
      aria-live="polite"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
        }}
        className="absolute top-2 right-2 text-text-dim hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {entry.name} in {entry.city}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{entry.action}</p>
          <p className="text-[10px] text-text-dim mt-1">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}
