"""Rep portal JSON API — consumed by the Next.js app at app.moderndayroof.com.

Auth model: email magic link.
  1. POST /api/portal/auth/request-link {email}
     -> JWT signed link sent to that email; clicking it sets a 30-day cookie.
  2. GET  /api/portal/auth/callback?token=...
     -> verifies, sets the `mdr_portal_session` httpOnly signed cookie, redirects
        to the Next.js portal /queue.

Every other endpoint requires the cookie. The cookie payload is just the rep
email; we re-resolve the rep on each request so reps.yaml stays the source
of truth.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from config.reps import Rep, all_reps, resolve_rep
from config.settings import settings
from db.database import async_session
from db.models import Approval, Lead, MessageQueue
from engine.approval_flow import (
    _build_why_now,
    approve_and_send,
    record_edit,
    skip,
)
from messaging import dispatch

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portal", tags=["portal"])

SESSION_COOKIE_NAME = "mdr_portal_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
MAGIC_LINK_TTL_SECONDS = 60 * 15          # 15 minutes


# ─────────────────────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────────────────────


def _jwt_secret() -> str:
    return settings.jwt_secret or "dev-secret-do-not-use-in-prod"


def _sign_magic_token(email: str) -> str:
    payload = {
        "sub": email.lower().strip(),
        "kind": "portal_magic",
        "iat": int(time.time()),
        "exp": int(time.time()) + MAGIC_LINK_TTL_SECONDS,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _verify_magic_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    except Exception:
        return None
    if payload.get("kind") != "portal_magic":
        return None
    return payload.get("sub")


def _sign_session(email: str) -> str:
    payload = {
        "sub": email.lower().strip(),
        "kind": "portal_session",
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _verify_session(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    except Exception:
        return None
    if payload.get("kind") != "portal_session":
        return None
    return payload.get("sub")


def _resolve_session_rep(email: str) -> Optional[Rep]:
    """Match the session email to a configured rep, or None if unknown.

    Unknown emails are rejected so a magic link emailed to an arbitrary
    address still can't access another rep's queue.
    """
    target = email.lower().strip()
    for rep in all_reps():
        if rep.email.lower().strip() == target or rep.sendgrid_sender_email.lower().strip() == target:
            return rep
    return None


async def require_rep(session_cookie: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> Rep:
    email = _verify_session(session_cookie)
    if not email:
        raise HTTPException(401, "Not authenticated")
    rep = _resolve_session_rep(email)
    if not rep:
        raise HTTPException(403, "Email is not a configured rep")
    return rep


class RequestLinkBody(BaseModel):
    email: EmailStr


@router.post("/auth/request-link")
async def request_link(payload: RequestLinkBody) -> dict:
    """Send a magic link to the rep's email. We respond 200 either way so an
    attacker can't enumerate which addresses are valid reps."""
    email = payload.email.strip().lower()
    rep = _resolve_session_rep(email)
    if rep:
        token = _sign_magic_token(rep.email)
        callback = f"{settings.app_base_url.rstrip('/')}/api/portal/auth/callback?token={token}"
        body = (
            f"Hey {rep.first_name},\n\n"
            f"Tap to sign in to the Modern Day Roofing rep portal. The link is good for 15 minutes.\n\n"
            f"{callback}\n\n"
            f"If you didn't request this, ignore the email.\n"
        )
        dispatch(
            channel="email",
            to_email=rep.email,
            to_name=rep.name,
            subject="Your MDR portal sign-in link",
            body_text=body,
            from_email=settings.sendgrid_from_email,
            from_name=settings.sendgrid_from_name,
        )
        log.info("portal magic link issued to %s", rep.email)
    else:
        log.info("portal magic-link request for unknown email (silent reject): %s", email)
    return {"ok": True}


@router.get("/auth/callback")
async def auth_callback(token: str = "") -> Response:
    email = _verify_magic_token(token)
    if not email or not _resolve_session_rep(email):
        return JSONResponse({"ok": False, "error": "invalid or expired link"}, status_code=400)

    session_jwt = _sign_session(email)
    redirect = RedirectResponse(url=f"{settings.portal_base_url.rstrip('/')}/queue", status_code=302)
    redirect.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_jwt,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=True,
        # Portal lives on app.moderndayroof.com (Vercel); API lives on the
        # Railway subdomain. That's cross-site for cookie purposes, so we
        # need SameSite=None+Secure for the browser to attach this on fetch.
        samesite="none",
        path="/",
    )
    return redirect


