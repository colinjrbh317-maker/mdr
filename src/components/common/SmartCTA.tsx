import { useEffect, useState } from "react";
import { getBusinessHoursInfo } from "@/lib/business-hours";
import { track } from "@/lib/track-events";

/**
 * Business-hours–aware CTA pair.
 *  - During hours (M-F 8:30am–5pm ET): "Call Now" is primary.
 *  - Outside hours: "Request Callback" is primary, phone label shifts to
 *    the next open day.
 *
 * Renders a primary button + a smaller secondary, plus a sub-line that
 * tells the visitor what response to expect. Location (header/hero/footer/
 * sticky) is passed through to event tracking.
 */

interface Props {
  /** Phone number in tel:-acceptable format, e.g. "15405551234". */
  phoneTel: string;
  /** Display phone number, e.g. "(540) 555-1234". */
  phoneDisplay: string;
  /** Anchor or URL for the callback CTA. Defaults to #hero-form. */
  callbackHref?: string;
  /** Where this CTA lives — goes to event tracking and data-source. */
  location: string;
  /** Visual density. "compact" skips the sub-line. */
  size?: "default" | "compact";
  /** Surface appearance — "dark" uses white-on-transparent for over-video/dark backgrounds. */
  theme?: "light" | "dark";
  /** Optional className for outer wrapper. */
  className?: string;
}

export default function SmartCTA({
  phoneTel,
  phoneDisplay,
  callbackHref = "#hero-form",
  location,
  size = "default",
  theme = "light",
  className = "",
}: Props) {
  const isDark = theme === "dark";
  const secondaryBtnClass = isDark
    ? "inline-flex items-center px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm rounded-lg transition-colors"
    : "inline-flex items-center px-5 py-3 border border-border hover:border-accent text-text-primary font-semibold text-sm rounded-lg transition-colors";
  const subClass = isDark ? "text-xs text-white/70" : "text-xs text-text-muted";
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [callbackPhrase, setCallbackPhrase] = useState("a few minutes");

  useEffect(() => {
    const info = getBusinessHoursInfo();
    setIsOpen(info.isOpen);
    setCallbackPhrase(info.callbackPhrase);
  }, []);

  // SSR + first paint: assume open (most visitors arrive during the day).
  // Hydration corrects the state within a tick.
  const openResolved = isOpen ?? true;
  const showSub = size !== "compact";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {openResolved ? (
          <>
            <a
              href={`tel:${phoneTel}`}
              data-source={location}
              onClick={() => track("smart_cta_click", { location, action: "call", state: "open" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              Call Now: {phoneDisplay}
            </a>
            <a
              href={callbackHref}
              onClick={() => track("smart_cta_click", { location, action: "callback", state: "open" })}
              className={secondaryBtnClass}
            >
              Request Callback
            </a>
          </>
        ) : (
          <>
            <a
              href={callbackHref}
              onClick={() => track("smart_cta_click", { location, action: "callback", state: "closed" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-colors"
            >
              Request Callback
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href={`tel:${phoneTel}`}
              data-source={location}
              onClick={() => track("smart_cta_click", { location, action: "call", state: "closed" })}
              className={secondaryBtnClass}
            >
              Call {phoneDisplay}
            </a>
          </>
        )}
      </div>

      {showSub && (
        <p className={subClass}>
          {openResolved ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
              Open now — typical response in {callbackPhrase}.
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
              Closed — we'll reach out {callbackPhrase}.
            </>
          )}
        </p>
      )}
    </div>
  );
}
