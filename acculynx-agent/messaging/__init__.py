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
    # SMS-specific args (ignored for email channel)
    acculynx_job_id: Optional[str] = None,
    acculynx_correspondent_id: Optional[str] = None,
    rep_slug: Optional[str] = None,
    rep_name: Optional[str] = None,
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

    # Operator-controlled kill switch (dashboard). Persists across restarts via
    # data/runtime_state.json so a UI click takes effect immediately without
    # rewriting .env or restarting the agent. Treated as DRY_RUN for both
    # channels.
    from db.runtime_state import get_kill_switch
    if get_kill_switch():
        log.info("KILL_SWITCH active: short-circuiting %s send (dry_run)", channel)
        return DispatchResult(
            channel=channel, sent=False, dry_run=True,
            blocked_reason="kill_switch", external_message_id=None,
            rfc_message_id=None, status_code=None, error=None,
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
        # Native AccuLynx SMS via internal v3 endpoint. Sent through the rep's
        # OWN session so the homeowner sees the rep's real AccuLynx number and
        # the message threads into the existing conversation. Falls back to
        # the bot account if the rep has no session. ANY failure posts a
        # Comment so the rep sees the proposed text + emails Colin so he can
        # remediate before more leads are affected.
        if settings.dry_run:
            return DispatchResult(
                channel="sms", sent=False, dry_run=True, blocked_reason=None,
                external_message_id=None, rfc_message_id=None,
                status_code=None, error=None,
            )
        if not to_phone:
            return DispatchResult(
                channel="sms", sent=False, dry_run=False,
                blocked_reason="missing to_phone", external_message_id=None,
                rfc_message_id=None, status_code=None, error=None,
            )

        from acculynx.send_text import send_text_sync
        from acculynx.internal_api import post_comment_sync
        from acculynx.opt_in_check import check_opt_in_sync
        from messaging.sms_alerts import alert_sms_failure, log_sms_success

        # Block-with-fallback when we can't resolve the AccuLynx routing keys.
        # We post a Comment so the rep still sees the draft + email Colin so
        # he knows the resolution path is broken.
        if not acculynx_job_id or not acculynx_correspondent_id:
            missing_what = "job_id" if not acculynx_job_id else "correspondent_id"
            fallback_note = (
                f"[AI Agent] DRAFT TEXT to {to_name or to_phone} — NOT SENT "
                f"(missing AccuLynx {missing_what}; agent couldn't resolve the contact). "
                f"Please send manually via the Texts tab.\n\nProposed body:\n{body_text}"
            )
            if acculynx_job_id:
                try:
                    post_comment_sync(acculynx_job_id, fallback_note)
                except Exception:
                    log.exception("Comment fallback failed on missing correspondent")
            try:
                from acculynx.send_text import TextSendResult as _TSR
                stub = _TSR(False, None, None, None, f"missing_{missing_what}", None, rep_slug or "")
                alert_sms_failure(
                    job_id=acculynx_job_id or "?", rep_slug=rep_slug or "",
                    rep_name=rep_name, to_phone=to_phone, to_name=to_name,
                    body_text=body_text, result=stub,
                    fallback_comment_posted=bool(acculynx_job_id),
                )
            except Exception:
                log.exception("alert_sms_failure raised on missing routing keys")
            return DispatchResult(
                channel="sms", sent=False, dry_run=False,
                blocked_reason=f"missing_{missing_what}",
                external_message_id=None, rfc_message_id=None,
                status_code=None, error=f"missing_{missing_what}; fallback Comment posted",
            )

        # Pre-flight: SMS opt-in. Fail-safe (unknown → allow).
        opt_in = check_opt_in_sync(
            job_id=acculynx_job_id,
            correspondent_id=acculynx_correspondent_id,
            phone=to_phone,
            rep_slug=rep_slug,
        )
        if not opt_in.can_send:
            log.warning(
                "SMS BLOCKED (opt-in off) job=%s contact=%s: %s",
                acculynx_job_id, acculynx_correspondent_id, opt_in.detail,
            )
            fallback_note = (
                f"[AI Agent] DRAFT TEXT to {to_name or to_phone} — NOT SENT "
                f"(contact has SMS opt-in OFF). To send: enable opt-in in AccuLynx "
                f"then approve again, or send manually.\n\nProposed body:\n{body_text}"
            )
            try:
                post_comment_sync(acculynx_job_id, fallback_note)
            except Exception:
                log.exception("Comment fallback failed on opt-in block")
            return DispatchResult(
                channel="sms", sent=False, dry_run=False,
                blocked_reason="opt_in_off",
                external_message_id=None, rfc_message_id=None,
                status_code=None, error="opt_in_off; fallback Comment posted",
            )

        result = send_text_sync(
            job_id=acculynx_job_id,
            correspondent_id=acculynx_correspondent_id,
            phone=to_phone,
            body_text=body_text,
            rep_slug=rep_slug,
        )

        if result.sent:
            log.info(
                "SMS sent (job=%s sender=%s msg=%s)",
                acculynx_job_id, result.sender_slug, result.message_id,
            )
            try:
                log_sms_success(
                    job_id=acculynx_job_id, rep_slug=result.sender_slug,
                    to_phone=to_phone, message_id=result.message_id,
                )
            except Exception:
                log.exception("log_sms_success failed (non-fatal)")
            return DispatchResult(
                channel="sms", sent=True, dry_run=False, blocked_reason=None,
                external_message_id=result.message_id, rfc_message_id=None,
                status_code=result.status_code, error=None,
            )

        # Failure path: post Comment fallback + alert Colin via email.
        log.warning(
            "SMS send FAILED (job=%s sender=%s error=%s status=%s) - falling back to Comment + alerting",
            acculynx_job_id, result.sender_slug, result.error, result.status_code,
        )
        fallback_note = (
            f"[AI Agent] DRAFT TEXT to {to_name or to_phone} — SEND FAILED "
            f"(error: {result.error}). Please send manually via the Texts tab.\n\n"
            f"Proposed body:\n{body_text}"
        )
        comment_posted = False
        try:
            post_comment_sync(acculynx_job_id, fallback_note)
            comment_posted = True
        except Exception:
            log.exception("Comment fallback failed on SMS error")

        try:
            alert_sms_failure(
                job_id=acculynx_job_id,
                rep_slug=result.sender_slug or (rep_slug or ""),
                rep_name=rep_name,
                to_phone=to_phone,
                to_name=to_name,
                body_text=body_text,
                result=result,
                fallback_comment_posted=comment_posted,
            )
        except Exception:
            log.exception("alert_sms_failure raised (non-fatal)")

        return DispatchResult(
            channel="sms", sent=False, dry_run=False,
            blocked_reason=f"v3_send_failed:{result.error}",
            external_message_id=None, rfc_message_id=None,
            status_code=result.status_code,
            error=f"{result.error}; fallback Comment {'posted' if comment_posted else 'FAILED'}",
        )

    return DispatchResult(
        channel=channel, sent=False, dry_run=False,
        blocked_reason=f"unknown channel '{channel}'",
        external_message_id=None, rfc_message_id=None,
        status_code=None, error=None,
    )


__all__ = ["dispatch", "DispatchResult", "SendResult", "send_email"]
