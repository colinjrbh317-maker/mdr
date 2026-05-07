"""Cadence + copy review web app — the deliverable Austin spends an hour with.

Routes:
  GET  /review                              — landing, lead picker
  GET  /review/{lead_id}                    — overview of all 11 layers for a lead
  GET  /review/{lead_id}/{layer}            — every touch in this layer for the lead
  GET  /review/draft/{lead_id}/{layer}/{touch}/{channel}  — JSON: real Claude draft
  POST /review/templates/{layer}/{touch}/{channel}        — save edited template to copy.yaml
  GET  /review/export                       — download approved copy.yaml

Drafts are cached in-memory by (lead_id, layer, touch_index, channel, template_hash).
First hit is slow (Claude API ~5-15s), subsequent hits are instant.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Optional

import yaml
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select

from ai.drafter import draft_message
from config.cadence import DEMO_VISIBLE_LAYERS, LAYER_MAP
from config.settings import settings
from db.database import async_session
from db.models import Lead

log = logging.getLogger(__name__)

router = APIRouter(prefix="/review", tags=["review"])

PROJECT_ROOT = Path(settings.project_root)
TEMPLATES_DIR = PROJECT_ROOT / "templates" / "review"
templates = Jinja2Templates(directory=str(PROJECT_ROOT / "templates"))

COPY_OVERLAY_PATH = PROJECT_ROOT / "config" / "copy.yaml"
TEMPLATES_FINAL_PATH = PROJECT_ROOT / "sops" / "templates_final.md"

# In-memory draft cache: {(lead_id, layer, touch_index, channel, template_hash): draft_dict}
_draft_cache: dict[tuple, dict] = {}


def _template_hash() -> str:
    if not TEMPLATES_FINAL_PATH.exists():
        return "no-template-file"
    overlay = COPY_OVERLAY_PATH.read_text(encoding="utf-8") if COPY_OVERLAY_PATH.exists() else ""
    base = TEMPLATES_FINAL_PATH.read_text(encoding="utf-8")
    return hashlib.sha1((base + "::OVERLAY::" + overlay).encode("utf-8")).hexdigest()[:12]


def _load_overlay() -> dict:
    if not COPY_OVERLAY_PATH.exists():
        return {}
    return yaml.safe_load(COPY_OVERLAY_PATH.read_text(encoding="utf-8")) or {}


def _save_overlay(data: dict) -> None:
    COPY_OVERLAY_PATH.parent.mkdir(parents=True, exist_ok=True)
    COPY_OVERLAY_PATH.write_text(yaml.safe_dump(data, sort_keys=True, allow_unicode=True), encoding="utf-8")


def _layer_summary() -> list[dict]:
    """Quick metadata for the sidebar.

    Filtered to DEMO_VISIBLE_LAYERS so the client-facing /review only shows
    the layers we actually want to demo. Hidden layers (FIRST_CONTACT,
    PRE_APPOINTMENT, POST_INSPECTION, PRE_INSTALL, CLOSED, RE_ENGAGEMENT)
    still exist in LAYER_MAP for the scheduler — they just aren't surfaced
    in the UI.
    """
    return [
        {
            "name": name,
            "tone": LAYER_MAP[name].tone,
            "goal": LAYER_MAP[name].goal,
            "touches": len(LAYER_MAP[name].touches),
        }
        for name in DEMO_VISIBLE_LAYERS
        if name in LAYER_MAP
    ]


def _display_layer(layer_name: Optional[str]) -> str:
    """For the /review demo we only surface DEMO_VISIBLE_LAYERS. Anything
    else (FIRST_CONTACT, PRE_APPOINTMENT, POST_INSPECTION, PRE_INSTALL,
    CLOSED, RE_ENGAGEMENT) is normalized to ESTIMATE_FOLLOWUP for the
    sake of the lead picker — the actual DB row is unchanged."""
    if not layer_name:
        return "ESTIMATE_FOLLOWUP"
    if layer_name in DEMO_VISIBLE_LAYERS:
        return layer_name
    return "ESTIMATE_FOLLOWUP"


async def _list_lead_choices(limit: int = 100) -> list[dict]:
    """Lead picker payload, prefer leads with email + active milestone."""
    async with async_session() as session:
        result = await session.execute(
            select(Lead)
            .where(Lead.contact_email.isnot(None))
            .where(Lead.is_active == True)
            .order_by(Lead.acculynx_modified_date.desc())
            .limit(limit)
        )
        return [
            {
                "id": lead.id,
                "name": lead.contact_name or "(no name)",
                "milestone": lead.milestone or "?",
                "address": lead.address or "",
                "email": lead.contact_email or "",
                "layer": _display_layer(lead.layer_name),
            }
            for lead in result.scalars()
        ]


async def _get_lead(lead_id: str) -> Optional[Lead]:
    async with async_session() as session:
        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        return result.scalar_one_or_none()


def _build_lead_context(lead: Lead, layer_name: str) -> dict:
    layer = LAYER_MAP.get(layer_name)
    return {
        "lead_id": lead.id,
        "contact_name": lead.contact_name or "Homeowner",
        "contact_phone": lead.contact_phone or "",
        "contact_email": lead.contact_email or "",
        "address": lead.address or "",
        "milestone": lead.milestone or "Lead",
        "work_type": lead.work_type or "roofing",
        "lead_source": lead.lead_source or "Unknown",
        "layer_name": layer_name,
        "layer_goal": layer.goal if layer else "",
        "layer_tone": layer.tone if layer else "",
        "days_since_layer_start": 0,
        "total_attempts": lead.total_contact_attempts or 0,
        "assigned_rep_id": "*",
        # Pass agent control fields through so drafter can adapt
        "agent_context": lead.agent_context,
        "agent_context_updated_at": lead.agent_context_updated_at,
        "agent_status": lead.agent_status or "Active",
    }


@router.get("", response_class=HTMLResponse)
async def review_landing(request: Request) -> Any:
    leads = await _list_lead_choices()
    return templates.TemplateResponse(
        request,
        "review/index.html",
        {
            "request": request,
            "leads": leads,
            "layers": _layer_summary(),
            "settings": settings,
        },
    )


@router.get("/{lead_id}", response_class=HTMLResponse)
async def review_lead(request: Request, lead_id: str) -> Any:
    lead = await _get_lead(lead_id)
    if not lead:
        raise HTTPException(404, f"Lead {lead_id} not found")

    # Fire-and-forget: warm the AccuLynx + agent-context caches so by the
    # time the user clicks a layer, the network round-trips are already
    # done and the only remaining latency is the Claude API call.
    import asyncio as _asyncio
    async def _warm():
        try:
            from engine.context_builder import build_agent_context
            await build_agent_context(lead_id)
        except Exception:
            pass
    _asyncio.create_task(_warm())

    return templates.TemplateResponse(
        request,
        "review/lead.html",
        {
            "request": request,
            "lead": lead,
            "layers": _layer_summary(),
            "current_layer": _display_layer(lead.layer_name),
            "settings": settings,
        },
    )


@router.get("/{lead_id}/context/full", response_class=HTMLResponse)
async def review_lead_context(request: Request, lead_id: str) -> Any:
    """The "What does the agent know about this homeowner?" page.

    Shows every piece of context the agent will read when drafting:
    - Lead row from our DB
    - Live AccuLynx history (every action with timestamp)
    - Auto-extracted context block (what gets pasted into Claude's prompt)

    Designed for the Austin meeting — proves there's no black box.
    """
    from acculynx.client import get_json
    from engine.context_builder import build_agent_context

    lead = await _get_lead(lead_id)
    if not lead:
        raise HTTPException(404, f"Lead {lead_id} not found")

    # Live history from AccuLynx
    try:
        h = await get_json(f"/jobs/{lead_id}/history")
        history_items = h.get("items", []) or []
    except Exception:
        history_items = []

    # Live job payload (for the readable fields like leadDeadReason, priority)
    try:
        job = await get_json(f"/jobs/{lead_id}")
    except Exception:
        job = {}

    # Auto-extracted context block — exactly what the drafter pastes into Claude
    auto_ctx = await build_agent_context(lead_id)

    return templates.TemplateResponse(
        request,
        "review/context.html",
        {
            "request": request,
            "lead": lead,
            "history_items": history_items,
            "job_payload": job,
            "auto_context": auto_ctx or "(no context extracted yet)",
            "settings": settings,
        },
    )


@router.get("/{lead_id}/{layer_name}", response_class=HTMLResponse)
async def review_layer(request: Request, lead_id: str, layer_name: str) -> Any:
    lead = await _get_lead(lead_id)
    if not lead:
        raise HTTPException(404, f"Lead {lead_id} not found")
    layer = LAYER_MAP.get(layer_name)
    if not layer:
        raise HTTPException(404, f"Layer {layer_name} not found")

    touches = [
        {
            "index": i,
            "day_offset": t.day_offset,
            "channel": t.channel,
            "content_type": t.content_type,
            "autonomous_ok": t.autonomous_ok,
        }
        for i, t in enumerate(layer.touches)
    ]
    return templates.TemplateResponse(
        request,
        "review/layer.html",
        {
            "request": request,
            "lead": lead,
            "layer_name": layer_name,
            "layer": layer,
            "touches": touches,
            "layers": _layer_summary(),
            "settings": settings,
        },
    )


@router.get("/draft/{lead_id}/{layer_name}/{touch_index}/{channel}")
async def review_draft(lead_id: str, layer_name: str, touch_index: int, channel: str) -> Any:
    lead = await _get_lead(lead_id)
    if not lead:
        raise HTTPException(404, f"Lead {lead_id} not found")
    layer = LAYER_MAP.get(layer_name)
    if not layer or touch_index >= len(layer.touches):
        raise HTTPException(404, f"Touch {touch_index} not found in {layer_name}")

    th = _template_hash()
    cache_key = (lead_id, layer_name, touch_index, channel, th)
    if cache_key in _draft_cache:
        return JSONResponse(_draft_cache[cache_key] | {"cached": True})

    touch = layer.touches[touch_index]
    if channel != touch.channel:
        # User asked for a different channel than the cadence prescribes,
        # still draft it but note it was a manual override
        pass
    touch_info = {
        "channel": channel,
        "content_type": touch.content_type,
        "day_offset": touch.day_offset,
        "touch_index": touch_index,
        "autonomous_ok": touch.autonomous_ok,
    }
    lead_ctx = _build_lead_context(lead, layer_name)

    try:
        result = await draft_message(lead_ctx, touch_info, lead.milestone or "Lead")
    except Exception as exc:
        log.exception("Draft generation failed")
        raise HTTPException(500, str(exc))

    payload = {
        "channel": result["channel"],
        "subject": result["subject"],
        "body": result["body"],
        "escalation": result.get("escalation"),
        "postflight_ok": result.get("postflight_ok", True),
        "postflight_reasons": result.get("postflight_reasons", []),
        "regenerations": result.get("regenerations", 0),
        "rep_name": result["rep"].name if result.get("rep") else "",
        "rep_email": result["rep"].sendgrid_sender_email if result.get("rep") else "",
        "cached": False,
    }
    _draft_cache[cache_key] = payload
    return JSONResponse(payload)


@router.post("/templates/{layer_name}/{touch_index}/{channel}")
async def save_template_override(
    layer_name: str,
    touch_index: int,
    channel: str,
    request: Request,
) -> Any:
    body = await request.json()
    new_template = (body or {}).get("template", "").strip()
    if not new_template:
        raise HTTPException(400, "template is required")

    overlay = _load_overlay()
    overlay.setdefault("touches", {}).setdefault(layer_name, {}).setdefault(str(touch_index), {})[channel] = new_template
    _save_overlay(overlay)

    # Invalidate cache for this layer+touch
    keys_to_drop = [k for k in _draft_cache if k[1] == layer_name and k[2] == touch_index and k[3] == channel]
    for k in keys_to_drop:
        _draft_cache.pop(k, None)

    return {"ok": True, "saved_to": str(COPY_OVERLAY_PATH), "invalidated_cache_entries": len(keys_to_drop)}


@router.post("/regenerate/{lead_id}/{layer_name}/{touch_index}/{channel}")
async def regenerate(lead_id: str, layer_name: str, touch_index: int, channel: str) -> Any:
    """Force a fresh draft, ignoring the cache."""
    th = _template_hash()
    cache_key = (lead_id, layer_name, touch_index, channel, th)
    _draft_cache.pop(cache_key, None)
    return await review_draft(lead_id, layer_name, touch_index, channel)


@router.post("/test-send/{lead_id}/{layer_name}/{touch_index}/{channel}")
async def test_send(lead_id: str, layer_name: str, touch_index: int, channel: str) -> Any:
    """Demo button: generate this draft, send it to settings.test_recipient_email,
    bypassing DRY_RUN. The recipient is YOU, never the homeowner — used in the
    Austin meeting to show 'this is exactly what would have hit Robert'."""
    lead = await _get_lead(lead_id)
    if not lead:
        raise HTTPException(404, f"Lead {lead_id} not found")
    layer = LAYER_MAP.get(layer_name)
    if not layer or touch_index >= len(layer.touches):
        raise HTTPException(404, f"Touch {touch_index} not found in {layer_name}")

    # Reuse the cached draft if one exists; otherwise generate fresh
    th = _template_hash()
    cache_key = (lead_id, layer_name, touch_index, channel, th)
    if cache_key in _draft_cache:
        draft = _draft_cache[cache_key]
    else:
        draft_resp = await review_draft(lead_id, layer_name, touch_index, channel)
        # review_draft returns JSONResponse; pull payload back from cache
        draft = _draft_cache.get(cache_key)
        if not draft:
            # Fallback: re-decode JSONResponse body
            import json as _json
            draft = _json.loads(draft_resp.body)

    # SMS is gated off until Twilio A2P approval, so "text" channel touches
    # are rendered as email for the demo. The drafted body already ends with
    # the tight 3-line text-style signature, so it reads correctly either way.

    test_to = settings.test_recipient_email
    if not test_to:
        raise HTTPException(500, "TEST_RECIPIENT_EMAIL not configured")

    # ── Thread continuity: pull the most recent rep email from AccuLynx so
    # this follow-up appears as a reply to the same conversation in the
    # homeowner's inbox. Falls back gracefully if no prior email exists. ──
    thread = None
    try:
        from acculynx.internal_api import get_thread_continuity_for_job
        thread = await get_thread_continuity_for_job(lead_id)
    except Exception:
        log.exception("thread continuity fetch failed")

    real_name = lead.contact_name or "homeowner"
    real_email = lead.contact_email or "no email on file"
    # Text-channel drafts have no subject. Use a touch-appropriate fallback.
    if channel == "text":
        base_subject = "Quick check-in on your roof estimate"
    else:
        base_subject = (draft.get("subject") or "Following up on your roof estimate").strip()

    # If there's a prior rep email, thread off it: Re: original subject
    threaded_subject = base_subject
    in_reply_to = None
    rep_email_addr = None
    rep_display_name = draft.get("rep_name") or settings.sendgrid_from_name
    if thread:
        prior_subj = (thread.get("subject") or "").strip()
        if prior_subj:
            re_prefix = "Re: " if not prior_subj.lower().startswith("re:") else ""
            threaded_subject = f"{re_prefix}{prior_subj}"
        in_reply_to = thread.get("synthetic_msgid")
        rep_email_addr = thread.get("rep_email")
        if thread.get("rep_name"):
            rep_display_name = thread["rep_name"].strip()

    demo_subject = f"[DEMO → would go to {real_name}] {threaded_subject}"
    thread_note = ""
    if thread:
        thread_note = (
            f"--- THREAD CONTEXT ---\n"
            f"Most recent rep email: \"{thread.get('subject')}\" by {thread.get('rep_name')} on {(thread.get('sent_date') or '')[:10]}\n"
            f"Replying as: {rep_email_addr or '(no rep email derived)'} ({rep_display_name})\n"
            f"In-Reply-To: {in_reply_to or '(none)'}\n"
            f"Threaded subject: {threaded_subject}\n"
            f"------------------------\n\n"
        )
    demo_body = (
        f"--- DEMO PREVIEW ---\n"
        f"Real recipient (NOT actually sent): {real_name} <{real_email}>\n"
        f"Layer: {layer_name}  ·  Touch {touch_index + 1}/{len(layer.touches)}  ·  {channel.upper()}\n"
        f"Lead ID: {lead_id}\n"
        f"--------------------\n\n"
        f"{thread_note}"
        f"{draft['body']}"
    )

    # Force-send: temporarily flip dry_run for THIS call only
    from messaging.sendgrid_email import send_email
    original_dry = settings.dry_run
    settings.dry_run = False
    try:
        result = send_email(
            to_email=test_to,
            subject=demo_subject,
            body_text=demo_body,
            lead_id=lead_id,
            from_name=rep_display_name,
            in_reply_to=in_reply_to,
            references=[in_reply_to] if in_reply_to else None,
        )
    finally:
        settings.dry_run = original_dry

    return {
        "sent": result.sent,
        "to": test_to,
        "real_recipient": f"{real_name} <{real_email}>",
        "subject": demo_subject,
        "sendgrid_message_id": result.sendgrid_message_id,
        "error": result.error,
    }


@router.get("/template-source/{layer_name}/{touch_index}/{channel}", response_class=PlainTextResponse)
async def template_source(layer_name: str, touch_index: int, channel: str) -> str:
    """Return the current template (overlay first, then templates_final.md fallback)
    so the editor textarea can pre-fill with the existing copy."""
    overlay = _load_overlay()
    saved = (
        overlay.get("touches", {})
        .get(layer_name, {})
        .get(str(touch_index), {})
        .get(channel)
    )
    if saved:
        return saved
    # Fall back to whatever templates_final.md has for this touch
    from ai.drafter import _load_template_for_touch
    return _load_template_for_touch(layer_name, touch_index, channel)


@router.get("/export")
async def export_overlay() -> Response:
    overlay = _load_overlay()
    payload = yaml.safe_dump(overlay or {"note": "no overlays saved yet"}, sort_keys=True, allow_unicode=True)
    return Response(
        payload,
        media_type="application/x-yaml",
        headers={"Content-Disposition": 'attachment; filename="copy.yaml"'},
    )
