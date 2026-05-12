"""Twilio SMS send module.

Mirrors `messaging.sendgrid_email` shape so `dispatch` can swap channels
without callers caring. Sending is gated by:
  - settings.dry_run (global)
  - settings.messaging_channels (channel allowlist, enforced in dispatch)
  - settings.twilio_account_sid / auth_token / phone_number presence

Per-rep "from_phone" is supported. When the caller does not pass a from_phone,
we fall back to settings.twilio_phone_number (shared bot number).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Optional

from config.settings import settings

log = logging.getLogger(__name__)


@dataclass
class SmsResult:
    sent: bool
    dry_run: bool
    twilio_message_sid: Optional[str]
    status_code: Optional[int]
    error: Optional[str] = None


def _normalize_phone(raw: str) -> str:
    """Light E.164 normalization for US numbers. Twilio rejects unformatted input."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    if raw.startswith("+"):
        return raw
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return raw


def send_sms(
    *,
    to_phone: str,
    body: str,
    from_phone: Optional[str] = None,
    lead_id: Optional[str] = None,
) -> SmsResult:
    """Send a single SMS through Twilio.

    Args:
        to_phone: recipient phone (E.164 preferred; we normalize US 10-digit).
        body: SMS text. Twilio splits >160 chars into segments.
        from_phone: per-rep sending number. Falls back to settings.twilio_phone_number.
        lead_id: AccuLynx job id, logged for correlation.

    Returns:
        SmsResult with the Twilio message SID on success.
    """
    if not body or not body.strip():
        return SmsResult(False, False, None, None, "body empty")

    to_normalized = _normalize_phone(to_phone)
    if not to_normalized:
        return SmsResult(False, False, None, None, "missing to_phone")

    sender = _normalize_phone(from_phone or settings.twilio_phone_number)
    if not sender:
        return SmsResult(False, False, None, None, "no from_phone available")

    if settings.dry_run:
        log.info(
            "DRY_RUN: would send SMS to=%s from=%s lead=%s body=%r",
            to_normalized, sender, lead_id, body[:80],
        )
        return SmsResult(
            sent=False, dry_run=True,
            twilio_message_sid=f"dryrun-sms-{uuid.uuid4().hex[:12]}",
            status_code=None,
        )

    if not (settings.twilio_account_sid and settings.twilio_auth_token):
        return SmsResult(False, False, None, None, "Twilio credentials not set")

    try:
        from twilio.rest import Client
    except ImportError:
        return SmsResult(False, False, None, None, "twilio package not installed")

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        message = client.messages.create(
            to=to_normalized,
            from_=sender,
            body=body,
        )
        return SmsResult(
            sent=True, dry_run=False,
            twilio_message_sid=message.sid,
            status_code=None,
        )
    except Exception as exc:
        log.exception("Twilio send failed")
        return SmsResult(False, False, None, None, str(exc))
