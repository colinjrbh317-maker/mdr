"use client";
import Link from "next/link";
import { useQueue, type QueueItem } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export default function QueuePage() {
  return (
    <AppShell>
      <Queue />
    </AppShell>
  );
}

function Queue() {
  const { data, error, isLoading } = useQueue();

  if (isLoading) return <QueueSkeleton />;
  if (error)
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load your queue. Try again in a moment.
      </p>
    );

  const items = data?.items || [];
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Queue</h1>
        <span className="text-sm text-brand-muted">{items.length} pending</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-brand-border bg-white p-8 text-center shadow-soft">
          <p className="text-lg font-semibold">Inbox zero.</p>
          <p className="mt-1 text-sm text-brand-muted">
            No drafts waiting on you right now. The AI will queue more as leads cool.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.message_id}>
              <QueueCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QueueCard({ item }: { item: QueueItem }) {
  const nudged = item.nudge_count > 0;
  return (
    <Link
      href={`/queue/${item.message_id}`}
      className={cn(
        "block rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:shadow-softLg",
        nudged ? "border-action-warning" : "border-brand-border",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <ChannelBadge channel={item.channel} />
        <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
          {item.layer?.replace(/_/g, " ") || "cadence"} · Touch {item.touch_index}
        </span>
        {nudged && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-action-warning/15 px-2 py-0.5 text-xs font-semibold text-yellow-900">
            <AlertTriangle size={12} /> nudged {item.nudge_count}x
          </span>
        )}
      </div>
      <h2 className="font-display text-xl font-bold leading-tight">
        {item.homeowner_name || "Homeowner"}
      </h2>
      <p className="mt-0.5 text-xs text-brand-muted">{item.address || "no address"}</p>
      <p className="mt-2 line-clamp-2 text-sm text-brand-body">{item.preview}</p>
      <p className="mt-3 flex items-center gap-1 text-xs text-brand-muted">
        <Clock size={12} aria-hidden /> Auto-sends at {item.expires_at_local}
      </p>
    </Link>
  );
}

function ChannelBadge({ channel }: { channel: "email" | "text" }) {
  if (channel === "text") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
        <MessageSquare size={12} /> TEXT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
      <Mail size={12} /> EMAIL
    </span>
  );
}

function QueueSkeleton() {
  return (
    <section>
      <div className="mb-4 h-8 w-24 animate-pulse rounded bg-brand-warm" />
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-brand-border bg-white shadow-soft"
          />
        ))}
      </ul>
    </section>
  );
}
