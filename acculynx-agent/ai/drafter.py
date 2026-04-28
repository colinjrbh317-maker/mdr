"""Claude Message Drafter — turns a lead + a touch into a sendable message.

Phase C upgrades over the original:
  • System prompt explicitly forbids em-dashes and en-dashes
  • Live business facts (review count, referral $, install windows) are
    injected from config/stats.yaml instead of hardcoded in templates
  • Solo-sender mode forces the rep to be Colin so prompts and signatures match
  • Subject parser handles "Subject:", "**Subject:**", missing blank line, etc.
  • Postflight regex gate rejects drafts containing dashes / leaked brackets /
    fallback-rep grammar / subject leak — the drafter retries up to 2x
  • SOP 04 has been dropped from the prompt, templates_final.md is the single
    source of truth for per-touch copy
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from anthropic import Anthropic

from ai.sop_loader import load_real_message_samples, load_sops_for_layer
from config.reps import resolve_rep
from config.settings import settings
from config.stats import stats_block_for_prompt
from engine.postflight import check_draft

log = logging.getLogger(__name__)

client = Anthropic(api_key=settings.anthropic_api_key)

MAX_REGENERATIONS = 2


SYSTEM_PROMPT = """You are the AI sales assistant for Modern Day Roofing (MDR), a roofing contractor in Christiansburg, Virginia. You draft follow-up messages to homeowners on behalf of the sales team.

CRITICAL RULES:
1. Follow the SOP rules provided EXACTLY. They define your tone, timing, and boundaries.
2. Write in MDR's voice: professional, warm, direct, transparent. Never pushy or aggressive.
3. Always include the rep's name and the rep's phone number where it makes sense. Use the values supplied in the LEAD CONTEXT block, never invent or copy from the SOP samples.
4. For TEXT messages: keep under 300 characters. Friendly, short, clear.
5. For EMAIL messages: include a Subject line on the very first line in the format "Subject: <subject>", then a single blank line, then the body. Include a branded signature at the end. Keep emails under 4000 characters total.
6. NEVER use emojis. NEVER use ALL CAPS. NEVER discuss specific pricing without approval.
7. NEVER use em-dashes (—) or en-dashes (–) anywhere in the subject or body. Use periods, commas, semicolons, or parentheses instead. This rule is absolute. Drafts containing dashes will be rejected and regenerated.
8. NEVER leave bracket placeholders like [Name], [Position], [Coordinator], [current season], [Google Review Link], [rep]@moderndayroof.com in the output. Substitute every placeholder using the LEAD CONTEXT, REP, or BUSINESS FACTS blocks. If a value is missing, omit that line gracefully rather than emitting the bracket.
9. If the lead's context suggests anger, complaints, or disputes, DO NOT draft a message. Instead respond with exactly: "ESCALATION_REQUIRED: <reason>".
10. Personalize using the lead's specific situation (service type, address city, days in cadence, last interaction). Do NOT mention details that are not in the LEAD CONTEXT block.
11. Sound like a real person. Match the voice of the real message examples for cadence and tone, but rewrite, do not copy.

Return ONLY the message text. No preamble, no explanation, no quotes around it. Just the message exactly as it should be sent."""


def _build_user_prompt(
    *,
    lead_context: dict,
    touch_info: dict,
    milestone: str,
    layer_name: str,
    layer_goal: str,
    layer_tone: str,
    rep_name: str,
    rep_first_name: str,
    rep_email: str,
    rep_title: str,
    rep_phone: str,
    sop_text: str,
    samples: str,
    template: str,
    stats: str,
) -> str:
    channel = touch_info["channel"]
    content_type = touch_info["content_type"]

    # Address fragment for personalization (city only is safer than full street)
    address = (lead_context.get("address") or "").strip()
    city = ""
    if address:
        # Pull city out of "Street, City, State Zip"
        parts = [p.strip() for p in address.split(",")]
        if len(parts) >= 2:
            city = parts[1]

    return f"""Draft a {channel.upper()} message for this lead.

--- PIPELINE LAYER ---
Layer: {layer_name}
Layer Goal: {layer_goal}
Layer Tone: {layer_tone}

