"use client";
import Link from "next/link";
import { useSentLog } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Mail, MessageSquare } from "lucide-react";

export default function SentPage() {
  return (
    <AppShell>
      <Sent />
    </AppShell>
  );
}

function Sent() {
  const { data, error, isLoading } = useSentLog();
  if (isLoading)
    return (
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-brand-border bg-white shadow-soft"
          />
        ))}
      </ul>
    );
  if (error)
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load sent log.
      </p>
    );

  const items = data?.items || [];
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Sent</h1>
        <span className="text-sm text-brand-muted">last {items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-brand-border bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-brand-muted">Nothing sent yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.message_id}
              className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-brand-muted">
                {m.channel === "text" ? <MessageSquare size={12} /> : <Mail size={12} />}
                <span>{m.sent_at ? new Date(m.sent_at).toLocaleString() : "n/a"}</span>
                {m.delivery_status && (
                  <span className="ml-auto rounded-full bg-brand-warm px-2 py-0.5 text-xs">
                    {m.delivery_status}
                  </span>
                )}
              </div>
              <div className="font-display text-lg font-bold leading-tight">
                <Link href={`https://my.acculynx.com/jobs/${m.lead_id}`} target="_blank" rel="noreferrer" className="hover:underline">
                  {m.homeowner_name || "Homeowner"}
                </Link>
              </div>
              {m.subject && <p className="text-sm font-medium">{m.subject}</p>}
              <p className="mt-1 text-sm text-brand-body">{m.preview}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
