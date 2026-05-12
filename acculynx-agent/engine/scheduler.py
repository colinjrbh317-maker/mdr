"""APScheduler wiring — the runtime loop.

Started by api/main.py:lifespan. Runs:
  sync_job              every 15 min — pulls pipeline state from AccuLynx
  cadence_job           every 5  min — finds leads needing follow-up, drafts + creates approvals
  approval_nudge_job    cron 17:00, 17:30, 17:45, 17:55 ET, Mon-Fri — escalating "please approve" reminders
  auto_send_at_deadline_job cron 18:00 ET, Mon-Fri — sends still-pending drafts and logs to AccuLynx
  cookie_health_job     cron 09:00 ET — checks the AccuLynx session cookie

Built on AsyncIOScheduler so we can call our async sync/draft pipeline directly.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from ai.drafter import draft_message
from config.reps import resolve_rep
from config.settings import settings
from db.database import async_session
from db.models import Approval, Lead, MessageQueue
from engine.approval_flow import approve_and_send, create_approval_request
from engine.enrich import enrich_lead
from engine.preflight import drip_safety_check, preflight_check
from engine.sync import advance_cadence, find_leads_needing_followup, is_business_hours, sync_pipeline

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
                # Drip safety gate — runs BEFORE drafter to avoid wasting a Claude call
                drip_check = await drip_safety_check(entry)
                if drip_check.get("skip"):
                    reasons = drip_check.get("reasons", [])
                    log.info(
                        "Drip blocked for lead %s: %s",
                        lead_id,
                        reasons,
                    )
                    print(f"Drip blocked for lead {lead_id}: {reasons}")
                    await advance_cadence(lead_id)
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
                rep = resolve_rep(getattr(lead, "assigned_rep_id", None))
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
                        rep=rep,
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
                        rep=rep,
                    )
            except Exception:
                log.exception("cadence_job entry failed for %s", entry.get("lead_id"))
    except Exception:
        log.exception("cadence_job top-level failure")


async def _pending_approvals_today() -> list[tuple[Approval, MessageQueue, Lead]]:
    """All approvals that are still pending decision AND were created today.

    We restrict to "today" because a draft that's been pending for multiple
    days has its own bigger problem (rep is unreachable, lead may be stale);
    those get manual triage, not a 5pm nudge.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    async with async_session() as session:
        result = await session.execute(
            select(Approval, MessageQueue, Lead)
            .join(MessageQueue, Approval.message_id == MessageQueue.id)
            .join(Lead, MessageQueue.lead_id == Lead.id)
            .where(
                Approval.decision.is_(None),
                Approval.created_at >= today_start,
                MessageQueue.status.in_(("pending", "edited")),
            )
        )
        return list(result.all())


async def approval_nudge_job() -> None:
    """Send an escalating 'please approve' email to the rep for every still-pending
    approval from today. Fires at 17:00 / 17:30 / 17:45 / 17:55 ET on business days.

    Each nudge increments Approval.nudge_count and stamps last_nudge_at so we
    can render the urgency in the email ("first reminder" vs "FINAL: auto-send in 5 min").
    """
    from config.reps import resolve_rep
    from engine.approval_flow import _build_links, _build_why_now  # internal helpers
    from messaging import dispatch

    try:
        pending = await _pending_approvals_today()
    except Exception:
        log.exception("approval_nudge_job: pending lookup failed")
        return

    now = datetime.now(timezone.utc)
    auto_send_clock = f"{settings.auto_send_hour:02d}:{settings.auto_send_minute:02d}"
    log.info("approval_nudge_job: %d pending approvals", len(pending))

    async with async_session() as session:
        for approval, message, lead in pending:
            try:
                # Reload from session so the update is committed under this transaction.
                ap = await session.get(Approval, approval.id)
                if not ap:
                    continue
                ap.nudge_count = (ap.nudge_count or 0) + 1
                ap.last_nudge_at = now
                ap.escalated = True
                ap.escalated_at = ap.escalated_at or now

                rep = resolve_rep(getattr(lead, "assigned_rep_id", None))
                links = _build_links(message.id, ap.token)
                stage_word = "First reminder" if ap.nudge_count == 1 else (
                    "Second reminder" if ap.nudge_count == 2 else (
                        "Third reminder" if ap.nudge_count == 3 else "FINAL reminder"
                    )
                )
                final = ap.nudge_count >= len(settings.approval_nudge_minutes)
                why = _build_why_now(lead, message)
                subj_prefix = "FINAL" if final else f"Reminder {ap.nudge_count}"
                subject = (
                    f"[{subj_prefix}] {lead.contact_name or 'Homeowner'} draft auto-sends at {auto_send_clock} ET"
                )
                body = (
                    f"{stage_word}.\n\n"
                    f"At {auto_send_clock} ET on business days, any draft still pending will auto-send to the homeowner as-is and get logged to AccuLynx.\n\n"
                    f"Lead: {lead.contact_name or 'Homeowner'} ({message.cadence_name or 'cadence'}, "
                    f"touch {(message.touch_index or 0) + 1})\n"
                    f"Why this lead now: {why}\n\n"
                    f"Approve:  {links.approve_url}\n"
                    f"Edit:     {links.edit_url}\n"
                    f"Skip:     {links.skip_url}\n"
                )
                cc_targets = [settings.escalation_cc_email] if settings.escalation_cc_email else None
                dispatch(
                    channel="email",
                    to_email=rep.email,
                    to_name=rep.name,
                    cc=cc_targets if final else None,
                    subject=subject,
                    body_text=body,
                    from_email=settings.sendgrid_from_email,
                    from_name=settings.sendgrid_from_name,
                    lead_id=lead.id,
                )
            except Exception:
                log.exception("approval_nudge_job: per-approval failure for %s", approval.id)
        await session.commit()


