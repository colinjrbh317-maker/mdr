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
from engine.financing import resolve_financing_phrase
from engine.postflight import check_draft

log = logging.getLogger(__name__)

client = Anthropic(api_key=settings.anthropic_api_key)

MAX_REGENERATIONS = 2


SYSTEM_PROMPT = """You are drafting a follow-up message that the assigned Modern Day Roofing (MDR) sales rep will send to a homeowner. You are NOT writing "on behalf of" the rep — you ARE the rep, in their voice. MDR is a roofing contractor in Christiansburg, Virginia.

CRITICAL RULES:

1. VOICE. Write in the FIRST PERSON as the assigned rep ("I sent over the estimate", "I wanted to check in"). Never refer to the rep in the third person. Never use phrases like "on behalf of", "your account manager", "the agent", or "the team here". The rep's name is in the REP block — use it as the speaker.

2. LENGTH (hard targets, count words):
   - TEXT messages: 30–80 words. One ask. End with rep first name + Modern Day Roofing + phone.
   - EMAIL messages (Touch 3 / value-add): 110–180 words BODY ONLY (subject does not count, signature does not count). One ask.
   - Other emails: 80–140 words BODY ONLY.
   Drafts that are too long will be rejected and regenerated.

3. ASTERISKS ARE FORBIDDEN. Zero `*` or `**` characters anywhere in subject or body. No markdown bold, no markdown italic, no asterisk emphasis. Plain prose only. Use periods, capitalized words, or short headers on their own line ("Financing." "Warranty.") — never `**Financing:**`. Drafts containing any asterisk will be rejected.

4. NO DASHES. Never use em-dashes (—) or en-dashes (–). Use periods, commas, semicolons, or parentheses instead.

4a. BANNED PHRASES (v4 voice). NEVER use any of these — they read as automated and lazy:
   - "follow up" / "following up" / "followup"
   - "checking in" / "check in" (as a CTA framing)
   - "just wanted to" / "just wanted to make sure" / "just wanted to check"
   - "circle back" / "circling back"
   - "hopefully"
   These are auto-rejected by postflight. Open with the homeowner's situation instead. Examples of CORRECT openers: "Wanted to make sure the estimate came through okay", "These numbers can bring up questions", "A number like that catches people off guard". Lead with what's on THEIR plate, not a generic touchpoint phrase.

4b. HOMEOWNER-FIRST VOICE (v4). Open with the homeowner's situation, not MDR's credentials. Every message names ONE specific thing MDR takes off their plate (handles permits, delivers materials day before, hauls debris, runs financing numbers, etc.). Don't brag about MDR. Sound like a contractor who already did good work and is making sure the customer has what they need.

5. SIGNATURE BLOCKS:
   - For TEXT (and TEXT-style content_types like check_in_questions_about_estimate, checking_in_on_proposal, no_pressure_still_here): tight close on its own line:
       {rep_first}
       Modern Day Roofing
       {rep_phone}
   - For full-length EMAIL (Touch 3 value-add, etc.): full block:
       Best regards,
       {rep_full_name}
       {rep_title}
       Modern Day Roofing
       {rep_phone}
       {rep_email}
       www.moderndayroof.com
   Use the rep values verbatim from the REP block. Never invent the title or phone. Omit the title line if blank.

6. ONE GOAL, ONE ASK. Every message has exactly one purpose and one call to action. Do not stack CTAs. Do not pivot mid-message. The TOUCH GOAL line in the prompt tells you the goal — execute on it.

7. PERSONALIZATION. Reference ONE concrete detail from the rep's most recent CRM activity (rep notes / last email / agent context), e.g. "the metal vs. shingle options we walked through", "the Platinum Pledge we talked about". Do not invent details. If no concrete detail is available, keep the message generic but human.

7a. REFERENCE THE LAST POINT OF CONTACT WITH SPECIFIC TIMING. Every draft MUST anchor to the most recent rep-to-homeowner touchpoint and name when it happened, using language like "after we sent the gold and silver options a couple weeks back", "since Paul left you a voicemail Tuesday", "from our walk-through last Thursday". Read the AGENT CONTEXT block — it contains dated rep notes and the body of recent rep emails/texts/comments pulled directly from AccuLynx. Pick the most recent meaningful event and name its approximate timing. If no timing data exists in context, OMIT the timing reference rather than inventing one ("when we last connected" is acceptable as a last resort). Drafts that fail to anchor to a real recent touchpoint when one is available will be rejected by postflight.

7b. MDR ACRONYM GLOSSARY (for INTERPRETING the AGENT CONTEXT — never expose these acronyms to the homeowner). When the rep's notes use one of these shorthand tokens, translate it into plain prose in the homeowner-facing message:
   - VM = voicemail (e.g. note "Left VM 5/12" → message "after my voicemail Monday")
   - HO = homeowner (e.g. "HO wants FR" → "you mentioned wanting a full replacement")
   - FR = full replacement
   - RR = roof repair / repair only
   - EST = estimate / proposal
   - PP = Platinum Pledge (GAF warranty)
   - GAF = GAF (the shingle manufacturer — keep the brand name)
   - LSA = local services ads (internal only, never mention)
   - ALC = Acculynx (internal only, never mention)
   Treat any unknown abbreviation as if it were typed in full — pull intent from context, do not echo the acronym back.

8. NO PLACEHOLDERS. Never leave brackets like [Name], [Position], [Coordinator], [current season], [Google Review Link], [rep]@moderndayroof.com in the output. Substitute every placeholder using the LEAD CONTEXT, REP, or BUSINESS FACTS blocks. If a value is missing, omit that line gracefully rather than emitting the bracket.

9. NO emojis. NO ALL CAPS. No specific dollar pricing without approval. Never write the homeowner's full address.

10. ESCALATION. If the lead context suggests anger, complaints, disputes, or that the deal is dead/lost, DO NOT draft a message. Respond with exactly: "ESCALATION_REQUIRED: <reason>".

11. EMAIL FORMAT. First line "Subject: <subject>", then a blank line, then the body, ending with the signature. Keep emails under 4000 characters total.

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
    financing_phrase: Optional[str] = None,
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

    # Agent context — rep-supplied notes from AccuLynx custom field "Agent Context".
    # Webhook keeps this fresh in real time. Drafter must respect what the rep wrote
    # and adapt the message to it (e.g., if rep says "spouse out of town until 5/12",
    # the message should reference that gracefully).
    agent_context_block = ""
    rep_notes = (lead_context.get("agent_context") or "").strip()
    if rep_notes:
        agent_context_block = (
            "\n--- REP CONTEXT (latest situation, written by the assigned rep — "
            "TREAT AS AUTHORITATIVE, ADAPT THE MESSAGE TO THIS) ---\n"
            f"{rep_notes}\n"
        )

    # Length & signature directives by content_type — the "tight text-style"
    # touches are SMS-replacements that ride email until SMS A2P approval lands.
    tight_text_types = {
        "check_in_questions_about_estimate",
        "checking_in_on_proposal",
        "no_pressure_still_here",
        "staying_in_touch",
        "reengagement_things_change",
        "last_check_in_closing_file",
    }
    is_tight = content_type in tight_text_types or channel == "text"

    if is_tight:
        length_directive = (
            "TARGET LENGTH: 30 to 80 words. ONE ask. Read it out loud, "
            "if it takes more than 25 seconds, cut it."
        )
        # SMS (text channel) gets a single first name only, no phone, no company,
        # because the homeowner already sees the rep's per-rep Twilio number and
        # the opener identifies the company ("Hey Natalie, it's Chris from MDR...").
        # Tight email-as-SMS replacements keep the 3-line block.
        if channel == "text":
            signature_directive = f"""SIGNATURE (SMS, exactly one line):
{rep_first_name}"""
        else:
            signature_directive = f"""SIGNATURE (tight, on its own three lines, exactly this format, no asterisks):
{rep_first_name}
Modern Day Roofing
{rep_phone}"""
    elif content_type in {
        "value_add_financing_warranty",
        "drip_t2_complimentary_tuneup_offer",
        "drip_t3_referral_program_offer",
        "drip_t4_anniversary_bundle_offer",
    }:
        length_directive = (
            "TARGET LENGTH: 110 to 180 words for the BODY (subject does not count, "
            "signature does not count). Exactly one ask, matching the TOUCH GOAL above."
        )
        signature_directive = f"""SIGNATURE (full block, exactly this format, no asterisks, omit title line if blank):