@router.post("/auth/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
async def me(rep: Rep = Depends(require_rep)) -> dict:
    return {
        "rep_id": rep.rep_id,
        "name": rep.name,
        "first_name": rep.first_name,
        "email": rep.email,
        "title": rep.title,
        "signature_phone": rep.signature_phone,
        "twilio_phone": rep.twilio_phone,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Queue + message detail
# ─────────────────────────────────────────────────────────────────────────────


def _rep_owns_lead(rep: Rep, lead: Lead) -> bool:
    """Wildcard rep (Colin) sees everything. Real reps see only their assigned leads."""
    if rep.rep_id == "*":
        return True
    return (lead.assigned_rep_id or "") == rep.rep_id


@router.get("/queue")
async def queue(rep: Rep = Depends(require_rep)) -> dict:
    """Pending approvals visible to this rep, oldest first so the urgent ones
    surface at the top."""
    async with async_session() as session:
        result = await session.execute(
            select(Approval, MessageQueue, Lead)
            .join(MessageQueue, Approval.message_id == MessageQueue.id)
            .join(Lead, MessageQueue.lead_id == Lead.id)
            .where(
                Approval.decision.is_(None),
                MessageQueue.status.in_(("pending", "edited")),
            )
            .order_by(Approval.created_at.asc())
        )
        rows = list(result.all())

    items = []
    for approval, message, lead in rows:
        if not _rep_owns_lead(rep, lead):
            continue
        preview = (message.body_edited or message.body or "").strip().replace("\n", " ")
        items.append({
            "message_id": message.id,
            "lead_id": lead.id,
            "homeowner_name": lead.contact_name,
            "address": lead.address,
            "channel": message.channel,
            "layer": message.cadence_name,
            "touch_index": (message.touch_index or 0) + 1,
            "subject": message.subject,
            "preview": preview[:200],
            "why_now": _build_why_now(lead, message),
            "nudge_count": approval.nudge_count or 0,
            "created_at": (approval.created_at.isoformat() if approval.created_at else None),
            "expires_at_local": "18:00 ET (business day)",
        })

    return {"items": items, "count": len(items)}


@router.get("/messages/{message_id}")
async def message_detail(message_id: int, rep: Rep = Depends(require_rep)) -> dict:
    async with async_session() as session:
        result = await session.execute(
            select(Approval, MessageQueue, Lead)
            .join(MessageQueue, Approval.message_id == MessageQueue.id)
            .join(Lead, MessageQueue.lead_id == Lead.id)
            .where(MessageQueue.id == message_id)
        )
        row = result.first()
    if not row:
        raise HTTPException(404, "Message not found")
    approval, message, lead = row
    if not _rep_owns_lead(rep, lead):
        raise HTTPException(403, "Not your lead")

    recent = []
    try:
        from acculynx.internal_api import fetch_messages_for_job
        recent = (await fetch_messages_for_job(lead.id))[:6]
    except Exception:
        log.debug("portal message_detail: recent fetch failed", exc_info=True)

    return {
        "message_id": message.id,
        "lead_id": lead.id,
        "status": message.status,
        "homeowner_name": lead.contact_name,
        "address": lead.address,
        "phone": lead.contact_phone,
        "email": lead.contact_email,
        "milestone": lead.milestone,
        "channel": message.channel,
        "layer": message.cadence_name,
        "touch_index": (message.touch_index or 0) + 1,
        "subject": message.subject,
        "body": message.body_edited or message.body,
        "why_now": _build_why_now(lead, message),
        "nudge_count": approval.nudge_count or 0,
        "auto_send_at": "18:00 ET (business day)",
        "agent_context": lead.agent_context,
        "rilla_present": bool(lead.rilla_transcript),
        "recent_interactions": [
            {
                "type": m.get("type"),
                "when": (m.get("created_date") or "")[:10],
                "by": m.get("created_by"),
                "subject": m.get("subject"),
                "body": (m.get("body_text") or "")[:600],
            }
            for m in recent
        ],
    }


class DecisionEdit(BaseModel):
    body: Optional[str] = None
    subject: Optional[str] = None
    reason: Optional[str] = None


@router.post("/messages/{message_id}/approve")
async def approve(message_id: int, rep: Rep = Depends(require_rep)) -> dict:
    result = await approve_and_send(message_id)
    return {"ok": bool(result.get("sent") or result.get("dry_run")), "result": result}


@router.post("/messages/{message_id}/edit")
async def edit(message_id: int, payload: DecisionEdit, rep: Rep = Depends(require_rep)) -> dict:
    if not payload.body:
        raise HTTPException(400, "body is required")
    await record_edit(message_id, new_body=payload.body, new_subject=payload.subject)
    result = await approve_and_send(message_id)
    return {"ok": bool(result.get("sent") or result.get("dry_run")), "result": result}


@router.post("/messages/{message_id}/skip")
async def skip_message(message_id: int, payload: DecisionEdit, rep: Rep = Depends(require_rep)) -> dict:
    await skip(message_id, reason=payload.reason or "rep skipped via portal")
    return {"ok": True}


@router.get("/sent")
async def sent_log(rep: Rep = Depends(require_rep), limit: int = 50) -> dict:
    async with async_session() as session:
        result = await session.execute(
            select(MessageQueue, Lead)
            .join(Lead, MessageQueue.lead_id == Lead.id)
            .where(
                MessageQueue.status.in_(("sent", "logged_to_acculynx")),
                MessageQueue.direction == "outbound",
            )
            .order_by(MessageQueue.sent_at.desc())
            .limit(limit * 2)
        )
        rows = list(result.all())
    items = []
    for message, lead in rows:
        if not _rep_owns_lead(rep, lead):
            continue
        items.append({
            "message_id": message.id,
            "lead_id": lead.id,
            "homeowner_name": lead.contact_name,
            "channel": message.channel,
            "subject": message.subject,
            "preview": (message.body_edited or message.body or "")[:200],
            "sent_at": message.sent_at.isoformat() if message.sent_at else None,
            "delivery_status": message.delivery_status,
        })
        if len(items) >= limit:
            break
    return {"items": items, "count": len(items)}


# ─────────────────────────────────────────────────────────────────────────────
# Lead search + Rilla transcript upload
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/leads/search")
async def lead_search(q: str = "", rep: Rep = Depends(require_rep)) -> dict:
    if not q or len(q.strip()) < 2:
        return {"items": []}
    needle = f"%{q.strip().lower()}%"
    from sqlalchemy import func as sa_func, or_
    async with async_session() as session:
        result = await session.execute(
            select(Lead)
            .where(
                or_(
                    sa_func.lower(Lead.contact_name).like(needle),
                    sa_func.lower(Lead.address).like(needle),
                    sa_func.lower(Lead.contact_email).like(needle),
                )
            )
            .order_by(Lead.acculynx_modified_date.desc())
            .limit(25)
        )
        rows = list(result.scalars())
    items = []
    for lead in rows:
        if not _rep_owns_lead(rep, lead):
            continue
        items.append({
            "id": lead.id,
            "name": lead.contact_name,
            "address": lead.address,
            "milestone": lead.milestone,
            "rilla_present": bool(lead.rilla_transcript),
        })
    return {"items": items[:15]}


class RillaUpload(BaseModel):
    lead_id: str
    transcript: str
    source: Optional[str] = "paste"  # paste | upload | email | extension


@router.post("/rilla-transcripts")
async def upload_rilla(payload: RillaUpload, rep: Rep = Depends(require_rep)) -> dict:
    transcript = (payload.transcript or "").strip()
    if not transcript:
        raise HTTPException(400, "transcript is empty")
    # Strip em-dashes and en-dashes preemptively to match MDR voice rules
    transcript = transcript.replace("—", ", ").replace("–", "-")

    async with async_session() as session:
        lead = await session.get(Lead, payload.lead_id)
        if not lead:
            raise HTTPException(404, "lead not found")
        if not _rep_owns_lead(rep, lead):
            raise HTTPException(403, "Not your lead")
        # Append rather than replace so reps can drop a second call's transcript
        # without overwriting an earlier one.
        prefix = (lead.rilla_transcript or "").strip()
        separator = "\n\n--- next session ---\n\n" if prefix else ""
        lead.rilla_transcript = (prefix + separator + transcript)[:60000]
        lead.rilla_uploaded_at = datetime.now(timezone.utc)
        await session.commit()

    # Mirror to AccuLynx notes so Alicia sees it in her source of truth.
    try:
        from acculynx.notes import log_send_to_acculynx
        preview = transcript[:400] + ("..." if len(transcript) > 400 else "")
        await log_send_to_acculynx(
            job_id=payload.lead_id, channel="internal_note",
            contact_name=lead.contact_name or "Homeowner",
            body=preview,
            subject=None,
            prefix_note=f"RILLA TRANSCRIPT uploaded by {rep.first_name} (source: {payload.source})",
        )
    except Exception:
        log.exception("rilla upload AccuLynx mirror failed (non-fatal)")

    # Invalidate the context cache so the next draft picks up the new transcript
    try:
        from engine.context_builder import invalidate_agent_context_cache
        invalidate_agent_context_cache(payload.lead_id)
    except Exception:
        pass

    return {"ok": True, "chars_stored": len(lead.rilla_transcript or "")}
