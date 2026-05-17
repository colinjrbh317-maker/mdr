"""SMS failure alerting.

Pages the operator via email when an outbound AccuLynx SMS send fails so they
can intervene (refresh cookies, re-capture endpoints, etc.) before downstream
fallout. Built deliberately defensive: this code path runs INSIDE the SMS
error handler and must never raise.
"""

from __future__ import annotations

import html
import logging
from datetime import datetime, timezone
from typing import Any

from config.settings import settings
from messaging.sendgrid_email import send_email

log = logging.getLogger(__name__)

_MAX_BODY_CHARS = 500


def _recommendation_for(error: str | None) -> str:
    if not error:
        return "Unknown error type. Inspect raw_response."
    if error == "auth":
        return "Run: `python scripts/refresh_cookies.py --rep {rep_slug} --headed`"
    if error == "cookies_not_configured":
        return "Seed the rep's session: `python scripts/refresh_cookies.py --rep {rep_slug} --headed`"
    if error == "null_guid_schema_reject":
        return "Payload schema may have changed. Re-capture endpoint via Cowork."
    if error == "server_500":
        return "AccuLynx v3 endpoint returned 500. Retry once; if persistent, escalate."
    if error in ("missing_recipient", "empty_body"):
        return "Calling code bug; check approval flow."
    if error.startswith("unexpected:"):
        return "Unexpected status. Check `raw_response`."
    if error.startswith("network:"):
        return "Transient network error. Will auto-retry; alert if seen 3+ times in 10 min."
    return "Unknown error type. Inspect raw_response."


def _truncate(text: str, limit: int = _MAX_BODY_CHARS) -> str:
    if text is None:
        return ""
    if len(text) <= limit:
        return text
    return text[:limit] + "…[truncated]"


def alert_sms_failure(
    *,
    job_id: str,
    rep_slug: str,
    rep_name: str | None,
    to_phone: str,
    to_name: str | None,
    body_text: str,
    result: Any,
    fallback_comment_posted: bool,
) -> None:
    try:
        if not settings.sms_alerts_enabled:
            return

        recipient = settings.sms_alert_recipient
        if not recipient:
            log.warning("sms_alerts_enabled but sms_alert_recipient is empty; skipping alert")
            return

        error = getattr(result, "error", None)
        status_code = getattr(result, "status_code", None)
        message_id = getattr(result, "message_id", None)
        raw_response = getattr(result, "raw_response", None)
        sender_slug = getattr(result, "sender_slug", None) or rep_slug or "bot"

        timestamp = datetime.now(timezone.utc).isoformat()
        job_url = f"https://my.acculynx.com/jobs/{job_id}/communications"
        rep_display = f"{rep_slug} ({rep_name})" if rep_name else rep_slug
        to_display = f"{to_phone} ({to_name})" if to_name else to_phone
        body_preview = _truncate(body_text or "")
        recommendation = _recommendation_for(error).format(rep_slug=rep_slug)
        fallback_str = "yes" if fallback_comment_posted else "no"

        subject = f"🚨 SMS SEND FAILED — {error or 'unknown'} ({sender_slug})"

        body_text_lines = [
            "AccuLynx SMS send failed.",
            "",
            f"Timestamp:        {timestamp}",
            f"Job ID:           {job_id}",
            f"Job URL:          {job_url}",
            f"Rep:              {rep_display}",
            f"Recipient:        {to_display}",
            f"Error:            {error or 'unknown'}",
            f"HTTP status:      {status_code if status_code is not None else 'n/a'}",
            f"Message ID:       {message_id or 'n/a'}",
            f"Fallback Comment: {fallback_str}",
            "",
            "Message body (truncated to 500 chars):",
            body_preview,
            "",
            f"Recommended action: {recommendation}",
        ]
        plain_body = "\n".join(body_text_lines)

        html_body = (
            "<div style=\"font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;"
            "font-size:14px;line-height:1.55;color:#1B1B1B;\">"
            "<h2 style=\"color:#C0392B;margin:0 0 12px;\">🚨 SMS Send Failed</h2>"
            "<table cellpadding=\"4\" style=\"border-collapse:collapse;font-size:14px;\">"
            f"<tr><td><b>Timestamp</b></td><td>{html.escape(timestamp)}</td></tr>"
            f"<tr><td><b>Job</b></td><td><a href=\"{html.escape(job_url)}\">{html.escape(job_id)}</a></td></tr>"
            f"<tr><td><b>Rep</b></td><td>{html.escape(rep_display)}</td></tr>"
            f"<tr><td><b>Recipient</b></td><td>{html.escape(to_display)}</td></tr>"
            f"<tr><td><b>Error</b></td><td><code>{html.escape(str(error) or 'unknown')}</code></td></tr>"
            f"<tr><td><b>HTTP status</b></td><td>{html.escape(str(status_code) if status_code is not None else 'n/a')}</td></tr>"
            f"<tr><td><b>Message ID</b></td><td>{html.escape(str(message_id) or 'n/a')}</td></tr>"
            f"<tr><td><b>Fallback Comment</b></td><td>{fallback_str}</td></tr>"
            "</table>"
            "<h3 style=\"margin:18px 0 6px;\">Message body (truncated)</h3>"
            f"<pre style=\"background:#F7F7F5;padding:10px;border-radius:6px;white-space:pre-wrap;\">{html.escape(body_preview)}</pre>"
            "<h3 style=\"margin:18px 0 6px;\">Recommended action</h3>"
            f"<p style=\"background:#FFF5E5;padding:10px;border-left:3px solid #D4A054;\">{html.escape(recommendation)}</p>"
            f"<p><a href=\"{html.escape(job_url)}\" style=\"display:inline-block;background:#C0392B;color:#FFF;padding:10px 16px;border-radius:4px;text-decoration:none;\">Open job in AccuLynx</a></p>"
            "</div>"
        )

        if raw_response:
            html_body += (
                "<details style=\"margin-top:18px;\"><summary>raw_response</summary>"
                f"<pre style=\"background:#F7F7F5;padding:10px;border-radius:6px;white-space:pre-wrap;font-size:12px;\">{html.escape(_truncate(str(raw_response), 4000))}</pre>"
                "</details>"
            )

        send_email(
            to_email=recipient,
            subject=subject,
            body_text=plain_body,
            body_html=html_body,
        )
    except Exception:
        log.exception("alert_sms_failure: internal failure while emitting alert")


def log_sms_success(
    *,
    job_id: str,
    rep_slug: str,
    to_phone: str,
    result: Any,
) -> None:
    return