Best regards,
{rep_name}
{rep_title or '(omit this line)'}
Modern Day Roofing
{rep_phone}
{rep_email}
www.moderndayroof.com"""
    else:
        length_directive = (
            "TARGET LENGTH: 80 to 140 words for the body. One ask only."
        )
        signature_directive = f"""SIGNATURE (full block, no asterisks):
Best regards,
{rep_name}
{rep_title or '(omit this line)'}
Modern Day Roofing
{rep_phone}
{rep_email}
www.moderndayroof.com"""

    # Per-touch goals — make each touch's goal explicit and singular so the
    # drafter cannot stack CTAs. ESTIMATE_FOLLOWUP and DRIP layers shipped
    # for the v1 client demo.
    per_touch_goals = {
        # ── ESTIMATE_FOLLOWUP ─────────────────────────────────────────────
        "check_in_questions_about_estimate":
            "Open the door for questions before the lead goes cold. ONE ask: 'any questions on the estimate?' Casual, low-pressure.",
        "checking_in_on_proposal":
            "Surface a reservation if there is one. ONE ask: 'is there anything you need from us to move forward?' If there is a concrete detail in CRM (financing, options, scope), reference it in one short clause.",
        "value_add_financing_warranty":
            "Reinforce three pieces of value: financing, warranty, scheduling — each as a one-line plain-prose section header (no asterisks, no bold). ONE ask: 'want me to lock in your install slot?' Do NOT mention referral programs, pricing, or anything else.",
        "no_pressure_still_here":
            "Last warm nudge before the lead goes cold. ONE ask: 'should I close this out on my end, or hold the spot a bit longer?' Acknowledge that either answer is fine.",
        # ── DRIP (post-close value ladder) ────────────────────────────────
        # Each rung escalates the offer. Do NOT introduce later rungs early.
        "drip_t1_soft_checkin_exterior_issues":
            "Day 30 post-install. NO offer yet. ONE ask: 'noticed any other exterior issues since the install?' Soft check-in only — gutters, flashing, soft spots, anything on their mind. Information-gathering. Do NOT mention free tune-ups, referrals, or discounts here — those come later.",
        "drip_t2_complimentary_tuneup_offer":
            "Day 90 post-install. SMALL FREE OFFER: complimentary exterior tune-up (roof walk, gutter check, flashing/vent inspection, basic clean-out if needed). ONE ask: 'want me to put you on the schedule for your free tune-up?' Frame as a thank-you, not a sales call. Do NOT mention referral money or the anniversary bundle yet.",
        "drip_t3_referral_program_offer":
            "Day 180 post-install. MID OFFER: $250 referral bounty (paid when the referred contract is signed). ONE ask: 'know anyone who needs a roof?' Be explicit about how the program works in 3 short steps. Do NOT pitch the tune-up or anniversary bundle here — keep it referral-focused.",
        "drip_t4_anniversary_bundle_offer":
            "Day 365 post-install. BIGGEST OFFER on the ladder: free one-year tune-up PLUS a 10% returning-homeowner discount on add-on services (gutter guards, siding repairs, skylights, attic insulation, exterior painting). ONE ask: 'want to schedule the tune-up and bundle anything onto it?' Frame it as a thank-you for one year of trust. This is the only touch that mentions add-on services.",
    }
    touch_goal_explicit = per_touch_goals.get(content_type, "")
    touch_goal_block = (
        f"\n--- TOUCH GOAL (execute exactly this) ---\n{touch_goal_explicit}\n"
        if touch_goal_explicit else ""
    )

    # Build the financing instruction block — injected after BUSINESS FACTS for ALL touches.
    # Claude applies it only when the template references monthly financing (Touch 3).
    if financing_phrase:
        financing_block = (
            f'--- FINANCING PHRASE TO USE ---\n'
            f'When this draft mentions monthly financing (Touch 3 / value-add), substitute the '
            f'placeholder `$[X]/month` with the EXACT string: "{financing_phrase}".\n'
            f'Use the phrasing verbatim. The leading "around" word is intentional — never substitute '
            f'an exact dollar amount.\n'
        )
    else:
        financing_block = (
            '--- FINANCING PHRASE NOT AVAILABLE ---\n'
            'No estimate amount available for this lead. If the touch references monthly financing, '
            'use vaguer language like "a manageable monthly payment through Hearth" instead of any '
            'specific dollar figure. Do NOT invent a monthly number.\n'
        )

    return f"""Draft a {channel.upper()} message for this lead.

