"""Dashboard API — backs app.moderndayroof.com/tracking.

All endpoints under /api/dash/* require header `X-Dashboard-Secret` matching
settings.dashboard_api_secret. The public /api/feedback endpoint uses its
own HMAC token from the email link (see messaging.feedback).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import desc, func, select

from config.settings import settings
from db.database import async_session
from db.models import (
    Approval,
    InboundReplyVerdict,
    Lead,
    MessageQueue,
    RepFeedback,
)
from db.runtime_state import get_kill_switch, get_state, set_kill_switch

log = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()  # endpoints that don't require the dashboard secret


def _require_secret(x_dashboard_secret: Optional[str] = Header(default=None)) -> None:
    expected = settings.dashboard_api_secret
    if not expected:
        # Locked down by default — refuse if not configured.
        raise HTTPException(status_code=503, detail="dashboard_api_secret not configured")
    if not x_dashboard_secret or x_dashboard_secret != expected:
        raise HTTPException(status_code=401, detail="bad dashboard secret")


@router.get("/system-status", dependencies=[Depends(_require_secret)])
async def system_status() -> dict:
    state = get_state()
    # Sample last sync from leads.acculynx_modified_date max (best proxy)
    async with async_session() as session:
        r = await session.execute(select(func.max(Lead.acculynx_modified_date)))
        last_modified = r.scalar()
        r2 = await session.execute(select(func.count()).select_from(Lead).where(Lead.is_active == True))
        active_leads = r2.scalar() or 0
        r3 = await session.execute(
            select(func.count()).select_from(MessageQueue).where(MessageQueue.status == "needs_review")
        )
        needs_review = r3.scalar() or 0
        r4 = await session.execute(
            select(func.count()).select_from(MessageQueue).where(MessageQueue.status == "pending")
        )
        pending = r4.scalar() or 0
        r5 = await session.execute(
            select(func.count()).select_from(Lead).where(Lead.is_paused == True)
        )
        paused = r5.scalar() or 0

    # Cookie health snapshot
    rep_sessions: list[dict] = []
    try:
        from config.reps import all_reps
        from acculynx.rep_sessions import diagnose
        for rep in all_reps():
            slug = getattr(rep, "acculynx_profile_slug", "") or ""
            if not slug:
                continue
            d = diagnose(slug)
            rep_sessions.append({
                "rep_slug": slug,
                "rep_name": rep.name,
                "health": d.get("health"),
                "age_hours": d.get("age_hours"),
                "missing_cookies": d.get("missing_cookies", []),
            })
    except Exception:
        log.exception("rep_sessions snapshot failed")

    return {
        "kill_switch": state.get("kill_switch", False),
        "kill_switch_reason": state.get("kill_switch_reason", ""),
        "kill_switch_actor": state.get("kill_switch_actor", ""),
        "kill_switch_updated_at": state.get("kill_switch_updated_at", ""),
        "dry_run_env": settings.dry_run,
        "messaging_channels": settings.messaging_channels,
        "solo_sender_mode": settings.solo_sender_mode,
        "test_lead_allowlist": settings.test_lead_allowlist,
        "last_acculynx_modified": last_modified.isoformat() if last_modified else None,
        "active_leads": active_leads,
        "queue_pending": pending,
        "queue_needs_review": needs_review,
        "leads_paused": paused,
        "rep_sessions": rep_sessions,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


class KillSwitchPayload(BaseModel):
    value: bool
    reason: str = ""
    actor: str = ""


@router.post("/kill-switch", dependencies=[Depends(_require_secret)])
async def flip_kill_switch(payload: KillSwitchPayload) -> dict:
    set_kill_switch(value=payload.value, reason=payload.reason, actor=payload.actor)
    return get_state()


@router.get("/messages", dependencies=[Depends(_require_secret)])
async def messages(since: Optional[str] = None, limit: int = 100) -> list[dict]:
    """Live message log. Pass `since` (ISO timestamp) to poll new rows only."""
    limit = max(1, min(limit, 500))
    async with async_session() as session:
        q = select(MessageQueue).order_by(desc(MessageQueue.created_at)).limit(limit)
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                q = q.where(MessageQueue.created_at >= since_dt)
            except Exception:
                pass
        rows = (await session.execute(q)).scalars().all()
    return [
        {
            "id": m.id,
            "lead_id": m.lead_id,
            "channel": m.channel,
            "recipient_email": m.recipient_email,
            "recipient_phone": m.recipient_phone,
            "subject": m.subject,
            "body_excerpt": (m.body or "")[:200],
            "status": m.status,
            "approved_by": m.approved_by,
            "skip_reason": m.skip_reason,
            "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            "external_message_id": m.external_message_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in rows
    ]


@router.get("/send-rate", dependencies=[Depends(_require_secret)])
async def send_rate(bucket: str = "hour", days: int = 7) -> list[dict]:
    """Hourly/daily send counts split by channel + outcome.

    Returns rows: {bucket_start, channel, sent, blocked, failed}
    Outcomes inferred from MessageQueue.status.
    """
    days = max(1, min(days, 30))
    bucket_sql = "strftime('%Y-%m-%dT%H:00:00', sent_at)" if bucket == "hour" else "date(sent_at)"
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    async with async_session() as session:
        # Use raw SQL for the strftime; SQLite-only but that's our store.
        from sqlalchemy import text
        sql = text(f"""
            SELECT {bucket_sql} AS bucket, channel, status, COUNT(*) AS n
            FROM message_queue
            WHERE sent_at IS NOT NULL AND sent_at >= :cutoff
            GROUP BY bucket, channel, status
            ORDER BY bucket ASC
        """)
        rows = (await session.execute(sql, {"cutoff": cutoff})).all()
    out = []
    for bucket_start, channel, status, n in rows:
        out.append({
            "bucket_start": bucket_start,
            "channel": channel,
            "status": status,
            "count": n,
        })
    return out


@router.get("/queue", dependencies=[Depends(_require_secret)])
async def queue() -> dict:
    """Queue depth + age breakdown by status."""
    async with async_session() as session:
        from sqlalchemy import text
        sql = text("""
            SELECT status, COUNT(*) AS n,
                   MIN(created_at) AS oldest, MAX(created_at) AS newest
            FROM message_queue
            WHERE status IN ('pending','needs_review','approved','auto_approved')
            GROUP BY status
        """)
        rows = (await session.execute(sql)).all()
    buckets = []
    for status, n, oldest, newest in rows:
        buckets.append({
            "status": status, "count": n,
            "oldest": oldest, "newest": newest,
        })
    return {"buckets": buckets}


@router.get("/needs-review", dependencies=[Depends(_require_secret)])
async def needs_review(limit: int = 50) -> list[dict]:
    async with async_session() as session:
        q = (
            select(MessageQueue, Lead)
            .join(Lead, Lead.id == MessageQueue.lead_id, isouter=True)
            .where(MessageQueue.status == "needs_review")
            .order_by(desc(MessageQueue.created_at))
            .limit(limit)
        )
        rows = (await session.execute(q)).all()
    return [
        {
            "message_id": m.id,
            "lead_id": m.lead_id,
            "contact_name": (l.contact_name if l else None),
            "milestone": (l.milestone if l else None),
            "layer": m.cadence_name,
            "touch_index": m.touch_index,
            "channel": m.channel,
            "subject": m.subject,
            "body": m.body,
            "skip_reason": m.skip_reason,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_paused": (l.is_paused if l else None),
        }
        for m, l in rows
    ]


@router.post("/touches/{message_id}/resume", dependencies=[Depends(_require_secret)])
async def resume_touch(message_id: int) -> dict:
    """Unpause the lead, mark the touch skipped (the parked draft is the
    failure marker; cadence picks up the next touch on the next tick)."""
    async with async_session() as session:
        r = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        m = r.scalar_one_or_none()
        if not m:
            raise HTTPException(404, "not found")
        r2 = await session.execute(select(Lead).where(Lead.id == m.lead_id))
        lead = r2.scalar_one_or_none()
        m.status = "skipped"
        m.skip_reason = (m.skip_reason or "") + " | resumed via dashboard"
        if lead:
            lead.is_paused = False
            if hasattr(lead, "pause_reason"):
                lead.pause_reason = None
        await session.commit()
    return {"ok": True}


@router.post("/touches/{message_id}/send-as-was", dependencies=[Depends(_require_secret)])
async def send_as_was(message_id: int) -> dict:
    """Bypass postflight and send the parked draft. Unpauses lead on success."""
    async with async_session() as session:
        r = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        m = r.scalar_one_or_none()
        if not m:
            raise HTTPException(404, "not found")
        r2 = await session.execute(select(Lead).where(Lead.id == m.lead_id))
        lead = r2.scalar_one_or_none()
        body_to_send = m.body_edited or m.body
        if not body_to_send or not lead:
            raise HTTPException(400, "missing body or lead")

    from messaging import dispatch  # late import
    result = dispatch(
        channel=m.channel,
        to_email=lead.contact_email,
        to_phone=lead.contact_phone,
        to_name=lead.contact_name,
        subject=m.subject,
        body_text=body_to_send,
        lead_id=lead.id,
    )

    async with async_session() as session:
        r = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        m = r.scalar_one_or_none()
        r2 = await session.execute(select(Lead).where(Lead.id == m.lead_id))
        lead = r2.scalar_one_or_none()
        if result.sent:
            m.status = "sent"
            m.sent_at = datetime.now(timezone.utc)
            m.external_message_id = result.external_message_id
            if lead:
                lead.is_paused = False
        else:
            m.status = "failed"
            m.skip_reason = (m.skip_reason or "") + f" | send-as-was failed: {result.error or result.blocked_reason}"
        await session.commit()

    return {
        "sent": result.sent,
        "blocked_reason": result.blocked_reason,
        "error": result.error,
        "external_message_id": result.external_message_id,
    }


class EditPayload(BaseModel):
    body: str
    subject: Optional[str] = None


@router.post("/touches/{message_id}/edit-and-send", dependencies=[Depends(_require_secret)])
async def edit_and_send(message_id: int, payload: EditPayload) -> dict:
    async with async_session() as session:
        r = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        m = r.scalar_one_or_none()
        if not m:
            raise HTTPException(404, "not found")
        m.body_edited = payload.body
        if payload.subject is not None:
            m.subject = payload.subject
        await session.commit()
    return await send_as_was(message_id)


@router.post("/touches/{message_id}/skip", dependencies=[Depends(_require_secret)])
async def skip_touch(message_id: int) -> dict:
    async with async_session() as session:
        r = await session.execute(select(MessageQueue).where(MessageQueue.id == message_id))
        m = r.scalar_one_or_none()
        if not m:
            raise HTTPException(404, "not found")
        r2 = await session.execute(select(Lead).where(Lead.id == m.lead_id))
        lead = r2.scalar_one_or_none()
        m.status = "skipped"
        m.skip_reason = (m.skip_reason or "") + " | skipped via dashboard"
        if lead:
            lead.is_paused = False
        await session.commit()
    return {"ok": True}


@router.get("/postflight-stats", dependencies=[Depends(_require_secret)])
async def postflight_stats(days: int = 7) -> dict:
    days = max(1, min(days, 30))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    async with async_session() as session:
        from sqlalchemy import text
        # Source: queue_drafts table tracks postflight_ok + reasons
        sql = text("""
            SELECT
                SUM(CASE WHEN postflight_ok = 1 THEN 1 ELSE 0 END) AS ok_count,
                SUM(CASE WHEN postflight_ok = 0 THEN 1 ELSE 0 END) AS fail_count,
                COUNT(*) AS total
            FROM queue_drafts
            WHERE created_at >= :cutoff
        """)
        row = (await session.execute(sql, {"cutoff": cutoff})).first()
        ok = row.ok_count or 0
        fail = row.fail_count or 0
        total = row.total or 0
        # Top reasons (parsed from JSON column)
        sql2 = text("""
            SELECT postflight_reasons FROM queue_drafts
            WHERE postflight_ok = 0 AND created_at >= :cutoff
            LIMIT 500
        """)
        reason_rows = (await session.execute(sql2, {"cutoff": cutoff})).all()
    reason_counts: dict[str, int] = {}
    for (raw,) in reason_rows:
        if not raw:
            continue
        try:
            parsed = json.loads(raw)
        except Exception:
            continue
        if not isinstance(parsed, list):
            continue
        for r in parsed:
            key = str(r)[:80]
            reason_counts[key] = reason_counts.get(key, 0) + 1
    top_reasons = sorted(reason_counts.items(), key=lambda kv: -kv[1])[:10]
    return {
        "ok": ok,
        "fail": fail,
        "total": total,
        "rejection_rate": (fail / total) if total else 0,
        "top_reasons": [{"reason": k, "count": v} for k, v in top_reasons],
    }


@router.get("/classifier", dependencies=[Depends(_require_secret)])
async def classifier(days: int = 7) -> dict:
    days = max(1, min(days, 30))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    async with async_session() as session:
        from sqlalchemy import text
        sql = text("""
            SELECT verdict, COUNT(*) AS n
            FROM inbound_reply_verdicts
            WHERE created_at >= :cutoff
            GROUP BY verdict
            ORDER BY n DESC
        """)
        rows = (await session.execute(sql, {"cutoff": cutoff})).all()
    return {"breakdown": [{"verdict": v, "count": n} for v, n in rows]}


@router.get("/feedback", dependencies=[Depends(_require_secret)])
async def feedback_list(days: int = 7, unresolved_only: bool = False) -> list[dict]:
    days = max(1, min(days, 90))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    async with async_session() as session:
        q = select(RepFeedback).where(RepFeedback.created_at >= cutoff).order_by(desc(RepFeedback.created_at))
        if unresolved_only:
            q = q.where(RepFeedback.resolved == False)
        rows = (await session.execute(q)).scalars().all()
    return [
        {
            "id": f.id,
            "approval_id": f.approval_id,
            "lead_id": f.lead_id,
            "rep_slug": f.rep_slug,
            "rep_email": f.rep_email,
            "severity": f.severity,
            "category": f.category,
            "body": f.body,
            "resolved": f.resolved,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in rows
    ]


@router.post("/feedback/{fb_id}/resolve", dependencies=[Depends(_require_secret)])
async def feedback_resolve(fb_id: int, actor: str = "") -> dict:
    async with async_session() as session:
        r = await session.execute(select(RepFeedback).where(RepFeedback.id == fb_id))
        f = r.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "not found")
        f.resolved = True
        f.resolved_at = datetime.now(timezone.utc)
        f.resolved_by = actor or "operator"
        await session.commit()
    return {"ok": True}


@router.get("/reps/health", dependencies=[Depends(_require_secret)])
async def reps_health() -> dict:
    rows = []
    try:
        from config.reps import all_reps
        from acculynx.rep_sessions import diagnose
        for rep in all_reps():
            slug = getattr(rep, "acculynx_profile_slug", "") or ""
            d = diagnose(slug) if slug else {"health": "no_slug"}
            # last approval clicked
            decided_at = None
            async with async_session() as session:
                rq = await session.execute(
                    select(Approval)
                    .where(Approval.rep_email == rep.email)
                    .where(Approval.decided_at.is_not(None))
                    .order_by(desc(Approval.decided_at))
                    .limit(1)
                )
                ap = rq.scalar_one_or_none()
                if ap:
                    decided_at = ap.decided_at.isoformat()
            rows.append({
                "rep_slug": slug,
                "rep_name": rep.name,
                "rep_email": rep.email,
                "cookie_health": d.get("health"),
                "cookie_age_hours": d.get("age_hours"),
                "last_approval_decided_at": decided_at,
            })
    except Exception:
        log.exception("reps_health failed")
    return {"reps": rows}


@router.get("/alerts", dependencies=[Depends(_require_secret)])
async def alerts_list(limit: int = 200) -> dict:
    from pathlib import Path
    from config.settings import PROJECT_ROOT
    sev1_path = Path(PROJECT_ROOT) / "data" / "alert_sev1.jsonl"
    digest_path = Path(PROJECT_ROOT) / "data" / "alert_digest.jsonl"
    sev1: list[dict] = []
    pending_sev2: list[dict] = []
    for p, dest in ((sev1_path, sev1), (digest_path, pending_sev2)):
        if not p.exists():
            continue
        try:
            with p.open() as fh:
                for line in fh.readlines()[-limit:]:
                    try:
                        dest.append(json.loads(line))
                    except Exception:
                        continue
        except Exception:
            continue
    return {"sev1": list(reversed(sev1)), "pending_sev2": list(reversed(pending_sev2))}


@router.post("/flush-digest", dependencies=[Depends(_require_secret)])
async def flush_digest_now() -> dict:
    from messaging.alerts import flush_digest
    n = flush_digest()
    return {"flushed": n}


# ── Public endpoint: rep feedback submission (HMAC-protected) ─────────────

class FeedbackSubmission(BaseModel):
    approval_id: int
    rep: str
    token: str
    body: str
    severity: Optional[int] = None
    category: Optional[str] = None
    lead_id: Optional[str] = None


@public_router.post("/feedback")
async def submit_feedback(payload: FeedbackSubmission) -> dict:
    from messaging.feedback import verify, record_feedback
    if not verify(payload.approval_id, payload.rep, payload.token):
        raise HTTPException(401, "bad token")
    if not payload.body or len(payload.body.strip()) < 3:
        raise HTTPException(400, "body too short")
    body = payload.body.strip()[:5000]
    result = await record_feedback(
        approval_id=payload.approval_id,
        rep_slug=payload.rep,
        rep_email=None,
        lead_id=payload.lead_id,
        severity=payload.severity,
        category=payload.category,
        body=body,
    )
    return result
