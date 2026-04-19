import { useState, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import { getBusinessHoursInfo } from "@/lib/business-hours";

/** US phone formatter: "5405536007" → "(540) 553-6007". Accepts partial input. */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Converts [Link Text](URL) to clickable HTML links and strips any
 * remaining markdown formatting (bold, italic, headers, etc.)
 * Output is sanitized with DOMPurify to prevent XSS.
 */
function formatChatMessage(text: string): string {
  let formatted = text;
  // Convert markdown links [text](url) to HTML links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline text-accent hover:text-accent-dark" target="_self" rel="noopener noreferrer">$1</a>'
  );
  // Strip bold **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "$1");
  formatted = formatted.replace(/__(.+?)__/g, "$1");
  // Strip italic *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, "$1");
  formatted = formatted.replace(/_(.+?)_/g, "$1");
  // Strip headers (# ## ### etc)
  formatted = formatted.replace(/^#{1,6}\s+/gm, "");
  // Strip backticks
  formatted = formatted.replace(/`([^`]+)`/g, "$1");
  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, "<br>");
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ["a", "br"],
    ALLOWED_ATTR: ["href", "class", "target", "rel"],
  });
}

const STORAGE_KEY = "mdr_chat_history";
const MAX_MESSAGES = 20;

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hey — thanks for stopping by Modern Day Roofing. What's going on with the roof?",
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "" });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  // Restore messages from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Dispatch events for StickyMobileCTA coordination + PostHog engagement funnel
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(isOpen ? "mdr:chat-open" : "mdr:chat-close"));
    if (isOpen) {
      sessionStorage.setItem("chat_active", "1");
      const ph = (window as any).posthog;
      if (ph?.capture) ph.capture("chat_opened", { landing_page: sessionStorage.getItem("landing_page") || "" });
    } else {
      sessionStorage.removeItem("chat_active");
      const ph = (window as any).posthog;
      if (ph?.capture) ph.capture("chat_closed", { user_turns: messagesRef.current.filter((m) => m.role === "user").length, lead_submitted: leadSubmitted });
    }
  }, [isOpen, leadSubmitted]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Check if we should show lead capture (after 2+ user messages and no lead yet —
  // faster qualification than the old 3-message threshold).
  useEffect(() => {
    if (leadSubmitted) return;
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (userMsgCount >= 2 && !showLeadCapture) {
      setShowLeadCapture(true);
    }
  }, [messages, showLeadCapture, leadSubmitted]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const currentMessages = messagesRef.current;
    const newMessages = [...currentMessages, userMessage].slice(-MAX_MESSAGES);
    messagesRef.current = newMessages;
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const userTurnCount = newMessages.filter((m) => m.role === "user").length;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role !== "assistant" || m.content !== WELCOME_MESSAGE.content),
          page: window.location.pathname,
          user_turn_count: userTurnCount,
          lead_form_visible: userTurnCount >= 2 && !leadSubmitted,
          lead_submitted: leadSubmitted,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: err.error || "Sorry, I'm having trouble right now. Please call us at (540) 553-6007." },
        ]);
        setStreaming(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
      }

      // Sync ref with final state so next sendMessage reads the complete conversation
      setMessages((prev) => {
        messagesRef.current = prev;
        return prev;
      });

      // Track chat interaction
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "chat_message", {
          event_category: "chatbot",
          event_label: "user_message",
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [
          ...prev.slice(0, -1),
          { role: "assistant" as const, content: "Sorry, I'm having trouble connecting. Please call us at (540) 553-6007." },
        ];
        messagesRef.current = updated;
        return updated;
      });
    }

    setStreaming(false);
  }, [input, streaming]);

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Hard guards against duplicate submits (rapid clicks / Enter + click race):
    if (leadSubmitted || submitting) return;
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    // Build a short conversation summary so Sierra sees what the lead said in chat.
    const chatContext = messagesRef.current
      .filter((m) => m.role === "user")
      .slice(0, 5)
      .map((m) => `- ${m.content}`)
      .join("\n");

    const hours = getBusinessHoursInfo();

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim(),
          email: leadForm.email.trim(),
          source: "ai-chatbot",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
          chat_context: chatContext,
          // submit-form.ts recomputes business hours server-side (source of truth),
          // but sending the client's view is useful for log correlation.
          submitted_during_hours: hours.isOpen,
        }),
      });

      if (!res.ok) {
        setSubmitError("Something went wrong on our end — try calling us at (540) 553-6007 and we'll get you squared away.");
        setSubmitting(false);
        return;
      }

      // Mark submitted FIRST so any race re-entry short-circuits at the top.
      setLeadSubmitted(true);
      setShowLeadCapture(false);
      sessionStorage.setItem("form_submitted", "1");

      const firstName = leadForm.name.trim().split(/\s+/)[0];
      const confirmationContent = hours.isOpen
        ? `Got it, ${firstName} — one of our guys will call you in the next ${hours.callbackPhrase}. Anything else I can help with in the meantime?`
        : `Got it, ${firstName} — we've got your info. Office is closed right now, so we'll call you ${hours.callbackPhrase}. Want me to send any info in the meantime?`;

      // Dedupe guard: only append if the last assistant message isn't already this confirmation.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === confirmationContent) return prev;
        return [...prev, { role: "assistant", content: confirmationContent }];
      });

      // GA4 + Meta Pixel
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "generate_lead", { event_category: "form", event_label: "ai-chatbot" });
      }
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead", { content_name: "ai-chatbot" });
      }

      // PostHog: identify + capture
      const ph = (window as any).posthog;
      if (ph && typeof ph.identify === "function") {
        ph.identify(leadForm.email.trim() || leadForm.phone.trim(), {
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim(),
          email: leadForm.email.trim(),
          source: "ai-chatbot",
        });
        ph.capture("lead_submitted", {
          source: "ai-chatbot",
          landing_page: sessionStorage.getItem("landing_page") || "",
          chat_turns: messagesRef.current.filter((m) => m.role === "user").length,
          submitted_during_hours: hours.isOpen,
        });
      }
    } catch {
      setSubmitError("Lost connection — try calling us at (540) 553-6007.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent hover:bg-accent-dark text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 lg:bottom-6 bottom-[88px]"
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed z-50 lg:bottom-6 lg:right-6 lg:w-[380px] lg:h-[520px] lg:rounded-2xl inset-0 lg:inset-auto bg-white shadow-2xl border border-border flex flex-col overflow-hidden lg:animate-slide-up">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: "#1B1B1B" }}>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "#FFFFFF" }}>Modern Day Roofing</h3>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                {getBusinessHoursInfo().isOpen ? "Replying in a few minutes" : "Closed — we'll reply first thing"}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.25)", padding: "6px" }}
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-bg-light text-text-primary rounded-bl-sm"
                  }`}
                >
                  {!msg.content ? (
                    <span className="flex gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                      <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                    </span>
                  ) : msg.role === "assistant" ? (
                    <span dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Lead capture card */}
            {showLeadCapture && !leadSubmitted && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3.5" data-ph-mask>
                <p className="text-xs font-semibold text-text-primary mb-2">
                  {getBusinessHoursInfo().isOpen
                    ? "Leave your number — we'll call you right back."
                    : "Office is closed — leave your info and we'll call you first thing."}
                </p>
                <form onSubmit={handleLeadSubmit} className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    required
                    autoComplete="name"
                    disabled={submitting}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Best number to reach you"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: formatPhone(e.target.value) })}
                    required
                    autoComplete="tel"
                    disabled={submitting}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="Email (optional)"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    autoComplete="email"
                    disabled={submitting}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !leadForm.name.trim() || !leadForm.phone.trim()}
                    className="w-full px-3 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Call me back"
                    )}
                  </button>
                  {submitError && (
                    <p className="text-[10px] text-accent text-center" role="alert">{submitError}</p>
                  )}
                  <p className="text-[10px] text-text-dim text-center leading-tight">
                    By submitting, you agree we can call or text you about your roof. Msg &amp; data rates may apply. Reply STOP to opt out.
                  </p>
                </form>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={streaming}
                enterKeyHint="send"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-40"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
            <a
              href="tel:5405536007"
              className="block text-center text-[10px] text-text-dim hover:text-accent mt-1.5 transition-colors"
            >
              Or call us: (540) 553-6007
            </a>
          </div>
        </div>
      )}
    </>
  );
}
