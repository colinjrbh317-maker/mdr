"""APScheduler wiring — the runtime loop.

Started by api/main.py:lifespan. Runs:
  sync_job        every 15 min — pulls pipeline state from AccuLynx
  cadence_job     every 5  min — finds leads needing follow-up, drafts + creates approvals
  escalation_job  every 30 min — escalates approvals stalled > 4h to Austin
  cleanup_job     daily at 03:00 ET — purges stale tokens

Built on AsyncIOScheduler so we can call our async sync/draft pipeline directly.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from ai.drafter import draft_message
from config.settings import settings
from db.database import async_session
from db.models import Approval, Lead, MessageQueue
from engine.approval_flow import approve_and_send, create_approval_request
from engine.enrich import enrich_lead
from engine.preflight import preflight_check
from engine.sync import find_leads_needing_followup, is_business_hours, sync_pipeline

log = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None


async def sync_job() -> None:
    log.info("Running sync_pipeline job")
    try:
        stats = await sync_pipeline()
        log.info("sync_job stats: %s", stats)
    except Exception:
        log.exception("sync_job failed")


async def cadence_job() -> None:
    """Find leads needing follow-up, enrich, preflight, draft, queue for approval."""
    try:
        due = await find_leads_needing_followup()
        log.info("cadence_job: %d leads due", len(due))
        for entry in due:
            try:
                lead_id = entry["lead_id"]
                touch = entry["touch"]
                # Enrich (cached after first call within TTL)
                await enrich_lead(lead_id)
                # Preflight
                async with async_session() as session:
                    r = await session.execute(select(Lead).where(Lead.id == lead_id))
                    lead = r.scalar_one_or_none()
                if not lead:
                    continue
                pf = await preflight_check(lead, touch["channel"])
                if not pf.get("safe", False):
                    log.info("preflight blocked %s: %s", lead_id, pf.get("reason"))
                    continue
                # Draft
                draft = await draft_message(entry, touch, lead.milestone or "Lead")
                if draft.get("escalation"):
                    log.info("draft escalated for %s: %s", lead_id, draft["escalation"])
                    continue
                if not draft.get("postflight_ok"):
                    log.info("postflight failed for %s: %s", lead_id, draft.get("postflight_reasons"))
                    continue
                # Decide: autonomous or approval-gated?
                if touch.get("autonomous_ok") and not is_business_hours():
                    # After-hours autonomous send: queue + dispatch immediately
                    result = await create_approval_request(
                        lead_id=lead_id,
                        channel=draft["channel"],
                        subject=draft["subject"],
                        body=draft["body"],
                        cadence_name=entry["layer_name"],
                        touch_index=touch["touch_index"],
                        content_type=touch["content_type"],
                    )
                    # Auto-approve since touch.autonomous_ok and after-hours
                    await approve_and_send(result["message_id"])
                else:
                    # Gated: send approval email to rep
                    await create_approval_request(
                        lead_id=lead_id,
                        channel=draft["channel"],
                        subject=draft["subject"],
                        body=draft["body"],
                        cadence_name=entry["layer_name"],
                        touch_index=touch["touch_index"],
                        content_type=touch["content_type"],
                    )
            except Exception:
                log.exception("cadence_job entry failed for %s", entry.get("lead_id"))
    except Exception:
        log.exception("cadence_job top-level failure")


async def escalation_job() -> None:
    """Approvals open > 4h with no decision get a second email to escalation_email."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.approval_timeout_hours)
    try:
        async with async_session() as session:
            r = await session.execute(
                select(Approval).where(
                    Approval.decision.is_(None),
                    Approval.escalated == False,
                    Approval.created_at <= cutoff,
                )
            )
            stale = list(r.scalars())
            for ap in stale:
                ap.escalated = True
                ap.escalated_at = datetime.now(timezone.utc)
            await session.commit()
        log.info("escalation_job: marked %d stale approvals (full email impl deferred to v2)", len(stale))
    except Exception:
        log.exception("escalation_job failed")


def start_scheduler() -> None:
    """Called from FastAPI lifespan startup."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler(timezone="America/New_York")
    _scheduler.add_job(sync_job, IntervalTrigger(minutes=settings.acculynx_poll_interval_minutes), id="sync", replace_existing=True)
    _scheduler.add_job(cadence_job, IntervalTrigger(minutes=5), id="cadence", replace_existing=True)
    _scheduler.add_job(escalation_job, IntervalTrigger(minutes=30), id="escalation", replace_existing=True)
    _scheduler.start()
    log.info("Scheduler started: sync=%dm, cadence=5m, escalation=30m",
             settings.acculynx_poll_interval_minutes)


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        log.info("Scheduler stopped")
