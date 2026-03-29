import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { getClientIP } from "@/lib/spam-filter";

export const prerender = false;

const SYSTEM_PROMPT = `You are the AI assistant for Modern Day Roofing, a GAF Master Elite certified roofing contractor serving the New River Valley and Roanoke, Virginia.

ABOUT THE COMPANY:
- Locations: Christiansburg (80 College St. STE R, 24073) and Roanoke (2740 Franklin Rd SW, 24014)
- Phone: (540) 553-6007
- Hours: Monday-Friday 8:30am-5:00pm
- 231+ five-star Google reviews, 600+ roofs completed
- GAF President's Club 2026, Triple Excellence Award, BBB A+ rated

SERVICES (with typical price ranges):
- Roof Replacement: $8,000-$25,000 depending on size/material
- Roof Repair: $300-$3,000
- Storm Damage: Free inspection, insurance claim assistance
- Metal Roofing: $15,000-$40,000
- Gutters: $1,000-$3,500
- Flat/Commercial Roofing: Quote required
- Siding, Windows, Skylights: Quote required

FINANCING: $0 down, 0% options available, soft credit check (no impact to score)

WARRANTY: GAF Golden Pledge warranty (50-year, non-prorated, transferable — only available from Master Elite contractors, top 1% in the nation)

SERVICE AREA: Christiansburg, Blacksburg, Radford, Salem, Roanoke, Floyd, Dublin, Pulaski, Wytheville, Bedford, Lexington, Covington, and surrounding areas in Southwest Virginia.

RULES:
1. Be warm, professional, and concise. 2-3 sentences max per response.
2. Never give exact pricing — always say "typically ranges from $X to $Y" and recommend a free inspection for an accurate quote.
3. Your goal is to get them to book a free inspection. After 2-3 exchanges, naturally ask for their name and phone number so you can have the team reach out.
4. If asked about competitors, stay positive: "We focus on delivering the best quality and warranties for our customers."
5. If asked something you don't know, say "Great question — our team can give you the best answer on that. Want me to have someone reach out?"
6. Never make up information about specific jobs, timelines, or guarantees not listed above.
7. For emergencies (active leak, storm damage), emphasize urgency and direct them to call (540) 553-6007 right away.
8. Always be helpful and never pushy. Build trust first, then guide toward booking.
9. If someone provides their name and phone number, thank them and confirm someone will call within 24 hours.`;

// Simple in-memory rate limiter for chat
const chatRateLimit = new Map<string, number[]>();
const RATE_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_MAX = 10; // 10 messages per 5 min

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = chatRateLimit.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);

  if (recent.length >= RATE_MAX) return true;

  recent.push(now);
  chatRateLimit.set(ip, recent);
  return false;
}

// Cleanup stale entries periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < RATE_WINDOW) return;
  lastCleanup = now;
  for (const [ip, timestamps] of chatRateLimit) {
    const valid = timestamps.filter((t) => now - t < RATE_WINDOW);
    if (valid.length === 0) chatRateLimit.delete(ip);
    else chatRateLimit.set(ip, valid);
  }
}

export const POST: APIRoute = async ({ request }) => {
  cleanup();

  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Chat not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientIP = getClientIP(request);
  if (isRateLimited(clientIP)) {
    return new Response(JSON.stringify({ error: "Too many messages. Please try again in a few minutes." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { messages, page } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Limit conversation length
    const trimmedMessages = messages.slice(-20).map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: String(m.content).slice(0, 500),
    }));

    // Add page context to system prompt if available
    const systemWithContext = page
      ? `${SYSTEM_PROMPT}\n\nThe user is currently viewing: ${page}`
      : SYSTEM_PROMPT;

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemWithContext,
      messages: trimmedMessages,
    });

    // Convert to SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
