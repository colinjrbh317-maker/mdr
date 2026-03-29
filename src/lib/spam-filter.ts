/**
 * Server-side spam filter for lead capture forms.
 * Multi-layer defense: phone validation, email checks, content scoring,
 * rate limiting, and duplicate detection.
 */

// --- Disposable email domains (top ~60 providers) ---
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "yopmail.com",
  "throwaway.email", "temp-mail.org", "fakeinbox.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com", "mailnesia.com",
  "maildrop.cc", "discard.email", "trashmail.com", "trashmail.me",
  "10minutemail.com", "tempail.com", "burnermail.io", "mailcatch.com",
  "getairmail.com", "mohmal.com", "getnada.com", "emailondeck.com",
  "mintemail.com", "tempr.email", "spamgourmet.com", "mytemp.email",
  "harakirimail.com", "33mail.com", "mailsac.com", "inboxkitten.com",
  "tempinbox.com", "binkmail.com", "trashmail.net", "spam4.me",
  "jetable.org", "fakemailgenerator.com", "armyspy.com", "cuvox.de",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us", "mailnull.com",
  "tempmailo.com", "bugmenot.com", "tmail.ws", "tmpmail.net",
  "tmpmail.org", "mailtemp.net", "mailtemp.org", "tempmailaddress.com",
  "disposableemailaddresses.emailmiser.com", "mailexpire.com",
]);

// --- Spam keywords in message body ---
const SPAM_KEYWORDS = [
  "casino", "viagra", "cialis", "crypto", "bitcoin", "forex",
  "click here", "buy now", "free money", "act now", "limited time",
  "congratulations", "you've won", "lottery", "prince", "inheritance",
  "make money fast", "work from home", "earn extra", "double your",
  "prescription", "pharmacy", "cheap meds", "weight loss", "diet pills",
];

// --- Rate limiting store (IP → timestamps) ---
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 3;

// --- Duplicate detection store (hash → timestamp) ---
const duplicateStore = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup stale entries periodically (every 5 min)
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return;
  lastCleanup = now;

  for (const [ip, timestamps] of rateLimitStore) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) rateLimitStore.delete(ip);
    else rateLimitStore.set(ip, valid);
  }

  for (const [hash, timestamp] of duplicateStore) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) duplicateStore.delete(hash);
  }
}

/** Strip non-digits from phone string */
function stripPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Validate US phone number (10 digits, or 11 starting with 1) */
export function isValidUSPhone(phone: string): boolean {
  const digits = stripPhone(phone);

  // Must be 10 digits, or 11 starting with "1"
  let normalized = digits;
  if (digits.length === 11 && digits.startsWith("1")) {
    normalized = digits.slice(1);
  }
  if (normalized.length !== 10) return false;

  // Reject all-same-digit
  if (/^(\d)\1{9}$/.test(normalized)) return false;

  // Reject 555 prefix (fictional numbers)
  if (normalized.slice(3, 6) === "555") return false;

  // Area code can't start with 0 or 1
  if (normalized[0] === "0" || normalized[0] === "1") return false;

  return true;
}

/** Check if email domain is a known disposable provider */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true; // No domain = suspicious
  return DISPOSABLE_DOMAINS.has(domain);
}

/** Validate basic email format */
export function isValidEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  // Basic format check: something@something.something
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate name field */
export function isValidName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;

  // Reject names that are just numbers
  if (/^\d+$/.test(name.trim())) return false;

  // Reject names containing URLs
  if (/https?:\/\/|www\./i.test(name)) return false;

  // Reject excessive special characters (more than 30% non-alpha)
  const alphaCount = (name.match(/[a-zA-Z\s]/g) || []).length;
  if (alphaCount / name.length < 0.7) return false;

  return true;
}

/** Score message content for spam signals (0 = clean, higher = spammier) */
export function scoreMessage(message: string): number {
  if (!message || message.trim().length === 0) return 0;

  let score = 0;
  const lower = message.toLowerCase();

  // Count URLs
  const urlCount = (message.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) score += 30;
  else if (urlCount > 0) score += urlCount * 5;

  // Check spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      score += 15;
    }
  }

  // ALL CAPS message (>50% uppercase, min 20 chars)
  if (message.length > 20) {
    const upperCount = (message.match(/[A-Z]/g) || []).length;
    const letterCount = (message.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.5) {
      score += 10;
    }
  }

  // Excessive length (>2000 chars for a roofing inquiry is suspicious)
  if (message.length > 2000) score += 10;

  return Math.min(score, 100);
}

/** Check for duplicate submission (same name+phone+email within window) */
export function isDuplicate(name: string, phone: string, email: string): boolean {
  const hash = `${name.toLowerCase().trim()}|${stripPhone(phone)}|${email.toLowerCase().trim()}`;
  const now = Date.now();
  const lastSeen = duplicateStore.get(hash);

  if (lastSeen && now - lastSeen < DUPLICATE_WINDOW_MS) {
    return true;
  }

  duplicateStore.set(hash, now);
  return false;
}

/** Check if IP is rate limited */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];

  // Filter to only recent timestamps
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  return false;
}

/** Extract client IP from request headers (Vercel) */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface SpamCheckResult {
  pass: boolean;
  reason?: string;
  score: number;
}

/** Run all spam checks. Returns pass=true if submission looks legitimate. */
export function spamCheck(
  data: {
    name: string;
    phone: string;
    email: string;
    message?: string;
  },
  ip: string,
): SpamCheckResult {
  cleanup();

  let score = 0;

  // 1. Rate limiting
  if (isRateLimited(ip)) {
    return { pass: false, reason: "rate_limited", score: 100 };
  }

  // 2. Phone validation
  if (!isValidUSPhone(data.phone)) {
    return { pass: false, reason: "invalid_phone", score: 80 };
  }

  // 3. Email validation
  if (data.email) {
    if (!isValidEmail(data.email)) {
      return { pass: false, reason: "invalid_email", score: 70 };
    }
    if (isDisposableEmail(data.email)) {
      return { pass: false, reason: "disposable_email", score: 75 };
    }
  }

  // 4. Name validation
  if (!isValidName(data.name)) {
    return { pass: false, reason: "invalid_name", score: 65 };
  }

  // 5. Message content scoring
  if (data.message) {
    const messageScore = scoreMessage(data.message);
    score += messageScore;
  }

  // 6. Duplicate detection
  if (isDuplicate(data.name, data.phone, data.email || "")) {
    return { pass: false, reason: "duplicate", score: 90 };
  }

  // Final verdict
  if (score >= 60) {
    return { pass: false, reason: "spam_score", score };
  }

  return { pass: true, score };
}
