"""AccuLynx Sync Service — the heartbeat of the AI agent.

Every 15 minutes, this service:
1. Pulls all active pipeline jobs from AccuLynx
2. Updates our local database with current state
3. Detects leads that need follow-up based on cadence timing
4. Returns a list of leads ready for AI action

SAFETY FIXES INCLUDED:
- Fix 1: Backfill guard (only cadence leads modified <90 days)
- Fix 3: Milestone oscillation guard (1-hour cooldown on cadence resets)
- Fix 4: Null cadence_start_date safety
- Fix 5: Timezone-aware business hours (pinned to America/New_York)
- Fix 6: Session savepoints (one failure doesn't break the batch)
- Activity collision check (check history before approving sends)
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from acculynx.client import get_json, get_all_pages
from config.cadence import LAYER_MAP, MILESTONE_TO_LAYER, determine_layer, Touch
from config.settings import settings
from db.database import async_session
from db.models import Action, Lead

# MDR timezone — all business hour checks use this
MDR_TZ = ZoneInfo("America/New_York")

# Backfill guard: only start cadences on leads modified within this many days
BACKFILL_CUTOFF_DAYS = 90

# Oscillation guard: minimum time between cadence resets for the same lead
OSCILLATION_COOLDOWN_HOURS = 1

# Stale touch: skip touches overdue by more than this many days
STALE_TOUCH_MAX_DAYS = 7

# Track sync health for pre-send checklist
_last_sync_success: bool = False
_last_sync_time: Optional[datetime] = None


def get_sync_health() -> dict:
    """Return sync health status for the pre-send checklist."""
    return {
        "last_sync_success": _last_sync_success,
        "last_sync_time": _last_sync_time,
    }


async def sync_pipeline() -> dict:
    """Pull active pipeline from AccuLynx and update local database."""
    global _last_sync_success, _last_sync_time
    stats = {"synced": 0, "new": 0, "updated": 0, "skipped_backfill": 0, "errors": 0}

    try:
        jobs = await get_all_pages("/jobs", {}, page_size=10, max_pages=200)
    except Exception as e:
        print(f"❌ AccuLynx sync failed: {e}")
        _last_sync_success = False
        stats["errors"] = 1
        return stats

    async with async_session() as session:
        for job in jobs:
            # Use savepoints so one failure doesn't break the batch (Fix 6)
            try:
                async with session.begin_nested():
                    result = await _upsert_lead(session, job)
                    if result == "new":
                        stats["new"] += 1
                    elif result == "updated":
                        stats["updated"] += 1
                    elif result == "skipped_backfill":
                        stats["skipped_backfill"] += 1
                    stats["synced"] += 1
            except Exception as e:
                # Savepoint rolled back automatically, session still valid
                print(f"  ⚠️ Error syncing job {job.get('jobNumber', '?')}: {str(e)[:120]}")
                stats["errors"] += 1

        await session.commit()

    _last_sync_success = True
    _last_sync_time = datetime.now(timezone.utc)

    print(
        f"📡 Sync complete: {stats['synced']} jobs "
        f"({stats['new']} new, {stats['updated']} updated, "
        f"{stats['skipped_backfill']} skipped backfill, {stats['errors']} errors)"
    )
    return stats


async def _upsert_lead(session: AsyncSession, job: dict) -> str:
    """Create or update a lead record from AccuLynx job data.

    Returns: "new", "updated", or "skipped_backfill"
    """
    job_id = job.get("id")
    if not job_id:
        return "skipped_backfill"

    # ── Extract fields ──
    milestone = _extract_milestone(job)
    lead_source = _extract_string_field(job, "leadSource", "jobCategory")
    work_type = _extract_work_type(job)
    contact_name = _extract_contact_name(job)
    address = _extract_address(job)
    acculynx_modified = _parse_date(job.get("modifiedDate"))
    acculynx_created = _parse_date(job.get("createdDate"))
    now = datetime.now(timezone.utc)

    # ── Check if lead exists ──
    result = await session.execute(select(Lead).where(Lead.id == job_id))
    existing = result.scalar_one_or_none()

    if existing:
        # ── UPDATE existing lead ──
        old_milestone = existing.milestone
        existing.milestone = milestone
        existing.acculynx_modified_date = acculynx_modified
        existing.job_number = job.get("jobNumber") or existing.job_number
        existing.is_active = milestone not in ["Dead", "Cancelled"]

        if contact_name:
            existing.contact_name = contact_name
        if address and not existing.address:
            existing.address = address

        # ── Milestone change detection with oscillation guard (Fix 3) ──
        if old_milestone != milestone:
            existing.previous_milestone = old_milestone
            last_change = existing.milestone_changed_date
            hours_since_change = float("inf")
            if last_change:
                if last_change.tzinfo is None:
                    last_change = last_change.replace(tzinfo=timezone.utc)
                hours_since_change = (now - last_change).total_seconds() / 3600

            existing.milestone_changed_date = now

            # Only reset layer if cooldown has passed (prevents oscillation)
            if hours_since_change >= OSCILLATION_COOLDOWN_HOURS:
                if milestone in MILESTONE_TO_LAYER:
                    new_layer = determine_layer(milestone, days_since_activity=0)
                    _set_layer(existing, new_layer, now)
                elif milestone in ["Dead", "Cancelled"]:
                    # Stop all active touches
                    _set_layer(existing, "CLOSED", now)
                    existing.is_paused = False

        # ── Backwards movement guard ──
        # If lead was GOING_COLD but AccuLynx shows recent activity on a
        # Prospect milestone, move back to ESTIMATE_FOLLOWUP.
        elif (
            milestone == "Prospect"
            and existing.layer_name == "GOING_COLD"
            and acculynx_modified
        ):
            mod = acculynx_modified
            if mod.tzinfo is None:
                mod = mod.replace(tzinfo=timezone.utc)
            if (now - mod).days <= 3:  # activity within last 3 days = re-engaged
                _set_layer(existing, "ESTIMATE_FOLLOWUP", now)

        return "updated"

    else:
        # ── CREATE new lead ──
        is_active = milestone not in ["Dead", "Cancelled"]

        new_lead = Lead(
            id=job_id,
            job_number=job.get("jobNumber"),
            contact_name=contact_name,
            address=address,
            milestone=milestone,
            acculynx_created_date=acculynx_created,
            acculynx_modified_date=acculynx_modified,
            milestone_changed_date=now,
            lead_source=lead_source,
            work_type=work_type,
            is_active=is_active,
        )

        # ── Backfill guard (Fix 1) ──
        # Only start cadences on leads modified within the last 90 days.
        # This prevents the 2000-lead bomb on first sync.
        is_recent = False
        if acculynx_modified:
            mod = acculynx_modified
            if mod.tzinfo is None:
                mod = mod.replace(tzinfo=timezone.utc)
            is_recent = (now - mod).days <= BACKFILL_CUTOFF_DAYS

        if is_recent and is_active and milestone in MILESTONE_TO_LAYER:
            layer_name = determine_layer(milestone, days_since_activity=0)
            _set_layer(new_lead, layer_name, now)

        session.add(new_lead)
        return "new" if is_recent else "skipped_backfill"


async def find_leads_needing_followup() -> list[dict]:
    """Check which leads are due for their next follow-up touch.

    Returns list of dicts with lead info + the touch that's due.
    Includes safety checks: null dates, stale touch skip, channel switching.
    """
    due_leads = []
    now = datetime.now(timezone.utc)

    async with async_session() as session:
        result = await session.execute(
            select(Lead).where(
                Lead.is_active == True,
                Lead.is_paused == False,
                Lead.cadence_name.isnot(None),
                Lead.cadence_start_date.isnot(None),
                Lead.total_contact_attempts < settings.max_contact_attempts,
            )
        )
        leads = result.scalars().all()

        for lead in leads:
            # Resolve touches from layer_name (preferred) or cadence_name (legacy)
            active_layer_name = lead.layer_name or lead.cadence_name
            layer = LAYER_MAP.get(active_layer_name)
            cadence = layer.touches if layer else []
            if lead.cadence_touch_index >= len(cadence):
                continue  # Layer sequence complete

            # ── Null safety (Fix 4) ──
            # Prefer layer_entered_date; fall back to cadence_start_date for legacy rows
            layer_start = lead.layer_entered_date or lead.cadence_start_date
            if layer_start is None:
                continue

            start = layer_start
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)

            next_touch: Touch = cadence[lead.cadence_touch_index]
            touch_due_date = start + timedelta(days=next_touch.day_offset)

            if now < touch_due_date:
                continue  # Not due yet

            # ── Stale touch skip ──
            days_overdue = (now - touch_due_date).days
            if days_overdue > STALE_TOUCH_MAX_DAYS:
                continue  # Touch is too old, skip it

            # ── Channel switching for Twilio STOP ──
            channel = next_touch.channel
            if channel == "text" and lead.twilio_stop:
                channel = "email"  # Respect Twilio STOP, switch to email

            # ── Build the due lead entry ──
            due_leads.append({
                "lead_id": lead.id,
                "job_number": lead.job_number,
                "contact_name": lead.contact_name,
                "contact_phone": lead.contact_phone,
                "contact_email": lead.contact_email,
                "address": lead.address,
                "milestone": lead.milestone,
                "assigned_rep_name": lead.assigned_rep_name,
                "layer_name": active_layer_name,
                "layer_goal": layer.goal,
                "layer_tone": layer.tone,
                "cadence_name": active_layer_name,  # backward-compat alias
                "touch_index": lead.cadence_touch_index,
                "touch": {
                    "day_offset": next_touch.day_offset,
                    "channel": channel,  # May have been switched from text to email
                    "content_type": next_touch.content_type,
                    "autonomous_ok": next_touch.autonomous_ok,
                    "touch_index": lead.cadence_touch_index,
                },
                "days_since_layer_start": (now - start).days,
                "days_since_cadence_start": (now - start).days,  # legacy alias
                "total_attempts": lead.total_contact_attempts,
                "sms_opt_out": lead.sms_opt_out,
                "twilio_stop": lead.twilio_stop,
            })

    print(f"🔍 Found {len(due_leads)} leads needing follow-up")
    return due_leads


async def check_recent_activity(job_id: str, hours: int = 24) -> dict:
    """Check AccuLynx history for recent activity on a job.

    Returns: {"has_human_activity": bool, "has_ai_activity": bool, "entries": list}

    This is the collision prevention system (Fix 2). Before sending any message,
    call this to make sure a human or AccuLynx automation hasn't already contacted
    the lead recently.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    has_human = False
    has_ai = False
    entries = []

    try:
        history = await get_json(f"/jobs/{job_id}/history", {"includes": "createdBy"})
        for entry in history.get("items", []):
            action = str(entry.get("action", ""))
            date = _parse_date(str(entry.get("date", "")))

            if not date or date < cutoff:
                continue

            # Check if this is a communication action
            is_comm = any(kw in action.lower() for kw in [
                "message added", "email added", "message sent", "text sent"
            ])
            if not is_comm:
                continue

            # Check if it's our AI agent's entry
            if "[AI Agent]" in action:
                has_ai = True
            else:
                has_human = True

            entries.append({
                "action": action,
                "date": date.isoformat() if date else None,
                "actor": entry.get("createdBy", {}).get("displayName", "System"),
            })
    except Exception as e:
        print(f"  ⚠️ History check failed for {job_id}: {str(e)[:80]}")
        # On failure, assume human activity to be safe (don't send)
        has_human = True

    return {
        "has_human_activity": has_human,
        "has_ai_activity": has_ai,
        "entries": entries,
    }


