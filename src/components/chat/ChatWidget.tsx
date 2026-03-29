import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Converts [Link Text](URL) to clickable HTML links and strips any
 * remaining markdown formatting (bold, italic, headers, etc.)
 */
function formatChatMessage(text: string): string {
  let formatted = text;
  // Convert markdown links [text](url) to HTML links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline text-accent hover:text-accent-dark" target="_self">$1</a>'
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
  return formatted;
}

const STORAGE_KEY = "mdr_chat_history";
const MAX_MESSAGES = 20;

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! 👋 I'm the Modern Day Roofing assistant. I can help with questions about roofing, pricing, financing, or scheduling a free inspection. How can I help you today?",
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "" });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Dispatch events for StickyMobileCTA coordination
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(isOpen ? "mdr:chat-open" : "mdr:chat-close"));
    if (isOpen) {
      sessionStorage.setItem("chat_active", "1");
    } else {
      sessionStorage.removeItem("chat_active");
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Check if we should show lead capture (after 3+ user messages and no lead yet)
  useEffect(() => {
    if (leadSubmitted) return;
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (userMsgCount >= 3 && !showLeadCapture) {
      setShowLeadCapture(true);
    }
  }, [messages, showLeadCapture, leadSubmitted]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage].slice(-MAX_MESSAGES);
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m !== WELCOME_MESSAGE),
          page: window.location.pathname,
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

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

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

      // Track chat interaction
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "chat_message", {
          event_category: "chatbot",
          event_label: "user_message",
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1), // remove empty assistant message
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please call us at (540) 553-6007." },
      ]);
    }

    setStreaming(false);
  }, [input, messages, streaming]);

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return;

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim(),
          email: "",
          source: "ai-chatbot",
          gclid: sessionStorage.getItem("gclid") || "",
          fclid: sessionStorage.getItem("fclid") || "",
          landing_page: sessionStorage.getItem("landing_page") || "",
        }),
      });

      if (res.ok) {
        setLeadSubmitted(true);
        setShowLeadCapture(false);
        sessionStorage.setItem("form_submitted", "1");

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Thanks ${leadForm.name.split(" ")[0]}! Someone from our team will call you within 24 hours to schedule your free inspection. Is there anything else I can help with?`,
          },
        ]);

        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: "ai-chatbot",
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", { content_name: "ai-chatbot" });
        }
      }
    } catch {
      // Silently fail
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
          <div className="bg-dark text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-bold text-sm">Chat with MDR</h3>
              <span className="text-[10px] text-white/60">Powered by AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-white/80 transition-colors p-1.5 bg-white/20 rounded-full"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3.5">
                <p className="text-xs font-semibold text-text-primary mb-2">
                  📞 Want us to call you? Leave your info:
                </p>
                <form onSubmit={handleLeadSubmit} className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="w-full px-3 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent-dark transition-colors"
                  >
                    Request Callback
                  </button>
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
