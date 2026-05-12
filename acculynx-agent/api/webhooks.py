"""Webhook receivers.

POST /api/webhooks/inbound-email   — SendGrid Inbound Parse
POST /api/webhooks/acculynx        — AccuLynx milestone change events

The inbound-email handler classifies the homeowner's reply and routes:
  - high-confidence objective question (warranty/financing/hours/process)
        -> schedule AI auto-reply after a 2-3 min random delay, BCC rep,
           log to AccuLynx, cadence stays paused until the reply lands
  - dead lead (selling house, going with someone else, opt-out)
        -> send empathy + door-open template now, pause cadence permanently
  - complaint / objection / pricing
        -> escalate to assigned rep + CC Sierra, cadence paused
  - everything else
        -> pause cadence, notify rep, manual reply
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select

from ai.classifier import SAFE_AUTO_REPLY_CATEGORIES, classify_inbound
from ai.drafter import draft_inbound_reply
from config.reps import resolve_rep
from config.settings import settings
from db.database import async_session
from db.models import Lead, MessageQueue
from messaging import dispatch
from messaging.inbound_parser import parse_payload

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


DEAD_LEAD_TEMPLATE = (
    "Totally understand, {first_name} — life moves fast. "
    "If anything ever changes or you want a second opinion down the road, "
    "Modern Day Roofing is always here. No pressure on our end.\n\n"
    "Wishing you the best,\n"
    "{rep_first}\n"
    "Modern Day Roofing\n"
    "{rep_phone}\n"
)


async def _send_rep_notification(
    *,
    lead: Lead,
    payload,
    reason_summary: str,
    classifier_note: str = "",
) -> None:
    """Email the assigned rep about an inbound that requires manual handling.
    Always CCs Sierra so she can pick up if the rep is unavailable.
    """
    rep = resolve_rep(lead.assigned_rep_id)
    cc_targets = [settings.escalation_cc_email] if settings.escalation_cc_email else None
    body = (
        f"{lead.contact_name or 'Homeowner'} replied to your follow-up.\n\n"
        f"From: {payload.from_email}\n"
        f"Subject: {payload.subject}\n"
        f"Why this is in your inbox: {reason_summary}\n"
        f"{('Classifier note: ' + classifier_note + chr(10)) if classifier_note else ''}\n"
        f"--- THEIR MESSAGE ---\n"
        f"{(payload.text or payload.html)[:1800]}\n"
        f"--- END ---\n\n"
        f"Cadence is paused. Reply from your inbox or resume the cadence once handled.\n"
    )
    dispatch(
        channel="email",
        to_email=rep.email,
        to_name=rep.name,
        cc=cc_targets,
        subject=f"[Action needed] {lead.contact_name or 'Homeowner'} replied — {reason_summary}",
        body_text=body,
        from_email=settings.sendgrid_from_email,
        from_name=settings.sendgrid_from_name,
        lead_id=lead.id,
    )


async def _send_dead_lead_reply(lead: Lead, payload) -> None:
    """Send the empathy + door-open template to the homeowner and permanently
    pause the cadence. Sends from the assigned rep so it threads cleanly."""
    rep = resolve_rep(lead.assigned_rep_id)
    body = DEAD_LEAD_TEMPLATE.format(
        first_name=(lead.contact_name or "").split()[0] or "there",
        rep_first=rep.first_name or rep.name.split()[0] or "Modern Day Roofing",
        rep_phone=rep.signature_phone,
    )
    subject = f"Re: {payload.subject}" if payload.subject else "Thanks for letting us know"
    dispatch(
        channel="email",
        to_email=payload.from_email,
        to_name=lead.contact_name,
        subject=subject,
        body_text=body,
        from_email=rep.sendgrid_sender_email or settings.sendgrid_from_email,
        from_name=rep.name,
        lead_id=lead.id,
        in_reply_to=payload.in_reply_to,
        references=payload.references or None,
    )

    async with async_session() as session:
        fresh = await session.get(Lead, lead.id)
        if fresh:
            fresh.is_paused = True
            fresh.is_active = False
            fresh.pause_reason = "homeowner_dead (auto-replied with empathy template)"
            await session.commit()

    try:
        from acculynx.notes import log_send_to_acculynx
        await log_send_to_acculynx(
            job_id=lead.id, channel="email",
            contact_name=lead.contact_name or "Homeowner",
            body=body, subject=subject,
            prefix_note="AUTO-REPLY (dead lead: empathy + door-open, cadence closed)",
        )
    except Exception:
        log.exception("AccuLynx note write failed (non-fatal)")


async def _auto_reply_send(
    *,
    lead_id: str,
    homeowner_email: str,
    homeowner_name: str | None,
    homeowner_message: str,
    category: str,
    in_reply_to: str | None,
    references: list[str] | None,
    prior_subject: str | None,
) -> None:
    """Coroutine scheduled by APScheduler to fire after the 2-3 min delay.
    Drafts the reply just before send (fresher context), runs postflight,
    sends, BCCs the rep, and logs to AccuLynx.
    """
    async with async_session() as session:
        lead = await session.get(Lead, lead_id)
    if not lead:
        log.warning("auto-reply: lead %s vanished before send", lead_id)
        return

    rep = resolve_rep(lead.assigned_rep_id)
    lead_context = {
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "city": (lead.address.split(",")[1].strip() if lead.address and "," in lead.address else None),
        "milestone": lead.milestone,
        "agent_context": lead.agent_context,
    }

    draft = await draft_inbound_reply(
        lead_context=lead_context,
        homeowner_message=homeowner_message,
        category=category,
        rep=rep,
        prior_subject=prior_subject,
    )

    if draft.get("escalation") or not draft.get("postflight_ok"):
        log.info(
            "auto-reply downgraded to manual for %s: %s",
            lead_id, draft.get("escalation") or draft.get("postflight_reasons"),
        )
        await _send_rep_notification(
            lead=lead,
            payload=type("P", (), {
                "from_email": homeowner_email,
                "subject": prior_subject or "(no subject)",
                "text": homeowner_message,
                "html": "",
                "in_reply_to": in_reply_to,
                "references": references,
            })(),
            reason_summary="auto-reply self-aborted",
            classifier_note=str(draft.get("escalation") or draft.get("postflight_reasons")),
        )
        return

    cc_bcc_rep = [rep.email] if rep.email and rep.email != homeowner_email else None

    result = dispatch(
        channel="email",
        to_email=homeowner_email,
        to_name=homeowner_name,
        bcc=cc_bcc_rep,
        subject=draft["subject"] or f"Re: {prior_subject}" if prior_subject else "Re: your question",
        body_text=draft["body"],
        from_email=rep.sendgrid_sender_email or settings.sendgrid_from_email,
        from_name=rep.name,
        lead_id=lead_id,
        in_reply_to=in_reply_to,
        references=references,
    )
    log.info("auto-reply sent for %s: %s", lead_id, result)

    try:
        from acculynx.notes import log_send_to_acculynx
        await log_send_to_acculynx(
            job_id=lead_id, channel="email",
            contact_name=lead.contact_name or "Homeowner",
            body=draft["body"], subject=draft["subject"],
            prefix_note=f"AUTO-REPLY (objective {category} answered, rep BCC'd)",
        )
    except Exception:
        log.exception("AccuLynx note write failed (non-fatal)")


@router.post("/inbound-email")
async def inbound_email(request: Request) -> dict:
    """Receive a SendGrid Inbound Parse POST, classify, and route."""
    form = await request.form()
    payload = parse_payload(dict(form))

    log.info("Inbound email: from=%s lead_id=%s in_reply_to=%s",
             payload.from_email, payload.extracted_lead_id, payload.in_reply_to)

    # ── Resolve lead ──
    lead_id = payload.extracted_lead_id
    async with async_session() as session:
        if not lead_id and payload.in_reply_to:
            stmt = select(MessageQueue).where(MessageQueue.rfc_message_id == payload.in_reply_to)
            r = await session.execute(stmt)
            matched = r.scalar_one_or_none()
            if matched:
                lead_id = matched.lead_id

        if not lead_id:
            log.warning("Inbound email could not be linked to any lead")
            return {"ok": False, "reason": "no lead match"}

        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            return {"ok": False, "reason": f"lead {lead_id} not found"}

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
        lead.is_paused = True
        lead.pause_reason = "homeowner replied"
        await session.commit()
        log.info("Inbound persisted: msg_id=%s lead %s paused", inbound_row.id, lead.id)

    # ── Classify ──
    rep_for_classifier = resolve_rep(lead.assigned_rep_id)
    classification = await classify_inbound(
        homeowner_text=payload.text or payload.html,
        rep_first_name=rep_for_classifier.first_name,
        lead_name=lead.contact_name,
    )
    log.info(
        "Inbound classified for lead=%s intent=%s confidence=%.2f category=%s",
        lead.id, classification.intent, classification.confidence, classification.category,
    )

    # ── Route ──
    intent = classification.intent
    category = (classification.category or "").lower()
    confidence = classification.confidence

    # Pricing / objection / complaint always go to the rep (Austin's call in the 5/8 meeting).
    pricing_objection = (
        intent in ("complaint", "objection")
        or category == "pricing"
    )

    if pricing_objection:
        await _send_rep_notification(
            lead=lead, payload=payload,
            reason_summary=f"{intent} (CC Sierra)",
            classifier_note=classification.reasoning,
        )
        return {"ok": True, "lead_id": lead.id, "routed": "escalation_rep_plus_sierra"}

    if intent == "dead_lead" and confidence >= settings.inbound_auto_reply_min_confidence:
        await _send_dead_lead_reply(lead, payload)
        return {"ok": True, "lead_id": lead.id, "routed": "dead_lead_auto_replied"}

    if (
        intent == "objective_question"
        and confidence >= settings.inbound_auto_reply_min_confidence
        and category in SAFE_AUTO_REPLY_CATEGORIES
    ):
        delay = random.uniform(
            float(settings.inbound_auto_reply_min_delay_seconds),
            float(settings.inbound_auto_reply_max_delay_seconds),
        )
        try:
            from engine.scheduler import schedule_one_shot
            schedule_one_shot(
                lambda: _auto_reply_send(
                    lead_id=lead.id,
                    homeowner_email=payload.from_email,
                    homeowner_name=lead.contact_name,
                    homeowner_message=payload.text or payload.html,
                    category=category,
                    in_reply_to=payload.in_reply_to,
                    references=payload.references or None,
                    prior_subject=payload.subject or None,
                ),
                run_in_seconds=delay,
                job_id=f"auto_reply_{lead.id}_{datetime.now(timezone.utc).timestamp():.0f}",
            )
            log.info("auto-reply scheduled for lead=%s in %.0fs", lead.id, delay)
            return {
                "ok": True, "lead_id": lead.id,
                "routed": "objective_auto_reply_scheduled",
                "delay_seconds": round(delay, 1),
                "category": category,
            }
        except Exception:
            log.exception("auto-reply schedule failed; falling back to rep notify")

    # Default: notify the rep and let them handle it.
    await _send_rep_notification(
        lead=lead, payload=payload,
        reason_summary=f"{intent} confidence={confidence:.2f}",
        classifier_note=classification.reasoning,
    )
    return {"ok": True, "lead_id": lead.id, "routed": "rep_manual"}


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
