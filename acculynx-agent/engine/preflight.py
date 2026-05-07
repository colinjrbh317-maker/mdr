"""Pre-Send Checklist — the 8-point safety gate before EVERY message.

Nothing gets sent without passing ALL checks. This is the last line of defense
between the AI agent and a customer's phone/inbox.

Think of it as TSA for text messages. Every message gets screened.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func as sqlfunc

from config.settings import settings
from db.database import async_session
from db.models import Lead, MessageQueue
from engine.sync import check_recent_activity, get_sync_health

log = logging.getLogger(__name__)


# Volume limits
MAX_MESSAGES_PER_HOUR = 20
MAX_MESSAGES_PER_DAY = 50


async def preflight_check(lead_data: dict) -> dict:
    """Run all 8 safety checks before sending a message.

    Args:
        lead_data: Dict from find_leads_needing_followup() with lead + touch info.

    Returns:
        {
            "approved": True/False,
            "reason": "all_checks_passed" or description of what failed,
            "check_results": {check_name: True/False for each check}
        }
    """
    checks = {}
    lead_id = lead_data["lead_id"]
    channel = lead_data["touch"]["channel"]

    # ── Check 1: Total attempts under limit ──
    checks["attempts_under_limit"] = lead_data["total_attempts"] < settings.max_contact_attempts

    # ── Check 2: Lead is active (not Dead/Cancelled) ──
    checks["lead_is_active"] = True  # Already filtered in find_leads_needing_followup
    async with async_session() as session:
        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if lead:
            checks["lead_is_active"] = lead.is_active
            checks["lead_not_paused"] = not lead.is_paused

            # ── Check 3: Layer is still valid for current milestone ──
            # With the 11-layer system, layer_name (e.g., "FIRST_CONTACT") won't equal
            # milestone (e.g., "Lead"). Instead, check that the lead hasn't moved to
            # Dead/Cancelled since the layer was assigned.
            from config.cadence import MILESTONE_TO_LAYER
            active_layer = lead.layer_name or lead.cadence_name
            if lead.milestone in ["Dead", "Cancelled"] and active_layer not in ["CLOSED", "RE_ENGAGEMENT"]:
                checks["layer_valid_for_milestone"] = False
            elif lead.milestone in MILESTONE_TO_LAYER or active_layer in ["CLOSED", "RE_ENGAGEMENT", "DRIP"]:
                checks["layer_valid_for_milestone"] = True
            else:
                checks["layer_valid_for_milestone"] = True  # Unknown milestone, allow

            # ── Check 6: Twilio STOP not received (for text channel) ──
            if channel == "text":
                checks["no_twilio_stop"] = not lead.twilio_stop
            else:
                checks["no_twilio_stop"] = True  # N/A for email

            # ── Check: Has contact info for this channel ──
            if channel == "text":
                checks["has_contact_info"] = bool(lead.contact_phone)
            else:
                checks["has_contact_info"] = bool(lead.contact_email)
        else:
            checks["lead_is_active"] = False
            checks["lead_not_paused"] = False
            checks["milestone_matches_cadence"] = False
            checks["no_twilio_stop"] = True
            checks["has_contact_info"] = False

    # ── Check 4: No human activity in last 24 hours (collision prevention) ──
    activity = await check_recent_activity(lead_id, hours=24)
    checks["no_recent_human_activity"] = not activity["has_human_activity"]

    # ── Check 5: Volume limit not exceeded ──
    checks["volume_under_limit"] = await _check_volume_limits()

    # ── Check 6: Last sync was successful ──
    sync_health = get_sync_health()
    checks["sync_healthy"] = sync_health["last_sync_success"]
    # Allow sending if sync has never run (first time) — don't block initial setup
    if sync_health["last_sync_time"] is None:
        checks["sync_healthy"] = True

    # ── Determine go/no-go ──
    all_passed = all(checks.values())

    if not all_passed:
        failed = [name for name, passed in checks.items() if not passed]
        reason = f"blocked: {', '.join(failed)}"
    else:
        reason = "all_checks_passed"

    return {
        "approved": all_passed,
        "reason": reason,
        "check_results": checks,
    }


async def drip_safety_check(lead_context: dict) -> dict:
    """Gate for drip-campaign touches only.

    Reads content_type from lead_context["touch"]["content_type"].  If the
    touch is NOT a drip content type the gate is a no-op and returns ok.
    If it IS a drip touch, calls check_drip_eligibility; on ineligibility
    returns skip=True so the caller can advance the cadence and move on.

    Args:
        lead_context: The entry dict produced by find_leads_needing_followup(),
                      which contains at minimum:
                        lead_context["lead_id"]          -- str
                        lead_context["touch"]["content_type"]  -- str (optional)

    Returns:
        {"ok": True,  "skip": False}                        -- proceed normally
        {"ok": False, "skip": True, "reasons": [str, ...]}  -- skip this touch
    """
    # Defensive: if content_type is absent, treat as non-drip and let through.
    touch = lead_context.get("touch") or {}
    content_type: str = touch.get("content_type") or ""

    from engine.drip_safety import check_drip_eligibility, is_drip_content_type

    if not is_drip_content_type(content_type):
        return {"ok": True, "skip": False}

    lead_id: str = lead_context.get("lead_id", "unknown")
    try:
        result = await check_drip_eligibility(lead_id)
    except Exception as exc:
        # Fail-safe: block on any unexpected error so we never send a
        # "love your roof" message to a customer with an active dispute.
        log.exception(
            "drip_safety_check: check_drip_eligibility raised for lead %s; blocking touch",
            lead_id,
        )
        return {
            "ok": False,
            "skip": True,
            "reasons": [f"drip eligibility check raised exception: {exc}"],
        }

    if result.ok:
        return {"ok": True, "skip": False}

    return {"ok": False, "skip": True, "reasons": result.reasons}


async def _check_volume_limits() -> bool:
    """Check if we're under the hourly and daily message send limits."""
    now = datetime.now(timezone.utc)
    hour_ago = now - timedelta(hours=1)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async with async_session() as session:
        # Count messages sent in last hour
        hourly_result = await session.execute(
            select(sqlfunc.count(MessageQueue.id)).where(
                MessageQueue.status == "sent",
                MessageQueue.sent_at >= hour_ago,
            )
        )
        hourly_count = hourly_result.scalar() or 0

        # Count messages sent today
        daily_result = await session.execute(
            select(sqlfunc.count(MessageQueue.id)).where(
                MessageQueue.status == "sent",
                MessageQueue.sent_at >= day_start,
            )
        )
        daily_count = daily_result.scalar() or 0

    if hourly_count >= MAX_MESSAGES_PER_HOUR:
        print(f"  🚦 Volume limit: {hourly_count}/{MAX_MESSAGES_PER_HOUR} hourly")
        return False
    if daily_count >= MAX_MESSAGES_PER_DAY:
        print(f"  🚦 Volume limit: {daily_count}/{MAX_MESSAGES_PER_DAY} daily")
        return False

    return True