async def auto_send_at_deadline_job() -> None:
    """At the deadline (default 18:00 ET, Mon-Fri), every still-pending draft from
    today gets auto-sent to the homeowner. The unedited draft is used so reps know
    exactly what went out. An internal AccuLynx note is logged with reason
    "auto-sent: rep did not respond by deadline".

    Settings.auto_send_enabled is a kill-switch — when false, we only log what
    WOULD have been sent.
    """
    from engine.approval_flow import approve_and_send

    try:
        pending = await _pending_approvals_today()
    except Exception:
        log.exception("auto_send_at_deadline_job: pending lookup failed")
        return

    log.info(
        "auto_send_at_deadline_job: %d pending approvals (auto_send_enabled=%s)",
        len(pending), settings.auto_send_enabled,
    )

    for approval, message, lead in pending:
        try:
            if not settings.auto_send_enabled:
                log.info(
                    "auto_send_at_deadline_job DRY: would auto-send msg %s for lead %s",
                    message.id, lead.id,
                )
                continue

            result = await approve_and_send(message.id)
            sent = bool(result.get("sent") or result.get("dry_run"))

            async with async_session() as session:
                ap = await session.get(Approval, approval.id)
                if ap and sent:
                    ap.decision = "auto_approved"
                    ap.decided_at = datetime.now(timezone.utc)
                    ap.auto_sent_at_deadline = True
                    ap.auto_sent_at = datetime.now(timezone.utc)
                    await session.commit()

            log.info(
                "auto_send_at_deadline_job: msg %s lead %s sent=%s blocked=%s",
                message.id, lead.id, sent, result.get("blocked_reason"),
            )

            if sent and not result.get("dry_run"):
                try:
                    from acculynx.notes import log_send_to_acculynx
                    await log_send_to_acculynx(
                        job_id=lead.id,
                        channel=message.channel,
                        contact_name=lead.contact_name or "Homeowner",
                        body=(message.body_edited or message.body or ""),
                        subject=message.subject,
                        prefix_note="AUTO-SENT (rep did not respond by deadline)",
                    )
                except Exception:
                    log.exception("auto_send_at_deadline_job: AccuLynx note write failed (non-fatal)")
        except Exception:
            log.exception("auto_send_at_deadline_job: per-approval failure for %s", approval.id)


