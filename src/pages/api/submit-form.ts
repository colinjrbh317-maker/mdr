import type { APIRoute } from "astro";
import { spamCheck, getClientIP } from "@/lib/spam-filter";
import { createLead } from "@/lib/acculynx";

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
    const { name, phone, email, address, service, message, website, source, gclid, fclid, landing_page } = body;

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

    // Fire-and-forget: Create lead in AccuLynx CRM
    createLead({
      firstName,
      lastName,
      phone: phone.trim(),
      email: email?.trim() || "",
      address: addressStr,
      leadSource: "Website Form Submission",
      serviceType: service?.trim() || "",
    }).then((result) => {
      if (result) {
        console.log(`[AccuLynx] Lead created: contact=${result.contactId}, job=${result.jobId}`);
      } else {
        console.error("[AccuLynx] Lead creation failed — falling through to Sheets");
      }
    }).catch((err) => {
      console.error("[AccuLynx] Lead creation error:", err);
    });

    // Fire-and-forget: Google Sheets webhook (backup)
    const webhookUrl = import.meta.env.FORM_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        }),
      }).catch((err) => {
        console.error("Webhook error:", err);
      });
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
