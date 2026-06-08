/**
 * Sends an internal notification email to Sierra (or her configured replacement)
 * every time a callback request comes in via the website form.
 *
 * Sierra's existing flow: see the lead drop into AccuLynx and check the CRM
 * note. Problem: that requires her to be actively watching AccuLynx. This
 * email lands directly in her inbox so callbacks get reaction time even when
 * she isn't watching the CRM.
 *
 * Triggered by submit-form.ts after AccuLynx createLead succeeds. The email
 * mirrors the structure of the AccuLynx note (source, contact info, urgency)
 * so Sierra has everything in the email itself — no AccuLynx click required
 * to triage.
 *
 * Uses Resend (same provider as lead-confirmation-email.ts). If
 * RESEND_API_KEY isn't set, no-ops gracefully — the AccuLynx note still
 * lands.
 */

import { getBusinessHoursInfo } from "./business-hours";

const SENDGRID_API_KEY = import.meta.env.SENDGRID_API_KEY;
const FROM_EMAIL = import.meta.env.INTERNAL_NOTIFICATION_FROM ?? "leads@moderndayroof.com";
const FROM_NAME = "Modern Day Roofing Leads";
const SIERRA_EMAIL = import.meta.env.SIERRA_NOTIFICATION_EMAIL ?? "sierraduncanmdr@gmail.com";

interface SierraNotificationData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  service?: string;
  message?: string;
  source?: string;
  landing_page?: string;
  gclid?: string;
  fclid?: string;
  chat_context?: string;
  sms_consent?: boolean;
  priority?: string;
  acculynx_job_id?: string | number | null;
}

const SOURCE_LABELS: Record<string, string> = {
  "ai-chatbot": "AI CHATBOT LEAD",
  "contact-form": "CONTACT FORM LEAD",
  "contact-page": "CONTACT PAGE LEAD",
  "referral-outbound": "REFERRAL — REFERRER",
  "referral-inbound": "REFERRAL — REFERRED",
  "financing-funnel": "FINANCING QUIZ LEAD",
  "lp-hero": "LP HERO FORM",
  "lp-final-cta": "LP FINAL CTA FORM",
  "lp-mini": "LP MINI FORM",
  "emergency": "EMERGENCY LEAD",
  "exit-intent": "EXIT-INTENT POPUP LEAD",
  "phone-rescue": "PHONE-CLICK RESCUE LEAD",
  "mobile-retention": "MOBILE RETENTION LEAD",
  "roof-quiz": "ROOF QUIZ LEAD",
};

/**
 * Fire-and-forget email send. Returns true if Resend accepted, false on any
 * error. Never throws into the form pipeline.
 */
