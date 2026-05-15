"""Send SMS via AccuLynx's internal v3 message-board endpoint.

This is the same endpoint the AccuLynx web UI calls when a rep types a text
in the Communications tab. Messages go through AccuLynx's own SMS
infrastructure (not Twilio), thread into the rep's existing conversation
with the homeowner, and land in the Communications tab as if the rep sent
them.

Endpoint:  POST https://my.acculynx.com/api/v3/message-board/{job_id}/text-message

Auth: 4 session cookies required (.ASPXAUTH, ASP.NET_SessionId, cf_clearance,
deviceThumbprint). All 4 are captured by scripts/refresh_cookies.py when it
runs the warmup-job navigation step. v4 endpoints (Comments) only need the
first 2; v3 enforces the full set because Cloudflare gates it.

Both sync and async entry points are provided. dispatch() in
messaging/__init__.py is sync so it calls send_text_sync(); future async
callers (background workers) can use send_text() directly.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Optional

import httpx

from .internal_api import _cookies, USER_AGENT, is_configured

log = logging.getLogger(__name__)

V3_BASE = "https://my.acculynx.com/api/v3"


@dataclass
class TextSendResult:
    sent: bool
    delivered: Optional[bool]
    message_id: Optional[str]
    status_code: Optional[int]
    error: Optional[str]
    raw_response: Optional[str]


def _build_headers(job_id: str) -> dict[str, str]:
    """Headers mirroring a real Chrome session. Origin + Referer + the
    Sec-Fetch-* trio are what the v3 endpoint cross-checks against its
    Cloudflare config."""
    return {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://my.acculynx.com",
        "Referer": f"https://my.acculynx.com/jobs/{job_id}/communications",
        "X-Device-Time-Zone": "America/New_York",
        "Sec-Ch-Ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }


def _wrap_html(body_text: str) -> str:
    """Wrap plain text in <p>...</p> to match the AccuLynx rich-text composer."""
    if body_text.lstrip().startswith("<"):
        return body_text
    paragraphs = [p.strip() for p in body_text.split("\n\n")]
    return "".join(f"<p>{p}</p>" for p in paragraphs if p)


def _build_payload(job_id: str, correspondent_id: str, phone: str, body_text: str) -> dict:
    return {
        "Message": _wrap_html(body_text.strip()),
        "Recipients": [
            {
                "CorrespondentID": correspondent_id,
                "Value": phone,
                "CorrespondentType": 1,  # 1 = mobile
            }
        ],
        "JobID": job_id,
        "SubscribeToNotifications": None,
        "IncludeSignature": False,
        "Attachments": [],
        "TagIds": [],
    }


def _parse_response(r: httpx.Response) -> TextSendResult:
    """Classify the response into a TextSendResult."""
    status = r.status_code
    body = r.text[:1000]

    if status in (302, 401, 403):
        log.warning(
            "send_text: AUTH FAILED (%s) - cookies likely missing cf_clearance/"
            "deviceThumbprint or expired. Run scripts/refresh_cookies.py.", status,
        )
        return TextSendResult(False, None, None, status, "auth", body)

    if status == 500:
        return TextSendResult(False, None, None, status, "server_500", body)

    if status not in (200, 201, 204):
        return TextSendResult(False, None, None, status, f"unexpected:{status}", body)

    # 200 - the v3 endpoint returns a JSON array containing one record with
    # TextMessageID, Sender, Recipient, etc. Older variants return a bare
    # GUID string or a JobMessage envelope.
    new_msg_id: Optional[str] = None
    try:
        if r.content:
            data = r.json()
            if isinstance(data, list) and data:
                first = data[0] if isinstance(data[0], dict) else {}
                new_msg_id = first.get("TextMessageID") or first.get("Id")
            elif isinstance(data, str):
                new_msg_id = data
            elif isinstance(data, dict):
                new_msg_id = (
                    data.get("TextMessageID")
                    or data.get("Id")
                    or (data.get("JobMessage") or {}).get("Id")
                )
    except Exception:
        pass

    # AccuLynx returns "00000000-..." when input is syntactically valid but
    # semantically rejected (wrong Type, missing field). Treat as failure.
    if new_msg_id and new_msg_id.replace("-", "").strip("0") == "":
        return TextSendResult(False, None, None, status, "null_guid_schema_reject", body)

    return TextSendResult(
        sent=True, delivered=None, message_id=new_msg_id,
        status_code=status, error=None, raw_response=body,
    )


def send_text_sync(
    *,
    job_id: str,
    correspondent_id: str,
    phone: str,
    body_text: str,
) -> TextSendResult:
    """Synchronous send. Used by messaging.dispatch().

    Returns TextSendResult; never raises. On auth failure (401/403) the
    dispatcher should fall back to posting an internal Comment so the rep
    sees the message and can send it manually.
    """
    if not is_configured():
        return TextSendResult(False, None, None, None, "cookies_not_configured", None)
    if not body_text or not body_text.strip():
        return TextSendResult(False, None, None, None, "empty_body", None)
    if not correspondent_id or not phone:
        return TextSendResult(False, None, None, None, "missing_recipient", None)

    url = f"{V3_BASE}/message-board/{job_id}/text-message"
    payload = _build_payload(job_id, correspondent_id, phone, body_text)

    try:
        with httpx.Client(
            timeout=30,
            cookies=_cookies(),
            headers=_build_headers(job_id),
            follow_redirects=False,
        ) as c:
            r = c.post(url, json=payload)
    except Exception as exc:
        log.warning("send_text_sync: network error for job %s: %s", job_id, exc)
        return TextSendResult(False, None, None, None, f"network:{exc}", None)

    return _parse_response(r)


async def send_text(
    *,
    job_id: str,
    correspondent_id: str,
    phone: str,
    body_text: str,
) -> TextSendResult:
    """Async variant for callers already inside an event loop."""
    if not is_configured():
        return TextSendResult(False, None, None, None, "cookies_not_configured", None)
    if not body_text or not body_text.strip():
        return TextSendResult(False, None, None, None, "empty_body", None)
    if not correspondent_id or not phone:
        return TextSendResult(False, None, None, None, "missing_recipient", None)

    url = f"{V3_BASE}/message-board/{job_id}/text-message"
    payload = _build_payload(job_id, correspondent_id, phone, body_text)

    try:
        async with httpx.AsyncClient(
            timeout=30,
            cookies=_cookies(),
            headers=_build_headers(job_id),
            follow_redirects=False,
        ) as c:
            r = await c.post(url, json=payload)
    except Exception as exc:
        log.warning("send_text: network error for job %s: %s", job_id, exc)
        return TextSendResult(False, None, None, None, f"network:{exc}", None)

    return _parse_response(r)
