import { useEffect, useState } from "react";
import { getEarnedTier, isReturningVisitor } from "@/lib/visitor-history";
import { track } from "@/lib/track-events";

/**
 * Thin banner that greets returning visitors who demonstrated real intent
 * on a prior visit (earned_tier === "hot"). Dismissible per session.
 *
 * Only shows when ALL of these are true:
 *   - Prior session(s) qualified as hot (2+ service pages, phone click,
 *     form start, offers/financing visit, or 3+ min on service page)
 *   - Current page is a high-intent surface (homepage or service/area page)
 *   - No form already submitted this session
 *   - Banner not dismissed this session
 *
 * Purpose: frame the $500 discount as something the visitor earned by
 * coming back, not something we throw at everyone.
 */

const DISMISS_KEY = "mdr_welcome_back_dismissed";

function pageIsHighIntent(path: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized === "/") return true;
  return (
    normalized.startsWith("/services") ||
    normalized.startsWith("/areas") ||
    normalized.startsWith("/offers") ||
    normalized.startsWith("/lp")
  );
}

export default function WelcomeBackBanner({ currentPage = "/" }: { currentPage?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pageIsHighIntent(currentPage)) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (sessionStorage.getItem("form_submitted")) return;
    if (!isReturningVisitor()) return;
    if (getEarnedTier() !== "hot") return;

    setVisible(true);
    track("welcome_back_shown", { path: currentPage });
  }, [currentPage]);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    track("welcome_back_dismissed", {});
  }

  function handleClaim() {
    track("welcome_back_click", { path: currentPage });
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Welcome back offer"
      className="relative bg-gradient-to-r from-accent/10 via-white to-amber-50 border-b border-accent/20"
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-accent flex-shrink-0" />
          <p className="text-sm text-text-primary leading-snug truncate">
            <span className="font-bold">Welcome back.</span>{" "}
            <span className="text-text-muted">Your $500 off is still available.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/offers/500-off"
            onClick={handleClaim}
            className="inline-flex items-center gap-1 px-4 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-bold uppercase tracking-wide rounded-md transition-colors"
          >
            Claim Now
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1.5 text-text-dim hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
