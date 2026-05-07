"""Cadence + copy review web app — the deliverable Austin spends an hour with.

Routes:
  GET  /review                              — landing, lead picker
  GET  /review/{lead_id}                    — overview of all 11 layers for a lead
  GET  /review/{lead_id}/{layer}            — every touch in this layer for the lead
  GET  /review/draft/{lead_id}/{layer}/{touch}/{channel}  — JSON: real Claude draft
  POST /review/templates/{layer}/{touch}/{channel}        — save edited template to copy.yaml
  GET  /review/export                       — download approved copy.yaml

  Testbench routes (Friday CEO review):
  GET  /review/testbench                   — main testbench page
  POST /review/testbench/draft             — generate draft, return results partial (HTMX)
  POST /review/testbench/verdict           — record verdict to DB
  GET  /review/testbench/stats             — JSON stats
  GET  /review/testbench/export.json       — download all verdicts as JSON
  GET  /review/testbench/export.md         — download verdicts as markdown report

Drafts are cached in-memory by (lead_id, layer, touch_index, channel, template_hash).
First hit is slow (Claude API ~5-15s), subsequent hits are instant.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml
from fastapi import APIRouter, Form, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func as sa_func, select

from ai.drafter import draft_message
from config.cadence import DEMO_VISIBLE_LAYERS, LAYER_MAP
from config.settings import settings
from db.database import async_session
from db.models import Lead, TestbenchVerdict

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

# ─────────────────────────────────────────────────────────────────────────────
# TESTBENCH — Friday CEO review session
# ─────────────────────────────────────────────────────────────────────────────

# Lead archetypes copied from scripts/export_60_drafts.py — same 8 profiles.
_ARCHETYPES = [
    {
        "id": "james_hicks_christiansburg",
        "contact_name": "James Hicks",
        "contact_phone": "555-301-4412",
        "contact_email": "james.hicks@example.com",
        "address": "142 Maple Ave, Christiansburg, VA 24073",
        "work_type": "Roof Replacement",
        "lead_source": "Google",
        "agent_context": "wants Barkwood shingle samples, asked about GAF warranty",
        "estimate_total": 15000,
    },
    {
        "id": "maria_santos_blacksburg",
        "contact_name": "Maria Santos",
        "contact_phone": "555-214-9877",
        "contact_email": "m.santos@example.com",
        "address": "88 Ridgeview Dr, Blacksburg, VA 24060",
        "work_type": "Storm Damage",
        "lead_source": "Referral",
        "agent_context": "spouse out of town until Friday, call after 5pm",
        "estimate_total": 22500,
    },
    {
        "id": "deshawn_williams_roanoke",
        "contact_name": "DeShawn Williams",
        "contact_phone": "555-488-6230",
        "contact_email": "deshawn.w@example.com",
        "address": "317 Jefferson St, Roanoke, VA 24016",
        "work_type": "Insurance Claim",
        "lead_source": "Door Knock",
        "agent_context": "had insurance claim in 2023, knows the drill, prefers text",
        "estimate_total": 19800,
    },
    {
        "id": "linda_nguyen_salem",
        "contact_name": "Linda Nguyen",
        "contact_phone": "555-762-0034",
        "contact_email": "linda.nguyen@example.com",
        "address": "45 Peach Tree Ln, Salem, VA 24153",
        "work_type": "Roof Repair",
        "lead_source": "Google",
        "agent_context": "",
        "estimate_total": 8400,
    },
    {
        "id": "robert_kowalski_cave_spring",
        "contact_name": "Robert Kowalski",
        "contact_phone": "555-553-8821",
        "contact_email": "rkowalski@example.com",
        "address": "210 Sunset Blvd, Cave Spring, VA 24018",
        "work_type": "Roof Replacement",
        "lead_source": "Facebook",
        "agent_context": "comparing three bids, price sensitive, likes Platinum Pledge warranty",
        "estimate_total": 27000,
    },
    {
        "id": "aisha_patel_radford",
        "contact_name": "Aisha Patel",
        "contact_phone": "555-630-1145",
        "contact_email": "aisha.patel@example.com",
        "address": "502 College Ave, Radford, VA 24141",
        "work_type": "Roof Replacement",
        "lead_source": "Referral",
        "agent_context": "",
        "estimate_total": 34500,
    },
    {
        "id": "carlos_mendez_pulaski",
        "contact_name": "Carlos Mendez",
        "contact_phone": "555-190-7753",
        "contact_email": "carlos.m@example.com",
        "address": "78 Hillcrest Rd, Pulaski, VA 24301",
        "work_type": "Storm Damage",
        "lead_source": "Google",
        "agent_context": "needs install done before son's graduation party in June",
        "estimate_total": 11200,
    },
    {
        "id": "tamika_robinson_lynchburg",
        "contact_name": "Tamika Robinson",
        "contact_phone": "555-874-3369",
        "contact_email": "tamika.r@example.com",
        "address": "163 Oak Hollow Dr, Lynchburg, VA 24501",
        "work_type": "Roof Replacement",
        "lead_source": "Door Knock",
        "agent_context": "landlord with two rental properties, mentioned second property might need work",
        "estimate_total": 18700,
    },
]

_ARCHETYPE_BY_ID: dict[str, dict] = {a["id"]: a for a in _ARCHETYPES}

# Layer-to-milestone mapping for archetype context building
_LAYER_TO_MILESTONE: dict[str, str] = {
    "FIRST_CONTACT":     "Lead",
    "PRE_APPOINTMENT":   "Lead",
    "POST_INSPECTION":   "Prospect",
    "ESTIMATE_FOLLOWUP": "Prospect",
    "NURTURE":           "Prospect",
    "GOING_COLD":        "Prospect",
    "PRE_INSTALL":       "Approved",
    "POST_INSTALL":      "Completed",
    "DRIP":              "Closed",
    "RE_ENGAGEMENT":     "Dead",
}

# Day-offset hints per layer for realistic lead context
_LAYER_DAY_HINTS: dict[str, list[int]] = {
    "FIRST_CONTACT":     [0, 0, 1],
    "PRE_APPOINTMENT":   [0],
    "POST_INSPECTION":   [1],
    "ESTIMATE_FOLLOWUP": [2, 5, 10, 14],
    "NURTURE":           [21, 30, 38, 45],
    "GOING_COLD":        [52, 60, 67],
    "PRE_INSTALL":       [14, 21],
    "POST_INSTALL":      [7, 9],
    "DRIP":              [30, 90, 180, 365],
    "RE_ENGAGEMENT":     [0, 7, 14],
}

# In-memory testbench draft cache: draft_id -> full draft payload
_testbench_cache: dict[str, dict] = {}


async def _list_testbench_real_leads() -> list[dict]:
    """Top 50 active residential leads, excluding stopped."""
    async with async_session() as session:
        result = await session.execute(
            select(Lead)
            .where(Lead.is_active == True)
            .where(Lead.agent_status != "Stopped")
            .order_by(Lead.milestone_changed_date.desc())
            .limit(50)
        )
        leads = []
        for lead in result.scalars():
            leads.append({
                "id": lead.id,
                "name": lead.contact_name or "(no name)",
                "address": lead.address or "",
                "work_type": lead.work_type or "",
                "milestone": lead.milestone or "?",
                "layer": lead.layer_name or "ESTIMATE_FOLLOWUP",
                "lead_source": lead.lead_source or "",
                "estimate_total": None,
                "agent_context": lead.agent_context or "",
            })
        return leads


async def _count_today_verdicts() -> int:
    today = datetime.now(timezone.utc).date()
    async with async_session() as session:
        result = await session.execute(
            select(sa_func.count(TestbenchVerdict.id))
            .where(TestbenchVerdict.created_at >= datetime(today.year, today.month, today.day))
        )
        return result.scalar_one() or 0


def _build_archetype_lead_context(arch: dict, layer_name: str, touch_index: int) -> dict:
    layer = LAYER_MAP.get(layer_name)
    day_hints = _LAYER_DAY_HINTS.get(layer_name, [0])
    days = day_hints[touch_index] if touch_index < len(day_hints) else 0
    return {
        "lead_id": None,
        "contact_name": arch["contact_name"],
        "contact_phone": arch["contact_phone"],
        "contact_email": arch["contact_email"],
        "address": arch["address"],
        "work_type": arch["work_type"],
        "lead_source": arch["lead_source"],
        "estimate_total": arch.get("estimate_total"),
        "milestone": _LAYER_TO_MILESTONE.get(layer_name, "Prospect"),
        "layer_name": layer_name,
        "layer_goal": layer.goal if layer else "",
        "layer_tone": layer.tone if layer else "",
        "days_since_layer_start": days,
        "total_attempts": touch_index,
        "assigned_rep_id": None,
        "agent_context": arch.get("agent_context", ""),
        "agent_status": "Active",
        "sms_opt_out": False,
        "twilio_stop": False,
        "touch_index": touch_index,
    }


def _build_real_lead_context(lead_row: dict, layer_name: str, touch_index: int) -> dict:
    layer = LAYER_MAP.get(layer_name)
    day_hints = _LAYER_DAY_HINTS.get(layer_name, [0])
    days = day_hints[touch_index] if touch_index < len(day_hints) else 0
    return {
        "lead_id": lead_row["id"],
        "contact_name": lead_row["name"],
        "contact_phone": "",
        "contact_email": "",
        "address": lead_row["address"],
        "work_type": lead_row["work_type"],
        "lead_source": lead_row["lead_source"],
        "estimate_total": lead_row.get("estimate_total"),
        "milestone": lead_row["milestone"],
        "layer_name": layer_name,
        "layer_goal": layer.goal if layer else "",
        "layer_tone": layer.tone if layer else "",
        "days_since_layer_start": days,
        "total_attempts": touch_index,
        "assigned_rep_id": None,
        "agent_context": lead_row["agent_context"],
        "agent_status": "Active",
        "sms_opt_out": False,
        "twilio_stop": False,
        "touch_index": touch_index,
    }


@router.get("/testbench", response_class=HTMLResponse)
async def testbench_landing(request: Request) -> Any:
    real_leads = await _list_testbench_real_leads()
    today_count = await _count_today_verdicts()
    all_layers = [
        {
            "name": name,
            "touches": [
                {
                    "index": i,
                    "channel": t.channel,
                    "content_type": t.content_type,
                    "day_offset": t.day_offset,
                }
                for i, t in enumerate(LAYER_MAP[name].touches)
            ],
        }
        for name in LAYER_MAP
        if LAYER_MAP[name].touches
    ]
    return templates.TemplateResponse(
        request,
        "review/testbench.html",
        {
            "request": request,
            "archetypes": _ARCHETYPES,
            "real_leads": real_leads,
            "all_layers": all_layers,
            "demo_layers": DEMO_VISIBLE_LAYERS,
            "settings": settings,
            "today_count": today_count,
        },
    )


@router.post("/testbench/draft", response_class=HTMLResponse)
async def testbench_draft(
    request: Request,
    lead_kind: str = Form(...),
    archetype_id: str = Form(default=""),
    real_lead_id: str = Form(default=""),
    custom_name: str = Form(default=""),
    custom_address: str = Form(default=""),
    custom_work_type: str = Form(default="Roof Replacement"),
    custom_estimate: str = Form(default=""),
    custom_lead_source: str = Form(default=""),
    custom_agent_context: str = Form(default=""),
    layer_name: str = Form(...),
    touch_index: int = Form(...),
    channel: str = Form(...),
    reviewer: str = Form(default="Colin"),
) -> Any:
    layer = LAYER_MAP.get(layer_name)
    if not layer or touch_index >= len(layer.touches):
        raise HTTPException(400, f"Invalid layer {layer_name} or touch_index {touch_index}")

    touch = layer.touches[touch_index]
    lead_ref: str
    display_lead: dict  # what the UI shows in the left pane
    acculynx_job_id: Optional[str] = None

    if lead_kind == "archetype":
        arch = _ARCHETYPE_BY_ID.get(archetype_id)
        if not arch:
            raise HTTPException(400, f"Unknown archetype {archetype_id}")
        lead_ref = archetype_id
        lead_ctx = _build_archetype_lead_context(arch, layer_name, touch_index)
        display_lead = {
            "name": arch["contact_name"],
            "address": arch["address"],
            "work_type": arch["work_type"],
            "lead_source": arch["lead_source"],
            "estimate_total": arch.get("estimate_total"),
            "agent_context": arch.get("agent_context", ""),
            "acculynx_url": None,
        }

    elif lead_kind == "real":
        async with async_session() as session:
            result = await session.execute(select(Lead).where(Lead.id == real_lead_id))
            lead_row_obj = result.scalar_one_or_none()
        if not lead_row_obj:
            raise HTTPException(404, f"Lead {real_lead_id} not found")
        lead_ref = real_lead_id
        acculynx_job_id = real_lead_id
        row: dict = {
            "id": lead_row_obj.id,
            "name": lead_row_obj.contact_name or "(no name)",
            "address": lead_row_obj.address or "",
            "work_type": lead_row_obj.work_type or "",
            "milestone": lead_row_obj.milestone or "?",
            "layer": lead_row_obj.layer_name or layer_name,
            "lead_source": lead_row_obj.lead_source or "",
            "estimate_total": None,
            "agent_context": lead_row_obj.agent_context or "",
        }
        lead_ctx = _build_real_lead_context(row, layer_name, touch_index)
        display_lead = {
            "name": row["name"],
            "address": row["address"],
            "work_type": row["work_type"],
            "lead_source": row["lead_source"],
            "estimate_total": None,
            "agent_context": row["agent_context"],
            "acculynx_url": f"https://my.acculynx.com/jobs/{real_lead_id}",
        }

    else:  # custom
        ts = int(time.time())
        lead_ref = f"custom_{ts}"
        estimate_total_val = int(custom_estimate) if custom_estimate.strip().isdigit() else None
        lead_ctx = {
            "lead_id": None,
            "contact_name": custom_name or "Homeowner",
            "contact_phone": "",
            "contact_email": "",
            "address": custom_address or "Virginia",
            "work_type": custom_work_type or "Roof Replacement",
            "lead_source": custom_lead_source or "Unknown",
            "estimate_total": estimate_total_val,
            "milestone": _LAYER_TO_MILESTONE.get(layer_name, "Prospect"),
            "layer_name": layer_name,
            "layer_goal": layer.goal,
            "layer_tone": layer.tone,
            "days_since_layer_start": 0,
            "total_attempts": touch_index,
            "assigned_rep_id": None,
            "agent_context": custom_agent_context,
            "agent_status": "Active",
            "sms_opt_out": False,
            "twilio_stop": False,
            "touch_index": touch_index,
        }
        display_lead = {
            "name": custom_name or "Homeowner",
            "address": custom_address or "Virginia",
            "work_type": custom_work_type or "Roof Replacement",
            "lead_source": custom_lead_source or "Unknown",
            "estimate_total": estimate_total_val,
            "agent_context": custom_agent_context,
            "acculynx_url": None,
        }

    touch_info = {
        "day_offset": touch.day_offset,
        "channel": channel,
        "content_type": touch.content_type,
        "autonomous_ok": touch.autonomous_ok,
        "touch_index": touch_index,
    }

    milestone = lead_ctx.get("milestone", "Prospect")
    try:
        result_draft = await draft_message(lead_ctx, touch_info, milestone)
    except Exception as exc:
        log.exception("Testbench draft generation failed")
        raise HTTPException(500, str(exc))

    draft_id = str(uuid.uuid4())
    th = _template_hash()
    payload = {
        "draft_id": draft_id,
        "lead_ref": lead_ref,
        "lead_kind": lead_kind,
        "layer": layer_name,
        "touch_index": touch_index,
        "content_type": touch.content_type,
        "channel": result_draft.get("channel", channel),
        "subject": result_draft.get("subject", ""),
        "body": result_draft.get("body", ""),
        "postflight_ok": result_draft.get("postflight_ok", True),
        "postflight_reasons": result_draft.get("postflight_reasons", []),
        "regenerations": result_draft.get("regenerations", 0),
        "template_hash": th,
        "reviewer": reviewer,
        "display_lead": display_lead,
        "acculynx_job_id": acculynx_job_id,
        "render_ts_ms": int(time.time() * 1000),
    }
    _testbench_cache[draft_id] = payload

    return templates.TemplateResponse(
        request,
        "review/testbench_results.html",
        {"request": request, "draft": payload},
    )


@router.post("/testbench/verdict")
async def testbench_verdict(
    draft_id: str = Form(...),
    verdict: str = Form(...),
    edited_body: str = Form(default=""),
    notes: str = Form(default=""),
    reviewer: str = Form(default="Colin"),
    decision_ms: int = Form(default=0),
) -> Any:
    if verdict not in ("send", "edit", "reject"):
        raise HTTPException(400, f"verdict must be send/edit/reject, got {verdict!r}")

    cached = _testbench_cache.get(draft_id)
    if not cached:
        raise HTTPException(404, f"draft_id {draft_id} not found in cache — page may have reloaded")

    row = TestbenchVerdict(
        layer=cached["layer"],
        touch_index=cached["touch_index"],
        content_type=cached["content_type"],
        channel=cached["channel"],
        lead_ref=cached["lead_ref"],
        lead_kind=cached["lead_kind"],
        draft_subject=cached.get("subject") or None,
        draft_body=cached["body"],
        postflight_ok=cached.get("postflight_ok", True),
        postflight_reasons=json.dumps(cached.get("postflight_reasons") or []),
        regenerations=cached.get("regenerations", 0),
        template_hash=cached.get("template_hash"),
        verdict=verdict,
        edited_body=edited_body.strip() or None,
        notes=notes.strip() or None,
        reviewer=reviewer,
        decision_ms=decision_ms if decision_ms > 0 else None,
    )

    async with async_session() as session:
        session.add(row)
        await session.commit()
        await session.refresh(row)

    verdict_label = {"send": "Send", "edit": "Edited", "reject": "Rejected"}.get(verdict, verdict)
    return HTMLResponse(
        f'<div class="verdict-recorded" style="'
        f'background:#DCFCE7;color:#166534;border:1px solid #BBF7D0;'
        f'border-radius:8px;padding:10px 14px;font-weight:600;font-size:14px;'
        f'display:flex;align-items:center;gap:8px;">'
        f'<span>Recorded</span>'
        f'<span style="font-weight:400;font-size:13px;">{verdict_label} verdict saved (ID {row.id})</span>'
        f'</div>'
    )


@router.get("/testbench/stats")
async def testbench_stats() -> Any:
    async with async_session() as session:
        total_result = await session.execute(
            select(sa_func.count(TestbenchVerdict.id))
        )
        total = total_result.scalar_one() or 0

        by_verdict_result = await session.execute(
            select(TestbenchVerdict.verdict, sa_func.count(TestbenchVerdict.id))
            .group_by(TestbenchVerdict.verdict)
        )
        by_verdict = {row[0]: row[1] for row in by_verdict_result}

        by_layer_result = await session.execute(
            select(TestbenchVerdict.layer, sa_func.count(TestbenchVerdict.id))
            .group_by(TestbenchVerdict.layer)
        )
        by_layer = {row[0]: row[1] for row in by_layer_result}

        by_reviewer_result = await session.execute(
            select(TestbenchVerdict.reviewer, sa_func.count(TestbenchVerdict.id))
            .group_by(TestbenchVerdict.reviewer)
        )
        by_reviewer = {row[0]: row[1] for row in by_reviewer_result}

        avg_ms_result = await session.execute(
            select(sa_func.avg(TestbenchVerdict.decision_ms))
            .where(TestbenchVerdict.decision_ms.isnot(None))
        )
        avg_ms = avg_ms_result.scalar_one()

        # Most-edited content_types (self-annealing signal)
        edited_ct_result = await session.execute(
            select(TestbenchVerdict.content_type, sa_func.count(TestbenchVerdict.id))
            .where(TestbenchVerdict.verdict == "edit")
            .group_by(TestbenchVerdict.content_type)
            .order_by(sa_func.count(TestbenchVerdict.id).desc())
            .limit(10)
        )
        most_edited = [{"content_type": row[0], "count": row[1]} for row in edited_ct_result]

    return JSONResponse({
        "total_verdicts": total,
        "by_verdict": by_verdict,
        "by_layer": by_layer,
        "by_reviewer": by_reviewer,
        "avg_decision_ms": round(avg_ms, 0) if avg_ms else None,
        "most_edited_content_types": most_edited,
    })


@router.get("/testbench/export.json")
async def testbench_export_json() -> Response:
    async with async_session() as session:
        result = await session.execute(
            select(TestbenchVerdict).order_by(TestbenchVerdict.created_at.asc())
        )
        rows = result.scalars().all()

    data = [
        {
            "id": r.id,
            "layer": r.layer,
            "touch_index": r.touch_index,
            "content_type": r.content_type,
            "channel": r.channel,
            "lead_ref": r.lead_ref,
            "lead_kind": r.lead_kind,
            "draft_subject": r.draft_subject,
            "draft_body": r.draft_body,
            "postflight_ok": r.postflight_ok,
            "postflight_reasons": json.loads(r.postflight_reasons) if r.postflight_reasons else [],
            "regenerations": r.regenerations,
            "template_hash": r.template_hash,
            "verdict": r.verdict,
            "edited_body": r.edited_body,
            "notes": r.notes,
            "reviewer": r.reviewer,
            "decision_ms": r.decision_ms,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"testbench_verdicts_{ts}.json"
    return Response(
        json.dumps(data, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/testbench/export.md")
async def testbench_export_md() -> Response:
    async with async_session() as session:
        result = await session.execute(
            select(TestbenchVerdict).order_by(TestbenchVerdict.created_at.asc())
        )
        rows = result.scalars().all()

    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "# MDR AI Sales Agent — Testbench Review Report",
        f"",
        f"Generated: {ts}",
        f"Total verdicts: {len(rows)}",
        f"",
        "---",
        "",
    ]

    verdict_counts: dict[str, int] = {}
    for r in rows:
        verdict_counts[r.verdict] = verdict_counts.get(r.verdict, 0) + 1

    lines += [
        "## Summary",
        "",
        f"- Send: {verdict_counts.get('send', 0)}",
        f"- Edit: {verdict_counts.get('edit', 0)}",
        f"- Reject: {verdict_counts.get('reject', 0)}",
        "",
        "---",
        "",
    ]

    for i, r in enumerate(rows, 1):
        pf_icon = "PASS" if r.postflight_ok else "FAIL"
        reasons_str = ""
        if r.postflight_reasons:
            try:
                reasons = json.loads(r.postflight_reasons)
                if reasons:
                    reasons_str = f" ({'; '.join(reasons)})"
            except Exception:
                pass

        verdict_icon = {"send": "Send", "edit": "Edit", "reject": "Reject"}.get(r.verdict, r.verdict)
        created = r.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if r.created_at else "unknown"

        lines += [
            f"## Verdict {i} — {r.layer} / Touch {r.touch_index + 1} ({r.channel.upper()})",
            f"",
            f"**Lead:** {r.lead_ref} ({r.lead_kind})",
            f"**Content type:** {r.content_type or 'N/A'}",
            f"**Reviewer:** {r.reviewer}",
            f"**Verdict:** {verdict_icon}",
            f"**Postflight:** {pf_icon}{reasons_str}",
            f"**Decision time:** {r.decision_ms}ms" if r.decision_ms else "**Decision time:** N/A",
            f"**Recorded:** {created}",
            f"",
        ]

        if r.draft_subject:
            lines.append(f"**Subject:** {r.draft_subject}")
            lines.append("")

        lines += ["**Draft body:**", "", "```", r.draft_body, "```", ""]

        if r.edited_body:
            lines += ["**Edited to:**", "", "```", r.edited_body, "```", ""]

        if r.notes:
            lines += [f"**Notes:** {r.notes}", ""]

        lines += ["---", ""]

    filename = f"testbench_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
    return Response(
        "\n".join(lines),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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