async def cookie_health_job() -> None:
    """Daily check that the AccuLynx internal-API session cookie is valid.

    On failure, attempt auto-refresh via Playwright (if login creds are
    configured). If auto-refresh fails, email the escalation address.
    """
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from scripts.check_cookie import health_check
        result = await health_check()
        if result["ok"]:
            log.info("cookie_health_job: ✓ %s", result["message"])
            return

        log.warning("cookie_health_job: ✗ %s — attempting auto-refresh", result["message"])

        # ── Try Playwright auto-relogin first ──
        auto_refresh_ok = False
        if settings.acculynx_login_email and settings.acculynx_login_password:
            try:
                from scripts.refresh_cookies import login_and_capture, write_env
                cookies = await login_and_capture(
                    email=settings.acculynx_login_email,
                    password=settings.acculynx_login_password,
                    headless=True,
                )
                write_env(cookies)
                # Re-import settings to pick up the fresh cookie value
                import importlib
                from config import settings as _s_mod
                importlib.reload(_s_mod)
                # Re-check
                from scripts.check_cookie import health_check as _hc
                result2 = await _hc()
                if result2["ok"]:
                    log.info("cookie_health_job: auto-refresh succeeded ✓")
                    auto_refresh_ok = True
                else:
                    log.warning("cookie_health_job: auto-refresh ran but health check still failing: %s", result2["message"])
            except Exception as exc:
                log.warning("cookie_health_job: auto-refresh failed (%s) — falling back to manual", exc)
        else:
            log.info("cookie_health_job: ACCULYNX_LOGIN_EMAIL/PASSWORD not set, skipping auto-refresh")

        if auto_refresh_ok:
            return

        # ── Notify a human ──
        try:
            from messaging.sendgrid_email import send_email
            send_email(
                to_email=settings.escalation_email or "colinjrbh317@gmail.com",
                subject="[MDR Agent] AccuLynx session cookie EXPIRED — manual refresh needed",
                body_text=(
                    "Cookie health check failed and auto-refresh did not succeed.\n\n"
                    f"Status: {result.get('status_code')}\n"
                    f"Message: {result['message']}\n\n"
                    "ACTION: re-capture cookies via Chrome DevTools and paste into "
                    "ACCULYNX_SESSION_COOKIE in .env, OR confirm the bot account's "
                    "credentials in ACCULYNX_LOGIN_EMAIL/PASSWORD are correct."
                ),
                from_email=settings.sendgrid_from_email,
                from_name="MDR Agent Monitor",
            )
        except Exception:
            log.exception("cookie_health_job: failed to send notification")
    except Exception:
        log.exception("cookie_health_job: top-level error")


def start_scheduler() -> None:
    """Called from FastAPI lifespan startup."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler(timezone="America/New_York")
    _scheduler.add_job(sync_job, IntervalTrigger(minutes=settings.acculynx_poll_interval_minutes), id="sync", replace_existing=True)
    _scheduler.add_job(cadence_job, IntervalTrigger(minutes=5), id="cadence", replace_existing=True)

    # Escalating "please approve" nudges at 17:00 / 17:30 / 17:45 / 17:55 ET.
    nudge_minutes = ",".join(str(m) for m in settings.approval_nudge_minutes) or "0,30,45,55"
    _scheduler.add_job(
        approval_nudge_job,
        CronTrigger(day_of_week="mon-fri", hour=17, minute=nudge_minutes),
        id="approval_nudge",
        replace_existing=True,
    )
    # Deadline auto-send at 18:00 ET, business days only.
    _scheduler.add_job(
        auto_send_at_deadline_job,
        CronTrigger(
            day_of_week="mon-fri",
            hour=settings.auto_send_hour,
            minute=settings.auto_send_minute,
        ),
        id="auto_send_at_deadline",
        replace_existing=True,
    )
    # Cookie health check at 09:00 ET daily — early enough that you can
    # refresh during the workday if it fails.
    _scheduler.add_job(cookie_health_job, CronTrigger(hour=9, minute=0), id="cookie_health", replace_existing=True)
    _scheduler.start()
    log.info(
        "Scheduler started: sync=%dm, cadence=5m, nudge=17:%s mon-fri, auto_send=%02d:%02d mon-fri, cookie_health=09:00",
        settings.acculynx_poll_interval_minutes, nudge_minutes,
        settings.auto_send_hour, settings.auto_send_minute,
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        log.info("Scheduler stopped")


def schedule_one_shot(coro_fn, *, run_in_seconds: float, job_id: str | None = None) -> None:
    """Schedule a coroutine to run once after `run_in_seconds`.

    Used by the inbound auto-reply path to introduce the 2-3 minute random
    delay before an AI reply hits the homeowner's inbox. Survives the request
    lifecycle because the scheduler runs independently in the FastAPI app.

    If the scheduler is not yet started, falls back to logging a warning and
    skipping (test environments).
    """
    if _scheduler is None:
        log.warning("schedule_one_shot called but scheduler not running; skipping %s", job_id or "<anon>")
        return
    run_at = datetime.now(timezone.utc) + timedelta(seconds=run_in_seconds)
    _scheduler.add_job(
        coro_fn,
        DateTrigger(run_date=run_at),
        id=job_id,
        replace_existing=bool(job_id),
        misfire_grace_time=600,
    )
