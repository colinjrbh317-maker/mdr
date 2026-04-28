"""Approval flow — magic-link email per draft with JWT-signed tokens.

Lifecycle:
  draft generated  →  create_approval_request(lead, draft)
       creates MessageQueue (status=pending) + Approval (token) rows,
       sends notification email to rep with Approve/Edit/Skip buttons
  rep clicks       →  validate_token + approve/edit/skip
       approve  → status=approved → send_now_via_sendgrid → status=sent → log_to_acculynx
       edit     → render form pre-filled with body → save → status=edited → send_now → sent → log
       skip     → status=skipped (advance cadence anyway)
  4h escalation    →  if Approval.decision is None after 4h, send second email to escalation_email
"""

from __future__ import annotations

import logging
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import jwt
from sqlalchemy import select

from acculynx.notes import log_send_to_acculynx
from config.reps import resolve_rep, Rep
from config.settings import settings
from db.database import async_session
from db.models import Approval, Lead, MessageQueue
from messaging import dispatch

log = logging.getLogger(__name__)


@dataclass
class ApprovalLinks:
    approve_url: str
    edit_url: str
    skip_url: str


def _sign_token(message_id: int) -> str:
    secret = settings.jwt_secret or "dev-secret-do-not-use-in-prod"
    payload = {
        "mid": message_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,
        "nonce": secrets.token_urlsafe(8),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_token(message_id: int, token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.jwt_secret or "dev-secret-do-not-use-in-prod", algorithms=["HS256"])
    except Exception as exc:
        log.warning("token verify failed: %s", exc)
        return False
    return int(payload.get("mid", -1)) == int(message_id)


def _build_links(message_id: int, token: str) -> ApprovalLinks:
    base = settings.app_base_url.rstrip("/")
    return ApprovalLinks(
        approve_url=f"{base}/api/approvals/{message_id}/approve?token={token}",
        edit_url=f"{base}/api/approvals/{message_id}/edit?token={token}",
        skip_url=f"{base}/api/approvals/{message_id}/skip?token={token}",
    )


def _build_notification_email(
    *,
    lead: Lead,
    message: MessageQueue,
    rep: Rep,
    links: ApprovalLinks,
) -> tuple[str, str, str]:
    """Returns (subject, body_text, body_html)."""
    layer = message.cadence_name or "?"
    touch_n = (message.touch_index or 0) + 1
    name = lead.contact_name or "Homeowner"

    subject = f"Draft for {name} ready for review ({layer}, Touch {touch_n})"

    text = f"""Hey {rep.first_name or rep.name.split()[0]},

A new follow-up draft is ready for {name} ({lead.contact_email or lead.contact_phone or 'no contact'}).

Layer: {layer} (Touch {touch_n})
Channel: {message.channel}
Lead address: {lead.address or 'unknown'}

--- DRAFT ---
{('Subject: ' + message.subject + chr(10) + chr(10)) if message.subject else ''}{message.body}
--- /DRAFT ---

Approve and send: {links.approve_url}
Edit first:      {links.edit_url}
Skip this one:   {links.skip_url}

If you don't decide in 4 hours, this escalates to {settings.escalation_email or 'the manager'}.

Modern Day Roofing AI Sales Agent
"""

    html = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1B1B1B;line-height:1.55;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E1DA;">
  <div style="background:#1B1B1B;color:#fff;padding:18px 24px;border-bottom:4px solid #C0392B;">
    <div style="font-weight:800;letter-spacing:0.5px;text-transform:uppercase;font-size:14px;">Modern Day Roofing</div>
    <div style="font-size:12px;opacity:0.7;">AI Sales Agent</div>
  </div>
  <div style="padding:24px;">
    <h2 style="margin:0 0 6px;font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:800;">Draft ready for {name}</h2>
    <p style="color:#6B7280;margin:0 0 18px;font-size:14px;">{layer} · Touch {touch_n} · {message.channel.upper()}</p>

    <div style="background:#FAFAF8;border:1px solid #E5E1DA;border-radius:8px;padding:14px 16px;margin-bottom:18px;font-size:13px;">
      <b>To:</b> {lead.contact_email or lead.contact_phone or '(no contact)'}<br>
      <b>Address:</b> {lead.address or 'unknown'}<br>
      <b>Milestone:</b> {lead.milestone or '?'}
    </div>

    {"<div style='font-weight:700;font-size:15px;margin-bottom:6px;'>Subject: " + message.subject + "</div>" if message.subject else ""}
    <pre style="background:#FAFAF8;border:1px solid #E5E1DA;border-radius:8px;padding:14px 16px;white-space:pre-wrap;font-family:-apple-system,sans-serif;font-size:14px;line-height:1.55;margin:0 0 22px;">{message.body}</pre>

    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:14px;"><tr>
      <td><a href="{links.approve_url}" style="display:block;background:#16a34a;color:#fff;padding:12px 16px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Approve and Send</a></td>
      <td width="8"></td>
      <td><a href="{links.edit_url}" style="display:block;background:#fff;color:#1B1B1B;border:1px solid #E5E1DA;padding:12px 16px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Edit First</a></td>
      <td width="8"></td>
      <td><a href="{links.skip_url}" style="display:block;background:#fff;color:#6B7280;border:1px solid #E5E1DA;padding:12px 16px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Skip</a></td>
    </tr></table>

    <p style="color:#9CA3AF;font-size:12px;margin:0;">If you don't decide within 4 hours, this escalates to {settings.escalation_email or 'the manager'}.</p>
  </div>
</div>
</body></html>"""
    return subject, text, html


async def create_approval_request(
    *,
    lead_id: str,
    channel: str,
    subject: Optional[str],
    body: str,
    cadence_name: str,
    touch_index: int,
    content_type: str,
    rep: Optional[Rep] = None,
) -> dict:
    """Persist the draft + send rep notification email.

    Returns a dict with the new message_id, token, and notification SendResult.
    """
    rep = rep or resolve_rep()

    async with async_session() as session:
        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        msg = MessageQueue(
            lead_id=lead_id,
            channel=channel,
            recipient_email=lead.contact_email,
            recipient_phone=lead.contact_phone,
            subject=subject,
            body=body,
            cadence_name=cadence_name,
            touch_index=touch_index,
            content_type=content_type,
            status="pending",
        )
        session.add(msg)
        await session.flush()  # get msg.id

        token = _sign_token(msg.id)
        approval = Approval(
            message_id=msg.id,
            lead_id=lead_id,
            rep_email=rep.email or settings.escalation_email or "",
            rep_name=rep.name,
            token=token,
        )
        session.add(approval)
        await session.commit()

        links = _build_links(msg.id, token)
        notif_subject, text_body, html_body = _build_notification_email(
            lead=lead, message=msg, rep=rep, links=links,
        )

    sent = dispatch(
        channel="email",
        to_email=rep.email,
        to_name=rep.name,
        subject=notif_subject,
        body_text=text_body,
        body_html=html_body,
        from_email=settings.sendgrid_from_email,
        from_name=settings.sendgrid_from_name,
        lead_id=lead_id,
    )

    return {
        "message_id": msg.id,
        "token": token,
        "approval_id": approval.id,
        "notification_sent": sent.sent,
        "notification_dry_run": sent.dry_run,
        "notification_error": sent.error,
        "links": {
            "approve": links.approve_url,
            "edit": links.edit_url,
            "skip": links.skip_url,
        },
    }


async def approve_and_send(message_id: int) -> dict:
    """Mark message approved, send via SendGrid, log to AccuLynx."""
    async with async_session() as session:
        result = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        msg = result.scalar_one_or_none()
        if not msg:
            raise ValueError(f"Message {message_id} not found")
        if msg.status not in ("pending", "edited"):
            return {"already_decided": True, "status": msg.status}

        result = await session.execute(select(Lead).where(Lead.id == msg.lead_id))
        lead = result.scalar_one_or_none()

        body_to_send = msg.body_edited or msg.body
        send_result = dispatch(
            channel=msg.channel,
            to_email=msg.recipient_email,
            to_phone=msg.recipient_phone,
            to_name=lead.contact_name if lead else None,
            subject=msg.subject,
            body_text=body_to_send,
            from_email=settings.sendgrid_from_email,
            from_name=settings.sendgrid_from_name,
            lead_id=msg.lead_id,
        )

        if send_result.sent or send_result.dry_run:
            msg.status = "sent"
            msg.sent_at = datetime.now(timezone.utc)
            msg.external_message_id = send_result.external_message_id
            # Update Approval row decision
            ap_result = await session.execute(select(Approval).where(Approval.message_id == message_id))
            approval = ap_result.scalar_one_or_none()
            if approval:
                approval.decision = "approved"
                approval.decided_at = datetime.now(timezone.utc)
        else:
            msg.status = "failed"
            msg.delivery_status = send_result.error or send_result.blocked_reason

        await session.commit()

    if (send_result.sent or send_result.dry_run) and not send_result.dry_run:
        try:
            await log_send_to_acculynx(
                job_id=msg.lead_id, channel=msg.channel,
                contact_name=(lead.contact_name if lead else "Homeowner"),
                body=body_to_send, subject=msg.subject,
            )
        except Exception:
            log.exception("AccuLynx note write failed (non-fatal)")

    return {
        "sent": send_result.sent,
        "dry_run": send_result.dry_run,
        "blocked_reason": send_result.blocked_reason,
        "external_message_id": send_result.external_message_id,
        "error": send_result.error,
        "status": msg.status,
    }


async def record_edit(message_id: int, new_body: str, new_subject: Optional[str] = None) -> None:
    async with async_session() as session:
        result = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        msg = result.scalar_one_or_none()
        if not msg:
            raise ValueError(f"Message {message_id} not found")
        msg.body_edited = new_body
        if new_subject is not None:
            msg.subject = new_subject
        msg.status = "edited"
        await session.commit()


async def skip(message_id: int, reason: str = "rep skipped") -> None:
    async with async_session() as session:
        result = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        msg = result.scalar_one_or_none()
        if not msg:
            raise ValueError(f"Message {message_id} not found")
        msg.status = "skipped"
        msg.skip_reason = reason
        ap_result = await session.execute(select(Approval).where(Approval.message_id == message_id))
        approval = ap_result.scalar_one_or_none()
        if approval:
            approval.decision = "skipped"
            approval.decided_at = datetime.now(timezone.utc)
        await session.commit()


async def get_pending_message(message_id: int) -> Optional[MessageQueue]:
    async with async_session() as session:
        result = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        return result.scalar_one_or_none()
