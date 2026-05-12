"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import {
  Check,
  Pencil,
  SkipForward,
  ChevronLeft,
  ExternalLink,
  Paperclip,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  approveMessage,
  skipMessage,
  useMessage,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/cn";

export default function MessageDetailPage() {
  return (
    <AppShell>
      <DetailInner />
    </AppShell>
  );
}

function DetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading } = useMessage(id);
  const [acting, setActing] = useState<null | "approve" | "skip">(null);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load this message. <Link href="/queue" className="underline">Back to queue</Link>
      </p>
    );
  }

  async function onApprove() {
    setActing("approve");
    try {
      await approveMessage(data!.message_id);
      toast.show("Sent. Logged to AccuLynx.");
      mutate("/api/portal/queue");
      router.push("/queue");
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : "approve failed", "error");
      setActing(null);
    }
  }

  async function onSkip() {
    setActing("skip");
    try {
      await skipMessage(data!.message_id);
      toast.show("Skipped. Cadence advances.");
      mutate("/api/portal/queue");
      router.push("/queue");
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : "skip failed", "error");
      setActing(null);
    }
  }

  return (
    <section className="no-overscroll pb-32">
      <Link
        href="/queue"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
      >
        <ChevronLeft size={16} /> Queue
      </Link>

      <header className="mb-4">
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {data.homeowner_name || "Homeowner"}
        </h1>
        <p className="text-sm text-brand-muted">
          {data.layer?.replace(/_/g, " ")} · Touch {data.touch_index} · {data.channel.toUpperCase()}
        </p>
        {data.nudge_count > 0 && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-action-warning/15 px-3 py-1 text-xs font-semibold text-yellow-900">
            <AlertTriangle size={12} /> Reminded {data.nudge_count}x today
          </p>
        )}
      </header>

      <div className="mb-4 rounded-xl border border-brand-border bg-white p-4 text-sm shadow-soft">
        <Row label="Address" value={data.address || "unknown"} />
        <Row label="Email" value={data.email || "n/a"} />
        <Row label="Phone" value={data.phone || "n/a"} />
        <Row label="Milestone" value={data.milestone || "n/a"} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href={`https://my.acculynx.com/jobs/${data.lead_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
          >
            Open in AccuLynx <ExternalLink size={14} />
          </a>
          <Link
            href={`/upload?lead_id=${data.lead_id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
          >
            <Paperclip size={14} />
            {data.rilla_present ? "Replace transcript" : "Add transcript"}
          </Link>
        </div>
      </div>

      <div className="mb-4 rounded-xl border-l-4 border-brand-amber bg-amber-50 p-4 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Why this lead now
        </div>
        <p>{data.why_now}</p>
      </div>

      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
        Proposed message
      </div>
      {data.subject && (
        <div className="mb-2 font-semibold">Subject: {data.subject}</div>
      )}
      <pre className="mb-5 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-brand-border bg-white p-4 text-sm leading-relaxed shadow-soft">
        {data.body}
      </pre>

      <details className="mb-5 rounded-xl border border-brand-border bg-white p-4 shadow-soft">
        <summary className="cursor-pointer text-sm font-semibold">
          Recent activity ({data.recent_interactions.length})
        </summary>
        <ul className="mt-3 space-y-3 text-sm">
          {data.recent_interactions.length === 0 && (
            <li className="text-brand-muted">No recent interactions on file.</li>
          )}
          {data.recent_interactions.map((m, i) => (
            <li key={i} className="border-l-4 border-brand-border pl-3">
              <div className="text-xs text-brand-muted">
                <span className="font-semibold">{m.type}</span> · {m.when} · {m.by}
              </div>
              {m.subject && <div className="text-sm italic">{m.subject}</div>}
              <div className="whitespace-pre-wrap text-sm">{m.body}</div>
            </li>
          ))}
        </ul>
      </details>

      <p className="mb-2 inline-flex items-center gap-1 text-xs text-brand-muted">
        <Clock size={12} /> Auto-sends at {data.auto_send_at} if no action.
      </p>

      <ActionBar
        onApprove={onApprove}
        onSkip={onSkip}
        editHref={`/queue/${data.message_id}/edit`}
        acting={acting}
      />
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <dt className="text-xs uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}

function ActionBar({
  onApprove,
  onSkip,
  editHref,
  acting,
}: {
  onApprove: () => void;
  onSkip: () => void;
  editHref: string;
  acting: null | "approve" | "skip";
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white/95 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="mx-auto flex w-full max-w-rep gap-3 px-4 py-3">
        <button
          onClick={onApprove}
          disabled={!!acting}
          className={cn(
            "flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-action-approve text-base font-semibold text-white shadow-soft transition-colors hover:bg-action-approveDark disabled:opacity-50",
          )}
        >
          {acting === "approve" ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
          Approve
        </button>
        <Link
          href={editHref}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-action-edit text-white shadow-soft transition-colors hover:brightness-95"
          aria-label="Edit"
        >
          <Pencil size={20} />
        </Link>
        <button
          onClick={onSkip}
          disabled={!!acting}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-muted shadow-soft transition-colors hover:bg-brand-warm disabled:opacity-50"
          aria-label="Skip"
        >
          {acting === "skip" ? <Loader2 className="animate-spin" size={20} /> : <SkipForward size={20} />}
        </button>
      </div>
    </div>
  );
}
