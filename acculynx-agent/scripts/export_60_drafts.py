"""Offline draft review export — 60+ AI-drafted messages for CEO sign-off.

Builds a matrix of (layer x touch x archetype) draft calls, writes a single
markdown file to exports/60_draft_review.md for offline review before the demo.

NO messages are sent. dry_run=True is enforced before any API call.

Usage:
    cd /Users/colinryan/MDR/acculynx-agent
    python -m scripts.export_60_drafts
"""

from __future__ import annotations

import asyncio
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# ── Path bootstrap ────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.cadence import LAYER_MAP
from config.settings import settings

# Safety: enforce dry_run regardless of .env value
settings.dry_run = True

from ai.drafter import draft_message  # noqa: E402  (imported after path fix)


# ── Lead archetypes ───────────────────────────────────────────────────────────
# 8 fake profiles; culturally diverse; Virginia service area; no real MDR data.

ARCHETYPES = [
    {
        "contact_name": "James Hicks",
        "contact_phone": "555-301-4412",
        "contact_email": "james.hicks@example.com",
        "address": "142 Maple Ave, Christiansburg, VA 24073",
        "work_type": "Roof Replacement",
        "lead_source": "Google",
        "agent_context": "wants Barkwood shingle samples, asked about GAF warranty",
        "estimate_total": 15000,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Maria Santos",
        "contact_phone": "555-214-9877",
        "contact_email": "m.santos@example.com",
        "address": "88 Ridgeview Dr, Blacksburg, VA 24060",
        "work_type": "Storm Damage",
        "lead_source": "Referral",
        "agent_context": "spouse out of town until Friday, call after 5pm",
        "estimate_total": 22500,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "DeShawn Williams",
        "contact_phone": "555-488-6230",
        "contact_email": "deshawn.w@example.com",
        "address": "317 Jefferson St, Roanoke, VA 24016",
        "work_type": "Insurance Claim",
        "lead_source": "Door Knock",
        "agent_context": "had insurance claim in 2023, knows the drill, prefers text",
        "estimate_total": 19800,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Linda Nguyen",
        "contact_phone": "555-762-0034",
        "contact_email": "linda.nguyen@example.com",
        "address": "45 Peach Tree Ln, Salem, VA 24153",
        "work_type": "Roof Repair",
        "lead_source": "Google",
        "agent_context": "",
        "estimate_total": 8400,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Robert Kowalski",
        "contact_phone": "555-553-8821",
        "contact_email": "rkowalski@example.com",
        "address": "210 Sunset Blvd, Cave Spring, VA 24018",
        "work_type": "Roof Replacement",
        "lead_source": "Facebook",
        "agent_context": "comparing three bids, price sensitive, likes Platinum Pledge warranty",
        "estimate_total": 27000,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Aisha Patel",
        "contact_phone": "555-630-1145",
        "contact_email": "aisha.patel@example.com",
        "address": "502 College Ave, Radford, VA 24141",
        "work_type": "Roof Replacement",
        "lead_source": "Referral",
        "agent_context": "",
        "estimate_total": 34500,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Carlos Mendez",
        "contact_phone": "555-190-7753",
        "contact_email": "carlos.m@example.com",
        "address": "78 Hillcrest Rd, Pulaski, VA 24301",
        "work_type": "Storm Damage",
        "lead_source": "Google",
        "agent_context": "needs install done before son's graduation party in June",
        "estimate_total": 11200,
        "assigned_rep_id": None,
    },
    {
        "contact_name": "Tamika Robinson",
        "contact_phone": "555-874-3369",
        "contact_email": "tamika.r@example.com",
        "address": "163 Oak Hollow Dr, Lynchburg, VA 24501",
        "work_type": "Roof Replacement",
        "lead_source": "Door Knock",
        "agent_context": "landlord with two rental properties, mentioned second property might need work",
        "estimate_total": 18700,
        "assigned_rep_id": None,
    },
]

# ── Layer/touch matrix ────────────────────────────────────────────────────────
# Include all layers that have at least one touch. We use 3 archetypes per slot
# to land near 69 total drafts (23 touch slots x 3 = 69).
# LAYER_MAP order determines output order.