--- PIPELINE LAYER ---
Layer: {layer_name}
Layer Goal: {layer_goal}
Layer Tone: {layer_tone}
{touch_goal_block}
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
{agent_context_block}

--- REP (THIS IS YOU — write in first person AS this person, never about them) ---
You ARE: {rep_name}
First name (signature + opener): {rep_first_name}
Title: {rep_title or '(omit if blank)'}
Email: {rep_email}
Phone: {rep_phone}

The opener should sound like THIS rep typed it from their phone. Examples of correct framing:
  "Hey {{name}}, it's {rep_first_name} with Modern Day Roofing — wanted to circle back on the estimate I sent over."
  "Hi {{name}} — {rep_first_name} here at Modern Day Roofing."
NEVER: "I'm writing on behalf of {rep_first_name}" or "your account manager" or "the team here". You ARE {rep_first_name}.

--- {length_directive} ---

--- {signature_directive} ---

--- MESSAGE TYPE ---
Channel: {channel}
Content Type: {content_type}
Touch Number: {touch_info.get('touch_index', 0) + 1}
Day Offset: {touch_info.get('day_offset', 0)} days since estimate/milestone change

--- {stats} ---

--- {financing_block}
--- SOP RULES (FOLLOW THESE) ---
{sop_text}

--- REAL MESSAGE EXAMPLES (match this voice, do NOT copy text verbatim, especially names or phone numbers) ---
{samples}

