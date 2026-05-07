"""AccuLynx webhook event handling.

Subscriptions are managed via the AccuLynx webhook API at
``https://api.acculynx.com/webhooks/v2/subscriptions``. They cannot be
configured from the AccuLynx admin UI — only via API.

Auth: AccuLynx does not return an HMAC secret at subscription creation
(verified empirically). We secure the receiver via a query-string token
that we generate and register as part of the consumerUrl.

Topics we subscribe to (Job-level, since Colin moved the custom fields
to Job entity):

  job.milestone.current_changed       — Lead/Prospect/Approved transitions.
                                        Payload includes a ``message`` field
                                        with the rep's milestone-change comment.
  job.appointments.initial_created    — initial inspection appointment.
  job.appointments.initial_updated    — appointment rescheduled.
  job.representatives.company_assigned — first rep assigned.
  job.representatives.company_changed  — rep changed.
  job.custom-field.value_changed      — Agent Context / Agent Snooze Until /
                                        Agent Status updated by a rep.
  job_updated                         — catch-all for anything else.

The custom-field event payload shape is undocumented — we read it
defensively, supporting multiple plausible field names
(``customFieldName``, ``fieldName``, ``label``, ``name``).
"""

from __future__ import annotations

import asyncio
import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import select

from config.settings import settings
from db.database import async_session
from db.models import Lead

log = logging.getLogger(__name__)

# Topics we want subscribed. Order matters only for documentation.
DESIRED_TOPICS: list[str] = [
    "job.milestone.current_changed",
    "job.appointments.initial_created",
    "job.appointments.initial_updated",
    "job.representatives.company_assigned",
    "job.representatives.company_changed",
    "job.custom-field.value_changed",
    "job_updated",
]

# Custom-field name → DB column. Match case-insensitively, trim whitespace.
CUSTOM_FIELD_NAME_MAP: dict[str, str] = {
    "agent context": "agent_context",
    "agent snooze until": "agent_snooze_until",
    "agent status": "agent_status",
}


# ── Event dataclass ────────────────────────────────────────────────────


@dataclass
class AccuLynxEvent:
    """Normalized representation of any incoming AccuLynx webhook payload."""

    topic: str
    event_id: Optional[str]
    event_datetime: Optional[datetime]
    subscription_id: Optional[str]
    job_id: Optional[str]
    raw_event: dict
    raw_payload: dict = field(repr=False)


def parse_event(payload: dict) -> AccuLynxEvent:
    """Normalize a raw webhook POST body into an AccuLynxEvent.

    AccuLynx documents the envelope as
    ``{topicName, eventDateTime, eventId, subscriptionId, Event}`` (note that
    the docs sometimes list ``topicNamee`` — likely a typo). We accept both.
    """
    topic = (
        payload.get("topicName")
        or payload.get("topicNamee")  # documented typo
        or payload.get("topic")
        or ""
    )
    event_id = payload.get("eventId") or payload.get("EventId")
    sub_id = payload.get("subscriptionId") or payload.get("SubscriptionId")
    when_str = payload.get("eventDateTime") or payload.get("EventDateTime")
    when: Optional[datetime] = None
    if when_str:
        try:
            when = datetime.fromisoformat(str(when_str).replace("Z", "+00:00"))
        except Exception:
            when = None

    event_data = (
        payload.get("Event")
        or payload.get("event")
        or payload.get("data")
        or {}
    )
    if not isinstance(event_data, dict):
        event_data = {}

    job_id = (
        event_data.get("jobId")
        or event_data.get("JobId")
        or event_data.get("job_id")
        or payload.get("jobId")
    )

    return AccuLynxEvent(
        topic=topic,
        event_id=event_id,
        event_datetime=when,
        subscription_id=sub_id,
        job_id=job_id,
        raw_event=event_data,
        raw_payload=payload,
    )


# ── Handlers ──────────────────────────────────────────────────────────


