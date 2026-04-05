/**
 * Twilio SMS client for sending text confirmations to new leads.
 * Bypasses AccuLynx's SMS consent requirement by sending directly via Twilio.
 * Messages are logged back to AccuLynx as job notes for CRM visibility.
 */

const ACCOUNT_SID = import.meta.env.TWILIO_ACCOUNT_SID || "";
const AUTH_TOKEN = import.meta.env.TWILIO_AUTH_TOKEN || "";
const FROM_NUMBER = import.meta.env.TWILIO_PHONE_NUMBER || "";

/**
 * Send an SMS via Twilio.
 * Returns the message SID on success, null on failure.
 */
export async function sendSMS(to: string, body: string): Promise<string | null> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.error("[Twilio] Missing credentials — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not set");
    return null;
  }

  // Normalize phone number to E.164 format (+1XXXXXXXXXX)
  const normalized = normalizePhone(to);
  if (!normalized) {
    console.error(`[Twilio] Invalid phone number: ${to}`);
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalized,
        From: FROM_NUMBER,
        Body: body,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error(`[Twilio] SMS failed: ${res.status} ${errorBody}`);
      return null;
    }

    const data = await res.json();
    console.log(`[Twilio] SMS sent to ${normalized}: SID=${data.sid}`);
    return data.sid;
  } catch (err) {
    console.error("[Twilio] SMS error:", err);
    return null;
  }
}

/**
 * Send the instant lead confirmation text.
 */
export async function sendLeadConfirmationSMS(phone: string, firstName: string): Promise<string | null> {
  const body = `Hi ${firstName}! This is Modern Day Roofing. We received your inquiry and will be reaching out shortly. Need immediate help? Call us at (540) 553-6007`;
  return sendSMS(phone, body);
}

/**
 * Normalize a phone number to E.164 format for Twilio.
 * Handles: "5402551234", "(540) 255-1234", "540-255-1234", "+15402551234"
 */
function normalizePhone(phone: string): string | null {
  // Strip everything except digits and leading +
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}