--- APPROVED TEMPLATE FOR THIS LAYER + TOUCH (starting point, personalize) ---
{template}

Now draft the {channel} message as {rep_first_name}. Personalize using ONE concrete detail from the lead context if available. Substitute every bracketed placeholder. ZERO asterisks. ZERO em-dashes. ONE ask. End with the signature block exactly as specified above.

- TEXT: 30 to 80 words, casual, ends with the tight 3-line signature block.
- EMAIL: first line "Subject: <subject>", blank line, body, signature block. No asterisks anywhere — not in subject, not in section headers, not in emphasis.
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
    """Pull the per-touch template.

    Order:
      1. config/copy.yaml overlay (saved from /review editor) — wins
      2. templates_final.md fallback (the canon shipped in the repo)

    Templates_final.md uses headers like "### Touch 1, Text, Day 0" after
    the em-dash strip pass.
    """
    # Overlay first — what Austin edits in /review wins
    overlay_path = Path(settings.project_root) / "config" / "copy.yaml"
    if overlay_path.exists():
        try:
            import yaml as _yaml
            overlay = _yaml.safe_load(overlay_path.read_text(encoding="utf-8")) or {}
            saved = (
                overlay.get("touches", {})
                .get(layer_name, {})
                .get(str(touch_index), {})
                .get(channel)
            )
            if saved and saved.strip():
                return saved
        except Exception:
            pass  # fall through to templates_final.md

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
    # 1500 chars is enough voice-prime; the full 6KB was prompt fat that
    # added ~1.5s to every Claude call without measurably improving voice
    # since the new SYSTEM_PROMPT and per-touch goals carry voice direction.
    samples = load_real_message_samples(max_chars=1500)
    template = _load_template_for_touch(layer_name, touch_info.get("touch_index", 0), touch_info["channel"])
    stats_block = stats_block_for_prompt() or "BUSINESS FACTS (none configured)"

    # Auto-extract context from AccuLynx (history + estimates + appointments).
    # The rep's manual "Agent Context" custom field, if present on the lead,
    # gets appended at the top by build_agent_context. Reps don't HAVE to
    # type into it — this is the fallback that just works.
    try:
        from engine.context_builder import build_agent_context
        auto_ctx = await build_agent_context(lead_context.get("lead_id") or "")
        if auto_ctx:
            # Replace whatever was passed in; the auto-extract is the canonical source
            lead_context = dict(lead_context)
            lead_context["agent_context"] = auto_ctx
    except Exception as exc:
        log.warning("auto context build failed: %s", exc)

    # ── Financing resolver ──
    # Fetch the estimate total from AccuLynx lazily so resolve_financing_phrase
    # has a numeric amount to work with. The lead_context dict from
    # find_leads_needing_followup() does not carry estimate fields, so we
    # pull them here. Failure is non-fatal: we fall through to the phrase=None
    # path which tells Claude to use vaguer language.
    financing_ctx = dict(lead_context)
    lead_id_for_est = lead_context.get("lead_id") or ""
    if lead_id_for_est and not any(
        lead_context.get(k) for k in ("estimate_total_cents", "estimate_total", "approved_estimate_amount")
    ):
        try:
            from acculynx.client import get_json as _acculynx_get_json
            ests_resp = await _acculynx_get_json(f"/jobs/{lead_id_for_est}/estimates")
            estimates = (ests_resp or {}).get("items", []) or []
            if estimates:
                primary = next((e for e in estimates if e.get("isPrimary")), estimates[0])
                detail = await _acculynx_get_json(f"/estimates/{primary['id']}")
                financials = (detail or {}).get("financials") or {}
                total = financials.get("total") or financials.get("contractAmount")
                if total is not None:
                    financing_ctx = dict(lead_context)
                    financing_ctx["estimate_total"] = float(total)
        except Exception as exc:
            log.debug("estimate fetch for financing resolver failed (non-fatal): %s", exc)
    financing_result = resolve_financing_phrase(financing_ctx)
    financing_phrase: Optional[str] = financing_result.get("phrase")
    if financing_phrase:
        log.debug("financing phrase resolved: %s (estimate=%.2f)", financing_phrase, financing_result.get("estimate_used", 0))
    else:
        log.debug("financing phrase unavailable: %s", financing_result.get("reason", "unknown"))

    # Resolve rep. Solo-sender mode forces the wildcard rep regardless of input.
    rep = resolve_rep(lead_context.get("assigned_rep_id"))

    # ── Thread-continuity rep override ──
    # The wildcard rep (Colin Ryan) is the SEND identity for the MVP, but the
    # message itself should be in the VOICE of the actual assigned rep on the
    # job (Aric / Sierra / Trey / Paul...). Pull the latest outbound rep email
    # from AccuLynx and override the prompt-side rep so the draft sounds like
    # that person typed it. Sender-side override happens later in approval_flow
    # and is gated by use_thread_continuity_send.
    if settings.use_thread_continuity_send:
        try:
            from acculynx.internal_api import get_thread_continuity_for_job
            thread = await get_thread_continuity_for_job(lead_context.get("lead_id") or "")
            if thread and thread.get("rep_name"):
                from dataclasses import replace as _replace
                thread_rep_name = thread["rep_name"].strip()
                thread_first = thread_rep_name.split()[0] if thread_rep_name else rep.first_name
                rep = _replace(
                    rep,
                    name=thread_rep_name,
                    first_name=thread_first,
                    email=thread.get("rep_email") or rep.email,
                )
        except Exception as exc:
            log.warning("thread continuity rep override skipped: %s", exc)

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

    # Belt-and-suspenders: if we have a financing phrase and the template still
    # contains the raw placeholder, substitute it now so the template Claude
    # sees already has the real number. This works in concert with the
    # FINANCING PHRASE TO USE instruction block — both point to the same string.
    if financing_phrase and "$[X]/month" in template:
        template = template.replace("$[X]/month", financing_phrase)

    user_prompt = _build_user_prompt(
        lead_context=lead_context, touch_info=touch_info, milestone=milestone,
        layer_name=layer_name, layer_goal=layer_goal, layer_tone=layer_tone,
        rep_name=rep.name, rep_first_name=rep.first_name, rep_email=rep.email,
        rep_title=rep.title, rep_phone=rep.signature_phone,
        sop_text=sop_text, samples=samples, template=template, stats=stats_block,
        financing_phrase=financing_phrase,
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
