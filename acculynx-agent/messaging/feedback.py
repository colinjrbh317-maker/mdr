"""Rep feedback funnel — capture rep impressions on agent drafts.

Wired into approval emails as a "📣 Send Feedback" button that opens a
form on the dashboard. The dashboard POSTs back to /api/feedback with an
HMAC-signed token so we trust the (approval_id, rep_slug) tuple without
requiring the rep to log in to the dashboard.

Storage:
    1. rep_feedback row in agent.db (source of truth)
    2. Google Sheet append via the `gws` CLI (operational visibility)
    3. SEV-2 alert (so Colin sees it without it pulling rank over real SEV-1)
"""

from __future__ import annotations

import hmac
import hashlib
import json
import logging
import shutil
import subprocess
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from config.settings import settings

log = logging.getLogger(__name__)


def _secret() -> bytes:
    s = settings.feedback_hmac_secret or settings.jwt_secret or "dev-feedback-secret"
    return s.encode("utf-8")


def sign(approval_id: int, rep_slug: str) -> str:
    """Sign (approval_id, rep_slug) with HMAC-SHA256, return hex digest."""
    msg = f"{approval_id}:{rep_slug}".encode("utf-8")
    return hmac.new(_secret(), msg, hashlib.sha256).hexdigest()


def verify(approval_id: int, rep_slug: str, token: str) -> bool:
    if not token:
        return False
    expected = sign(approval_id, rep_slug)
    return hmac.compare_digest(expected, token)


def feedback_url(*, approval_id: int, rep_slug: str, lead_id: Optional[str] = None) -> str:
    """Build the public feedback-form URL for an approval email."""
    base = settings.dashboard_base_url.rstrip("/")
    params = {
        "approval_id": approval_id,
        "rep": rep_slug or "",
        "token": sign(approval_id, rep_slug or ""),
    }
    if lead_id:
        params["lead_id"] = lead_id
    return f"{base}/feedback?{urlencode(params)}"


def render_email_footer(*, approval_id: int, rep_slug: str, lead_id: Optional[str] = None) -> tuple[str, str]:
    """Returns (text_footer, html_footer) to append to approval emails."""
    url = feedback_url(approval_id=approval_id, rep_slug=rep_slug, lead_id=lead_id)
    text = (
        "\n\n—\n"
        "Something off about this draft? "
        f"Send feedback: {url}\n"
    )
    html = (
        '<hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5">'
        '<p style="font-size:13px;color:#666;margin:0">'
        'Something off about this draft? '
        f'<a href="{url}" '
        'style="display:inline-block;padding:6px 12px;background:#1B1B1B;color:#fff;'
        'border-radius:6px;text-decoration:none;font-weight:600">'
        '📣 Send feedback</a></p>'
    )
    return text, html


def _append_to_sheet(row: list[str]) -> Optional[str]:
    """Append a row to the configured feedback Google Sheet via `gws`.

    Returns the sheet response on success, None on any failure (including
    no sheet configured or `gws` not installed). Never raises.
    """
    sheet_id = settings.feedback_log_sheet_id
    if not sheet_id:
        return None
    if not shutil.which("gws"):
        log.info("gws CLI not on PATH; skipping sheet append")
        return None
    try:
        payload = {"range": "Sheet1!A:G", "values": [row]}
        proc = subprocess.run(
            ["gws", "sheets", "append", sheet_id, "--json", "--input", "-"],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=15,
        )
        if proc.returncode != 0:
            log.warning("gws sheets append failed: rc=%d stderr=%s", proc.returncode, proc.stderr[:200])
            return None
        return proc.stdout.strip() or "ok"
    except Exception as exc:
        log.warning("gws sheets append raised: %r", exc)
        return None


async def record_feedback(
    *,
    approval_id: int,
    rep_slug: str,
    rep_email: Optional[str],
    lead_id: Optional[str],
    severity: Optional[int],
    category: Optional[str],
    body: str,
) -> dict:
    """Persist a feedback submission to DB + Sheet + alert. Async-friendly.

    Returns a dict the API can echo back to the client.
    """
    from sqlalchemy import select
    from db.database import async_session
    from db.models import Approval, RepFeedback

    ts = datetime.now(timezone.utc)

    # Resolve linked message + lead from approval row when possible.
    message_id = None
    if approval_id:
        async with async_session() as session:
            r = await session.execute(select(Approval).where(Approval.id == approval_id))
            ap = r.scalar_one_or_none()
            if ap:
                message_id = ap.message_id
                if not lead_id:
                    lead_id = ap.lead_id
                if not rep_email:
                    rep_email = ap.rep_email

    sheet_row = [
        ts.isoformat(),
        rep_slug or "",
        rep_email or "",
        lead_id or "",
        str(approval_id) if approval_id else "",
        str(severity) if severity is not None else "",
        category or "",
        body[:1000],
    ]
    sheet_resp = _append_to_sheet(sheet_row)

    fb = RepFeedback(
        approval_id=approval_id,
        message_id=message_id,
        lead_id=lead_id,
        rep_slug=rep_slug,
        rep_email=rep_email,
        severity=severity,
        category=category,
        body=body,
        sheet_row_id=sheet_resp,
        created_at=ts,
    )
    async with async_session() as session:
        session.add(fb)
        await session.commit()
        fb_id = fb.id

    # Alert at SEV-2 so it doesn't crowd real outages but still surfaces.
    try:
        from messaging.alerts import alert_sev2
        alert_sev2(
            source="messaging.feedback",
            error=f"rep_feedback_severity_{severity or '?'}",
            message=body[:300],
            context={
                "feedback_id": fb_id,
                "approval_id": approval_id,
                "rep_slug": rep_slug,
                "lead_id": lead_id,
                "severity": severity,
                "category": category,
            },
        )
    except Exception:
        log.exception("feedback alert raised (non-fatal)")

    return {
        "feedback_id": fb_id,
        "sheet_logged": bool(sheet_resp),
        "ts": ts.isoformat(),
    }


__all__ = [
    "sign",
    "verify",
    "feedback_url",
    "render_email_footer",
    "record_feedback",
]
