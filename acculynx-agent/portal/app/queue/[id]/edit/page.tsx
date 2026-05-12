"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mutate } from "swr";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { editMessage, useMessage } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/Toast";

export default function EditPage() {
  return (
    <AppShell>
      <Editor />
    </AppShell>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading } = useMessage(id);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setSubject(data.subject || "");
      setBody(data.body || "");
    }
  }, [data]);

  if (isLoading)
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (error || !data)
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load this message. <Link href="/queue" className="underline">Back to queue</Link>
      </p>
    );

  async function save() {
    setSaving(true);
    try {
      await editMessage(data!.message_id, body, subject || undefined);
      toast.show("Edit saved and sent.");
      mutate("/api/portal/queue");
      router.push("/queue");
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : "edit failed", "error");
      setSaving(false);
    }
  }

  return (
    <section className="no-overscroll pb-28">
      <Link
        href={`/queue/${data.message_id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
      >
        <ChevronLeft size={16} /> Back to draft
      </Link>

      <h1 className="mb-4 font-display text-2xl font-bold">Edit before sending</h1>

      {data.channel === "email" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Subject
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-white px-3 py-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Body
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-3 font-mono text-sm leading-relaxed focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </label>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white/95 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="mx-auto flex w-full max-w-rep gap-3 px-4 py-3">
          <Link
            href={`/queue/${data.message_id}`}
            className="flex h-14 w-24 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-muted shadow-soft hover:bg-brand-warm"
          >
            Cancel
          </Link>
          <button
            onClick={save}
            disabled={saving || !body.trim()}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-action-approve text-base font-semibold text-white shadow-soft transition-colors hover:bg-action-approveDark disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save &amp; Send
          </button>
        </div>
      </div>
    </section>
  );
}
