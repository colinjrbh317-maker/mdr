"""Webhook receivers.

POST /api/webhooks/inbound-email   — SendGrid Inbound Parse
POST /api/webhooks/acculynx        — (stub) AccuLynx milestone change events
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select

from config.reps import resolve_rep
from config.settings import settings
from db.database import async_session
from db.models import Lead, MessageQueue
from messaging import dispatch
from messaging.inbound_parser import parse_payload

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/inbound-email")
async def inbound_email(request: Request) -> dict:
    """Receive a SendGrid Inbound Parse POST.

    1. Parse the payload, extract lead_id from reply+<id>@reply.<domain>
       (or fall back to In-Reply-To header against MessageQueue.rfc_message_id).
    2. Persist a new MessageQueue row with direction="inbound".
    3. Pause the lead's cadence (rep takes over) and notify the rep via email.
    """
    form = await request.form()
    payload = parse_payload(dict(form))

    log.info("Inbound email: from=%s lead_id=%s in_reply_to=%s",
             payload.from_email, payload.extracted_lead_id, payload.in_reply_to)

    # Resolve lead
    lead_id = payload.extracted_lead_id
    matched_outbound: MessageQueue | None = None
    async with async_session() as session:
        if not lead_id and payload.in_reply_to:
            stmt = select(MessageQueue).where(MessageQueue.rfc_message_id == payload.in_reply_to)
            r = await session.execute(stmt)
            matched_outbound = r.scalar_one_or_none()
            if matched_outbound:
                lead_id = matched_outbound.lead_id

        if not lead_id:
            log.warning("Inbound email could not be linked to any lead")
            return {"ok": False, "reason": "no lead match"}

        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            return {"ok": False, "reason": f"lead {lead_id} not found"}

        # Persist as inbound MessageQueue row
        inbound_row = MessageQueue(
            lead_id=lead.id,
            channel="email",
            recipient_email=payload.from_email,
            subject=payload.subject,
            body=payload.text or payload.html,
            status="received",
            direction="inbound",
            in_reply_to=payload.in_reply_to,
        )
        session.add(inbound_row)

        # Pause cadence so we don't keep firing follow-ups while rep replies
        lead.is_paused = True
        lead.pause_reason = "homeowner replied"

        await session.commit()
        log.info("Inbound persisted: msg_id=%s, lead %s paused", inbound_row.id, lead.id)

    # Notify the rep via email, with Sierra on CC so she stays in the loop.
    rep = resolve_rep(lead.assigned_rep_id)
    cc_targets = [settings.escalation_cc_email] if settings.escalation_cc_email else None
    body = (
        f"{lead.contact_name or 'Homeowner'} replied to your follow-up.\n\n"
        f"From: {payload.from_email}\n"
        f"Subject: {payload.subject}\n\n"
        f"--- THEIR MESSAGE ---\n{(payload.text or payload.html)[:1500]}\n--- END ---\n\n"
        f"Cadence is now paused for this lead. Reply directly from your inbox or "
        f"resume the cadence after you've engaged.\n"
    )
    dispatch(
        channel="email",
        to_email=rep.email,
        to_name=rep.name,
        cc=cc_targets,
        subject=f"{lead.contact_name or 'Homeowner'} replied",
        body_text=body,
        from_email=settings.sendgrid_from_email,
        from_name=settings.sendgrid_from_name,
        lead_id=lead.id,
    )

    return {"ok": True, "lead_id": lead.id, "paused": True}


@router.post("/acculynx")
async def acculynx_webhook(request: Request) -> dict:
    """Receive an AccuLynx webhook event.

    Auth: ``?token=<settings.acculynx_webhook_token>`` embedded in the
    registered consumerUrl. AccuLynx does not provide an HMAC secret at
    subscription creation (verified empirically), so we rely on the
    token-in-URL pattern.

    Subscribed topics: see ``acculynx.webhooks.DESIRED_TOPICS``.
    """
    from acculynx.webhooks import handle_event, parse_event

    expected = settings.acculynx_webhook_token
    if expected:
        provided = request.query_params.get("token", "")
        if provided != expected:
            log.warning("acculynx webhook auth failed: token mismatch")
            return {"ok": False, "error": "unauthorized"}

    try:
        payload = await request.json()
    except Exception as e:
        log.warning("acculynx webhook bad JSON: %s", e)
        return {"ok": False, "error": "bad json"}

    event = parse_event(payload)
    log.info("acculynx webhook: topic=%s job=%s event_id=%s",
             event.topic, event.job_id, event.event_id)

    try:
        result = await handle_event(event)
    except Exception:
        log.exception("acculynx webhook handler error")
        return {"ok": False, "error": "handler exception"}

    return result
