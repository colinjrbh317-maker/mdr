/**
 * Sends a thank-you confirmation email to the lead after form submission.
 * Triggered ONLY by web form submissions (not phone calls or manual CRM entries),
 * per Apr 29 meeting decision (avoid double-tap with appointment confirmations).
 *
 * Uses Resend transactional email API. If RESEND_API_KEY isn't set, this no-ops
 * gracefully and logs a warning — the function never throws into the form pipeline.
 *
 * Copy is business-hours aware (uses getBusinessHoursInfo) so weekend submissions
 * say "Monday morning" instead of promising a same-day callback.
 */

import { getBusinessHoursInfo } from "./business-hours";

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.LEAD_CONFIRMATION_FROM ?? "Modern Day Roofing <hello@moderndayroof.com>";
const REPLY_TO = import.meta.env.LEAD_CONFIRMATION_REPLY_TO ?? "sales@moderndayroof.com";

interface ConfirmationData {
  to: string;
  firstName: string;
  isUrgent?: boolean;
}

/**
 * Fire-and-forget email send. Returns true if Resend accepted the request,
 * false on any error (or if API key not configured). Never throws.
 */
export async function sendLeadConfirmationEmail(data: ConfirmationData): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[LeadEmail] RESEND_API_KEY not set — skipping confirmation email (lead still in CRM)");
    return false;
  }
  if (!data.to || !data.to.includes("@")) {
    return false;
  }

  const hours = getBusinessHoursInfo();
  const calloutLine = data.isUrgent
    ? "We received your <strong>emergency request</strong> and will be in touch as soon as possible."
    : hours.isOpen
      ? "We received your inquiry and a member of our team will call you within the hour."
      : `We received your inquiry. We're closed right now — you'll hear from us <strong>${hours.callbackPhrase}</strong>.`;

  const subject = data.isUrgent
    ? "We got your emergency request — Modern Day Roofing"
    : "Thanks — we got your request";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F0EDE8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1B1B1B;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E0D8;">
            <tr>
              <td style="padding:32px 32px 16px;border-bottom:3px solid #C0392B;">
                <h1 style="margin:0;font-size:24px;font-weight:700;color:#1B1B1B;font-family:Georgia,serif;">Modern Day Roofing</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1B1B1B;">Hi ${escapeHtml(data.firstName)},</h2>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3D3D3D;">${calloutLine}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#3D3D3D;">If it's urgent, you can reach us directly at <a href="tel:5405536007" style="color:#C0392B;font-weight:600;text-decoration:none;">(540) 553-6007</a>.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#C0392B;border-radius:6px;">
                      <a href="https://moderndayroof.com" style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-weight:600;text-decoration:none;font-size:15px;">Visit Our Website</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#F7F7F5;border-top:1px solid #E5E0D8;font-size:13px;color:#6B7280;">
                <p style="margin:0 0 6px;"><strong>Modern Day Roofing</strong> — GAF Master Elite Contractor</p>
                <p style="margin:0;">Christiansburg • Roanoke • Serving the New River Valley and Roanoke Area</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${data.firstName},

${stripTags(calloutLine)}

If it's urgent, call us directly at (540) 553-6007.

— Modern Day Roofing
GAF Master Elite Contractor
moderndayroof.com`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: data.to,
        reply_to: REPLY_TO,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[LeadEmail] Resend rejected (${res.status}):`, errBody);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[LeadEmail] Send error:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