async def advance_cadence(lead_id: str) -> None:
    """Move a lead to the next touch in their cadence sequence.

    Called after a message is successfully sent or skipped.
    """
    async with async_session() as session:
        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if lead:
            lead.cadence_touch_index += 1
            lead.total_contact_attempts += 1
            lead.last_contact_date = datetime.now(timezone.utc)
            await session.commit()


def is_business_hours() -> bool:
    """Check if we're currently in business hours (8am-6pm Mon-Sat EST).

    Fixed: Uses America/New_York timezone explicitly (Fix 5).
    """
    now = datetime.now(MDR_TZ)
    day_name = now.strftime("%a").lower()
    hour = now.hour

    if day_name not in settings.business_days:
        return False
    return settings.business_hours_start <= hour < settings.business_hours_end


# ── Helper functions ──

def _set_layer(lead: "Lead", layer_name: str, entered_at: datetime) -> None:
    """Apply a layer transition to a Lead object in-place.

    Sets both the new layer_name / layer_entered_date fields AND keeps the
    legacy cadence_name / cadence_start_date aliases in sync so existing
    code paths that read either field continue to work.
    """
    lead.layer_name = layer_name
    lead.layer_entered_date = entered_at
    # Keep legacy aliases in sync for backward compatibility
    lead.cadence_name = layer_name
    lead.cadence_start_date = entered_at
    lead.cadence_touch_index = 0


