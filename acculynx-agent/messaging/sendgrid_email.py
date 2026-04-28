"""SendGrid email send module.

Sends a single email with explicit threading headers and returns the SendGrid
message id so we can correlate delivery status later. Threading is preserved by
setting RFC 2822 Message-ID, In-Reply-To, and References on outbound mail, and
by routing replies through a sub-addressed Reply-To (reply+<lead_id>@<domain>).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from email.utils import make_msgid
from typing import Optional

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Email,
    Header,
    Mail,
    MailSettings,
    SandBoxMode,
    To,
    ReplyTo,
)

from config.settings import settings

log = logging.getLogger(__name__)


@dataclass
class SendResult:
    sent: bool
    dry_run: bool
    sendgrid_message_id: Optional[str]
    rfc_message_id: Optional[str]
    status_code: Optional[int]
    error: Optional[str] = None


def _generate_message_id(domain: str) -> str:
    """Generate an RFC 2822 Message-ID rooted on our sending domain."""
    return make_msgid(domain=domain)


def _resolve_reply_to(lead_id: Optional[str]) -> str:
    """Build the per-lead Reply-To using sub-address routing.

    Falls back to the override or the from address if no lead id provided.
    """
    if settings.reply_to_override:
        return settings.reply_to_override
    if lead_id and settings.sendgrid_reply_subdomain:
        return f"reply+{lead_id}@{settings.sendgrid_reply_subdomain}"
    return settings.sendgrid_from_email


def send_email(
    *,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    to_name: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    lead_id: Optional[str] = None,
    in_reply_to: Optional[str] = None,
    references: Optional[list[str]] = None,
    sandbox: bool = False,
) -> SendResult:
    """Send a single email through SendGrid.

    Args:
        to_email: recipient address.
        subject: email subject line.
        body_text: plain-text body. Required.
        body_html: optional HTML body. Falls back to body_text wrapped in <pre>.
        to_name: optional recipient display name.
        from_email: override sender address. Defaults to settings.sendgrid_from_email.
        from_name: override sender display name. Defaults to settings.sendgrid_from_name.
        lead_id: AccuLynx job id, used to build Reply-To: reply+<lead_id>@<subdomain>.
        in_reply_to: prior Message-ID being replied to. Adds threading headers.
        references: full thread of prior Message-IDs.
        sandbox: when True, SendGrid validates but does NOT deliver. Useful for CI.

    Returns:
        SendResult with sendgrid_message_id (X-Message-Id) and rfc_message_id
        (the Message-ID we generated, persisted on the queue row for threading).
    """
    if not body_text or not body_text.strip():
        return SendResult(False, False, None, None, None, "body_text empty")

    sender = from_email or settings.sendgrid_from_email
    sender_name = from_name or settings.sendgrid_from_name

    domain = sender.split("@", 1)[1] if "@" in sender else "moderndayroof.com"
    rfc_message_id = _generate_message_id(domain)
    reply_to = _resolve_reply_to(lead_id)

    if not body_html:
        body_html = (
            "<div style=\"font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;"
            "font-size:15px;line-height:1.55;color:#1B1B1B;white-space:pre-wrap;\">"
            f"{body_text}"
            "</div>"
        )

    mail = Mail(
        from_email=Email(sender, sender_name),
        to_emails=To(to_email, to_name),
        subject=subject,
        plain_text_content=body_text,
        html_content=body_html,
    )
    mail.reply_to = ReplyTo(reply_to)

    mail.add_header(Header("Message-ID", rfc_message_id))
    if in_reply_to:
        mail.add_header(Header("In-Reply-To", in_reply_to))
    if references:
        mail.add_header(Header("References", " ".join(references)))

    if sandbox:
        mail.mail_settings = MailSettings(sandbox_mode=SandBoxMode(enable=True))

    if settings.dry_run:
        log.info(
            "DRY_RUN: would send to=%s subject=%r from=%r reply_to=%s message_id=%s",
            to_email, subject, f"{sender_name} <{sender}>", reply_to, rfc_message_id,
        )
        return SendResult(
            sent=False, dry_run=True,
            sendgrid_message_id=f"dryrun-{uuid.uuid4().hex[:12]}",
            rfc_message_id=rfc_message_id, status_code=None,
        )

    if not settings.sendgrid_api_key:
        return SendResult(False, False, None, rfc_message_id, None, "SENDGRID_API_KEY not set")

    try:
        client = SendGridAPIClient(settings.sendgrid_api_key)
        response = client.send(mail)
        sg_id = response.headers.get("X-Message-Id") if hasattr(response, "headers") else None
        return SendResult(
            sent=200 <= response.status_code < 300,
            dry_run=False,
            sendgrid_message_id=sg_id,
            rfc_message_id=rfc_message_id,
            status_code=response.status_code,
        )
    except Exception as exc:
        log.exception("SendGrid send failed")
        return SendResult(False, False, None, rfc_message_id, None, str(exc))