ACTIVE_LAYERS = {
    name: layer
    for name, layer in LAYER_MAP.items()
    if layer.touches
}

# Archetype rotation: 3 per touch slot (indices 0, 1, 2 cycling)
ARCHETYPES_PER_TOUCH = 3

# Milestone map for layer -> plausible AccuLynx milestone used in draft prompt
LAYER_TO_MILESTONE: dict[str, str] = {
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

# Realistic days_since_layer_start per touch_index for each layer
# (used to make the lead context plausible)
LAYER_DAY_HINTS: dict[str, list[int]] = {
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


def _build_lead_context(
    archetype: dict,
    layer_name: str,
    touch_index: int,
    touch: object,
) -> tuple[dict, dict]:
    """Return (lead_context, touch_info) shaped to match find_leads_needing_followup."""
    from config.cadence import LAYER_MAP

    layer = LAYER_MAP[layer_name]
    day_hints = LAYER_DAY_HINTS.get(layer_name, [touch.day_offset])
    days = day_hints[touch_index] if touch_index < len(day_hints) else touch.day_offset

    lead_context = {
        # Identity
        "lead_id": None,           # no real lead
        "job_number": f"FAKE-{layer_name[:3]}-{touch_index}-{archetype['contact_name'].split()[0].upper()}",
        "contact_name": archetype["contact_name"],
        "contact_phone": archetype["contact_phone"],
        "contact_email": archetype["contact_email"],
        "address": archetype["address"],
        # Work info
        "work_type": archetype["work_type"],
        "lead_source": archetype["lead_source"],
        "estimate_total": archetype.get("estimate_total"),
        # Layer / milestone
        "milestone": LAYER_TO_MILESTONE.get(layer_name, "Prospect"),
        "layer_name": layer_name,
        "layer_goal": layer.goal,
        "layer_tone": layer.tone,
        # Timing
        "days_since_layer_start": days,
        "total_attempts": touch_index,
        # Rep
        "assigned_rep_id": archetype.get("assigned_rep_id"),
        # Context
        "agent_context": archetype.get("agent_context", ""),
        "sms_opt_out": False,
        "twilio_stop": False,
        "touch_index": touch_index,
    }

    touch_info = {
        "day_offset": touch.day_offset,
        "channel": touch.channel,
        "content_type": touch.content_type,
        "autonomous_ok": touch.autonomous_ok,
        "touch_index": touch_index,
    }

    return lead_context, touch_info


def _postflight_icon(ok: bool, reasons: list[str]) -> str:
    if ok:
        return "passed"
    return f"failed: {'; '.join(reasons)}"


async def generate_all_drafts() -> list[dict]:
    """Run all (layer, touch, archetype) draft calls sequentially in batches of 5."""
    jobs: list[tuple[str, int, object, dict]] = []

    for layer_name, layer in ACTIVE_LAYERS.items():
        for touch_index, touch in enumerate(layer.touches):
            for arch_idx in range(ARCHETYPES_PER_TOUCH):
                archetype = ARCHETYPES[arch_idx % len(ARCHETYPES)]
                jobs.append((layer_name, touch_index, touch, archetype))

    total = len(jobs)
    print(f"Generating {total} drafts across {len(ACTIVE_LAYERS)} layers...")

    results = []
    batch_size = 5

    for batch_start in range(0, total, batch_size):
        batch = jobs[batch_start: batch_start + batch_size]
        batch_num = batch_start // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} calls)...")

        async def run_one(job):
            layer_name, touch_index, touch, archetype = job
            lead_context, touch_info = _build_lead_context(
                archetype, layer_name, touch_index, touch
            )
            milestone = lead_context["milestone"]
            try:
                result = await draft_message(lead_context, touch_info, milestone)
                return {
                    "layer_name": layer_name,
                    "touch_index": touch_index,
                    "touch": touch,
                    "archetype": archetype,
                    "lead_context": lead_context,
                    "draft": result,
                    "error": None,
                }
            except Exception as exc:
                return {
                    "layer_name": layer_name,
                    "touch_index": touch_index,
                    "touch": touch,
                    "archetype": archetype,
                    "lead_context": lead_context,
                    "draft": None,
                    "error": str(exc),
                }

        batch_results = await asyncio.gather(*[run_one(j) for j in batch])
        results.extend(batch_results)

        # Brief pause between batches to stay within Anthropic rate limits
        if batch_start + batch_size < total:
            await asyncio.sleep(1)

    return results


def _estimate_amount_label(amount) -> str:
    if not amount:
        return "no estimate"
    return f"${amount:,} estimate"


def build_markdown(results: list[dict]) -> tuple[str, dict]:
    """Build the review markdown and return (markdown_text, stats_dict)."""
    ts = datetime.now(tz=timezone.utc).isoformat(timespec="seconds")

    n_total = len(results)
    n_passed = sum(
        1 for r in results
        if r["draft"] and r["draft"].get("postflight_ok")
    )
    n_failed = n_total - n_passed
    pct = round(100 * n_passed / n_total) if n_total else 0
    n_regen = sum(
        r["draft"].get("regenerations", 0)
        for r in results if r["draft"]
    )
    n_escalations = sum(
        1 for r in results
        if r["draft"] and r["draft"].get("escalation")
    )
    avg_regen = round(n_regen / n_total, 2) if n_total else 0

    # Top rejection reasons
    reason_counter: Counter = Counter()
    for r in results:
        if r["draft"] and not r["draft"].get("postflight_ok"):
            for reason in (r["draft"].get("postflight_reasons") or []):
                reason_counter[reason] += 1

    lines = []
    lines.append("# MDR AI Sales Agent — 60 Draft Review\n")
    lines.append(f"Generated: {ts}")
    lines.append(f"Model: {settings.claude_model}")
    lines.append("Mode: dry-run (no leads were contacted)\n")
    lines.append("## Summary\n")
    lines.append(f"- Total drafts: {n_total}")
    lines.append(f"- Postflight passed: {n_passed} ({pct}%)")
    lines.append(f"- Regenerations needed: {n_regen}")
    lines.append(f"- Escalations: {n_escalations}")
    if reason_counter:
        lines.append("\n**Top rejection reasons:**")
        for reason, count in reason_counter.most_common(5):
            lines.append(f"- {reason}: {count}x")
    lines.append("")
    lines.append("## How to use this document")
    lines.append(
        "For each draft below, mark either "
        "✅ (good — would send), "
        "✏️ (would edit — note what), "
        "or ❌ (do not send — note why).\n"
    )
    lines.append("---\n")

    # Group by layer + touch for clean section headers
    # Group results in order
    from itertools import groupby

    def group_key(r):
        return (r["layer_name"], r["touch_index"])

    group_order = []
    seen_groups = set()
    for r in results:
        k = group_key(r)
        if k not in seen_groups:
            seen_groups.add(k)
            group_order.append(k)

    grouped: dict[tuple, list] = {}
    for r in results:
        k = group_key(r)
        grouped.setdefault(k, []).append(r)

    draft_counter = 0
    for (layer_name, touch_index) in group_order:
        group = grouped[(layer_name, touch_index)]
        # Section header
        touch_obj = group[0]["touch"]
        layer = ACTIVE_LAYERS[layer_name]
        day = touch_obj.day_offset
        channel = touch_obj.channel.capitalize()
        touch_label = f"Touch {touch_index + 1} (Day {day}, {channel})"
        lines.append(f"## {layer_name} — {touch_label}\n")
        lines.append(f"**Layer goal:** {layer.goal}")
        lines.append(f"**Content type:** `{touch_obj.content_type}`\n")

        for r in group:
            draft_counter += 1
            arch = r["archetype"]
            lead_ctx = r["lead_context"]
            draft = r["draft"]
            error = r["error"]

            name = arch["contact_name"]
            city = arch["address"].split(",")[1].strip() if "," in arch["address"] else "VA"
            est_label = _estimate_amount_label(arch.get("estimate_total"))
            agent_ctx_display = arch.get("agent_context") or "(none)"

            lines.append(f"### Draft {draft_counter} — {name} ({city}, {est_label})\n")
            lines.append(f"**Channel:** {touch_obj.channel}")

            if error:
                lines.append(f"**Error:** {error}")
                lines.append("")
                lines.append("**Verdict (fill in):** [ ] ✅ Send  [ ] ✏️ Edit  [ ] ❌ Reject")
                lines.append("**Notes:**\n")
                lines.append("---\n")
                continue

            if draft:
                pf_label = _postflight_icon(
                    draft.get("postflight_ok", False),
                    draft.get("postflight_reasons", []),
                )
                lines.append(f"**Postflight:** {'✅' if draft.get('postflight_ok') else '❌'} {pf_label}")
                lines.append(f"**Regenerations:** {draft.get('regenerations', 0)}")
                lines.append(
                    f"**Lead context summary:** {arch['work_type']}, "
                    f"{arch['lead_source']} lead, "
                    f"agent_context: \"{agent_ctx_display}\""
                )

                if draft.get("escalation"):
                    lines.append(f"\n**ESCALATION:** {draft['escalation']}")
                else:
                    if draft.get("subject"):
                        lines.append(f"\n**Subject:** {draft['subject']}")
                    body = draft.get("body") or "(empty body)"
                    lines.append("\n```")
                    lines.append(body)
                    lines.append("```")
            else:
                lines.append("**Error:** no draft returned")

            lines.append("")
            lines.append("**Verdict (fill in):** [ ] ✅ Send  [ ] ✏️ Edit  [ ] ❌ Reject")
            lines.append("**Notes:**\n")
            lines.append("---\n")

    stats = {
        "n_total": n_total,
        "n_passed": n_passed,
        "n_failed": n_failed,
        "pct": pct,
        "n_regen": n_regen,
        "avg_regen": avg_regen,
        "n_escalations": n_escalations,
        "top_reasons": reason_counter.most_common(3),
    }

    return "\n".join(lines), stats


async def main():
    # Safety: triple-check dry_run
    assert settings.dry_run, "dry_run must be True — refusing to run without it"

    if not settings.anthropic_api_key:
        print("ERROR: ANTHROPIC_API_KEY not set in .env — cannot draft messages")
        sys.exit(1)

    print("=" * 60)
    print("MDR AI Sales Agent — 60 Draft Export")
    print("dry_run=True | no messages will be sent")
    print("=" * 60)
    print()

    # Show layer x touch matrix
    print("Layer x touch matrix:")
    for layer_name, layer in ACTIVE_LAYERS.items():
        n_touches = len(layer.touches)
        print(f"  {layer_name}: {n_touches} touch(es)")
    total_touches = sum(len(l.touches) for l in ACTIVE_LAYERS.values())
    total_drafts = total_touches * ARCHETYPES_PER_TOUCH
    print(f"\n  Total: {total_touches} touch slots x {ARCHETYPES_PER_TOUCH} archetypes = {total_drafts} drafts")
    print()

    results = await generate_all_drafts()

    print(f"\nBuilding markdown ({len(results)} results)...")
    md_text, stats = build_markdown(results)

    # Write output
    out_dir = Path(__file__).resolve().parent.parent / "exports"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "60_draft_review.md"
    out_path.write_text(md_text, encoding="utf-8")

    # Print summary
    print()
    print("=" * 60)
    print("EXPORT COMPLETE")
    print("=" * 60)
    print(f"Total drafts:           {stats['n_total']}")
    print(f"Postflight passed:      {stats['n_passed']} ({stats['pct']}%)")
    print(f"Postflight failed:      {stats['n_failed']}")
    print(f"Regenerations total:    {stats['n_regen']}")
    print(f"Avg regenerations/draft:{stats['avg_regen']}")
    print(f"Escalations:            {stats['n_escalations']}")
    if stats["top_reasons"]:
        print("\nTop rejection reasons:")
        for reason, count in stats["top_reasons"]:
            print(f"  {count}x  {reason}")
    print()
    print(f"Output: {out_path}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
