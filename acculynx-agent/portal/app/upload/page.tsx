"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Upload, ChevronLeft, Search } from "lucide-react";
import { searchLeads, uploadRillaTranscript } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/Toast";

type LeadHit = { id: string; name: string; address: string; milestone: string; rilla_present: boolean };

export default function UploadPage() {
  return (
    <AppShell>
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <Uploader />
      </Suspense>
    </AppShell>
  );
}

function Uploader() {
  const search = useSearchParams();
  const presetLeadId = search.get("lead_id") || "";
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LeadHit[]>([]);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(
    presetLeadId ? { id: presetLeadId, label: presetLeadId } : null,
  );
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchLeads(query);
        setHits(res.items);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTranscript(text);
  }

  async function submit() {
    if (!selected || !transcript.trim()) {
      toast.show("Pick a lead and paste the transcript.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await uploadRillaTranscript(selected.id, transcript, "paste");
      toast.show("Transcript saved. Agent will use it on the next draft.");
      setTranscript("");
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : "upload failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="pb-28">
      <Link
        href="/queue"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
      >
        <ChevronLeft size={16} /> Queue
      </Link>

      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight">Add Rilla transcript</h1>
      <p className="mb-5 text-sm text-brand-muted">
        Paste a meeting summary or transcript and we&apos;ll attach it to the lead so the AI agent uses
        it on every future follow-up.
      </p>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
        Lead
      </label>
      {selected ? (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-brand-border bg-white p-3 shadow-soft">
          <span className="text-sm font-medium">{selected.label}</span>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-brand-red hover:underline"
          >
            change
          </button>
        </div>
      ) : (
        <div className="mb-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-brand-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or address..."
              className="w-full rounded-lg border border-brand-border bg-white px-9 py-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
          {searching && <p className="mt-1 text-xs text-brand-muted">Searching...</p>}
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-brand-border overflow-hidden rounded-xl border border-brand-border bg-white shadow-soft">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() =>
                      setSelected({ id: h.id, label: `${h.name} · ${h.address || ""}` })
                    }
                    className="block w-full px-3 py-3 text-left hover:bg-brand-warm"
                  >
                    <div className="font-medium">{h.name || "Homeowner"}</div>
                    <div className="text-xs text-brand-muted">
                      {h.address} · {h.milestone}
                      {h.rilla_present && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-green-900">
                          transcript on file
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
        Transcript
      </label>
      <input
        type="file"
        accept=".txt,.md,.json,.pdf"
        onChange={onFile}
        className="mb-2 block text-sm"
      />
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={14}
        placeholder="Paste Rilla summary or transcript here, or drop a file above."
        className="w-full rounded-lg border border-brand-border bg-white px-3 py-3 font-mono text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
      />
      <p className="mt-2 text-xs text-brand-muted">
        {transcript.length.toLocaleString()} chars · transcripts are mirrored to AccuLynx notes
        automatically.
      </p>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white/95 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="mx-auto flex w-full max-w-rep px-4 py-3">
          <button
            onClick={submit}
            disabled={submitting || !selected || !transcript.trim()}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-action-approve text-base font-semibold text-white shadow-soft transition-colors hover:bg-action-approveDark disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            Save transcript
          </button>
        </div>
      </div>
    </section>
  );
}
