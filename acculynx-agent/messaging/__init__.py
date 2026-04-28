"""Messaging channel router.

Single entry point for outbound message delivery. Routes by channel, enforces
DRY_RUN globally, and gates sends through MESSAGING_CHANNELS + TEST_LEAD_ALLOWLIST.

Today only "email" is wired (SendGrid). SMS via Twilio stays gated until A2P
approval lands. Once Twilio is approved, set MESSAGING_CHANNELS=email,sms in
.env and add `messaging/twilio_sms.py` with a `send_sms()` function matching
the same return shape.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Optional

from config.settings import settings

from .sendgrid_email import SendResult, send_email

log = logging.getLogger(__name__)


@dataclass
class DispatchResult:
    """Unified result shape across email and (eventually) SMS channels."""
    channel: str
    sent: bool
    dry_run: bool
    blocked_reason: Optional[str]
    external_message_id: Optional[str]
    rfc_message_id: Optional[str]
    status_code: Optional[int]
    error: Optional[str]


def _channel_enabled(channel: str) -> bool:
    enabled = {c.strip().lower() for c in settings.messaging_channels.split(",") if c.strip()}
    return channel.lower() in enabled


def _allowlist_blocks(lead_id: Optional[str]) -> Optional[str]:
    """When TEST_LEAD_ALLOWLIST is set and DRY_RUN is false, only allowlisted
    leads can receive real sends. Belt-and-suspenders alongside DRY_RUN."""
    allowlist_raw = settings.test_lead_allowlist.strip()
    if not allowlist_raw:
        return None
    if settings.dry_run:
        return None
    if not lead_id:
        return "no lead_id; allowlist active"
    allowed = {x.strip() for x in allowlist_raw.split(",") if x.strip()}
    if lead_id not in allowed:
        return f"lead {lead_id} not in TEST_LEAD_ALLOWLIST"
    return None


def dispatch(
    *,
    channel: str,
    to_email: Optional[str] = None,
    to_phone: Optional[str] = None,
    to_name: Optional[str] = None,
    subject: Optional[str] = None,
    body_text: str,
    body_html: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    lead_id: Optional[str] = None,
    in_reply_to: Optional[str] = None,
    references: Optional[list[str]] = None,
) -> DispatchResult:
    """Route an outbound message to the right channel.

    Returns a DispatchResult that always tells you whether the message went
    out, was blocked (channel disabled / allowlist / dry run), or errored.
    """
    channel = channel.lower()

    if not _channel_enabled(channel):
        return DispatchResult(
            channel=channel, sent=False, dry_run=False,
            blocked_reason=f"channel '{channel}' not in MESSAGING_CHANNELS",
            external_message_id=None, rfc_message_id=None,
            status_code=None, error=None,
        )

    blocked = _allowlist_blocks(lead_id)
    if blocked:
        log.info("ALLOWLIST_BLOCK: %s", blocked)
        return DispatchResult(
            channel=channel, sent=False, dry_run=False, blocked_reason=blocked,
            external_message_id=None, rfc_message_id=None,
            status_code=None, error=None,
        )

    if channel == "email":
        if not to_email:
            return DispatchResult(
                channel="email", sent=False, dry_run=False,
                blocked_reason="missing to_email", external_message_id=None,
                rfc_message_id=None, status_code=None, error=None,
            )
        result: SendResult = send_email(
            to_email=to_email, to_name=to_name,
            subject=subject or "(no subject)",
            body_text=body_text, body_html=body_html,
            from_email=from_email, from_name=from_name,
            lead_id=lead_id, in_reply_to=in_reply_to, references=references,
        )
        return DispatchResult(
            channel="email", sent=result.sent, dry_run=result.dry_run,
            blocked_reason=None,
            external_message_id=result.sendgrid_message_id,
            rfc_message_id=result.rfc_message_id,
            status_code=result.status_code, error=result.error,
        )

    if channel == "sms":
        return DispatchResult(
            channel="sms", sent=False, dry_run=False,
            blocked_reason="SMS not implemented; awaiting Twilio A2P",
            external_message_id=None, rfc_message_id=None,
            status_code=None, error=None,
        )

    return DispatchResult(
        channel=channel, sent=False, dry_run=False,
        blocked_reason=f"unknown channel '{channel}'",
        external_message_id=None, rfc_message_id=None,
        status_code=None, error=None,
    )


__all__ = ["dispatch", "DispatchResult", "SendResult", "send_email"]
