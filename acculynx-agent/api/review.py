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
from config.cadence import LAYER_MAP
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
    """Quick metadata for the sidebar."""
    return [
        {
            "name": name,
            "tone": layer.tone,
            "goal": layer.goal,
            "touches": len(layer.touches),
        }
        for name, layer in LAYER_MAP.items()
    ]


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
                "layer": lead.layer_name or "(no layer)",
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

    return templates.TemplateResponse(
        request,
        "review/lead.html",
        {
            "request": request,
            "lead": lead,
            "layers": _layer_summary(),
            "current_layer": lead.layer_name or "FIRST_CONTACT",
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
