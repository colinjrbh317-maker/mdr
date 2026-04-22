import type { APIRoute } from "astro";
import { spamCheck, getClientIP } from "@/lib/spam-filter";
import { createLead, addJobNote, addJobMessage, formatFinancingNote } from "@/lib/acculynx";
import { sendLeadConfirmationSMS } from "@/lib/twilio";
import { getBusinessHoursInfo } from "@/lib/business-hours";

export const prerender = false;

/** Fake success response — used for spam rejections to avoid tipping off bots */
function fakeSuccess() {
  return new Response(JSON.stringify({ success: true, message: "Thank you! We'll be in touch shortly." }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, phone, email, address, service, message, website, source, gclid, fclid, landing_page, financing_data, sms_consent, chat_context } = body;

    // --- Layer 1: Honeypot check ---
    if (website) {
      console.log("[Spam] Honeypot triggered");
      return fakeSuccess();
    }

    // --- Basic validation ---
    if (!name?.trim() || !phone?.trim()) {
      return new Response(JSON.stringify({ success: false, message: "Name and phone are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- Layer 2: Server-side spam filter ---
    const clientIP = getClientIP(request);
    const spamResult = spamCheck(
      {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || "",
        message: message?.trim() || "",
      },
      clientIP,
    );

    if (!spamResult.pass) {
      console.log(`[Spam] Rejected: ${spamResult.reason} (score: ${spamResult.score}, IP: ${clientIP})`);
      return fakeSuccess();
    }

    // --- Passed all filters — this is a legitimate lead ---

    // Parse name into first/last for AccuLynx
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Parse address components (if provided as combined string)
    // Forms may send full address or separate city/state/zip
    const addressStr = address?.trim() || "";

    // Determine if this is a financing funnel lead
    const isFinancingLead = source === "financing-funnel";

    // Parse financing profile from message if present
    let financingProfile: Record<string, string> = {};
    if (isFinancingLead && message) {
      try {
        const match = message.match(/Financing funnel profile: (.+)/);
        if (match) financingProfile = JSON.parse(match[1]);
      } catch { /* non-fatal — profile just won't be in note */ }
    }

    // --- Server-side PostHog: fire lead_created for every real (spam-passed) lead ---
    // Intentionally BEFORE AccuLynx so a CRM hiccup doesn't lose the conversion event.
    // AccuLynx status gets attached as properties after it runs below.
    let acculynxJobId: string | number | null = null;
    let acculynxContactId: string | number | null = null;
    let acculynxStatus: "success" | "failed" | "skipped" = "skipped";

    // --- CRM + SMS + Sheets: await all before returning response ---
    // Vercel serverless kills execution after response is sent,
    // so everything must complete before we return.

    // 1. Create lead in AccuLynx CRM
    try {
      const result = await createLead({
        firstName,
        lastName,
        phone: phone.trim(),
        email: email?.trim() || "",
        address: addressStr,
        serviceType: service?.trim() || "",
        formSource: source || "",
        gclid: gclid || "",
        fclid: fclid || "",
      });

      if (result) {
        console.log(`[AccuLynx] Lead created: contact=${result.contactId}, job=${result.jobId}`);
        acculynxJobId = result.jobId;
        acculynxContactId = result.contactId;
        acculynxStatus = "success";

        // Send instant SMS confirmation via Twilio
        if (result.jobId && phone) {
          const smsResult = await sendLeadConfirmationSMS(phone.trim(), firstName);
          if (smsResult) {
            // Log the text in AccuLynx job messages so Sierra sees it
            await addJobMessage(result.jobId, `[Auto-SMS sent via Twilio] Hi ${firstName}! This is Modern Day Roofing. We received your inquiry and will be reaching out shortly. Need immediate help? Call us at (540) 553-6007`);
          }
        }

        // For financing leads: add a detailed note to the job so reps see everything
        if (isFinancingLead && result.jobId) {
          const note = formatFinancingNote({
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || "",
            service: service?.trim(),
            address: addressStr,
            budget: financingProfile.budget,
            timeline: financingProfile.timeline,
            homeowner: financingProfile.homeowner,
            propertyType: financingProfile.propertyType,
            credit: financingProfile.credit,
            income: financingProfile.income,
            employment: financingProfile.employment,
            qualificationTier: financingProfile.qualificationTier,
            skipped: financingProfile.credit === "Skipped",
          });
          await addJobNote(result.jobId, `🔔 CALL BACK REQUESTED — FINANCING LEAD\n\n${note}`);
        } else if (result.jobId) {
          // For all other web leads (contact form, chat widget, etc): add a
          // concise "Call Back Requested" note so Sierra's queue surfaces it.
          // Note: business-hours aware — no "3-min SLA" pressure on a Sunday 11pm lead.
          const hours = getBusinessHoursInfo();
          const sourceLabel = source === "ai-chatbot"
            ? "AI CHATBOT LEAD"
            : source === "contact-form" ? "CONTACT FORM LEAD"
            : source ? `${source.toUpperCase()} LEAD`
            : "WEB LEAD";

          const urgencyLine = hours.isOpen
            ? `⏰ SLA: Call back within 3 minutes per SOP.`
            : `🌙 AFTER HOURS — call back ${hours.callbackPhrase} (first thing when office opens).`;

          const noteLines = [
            `🔔 CALL BACK REQUESTED — ${sourceLabel}`,
            hours.isOpen ? null : `(${hours.crmLabel})`,
            ``,
            `Name: ${name.trim()}`,
            `Phone: ${phone.trim()}`,
            email?.trim() ? `Email: ${email.trim()}` : null,
            addressStr ? `Address: ${addressStr}` : null,
            service?.trim() ? `Service: ${service.trim()}` : null,
            landing_page ? `Landed on: ${landing_page}` : null,
            gclid ? `Google Click ID: ${gclid}` : null,
            fclid ? `Facebook Click ID: ${fclid}` : null,
            chat_context ? `\nWhat they said in chat:\n${chat_context}` : null,
            message?.trim() ? `\nMessage:\n${message.trim()}` : null,
            ``,
            urgencyLine,
            `Submitted: ${hours.currentET}`,
          ].filter(Boolean).join("\n");

          await addJobNote(result.jobId, noteLines);
        }
      } else {
        console.error("[AccuLynx] Lead creation failed — falling through to Sheets");
        acculynxStatus = "failed";
      }
    } catch (err) {
      console.error("[AccuLynx] Lead creation error:", err);
      acculynxStatus = "failed";
    }

    // 2. Google Sheets webhook (backup) — await to ensure it completes
    const webhookUrl = import.meta.env.FORM_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          redirect: "follow",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || "",
            address: addressStr,
            service: service?.trim() || "",
            message: message?.trim() || "",
            source: source || "",
            gclid: gclid || "",
            fclid: fclid || "",
            landing_page: landing_page || "",
            financing_data: financing_data || "",
            is_financing_lead: isFinancingLead,
            financing_profile: isFinancingLead ? JSON.stringify(financingProfile) : "",
            financing_tier: financingProfile.qualificationTier || "",
          }),
        });
      } catch (err) {
        console.error("Webhook error:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Thank you! We'll be in touch shortly." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Invalid request." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