def _extract_milestone(job: dict) -> str:
    milestone_raw = job.get("currentMilestone", {})
    if isinstance(milestone_raw, dict):
        return milestone_raw.get("name", "Unknown")
    return str(milestone_raw) if milestone_raw else "Unknown"


def _extract_string_field(job: dict, *keys: str) -> Optional[str]:
    for key in keys:
        val = job.get(key)
        if isinstance(val, dict):
            return val.get("name", "Unknown")
        elif val:
            return str(val)
    return None


def _extract_work_type(job: dict) -> Optional[str]:
    wt = job.get("workType") or job.get("tradeTypes")
    if isinstance(wt, dict):
        return wt.get("name", "Unknown")
    elif isinstance(wt, list) and wt:
        return ", ".join(
            t.get("name", str(t)) if isinstance(t, dict) else str(t)
            for t in wt
        )
    elif wt:
        return str(wt)
    return None


def _extract_contact_name(job: dict) -> Optional[str]:
    contacts = job.get("contacts", [])
    if contacts:
        c = contacts[0] if isinstance(contacts, list) else contacts
        if isinstance(c, dict):
            first = c.get("firstName", "")
            last = c.get("lastName", "")
            name = f"{first} {last}".strip()
            return name if name else None
    return None


def _extract_address(job: dict) -> Optional[str]:
    """Build a single-line address from AccuLynx locationAddress.

    Format: "123 Main St, Christiansburg, VA 24073"
    Returns None if no street/city present.
    """
    loc = job.get("locationAddress") or {}
    if not isinstance(loc, dict):
        return None
    street = (loc.get("street1") or "").strip()
    street2 = (loc.get("street2") or "").strip()
    city = (loc.get("city") or "").strip()
    state_obj = loc.get("state")
    state = ""
    if isinstance(state_obj, dict):
        state = (state_obj.get("abbreviation") or state_obj.get("name") or "").strip()
    elif state_obj:
        state = str(state_obj).strip()
    zip_code = (loc.get("zipCode") or "").strip()

    if not street and not city:
        return None
    line1 = f"{street} {street2}".strip() if street2 else street
    parts = [p for p in [line1, city, f"{state} {zip_code}".strip()] if p]
    return ", ".join(parts) if parts else None


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        date_str = date_str.replace("Z", "+00:00")
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None
