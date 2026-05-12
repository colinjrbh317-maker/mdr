"use client";
import { useMe, apiFetch } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  return (
    <AppShell>
      <Settings />
    </AppShell>
  );
}

function Settings() {
  const { data, isLoading, error } = useMe();
  const toast = useToast();

  async function signOut() {
    try {
      await apiFetch("/api/portal/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : "logout failed", "error");
    }
  }

  if (isLoading)
    return (
      <div className="flex h-[40vh] items-center justify-center text-brand-muted">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (error || !data)
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load profile. Sign in again.
      </p>
    );

  return (
    <section>
      <h1 className="mb-4 font-display text-3xl font-extrabold tracking-tight">Settings</h1>

      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-display text-xl font-bold">Profile</h2>
        <Row label="Name" value={data.name} />
        <Row label="Title" value={data.title || "n/a"} />
        <Row label="Email" value={data.email} />
        <Row label="Sending phone" value={data.signature_phone || "n/a"} />
        <Row label="Twilio number" value={data.twilio_phone || "(shared bot number)"} />
      </div>

      <button
        onClick={signOut}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-action-danger shadow-soft hover:bg-red-50"
      >
        <LogOut size={16} /> Sign out
      </button>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-xs uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}