--- LEAD CONTEXT ---
Name: {lead_context.get('contact_name', 'Homeowner')}
Phone: {lead_context.get('contact_phone', 'N/A')}
Email: {lead_context.get('contact_email', 'N/A')}
City: {city or 'N/A'}
Full Address: {address or 'N/A'}
Current Milestone: {milestone}
Service Type: {lead_context.get('work_type', 'roofing')}
Lead Source: {lead_context.get('lead_source', 'Unknown')}
Days In Current Layer: {lead_context.get('days_since_layer_start', lead_context.get('days_since_cadence_start', 'Unknown'))}
Total Contact Attempts So Far: {lead_context.get('total_attempts', 0)}

--- REP (use these names + numbers verbatim, do not invent or copy from SOP samples) ---
Name: {rep_name}
First name only (use in signature line "Hey, this is {rep_first_name}..."): {rep_first_name}
Title: {rep_title or '(omit if blank)'}
Email: {rep_email}
Phone for signature: {rep_phone}

--- MESSAGE TYPE ---
Channel: {channel}
Content Type: {content_type}
Touch Number: {touch_info.get('touch_index', 0) + 1}
Day Offset: {touch_info.get('day_offset', 0)} days since estimate/milestone change

--- {stats} ---

--- SOP RULES (FOLLOW THESE) ---
{sop_text}

--- REAL MESSAGE EXAMPLES (match this voice, do NOT copy text verbatim, especially names or phone numbers) ---
{samples}

--- APPROVED TEMPLATE FOR THIS LAYER + TOUCH (starting point, personalize) ---
{template}

Now draft the {channel} message. Use the approved template above as a starting point, personalize it for this specific lead. Substitute every bracketed placeholder using the LEAD CONTEXT, REP, and BUSINESS FACTS blocks above, and remove any line that you cannot fill in cleanly.

