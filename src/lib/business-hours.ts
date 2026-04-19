/**
 * MDR business hours: Monday–Friday, 8:30am–5:00pm America/New_York.
 * Used by the chat widget and /api/submit-form to:
 *  - Adjust the callback wording ("a few minutes" vs "first thing Monday morning")
 *  - Flag off-hours leads in the AccuLynx note so reps don't get paged on weekends
 *
 * Safe to call on both server (Astro SSR / API routes) and client (React).
 * Uses Intl.DateTimeFormat with timeZone to avoid timezone drift.
 */

const TZ = "America/New_York";
const OPEN_MIN = 8 * 60 + 30; // 08:30 → 510
const CLOSE_MIN = 17 * 60; // 17:00 → 1020

interface EasternParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sun, 1 = Mon, ... 6 = Sat
}

function getEasternParts(date = new Date()): EasternParts {
  // Use Intl.DateTimeFormat to extract Eastern time parts
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24, // handle '24' edge case
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export interface BusinessHoursInfo {
  /** True if current Eastern time is within M-F 8:30am-5pm. */
  isOpen: boolean;
  /** Human phrase: "a few minutes" (open) or e.g. "Monday morning" (closed). */
  callbackPhrase: string;
  /** Short label for CRM notes. */
  crmLabel: string;
  /** Current day/time string for logs/notes. */
  currentET: string;
}

export function getBusinessHoursInfo(now = new Date()): BusinessHoursInfo {
  const p = getEasternParts(now);
  const minuteOfDay = p.hour * 60 + p.minute;
  const isWeekday = p.weekday >= 1 && p.weekday <= 5;
  const isOpen = isWeekday && minuteOfDay >= OPEN_MIN && minuteOfDay < CLOSE_MIN;

  const currentET = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")} ET`;

  if (isOpen) {
    return {
      isOpen: true,
      callbackPhrase: "a few minutes",
      crmLabel: "BUSINESS HOURS — 3-min SLA",
      currentET,
    };
  }

  // Closed — determine next open phrase
  // Weekend or outside hours
  let phrase: string;
  if (p.weekday === 0) {
    // Sunday
    phrase = "Monday morning";
  } else if (p.weekday === 6) {
    // Saturday
    phrase = "Monday morning";
  } else if (p.weekday === 5 && minuteOfDay >= CLOSE_MIN) {
    // Friday after 5pm
    phrase = "Monday morning";
  } else if (minuteOfDay < OPEN_MIN) {
    // Before 8:30am on a weekday
    phrase = "this morning at 8:30";
  } else {
    // After 5pm on M-Th
    phrase = "tomorrow morning";
  }

  return {
    isOpen: false,
    callbackPhrase: phrase,
    crmLabel: `AFTER HOURS — will call ${phrase}`,
    currentET,
  };
}
