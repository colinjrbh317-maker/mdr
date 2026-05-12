"use client";
import { useState } from "react";
import { requestMagicLink } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await requestMagicLink(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-page px-4 text-brand-ink">
      <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-white p-6 shadow-softLg">
        <div className="mb-1 font-display text-3xl font-extrabold uppercase tracking-tight">
          MDR <span className="text-brand-red">Portal</span>
        </div>
        <p className="mb-6 text-sm text-brand-muted">
          Sign in with your <span className="font-medium text-brand-ink">@moderndayroof.com</span> email
          to approve drafts on the go.
        </p>

        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-5 text-sm text-green-900">
            Check your inbox. Tap the link from your phone, you&apos;re in for 30 days after that.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Work email
            </label>
            <input
              id="email"
              autoFocus
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@moderndayroof.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-white px-4 py-3 text-base text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="h-12 w-full rounded-lg bg-action-approve text-base font-semibold text-white shadow-soft transition-colors hover:bg-action-approveDark disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send me a link"}
            </button>
            {err && <p className="text-sm text-action-danger">{err}</p>}
          </form>
        )}
      </div>
      <p className="mt-6 text-xs text-brand-muted">
        Modern Day Roofing · Rep Portal
      </p>
    </main>
  );
}