- TEXT: under 300 characters, casual-professional, end with rep first name and "Modern Day Roofing".
- EMAIL: first line "Subject: <subject>", then a blank line, then body. End with a branded signature using the REP block. No em-dashes or en-dashes anywhere.
"""


def _parse_subject(channel: str, raw_body: str) -> tuple[Optional[str], str]:
    """Robust subject parser. Handles 'Subject:', '**Subject:**',
    missing blank line, leading whitespace, trailing punctuation.
    Returns (subject, body) — subject is None for non-email channels.
    """
    if channel != "email":
        return None, raw_body

    pattern = re.compile(r"^\s*\**\s*[Ss]ubject\s*:\s*(?P<subject>.+?)\s*\**\s*$", re.MULTILINE)
    match = pattern.search(raw_body)
    if not match:
        return None, raw_body.strip()

    subject = match.group("subject").strip().rstrip("*").strip()
    # Remove the matched subject line from the body, plus any single blank line that follows
    start, end = match.start(), match.end()
    body = raw_body[:start] + raw_body[end:]
    body = re.sub(r"^\s*\n", "", body, count=1)
    return subject, body.strip()


def _load_template_for_touch(layer_name: str, touch_index: int, channel: str) -> str:
    """Pull the per-touch section out of templates_final.md.

    Templates_final.md uses headers like "### Touch 1, Text, Day 0" after
    the em-dash strip pass. Match that pattern.
    """
    templates_path = Path(settings.sops_directory) / "templates_final.md"
    if not templates_path.exists():
        return f"(No template file at {templates_path}, draft freely following the SOP rules above)"

    content = templates_path.read_text(encoding="utf-8")
    touch_num = touch_index + 1
    channel_label = channel.capitalize()

    candidates = [
        f"Touch {touch_num}, {channel_label}",
        f"Touch {touch_num} {channel_label}",
    ]
    for needle in candidates:
        if needle in content:
            idx = content.index(needle)
            header_start = content.rfind("###", 0, idx)
            next_section = content.find("\n###", idx + 10)
            next_layer = content.find("\n##", idx + 10)
            end = min(
                next_section if next_section != -1 else len(content),
                next_layer if next_layer != -1 else len(content),
            )
            return content[header_start if header_start != -1 else idx:end].strip()

    return (
        f"(No specific template found for {layer_name} Touch {touch_num} "
        f"{channel}, draft freely following the layer tone: {layer_name})"
    )


async def draft_message(
    lead_context: dict,
    touch_info: dict,
    milestone: str,
) -> dict:
    """Draft a follow-up message and run postflight checks. Regenerates on failure.

    Returns:
        {
            "channel": str,
            "body": str | None,
            "subject": str | None,    (email only)
            "escalation": str | None, (set when ESCALATION_REQUIRED)
            "rep": Rep,
            "postflight_ok": bool,
            "postflight_reasons": list[str],
            "regenerations": int,
        }
    """
    layer_name = lead_context.get("layer_name") or milestone
    sop_text = load_sops_for_layer(layer_name)
    samples = load_real_message_samples(max_chars=6000)
    template = _load_template_for_touch(layer_name, touch_info.get("touch_index", 0), touch_info["channel"])
    stats_block = stats_block_for_prompt() or "BUSINESS FACTS (none configured)"

    # Resolve rep. Solo-sender mode forces the wildcard rep regardless of input.
    rep = resolve_rep(lead_context.get("assigned_rep_id"))

    # If the rep ended up empty/blank, fail loud, do NOT ship "the Modern Day Roofing team".
    if not rep.first_name and not rep.name:
        return {
            "channel": touch_info["channel"],
            "body": None,
            "subject": None,
            "escalation": "MISSING_REP: cannot draft without an assigned rep",
            "rep": rep,
            "postflight_ok": False,
            "postflight_reasons": ["no rep resolved"],
            "regenerations": 0,
        }

    layer_goal = lead_context.get("layer_goal")
    layer_tone = lead_context.get("layer_tone")
    if not layer_goal or not layer_tone:
        from config.cadence import LAYER_MAP
        layer = LAYER_MAP.get(layer_name)
        layer_goal = layer_goal or (layer.goal if layer else "Follow up with the lead")
        layer_tone = layer_tone or (layer.tone if layer else "Professional and helpful")

    user_prompt = _build_user_prompt(
        lead_context=lead_context, touch_info=touch_info, milestone=milestone,
        layer_name=layer_name, layer_goal=layer_goal, layer_tone=layer_tone,
        rep_name=rep.name, rep_first_name=rep.first_name, rep_email=rep.email,
        rep_title=rep.title, rep_phone=rep.signature_phone,
        sop_text=sop_text, samples=samples, template=template, stats=stats_block,
    )

    # Generation loop with postflight regeneration
    last_subject: Optional[str] = None
    last_body = ""
    last_reasons: list[str] = []
    feedback_addendum = ""
    for attempt in range(MAX_REGENERATIONS + 1):
        prompt_to_use = user_prompt + (f"\n\nPRIOR ATTEMPT REJECTED FOR: {feedback_addendum}\nFix every issue and try again." if feedback_addendum else "")
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt_to_use}],
        )
        raw = response.content[0].text.strip()

        if raw.startswith("ESCALATION_REQUIRED:"):
            return {
                "channel": touch_info["channel"],
                "body": None,
                "subject": None,
                "escalation": raw,
                "rep": rep,
                "postflight_ok": False,
                "postflight_reasons": ["escalation requested"],
                "regenerations": attempt,
            }

        subject, body = _parse_subject(touch_info["channel"], raw)
        check = check_draft(channel=touch_info["channel"], subject=subject, body=body)
        last_subject, last_body, last_reasons = subject, body, check.reasons

        if check.ok:
            return {
                "channel": touch_info["channel"],
                "body": body,
                "subject": subject,
                "escalation": None,
                "rep": rep,
                "postflight_ok": True,
                "postflight_reasons": [],
                "regenerations": attempt,
            }

        feedback_addendum = "; ".join(check.reasons)
        log.info("Postflight rejected attempt %d/%d: %s", attempt + 1, MAX_REGENERATIONS + 1, feedback_addendum)

    # All retries exhausted, return last attempt with the failure reasons
    return {
        "channel": touch_info["channel"],
        "body": last_body,
        "subject": last_subject,
        "escalation": None,
        "rep": rep,
        "postflight_ok": False,
        "postflight_reasons": last_reasons,
        "regenerations": MAX_REGENERATIONS,
    }
