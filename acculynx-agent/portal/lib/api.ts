"use client";
import useSWR from "swr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("unauthenticated");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || j.error || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

export const jsonFetcher = <T,>(path: string) => apiFetch<T>(path);

export function useQueue() {
  return useSWR<{
    items: QueueItem[];
    count: number;
  }>("/api/portal/queue", jsonFetcher, {
    refreshInterval: 90_000,
    revalidateOnFocus: true,
  });
}

export function useMessage(messageId: string | number) {
  return useSWR<MessageDetail>(
    messageId ? `/api/portal/messages/${messageId}` : null,
    jsonFetcher,
  );
}

export function useSentLog() {
  return useSWR<{ items: SentItem[]; count: number }>(
    "/api/portal/sent",
    jsonFetcher,
  );
}

export function useMe() {
  return useSWR<RepInfo>("/api/portal/me", jsonFetcher);
}

export type QueueItem = {
  message_id: number;
  lead_id: string;
  homeowner_name: string | null;
  address: string | null;
  channel: "email" | "text";
  layer: string | null;
  touch_index: number;
  subject: string | null;
  preview: string;
  why_now: string;
  nudge_count: number;
  created_at: string | null;
  expires_at_local: string;
};

export type RecentInteraction = {
  type: string | null;
  when: string;
  by: string | null;
  subject: string | null;
  body: string;
};

export type MessageDetail = {
  message_id: number;
  lead_id: string;
  status: string;
  homeowner_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  milestone: string | null;
  channel: "email" | "text";
  layer: string | null;
  touch_index: number;
  subject: string | null;
  body: string;
  why_now: string;
  nudge_count: number;
  auto_send_at: string;
  agent_context: string | null;
  rilla_present: boolean;
  recent_interactions: RecentInteraction[];
};

export type SentItem = {
  message_id: number;
  lead_id: string;
  homeowner_name: string | null;
  channel: "email" | "text";
  subject: string | null;
  preview: string;
  sent_at: string | null;
  delivery_status: string | null;
};

export type RepInfo = {
  rep_id: string;
  name: string;
  first_name: string;
  email: string;
  title: string;
  signature_phone: string;
  twilio_phone: string;
};

export async function approveMessage(id: number) {
  return apiFetch(`/api/portal/messages/${id}/approve`, { method: "POST", body: "{}" });
}

export async function editMessage(id: number, body: string, subject?: string) {
  return apiFetch(`/api/portal/messages/${id}/edit`, {
    method: "POST",
    body: JSON.stringify({ body, subject }),
  });
}

export async function skipMessage(id: number, reason?: string) {
  return apiFetch(`/api/portal/messages/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function requestMagicLink(email: string) {
  return apiFetch(`/api/portal/auth/request-link`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function searchLeads(q: string) {
  return apiFetch<{ items: { id: string; name: string; address: string; milestone: string; rilla_present: boolean }[] }>(
    `/api/portal/leads/search?q=${encodeURIComponent(q)}`,
  );
}

export async function uploadRillaTranscript(leadId: string, transcript: string, source = "paste") {
  return apiFetch(`/api/portal/rilla-transcripts`, {
    method: "POST",
    body: JSON.stringify({ lead_id: leadId, transcript, source }),
  });
}
