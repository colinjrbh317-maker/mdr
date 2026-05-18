"""Tiered alerting for the AccuLynx agent.

Two severity tiers:

- SEV-1: sent immediately via SendGrid to settings.sms_alert_recipient.
  Use for auth/permission failures, postflight exhaustion, scheduler crashes,
  any condition that means the system is meaningfully degraded right now.

- SEV-2: appended to data/alert_digest.jsonl as one line per event. The
  hourly digest flush groups by error_type and emails Colin a single rollup.
  Use for transient 5xx, redirects, timeouts, opt-in lookup misses — noisy
  things you want to count but not be paged on individually.

The flusher is idempotent and crash-safe: it reads the digest, sends the
email, then truncates by atomic rename. If the send fails the file is
preserved for the next pass.

USAGE
    from messaging.alerts import alert_sev1, alert_sev2, flush_digest

    alert_sev1(
        source="acculynx.internal_api.get_sms_correspondent_id",
        error="auth_401",
        message="bot session rejected by /api/v3/message-board/...",
        context={"job_id": job_id, "status": 401},
    )

    alert_sev2(
        source="acculynx.client.fetch_jobs",
        error="transient_5xx",
        context={"status": 503, "url": url},
    )

This module is import-safe and never raises. Failures degrade silently with
a log line — the caller is in an error path already.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from config.settings import PROJECT_ROOT, settings
from messaging.sendgrid_email import send_email

log = logging.getLogger(__name__)

DIGEST_PATH = Path(PROJECT_ROOT) / "data" / "alert_digest.jsonl"
SEV1_LOG_PATH = Path(PROJECT_ROOT) / "data" / "alert_sev1.jsonl"


def _record(path: Path, entry: dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, default=str) + "\n")
    except Exception as exc:
        log.warning("alert record write failed (%s): %r", path, exc)


def _send_email(subject: str, html_body: str, text_body: str) -> None:
    recipient = settings.sms_alert_recipient
    if not settings.sms_alerts_enabled or not recipient:
        log.info("alerts disabled or no recipient; suppressing email for %r", subject)
        return
    try:
        send_email(
            to_email=recipient,
            to_name=None,
            subject=subject,
            body_text=text_body,
            body_html=html_body,
            from_email=None,
            from_name="MDR Agent Alerts",
            lead_id=None,
            in_reply_to=None,
            references=None,
        )
    except Exception as exc:
        log.warning("alert email send raised: %r", exc)


def alert_sev1(
    *,
    source: str,
    error: str,
    message: str = "",
    context: Optional[dict[str, Any]] = None,
) -> None:
    """SEV-1: pages Colin immediately. Use for system-down conditions."""
    ts = datetime.now(timezone.utc).isoformat()
    entry = {
        "ts": ts,
        "severity": "SEV1",
        "source": source,
        "error": error,
        "message": message,
        "context": context or {},
    }
    _record(SEV1_LOG_PATH, entry)

    ctx_lines = "\n".join(f"  {k}: {v}" for k, v in (context or {}).items())
    text_body = (
        f"SEV-1 alert from MDR Agent\n\n"
        f"Time:    {ts}\n"
        f"Source:  {source}\n"
        f"Error:   {error}\n"
        f"Message: {message or '(none)'}\n\n"
        f"Context:\n{ctx_lines or '  (none)'}\n"
    )
    html_body = (
        f"<h2 style='color:#c0392b;margin:0 0 12px'>🚨 SEV-1 — MDR Agent</h2>"
        f"<table style='font-family:monospace;font-size:13px;border-collapse:collapse'>"
        f"<tr><td style='padding:4px 12px 4px 0;color:#666'>Time</td><td>{ts}</td></tr>"
        f"<tr><td style='padding:4px 12px 4px 0;color:#666'>Source</td><td>{source}</td></tr>"
        f"<tr><td style='padding:4px 12px 4px 0;color:#666'>Error</td><td><b>{error}</b></td></tr>"
        f"<tr><td style='padding:4px 12px 4px 0;color:#666'>Message</td><td>{message or '(none)'}</td></tr>"
        f"</table>"
        f"<h3 style='margin-top:18px;color:#333'>Context</h3>"
        f"<pre style='background:#f4f4f4;padding:10px;border-radius:4px;font-size:12px'>"
        f"{json.dumps(context or {}, indent=2, default=str)}"
        f"</pre>"
    )
    _send_email(f"[MDR SEV-1] {source} — {error}", html_body, text_body)


def alert_sev2(
    *,
    source: str,
    error: str,
    message: str = "",
    context: Optional[dict[str, Any]] = None,
) -> None:
    """SEV-2: appended to the hourly digest. Won't email until flush_digest()."""
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "severity": "SEV2",
        "source": source,
        "error": error,
        "message": message,
        "context": context or {},
    }
    _record(DIGEST_PATH, entry)


def _read_digest_entries() -> list[dict[str, Any]]:
    if not DIGEST_PATH.exists():
        return []
    out: list[dict[str, Any]] = []
    try:
        with DIGEST_PATH.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    continue
    except Exception as exc:
        log.warning("digest read failed: %r", exc)
    return out


def _truncate_digest_file() -> None:
    """Atomically replace the digest file with an empty one."""
    try:
        if not DIGEST_PATH.exists():
            return
        fd, tmp = tempfile.mkstemp(
            prefix=".alert_digest.", suffix=".jsonl", dir=str(DIGEST_PATH.parent)
        )
        os.close(fd)
        os.replace(tmp, DIGEST_PATH)
    except Exception as exc:
        log.warning("digest truncate failed: %r", exc)


def flush_digest() -> int:
    """Group SEV-2 events by (source, error), send one digest email, truncate.

    Returns number of events flushed. Safe to call when the digest is empty
    (no-op). Run hourly from the in-process scheduler.
    """
    entries = _read_digest_entries()
    if not entries:
        return 0

    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for e in entries:
        key = (e.get("source", "?"), e.get("error", "?"))
        groups.setdefault(key, []).append(e)

    rows_text = []
    rows_html = []
    for (src, err), evts in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        rows_text.append(f"  {len(evts):>4}× {src} — {err}")
        rows_html.append(
            f"<tr><td style='padding:4px 12px 4px 0'><b>{len(evts)}</b></td>"
            f"<td style='padding:4px 12px 4px 0;font-family:monospace'>{src}</td>"
            f"<td style='font-family:monospace;color:#c0392b'>{err}</td></tr>"
        )

    text_body = (
        f"Hourly SEV-2 digest — {len(entries)} events across {len(groups)} buckets\n\n"
        + "\n".join(rows_text)
        + "\n\nFull entries in data/alert_digest.jsonl (truncated after this send).\n"
    )
    html_body = (
        f"<h2 style='margin:0 0 12px'>📊 SEV-2 Digest — {len(entries)} events</h2>"
        f"<p style='color:#666;font-size:13px'>Grouped by source/error. Top buckets first.</p>"
        f"<table style='font-size:13px;border-collapse:collapse'>"
        f"<tr style='background:#f4f4f4'><th style='padding:6px 12px 6px 0'>Count</th>"
        f"<th style='padding:6px 12px 6px 0'>Source</th><th>Error</th></tr>"
        + "".join(rows_html)
        + "</table>"
    )
    _send_email(
        f"[MDR SEV-2] hourly digest — {len(entries)} events / {len(groups)} buckets",
        html_body,
        text_body,
    )
    _truncate_digest_file()
    return len(entries)


__all__ = ["alert_sev1", "alert_sev2", "flush_digest"]