async def handle_event(event: AccuLynxEvent) -> dict:
    """Route an event to its handler. Returns a dict for logging."""
    if not event.job_id:
        return {"ok": False, "reason": "no jobId in payload", "topic": event.topic}

    if event.topic == "job.milestone.current_changed":
        return await _handle_milestone_changed(event)
    if event.topic in ("job.custom-field.value_changed", "job.custom-field.status_changed"):
        return await _handle_custom_field(event)
    if event.topic in ("job.representatives.company_assigned", "job.representatives.company_changed"):
        return await _handle_rep_change(event)
    if event.topic in ("job.appointments.initial_created", "job.appointments.initial_updated"):
        return await _handle_appointment(event)
    if event.topic in ("job_updated", "job_created"):
        return await _handle_job_touched(event)

    return {"ok": True, "noop": True, "topic": event.topic}


async def _handle_milestone_changed(event: AccuLynxEvent) -> dict:
    """Milestone changed. Update Lead.milestone + capture the rep's comment.

    Per docs the Event object contains: jobId, companyId, milestoneId,
    milestoneName, companyUserId, adminId, message, actionLocation,
    milestoneDate.
    """
    e = event.raw_event
    new_milestone = e.get("milestoneName") or e.get("MilestoneName")
    rep_message = e.get("message") or e.get("Message")  # rep's typed comment
    when_str = e.get("milestoneDate") or e.get("MilestoneDate")

    async with async_session() as session:
        r = await session.execute(select(Lead).where(Lead.id == event.job_id))
        lead = r.scalar_one_or_none()
        if not lead:
            return {"ok": False, "reason": f"lead {event.job_id} not found"}

        old_milestone = lead.milestone
        if new_milestone and new_milestone != old_milestone:
            lead.previous_milestone = old_milestone
            lead.milestone = new_milestone
            if when_str:
                try:
                    lead.milestone_changed_date = datetime.fromisoformat(str(when_str).replace("Z","+00:00"))
                except Exception:
                    pass

        # Auto-deactivate on terminal milestones
        if new_milestone in ("Approved", "Closed", "Dead", "Cancelled", "Invoiced"):
            lead.is_active = False
            lead.pause_reason = f"milestone={new_milestone}"

        # Append rep's comment to agent_context if present (rep typed something on the milestone change)
        if rep_message:
            existing = lead.agent_context or ""
            stamp = (event.event_datetime or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
            new_line = f"[{stamp}] milestone→{new_milestone}: {rep_message}"
            lead.agent_context = (existing + "\n" + new_line).strip() if existing else new_line
            lead.agent_context_updated_at = event.event_datetime or datetime.now(timezone.utc)

        await session.commit()
    return {
        "ok": True,
        "topic": event.topic,
        "lead_id": event.job_id,
        "old_milestone": old_milestone,
        "new_milestone": new_milestone,
        "rep_message_captured": bool(rep_message),
    }


async def _handle_custom_field(event: AccuLynxEvent) -> dict:
    """Job custom field changed. Map known fields to our DB columns.

    The AccuLynx custom-field event payload shape is undocumented — we read
    it defensively. Plausible field-name keys: customFieldName, fieldName,
    label, name. Plausible value keys: value, newValue, currentValue.
    """
    e = event.raw_event
    field_name = (
        e.get("customFieldName")
        or e.get("CustomFieldName")
        or e.get("fieldName")
        or e.get("FieldName")
        or e.get("label")
        or e.get("Label")
        or e.get("name")
        or e.get("Name")
        or ""
    )
    field_value = (
        e.get("value")
        if "value" in e
        else e.get("Value")
        if "Value" in e
        else e.get("newValue")
        if "newValue" in e
        else e.get("NewValue")
        if "NewValue" in e
        else e.get("currentValue")
        if "currentValue" in e
        else e.get("CurrentValue")
        if "CurrentValue" in e
        else None
    )

    norm_name = (field_name or "").strip().lower()
    column = CUSTOM_FIELD_NAME_MAP.get(norm_name)
    if not column:
        # Unknown custom field — log it but don't fail
        log.info(
            "custom-field event for unrecognized field: name=%r job=%s value=%r",
            field_name, event.job_id, field_value,
        )
        return {"ok": True, "ignored": True, "field_name": field_name, "lead_id": event.job_id}

    async with async_session() as session:
        r = await session.execute(select(Lead).where(Lead.id == event.job_id))
        lead = r.scalar_one_or_none()
        if not lead:
            return {"ok": False, "reason": f"lead {event.job_id} not found"}

        if column == "agent_context":
            lead.agent_context = (field_value or "") or None
            lead.agent_context_updated_at = event.event_datetime or datetime.now(timezone.utc)
        elif column == "agent_snooze_until":
            parsed: Optional[datetime] = None
            if field_value:
                try:
                    parsed = datetime.fromisoformat(str(field_value).replace("Z","+00:00"))
                except Exception:
                    try:
                        parsed = datetime.strptime(str(field_value), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except Exception:
                        parsed = None
            lead.agent_snooze_until = parsed
            if parsed:
                lead.is_paused = True
                lead.pause_reason = f"agent_snooze_until={parsed.date()}"
            else:
                # Snooze cleared — un-pause if reason was a snooze
                if lead.pause_reason and lead.pause_reason.startswith("agent_snooze_until="):
                    lead.is_paused = False
                    lead.pause_reason = None
        elif column == "agent_status":
            normalized = (field_value or "").strip().capitalize() or "Active"
            lead.agent_status = normalized
            if normalized == "Stopped":
                lead.is_active = False
                lead.pause_reason = "agent_status=Stopped"
            elif normalized == "Paused":
                lead.is_paused = True
                lead.pause_reason = "agent_status=Paused"
            elif normalized == "Active":
                # Clear status-based pause/inactive — be careful not to clobber other reasons
                if lead.pause_reason in ("agent_status=Paused", "agent_status=Stopped"):
                    lead.is_paused = False
                    lead.pause_reason = None
                if not lead.is_active and lead.pause_reason in (None, "agent_status=Stopped"):
                    lead.is_active = True

        await session.commit()
    return {"ok": True, "topic": event.topic, "lead_id": event.job_id, "column": column, "value": field_value}


async def _handle_rep_change(event: AccuLynxEvent) -> dict:
    """Rep was assigned or changed."""
    e = event.raw_event
    rep_id = e.get("companyUserId") or e.get("CompanyUserId") or e.get("repId")
    rep_name = e.get("companyUserName") or e.get("repName")

    async with async_session() as session:
        r = await session.execute(select(Lead).where(Lead.id == event.job_id))
        lead = r.scalar_one_or_none()
        if not lead:
            return {"ok": False, "reason": f"lead {event.job_id} not found"}
        if rep_id:
            lead.assigned_rep_id = rep_id
        if rep_name:
            lead.assigned_rep_name = rep_name
        await session.commit()
    return {"ok": True, "topic": event.topic, "lead_id": event.job_id, "rep_id": rep_id}


async def _handle_appointment(event: AccuLynxEvent) -> dict:
    """Initial appointment created/updated. Currently informational —
    we don't auto-trigger off this since the agent activates on milestone
    Lead→Prospect transition. Logged for context."""
    log.info("appointment event %s for lead %s: %s", event.topic, event.job_id, event.raw_event)
    return {"ok": True, "topic": event.topic, "lead_id": event.job_id, "noted": True}


async def _handle_job_touched(event: AccuLynxEvent) -> dict:
    """job_updated / job_created — informational for now. The 15-minute
    sync handles full state reconciliation."""
    return {"ok": True, "topic": event.topic, "lead_id": event.job_id, "noted": True}


# ── Subscription management ──────────────────────────────────────────


def _api_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.acculynx_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def list_subscriptions() -> list[dict]:
    """Return the list of current webhook subscriptions on this AccuLynx account."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            "https://api.acculynx.com/webhooks/v2/subscriptions",
            headers=_api_headers(),
        )
        r.raise_for_status()
        return r.json().get("items", [])


async def create_subscription(consumer_url: str, topics: list[str], tech_contact: str) -> str:
    """Register a new webhook subscription. Returns the new subscriptionId."""
    body = {
        "consumerUrl": consumer_url,
        "topicNames": topics,
        "techContact": tech_contact,
    }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            "https://api.acculynx.com/webhooks/v2/subscriptions",
            headers=_api_headers(),
            json=body,
        )
        r.raise_for_status()
        return r.json()["subscriptionId"]


async def delete_subscription(subscription_id: str) -> bool:
    """Soft-delete (Disable) a subscription."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.delete(
            f"https://api.acculynx.com/webhooks/v2/subscriptions/{subscription_id}",
            headers={"Authorization": f"Bearer {settings.acculynx_api_key}"},
        )
        return r.status_code == 200


def generate_token() -> str:
    """One-shot token to embed in the consumerUrl as ``?token=XXX``."""
    return secrets.token_urlsafe(32)
