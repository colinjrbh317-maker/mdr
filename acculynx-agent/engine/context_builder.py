"""Auto-extract agent context from AccuLynx for any lead.

Colin's rule: the FIRST manual action a rep takes should be approving the
agent's draft email. Reps should not be required to type into custom fields
for the agent to know what's going on. So this module mines everything we
can read from the AccuLynx API and assembles it into a context block the
drafter can paste into Claude's prompt.

What we extract:

1. Milestone-change comments — when a rep changes a milestone with a typed
   comment, AccuLynx surfaces "Comment: <text>" inline in the history
   action string. We capture every one of these for the lead.
2. Estimate timeline — when each estimate was created and modified, how
   many revisions exist. Strong signal for whether negotiation is active.
3. Initial appointment date — inspection date if present.
4. Days in current milestone.
5. Lead source.
6. Recent activity bursts — if history shows a flurry of activity in the
   last 48 hours, the agent should defer.

What we cannot extract (AccuLynx API limitation):
  - Content of "Job Message Added" rep notes
  - Content of rep emails to homeowner
  - Content of rep texts to homeowner

For those edge cases, the rep can type into the AccuLynx "Agent Context"
custom field, which arrives via webhook and overrides the auto-extracted
context. But that is the exception, not the rule.

Public surface:

  build_agent_context(lead_id) -> str
      Returns a formatted multi-line string ready to paste into the
      drafter prompt. Empty string if nothing useful is available.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from acculynx.client import get_json
from db.database import async_session
from db.models import Lead

log = logging.getLogger(__name__)

# Action strings that indicate active negotiation — if any happened in the
# last 48 hours, the agent should defer (rep is in the middle of something).
ACTIVE_NEGOTIATION_ACTIONS = {
    "Estimate Modified",
    "Estimate Sent",
    "Estimate sent",
    "Job Email added",
    "Email Sent",
    "Text Message Added",
    "Job Message Added",
}


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def _extract_inline_comment(action: str) -> Optional[str]:
    """Pull rep-typed comment out of a history action string.

    AccuLynx concatenates milestone-change comments inline like:
      "Job milestone changed to Dead by Paul VanWagoner. Comment: Estimated Cost was Too High"
    """
    m = re.search(r"\bComment:\s*(.+?)\s*$", action)
    if m:
        return m.group(1).strip()
    return None


# Per-lead memoization: a layer-page load fires 4 parallel draft calls,
# each of which would otherwise rebuild the agent context from scratch
# (history, estimates, messages — multiple network round-trips). 3-min TTL
# keeps it fresh enough for /review while saving 80%+ of redundant fetches.
import time as _time

_CTX_CACHE: dict[tuple[str, int], tuple[float, str]] = {}
_CTX_TTL_SECONDS = 180.0


def invalidate_agent_context_cache(lead_id: str | None = None) -> None:
    if lead_id is None:
        _CTX_CACHE.clear()
        return
    for key in list(_CTX_CACHE.keys()):
        if key[0] == lead_id:
            _CTX_CACHE.pop(key, None)


async def build_agent_context(lead_id: str, max_chars: int = 1500) -> str:
    """Mine AccuLynx for everything readable about this lead.

    Returns a formatted multi-line string for the drafter. Empty string
    if nothing useful is available. Memoized per-(lead_id, max_chars)
    with a 3-minute TTL.
    """
    cache_key = (lead_id, max_chars)
    cached = _CTX_CACHE.get(cache_key)
    if cached is not None:
        ts, value = cached
        if (_time.time() - ts) < _CTX_TTL_SECONDS:
            return value

    parts: list[str] = []

    # ── Lead row from our DB (already-synced fields) ──
    async with async_session() as session:
        r = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = r.scalar_one_or_none()

    if not lead:
        return ""

    now = datetime.now(timezone.utc)

    # Days in milestone — a key signal
    if lead.milestone_changed_date:
        anchor = lead.milestone_changed_date
        if anchor.tzinfo is None:
            anchor = anchor.replace(tzinfo=timezone.utc)
        days_in = (now - anchor).days
        parts.append(f"- {lead.milestone} for {days_in} day(s)")

    if lead.lead_source:
        parts.append(f"- Came in via {lead.lead_source}")

    if getattr(lead, "lead_dead_reason", None):
        parts.append(f"- LEAD DEAD REASON (from rep): {lead.lead_dead_reason}")

    # ── History (action labels with timestamps) ──
    try:
        history_resp = await get_json(f"/jobs/{lead_id}/history")
        history_items = (history_resp or {}).get("items", []) or []
    except Exception as e:
        log.warning("history fetch failed for %s: %s", lead_id, e)
        history_items = []

    # Milestone-change comments — every one we find
    milestone_comments: list[tuple[datetime, str, str]] = []  # (when, full_action, comment)
    for it in history_items:
        action = it.get("action", "")
        when = _parse_dt(it.get("date"))
        if "milestone changed" in action.lower():
            comment = _extract_inline_comment(action)
            if comment and when:
                milestone_comments.append((when, action, comment))

    if milestone_comments:
        milestone_comments.sort(reverse=True)
        for when, _, comment in milestone_comments[:3]:
            parts.append(f"- {when.strftime('%Y-%m-%d')} milestone-change comment from rep: \"{comment}\"")

    # Active negotiation detection: any actions in last 48h?
    recent_actions: list[tuple[datetime, str]] = []
    for it in history_items:
        when = _parse_dt(it.get("date"))
        action = it.get("action", "")
        if when and (now - when).total_seconds() < 48 * 3600:
            recent_actions.append((when, action))
    if recent_actions:
        recent_actions.sort(reverse=True)
        if any(a in ACTIVE_NEGOTIATION_ACTIONS for _, a in recent_actions):
            parts.append(
                f"- Rep was active in the last 48h ({len(recent_actions)} CRM event(s)). "
                f"Negotiation is likely live, tone the message DOWN."
            )

    # ── Estimates ──
    try:
        ests_resp = await get_json(f"/jobs/{lead_id}/estimates")
        estimates = (ests_resp or {}).get("items", []) or []
    except Exception:
        estimates = []

    if estimates:
        # Pull primary estimate detail
        primary = next((e for e in estimates if e.get("isPrimary")), estimates[0])
        try:
            detail = await get_json(f"/estimates/{primary['id']}")
            created = _parse_dt(detail.get("createdDate"))
            modified = _parse_dt(detail.get("modifiedDate"))
            financials = detail.get("financials") or {}
            total = financials.get("total") or financials.get("contractAmount")

            if created:
                age = (now - created).days
                parts.append(f"- Primary estimate created {age} day(s) ago")
            if modified and created and modified > created:
                last_mod = (now - modified).days
                parts.append(f"- Estimate last modified {last_mod} day(s) ago (revision activity)")
            if len(estimates) > 1:
                parts.append(f"- {len(estimates)} estimate revisions on file")
            if total:
                parts.append(f"- Estimate total: ${total:,.0f}" if isinstance(total, (int, float)) else f"- Estimate total: {total}")
        except Exception as e:
            log.debug("estimate detail fetch failed: %s", e)

    # ── Estimate-sent timestamp from history ──
    estimate_sent_when = None
    for it in history_items:
        if "estimate sent" in it.get("action", "").lower():
            estimate_sent_when = _parse_dt(it.get("date"))
            break
    if estimate_sent_when:
        days = (now - estimate_sent_when).days
        parts.append(f"- Estimate was officially marked Sent {days} day(s) ago")

    # ── Initial appointment ──
    for it in history_items:
        action = it.get("action", "")
        if "appointment" in action.lower() and "initial" in action.lower():
            when = _parse_dt(it.get("date"))
            if when:
                ago = (now - when).days
                parts.append(f"- Initial inspection appointment {ago} day(s) ago")
                break

    # ── Manual override from custom field (highest priority — append at top) ──
    if lead.agent_context and lead.agent_context.strip():
        parts.insert(0, f"REP NOTE (manual override, treat as authoritative): {lead.agent_context.strip()}")

    # ── Internal API: actual content of rep emails / texts / comments ──
    # This is the GOLD layer. The public API hides comment/email content;
    # the internal API exposes full bodies. Requires session cookies.
    comm_block = ""
    try:
        from acculynx.internal_api import (
            fetch_messages_for_job,
            format_messages_for_context,
            is_configured,
        )
        if is_configured():
            messages = await fetch_messages_for_job(lead_id)
            comm_block = format_messages_for_context(
                messages, max_messages=6, max_chars_per_message=350
            )
    except Exception as exc:
        log.debug("internal_api enrichment failed for %s: %s", lead_id, exc)

    if not parts and not comm_block:
        _CTX_CACHE[cache_key] = (_time.time(), "")
        return ""

    summary = "\n".join(parts) if parts else ""
    block = "\n\n".join(b for b in (summary, comm_block) if b)
    if len(block) > max_chars:
        block = block[: max_chars - 20] + "\n- (truncated)"
    _CTX_CACHE[cache_key] = (_time.time(), block)
    return block