export async function sendSierraNotification(data: SierraNotificationData): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log("[SierraNotif] SENDGRID_API_KEY not set — skipping (CRM note still lands)");
    return false;
  }
  if (!SIERRA_EMAIL || !SIERRA_EMAIL.includes("@")) {
    console.log("[SierraNotif] SIERRA_NOTIFICATION_EMAIL not configured — skipping");
    return false;
  }

  const hours = getBusinessHoursInfo();
  const sourceLabel = SOURCE_LABELS[data.source ?? ""] ?? (data.source ? `${data.source.toUpperCase()} LEAD` : "WEB LEAD");
  const isUrgent = data.priority === "urgent" || data.source === "emergency";

  const urgencyLine = isUrgent
    ? "URGENT — call back IMMEDIATELY (emergency request)."
    : hours.isOpen
      ? "SLA: Call back within 3 minutes per SOP."
      : `AFTER HOURS — call back ${hours.callbackPhrase} (first thing when office opens).`;

  const smsLine = data.sms_consent === true
    ? "SMS Consent: GRANTED (you may text this lead)"
    : "SMS Consent: NOT GIVEN (calls only — do not text)";

  const subject = isUrgent
    ? `[URGENT] Callback request — ${data.name}`
    : `Callback request — ${data.name} (${sourceLabel})`;

  // Build the detail rows (filter out nulls before joining)
  const detailRows: Array<[string, string]> = [];
  detailRows.push(["Name", data.name]);
  detailRows.push(["Phone", data.phone]);
  if (data.email?.trim()) detailRows.push(["Email", data.email]);
  if (data.address?.trim()) detailRows.push(["Address", data.address]);
  if (data.service?.trim()) detailRows.push(["Service", data.service]);
  if (data.landing_page) detailRows.push(["Landed on", data.landing_page]);
  if (data.gclid) detailRows.push(["Google Click ID", data.gclid]);
  if (data.fclid) detailRows.push(["Facebook Click ID", data.fclid]);
  if (data.acculynx_job_id) detailRows.push(["AccuLynx Job ID", String(data.acculynx_job_id)]);

  const detailRowsHtml = detailRows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-weight:600;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:4px 0;color:#1B1B1B;">${escapeHtml(v)}</td></tr>`)
    .join("");

  const messageBlock = data.message?.trim()
    ? `<p style="margin:16px 0 0 0;font-size:13px;color:#6B7280;font-weight:600;">Message from lead:</p><p style="margin:4px 0 0 0;padding:12px 14px;background:#F7F7F5;border-left:3px solid #C0392B;font-size:14px;color:#1B1B1B;line-height:1.5;">${escapeHtml(data.message)}</p>`
    : "";

  const chatBlock = data.chat_context?.trim()
    ? `<p style="margin:16px 0 0 0;font-size:13px;color:#6B7280;font-weight:600;">What they said in chat:</p><p style="margin:4px 0 0 0;padding:12px 14px;background:#F7F7F5;border-left:3px solid #3B82F6;font-size:14px;color:#1B1B1B;line-height:1.5;">${escapeHtml(data.chat_context)}</p>`
    : "";

  const accentColor = isUrgent ? "#C0392B" : "#1F2937";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F0EDE8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1B1B1B;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E0D8;">
          <tr><td style="padding:24px 32px;background:${accentColor};">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;opacity:0.85;">${escapeHtml(sourceLabel)}</p>
            <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:700;color:#FFFFFF;">Callback request: ${escapeHtml(data.name)}</h1>
          </td></tr>
          <tr><td style="padding:24px 32px;">
            <p style="margin:0 0 16px 0;padding:12px 14px;background:${isUrgent ? '#FEE2E2' : '#FEF3C7'};border-left:3px solid ${isUrgent ? '#DC2626' : '#D97706'};font-size:14px;color:#1B1B1B;font-weight:600;">${escapeHtml(urgencyLine)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
              ${detailRowsHtml}
            </table>
            ${messageBlock}
            ${chatBlock}
            <p style="margin:20px 0 4px 0;font-size:13px;color:#6B7280;">${escapeHtml(smsLine)}</p>
            <p style="margin:0;font-size:12px;color:#9CA3AF;">Submitted: ${escapeHtml(hours.currentET)}</p>
          </td></tr>
          <tr><td style="padding:16px 32px;background:#F7F7F5;border-top:1px solid #E5E0D8;font-size:12px;color:#6B7280;">
            Automated notification from the moderndayroof.com website form pipeline. The AccuLynx CRM note has the same data &mdash; this email is the redundant signal so callbacks don't wait for a CRM check.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textLines: string[] = [];
  textLines.push(`${sourceLabel}`);
  textLines.push(`Callback request: ${data.name}`);
  textLines.push(``);
  textLines.push(urgencyLine);
  textLines.push(``);
  for (const [k, v] of detailRows) textLines.push(`${k}: ${v}`);
  if (data.message?.trim()) {
    textLines.push(``);
    textLines.push(`Message from lead:`);
    textLines.push(data.message);
  }
  if (data.chat_context?.trim()) {
    textLines.push(``);
    textLines.push(`What they said in chat:`);
    textLines.push(data.chat_context);
  }
  textLines.push(``);
  textLines.push(smsLine);
  textLines.push(`Submitted: ${hours.currentET}`);
  const text = textLines.join("\n");

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SIERRA_EMAIL }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[SierraNotif] SendGrid rejected (${res.status}):`, errBody);
      return false;
    }
    console.log(`[SierraNotif] Sent to ${SIERRA_EMAIL} for lead ${data.name}`);
    return true;
  } catch (err) {
    console.error("[SierraNotif] Send error:", err);
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
