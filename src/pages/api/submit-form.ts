import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, phone, email, address, service, message, website, source, gclid, fclid, landing_page } = body;

    // Honeypot check — return fake success to avoid tipping off bots
    if (website) {
      return new Response(JSON.stringify({ success: true, message: "Thank you! We'll be in touch shortly." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validation
    if (!name?.trim() || !phone?.trim()) {
      return new Response(JSON.stringify({ success: false, message: "Name and phone are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget webhook to Google Sheets
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
          address: address?.trim() || "",
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
