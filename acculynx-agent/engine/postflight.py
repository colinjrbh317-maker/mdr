"""Postflight checks on AI-drafted messages before they enter the queue.

Drafts that fail any check are returned with a reason so the drafter can
regenerate (up to N retries). If a draft still fails after retries, the
upstream caller marks it as `error` and surfaces it for manual edit.

Current checks:
1. NO_EM_DASHES        — the body and subject must contain zero em-/en-dashes.
                         Colin's directive: agent never writes em-dashes.
2. NO_BRACKETS         — leftover [Token] placeholders that didn't get substituted.
                         e.g., "[current season]", "[Position]", "[Google Review Link]"
3. NO_FALLBACK_REP_GRAMMAR
                       — catches "the Modern Day Roofing team with Modern Day Roofing"
                         and similar awkward grammar from the empty-rep fallback.
4. NO_ASTERISKS        — drafts must contain zero asterisks. They render as
                         literal `*` in plain-text email and look terrible.
                         Includes both `**bold**` markdown and stray `*emphasis*`.
5. SIGNATURE           — emails must contain "Modern Day Roofing" and a phone
                         number in the signature block.
6. SUBJECT_FORMAT      — for email: subject must be set. If body still starts with
                         "Subject:" or "**Subject:**" (parser leakage), reject.
7. BANNED_PHRASES      — v4 voice: reject drafts containing generic follow-up clichés
                         ("follow up", "checking in", "just wanted to", "circle back",
                         "hopefully").
8. WORD_COUNT          — per-content_type word-count windows (text/email).
                         Falls back to char limits for unknown content_types.
9. ONE_ASK             — body (before signature) must contain exactly one "?".
                         Multiple question marks signal multiple CTAs.
10. CRM_DETAIL         — body must reference at least one piece of lead-specific
                         context (contact first name, city, work_type, or a
                         meaningful agent_context word >= 5 chars).
11. LENGTH             — text messages over 320 chars; emails over 4000 chars.
                         Fallback for unknown content_types not covered by
                         WORD_COUNT windows.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

DASH_PATTERN = re.compile(r"[—–―−]")
BRACKET_PATTERN = re.compile(r"\[[^\]]+\]")
SUBJECT_LEAK_PATTERN = re.compile(r"^\s*\**\s*[Ss]ubject\s*:\s*", re.MULTILINE)
ASTERISK_PATTERN = re.compile(r"\*")
PHONE_PATTERN = re.compile(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}")
FALLBACK_REP_PATTERNS = [
    re.compile(r"the\s+Modern\s+Day\s+Roofing\s+team\s+with\s+Modern\s+Day\s+Roofing", re.I),
    re.compile(r"this\s+is\s+the\s+Modern\s+Day\s+Roofing\s+team\b", re.I),
]
ALLOWED_BRACKETS = {
    "[Phone]",
    "[Name]",
    "[Rep]",
    "[Time]",
    "[Date]",
}

# v4 voice: banned clichés (case-insensitive substring match)
BANNED_PHRASES = [
    "follow up",
    "checking in",
    "just wanted to",
    "circle back",
    "hopefully",
]

# v4 word-count windows per content_type: (min_words, max_words)
WORD_COUNT_WINDOWS: dict[str, tuple[int, int]] = {
    "check_in_questions_about_estimate":   (35,  70),
    "checking_in_on_proposal":             (40,  75),
    "value_add_financing_warranty":        (120, 175),
    "no_pressure_still_here":             (45,  80),
    "drip_t1_soft_checkin_exterior_issues": (30,  65),
    "drip_t2_complimentary_tuneup_offer":  (110, 165),
    "drip_t3_referral_program_offer":      (105, 155),
    "drip_t4_anniversary_bundle_offer":    (120, 170),
}

_SIGNATURE_SENTINEL = "modern day roofing"


@dataclass
class PostflightResult:
    ok: bool
    reasons: list[str]


def _strip_signature(body: str) -> str:
    """Return body text up to the first occurrence of 'Modern Day Roofing'
    (case-insensitive). Used so word counts and question counts ignore the
    signature block."""
    idx = body.lower().find(_SIGNATURE_SENTINEL)
    if idx == -1:
        return body
    return body[:idx]


def _count_words(text: str) -> int:
    """Split on whitespace and count non-empty tokens."""
    return len(text.split())


def _check_dashes(text: str, label: str) -> Optional[str]:
    if DASH_PATTERN.search(text):
        return f"{label} contains em/en-dash"
    return None


def _check_brackets(text: str, label: str) -> Optional[str]:
    found = BRACKET_PATTERN.findall(text or "")
    leaked = [b for b in found if b not in ALLOWED_BRACKETS]
    if leaked:
        return f"{label} contains unsubstituted bracket(s): {leaked[:3]}"
    return None


def _check_fallback_rep(text: str) -> Optional[str]:
    for pat in FALLBACK_REP_PATTERNS:
        if pat.search(text):
            return "fallback-rep grammar artifact found ('Modern Day Roofing team with Modern Day Roofing')"
    return None


def _check_subject_leak(body: str) -> Optional[str]:
    if SUBJECT_LEAK_PATTERN.match(body or ""):
        return "body starts with 'Subject:' (parser failed to extract subject)"
    return None


def _check_asterisks(text: str, label: str) -> Optional[str]:
    """No asterisks anywhere. They render as literal `*` in plain-text email."""
    if ASTERISK_PATTERN.search(text or ""):
        return f"{label} contains asterisk(s) — strip all `*` and `**` markdown"
    return None


def _check_signature(channel: str, body: str) -> Optional[str]:
    """Email signatures must include 'Modern Day Roofing' and a phone number.
    Texts get a lighter check (just a phone number)."""
    if not body:
        return None
    body_lower = body.lower()
    has_phone = bool(PHONE_PATTERN.search(body))
    has_brand = "modern day roofing" in body_lower
    if channel == "email":
        if not has_brand:
            return "email signature missing 'Modern Day Roofing'"
        if not has_phone:
            return "email signature missing phone number"
    elif channel == "text":
        if not has_phone:
            return "text missing phone number"
    return None


def _check_banned_phrases(text: str, label: str) -> Optional[str]:
    """Reject drafts containing any v4 banned clichés (case-insensitive)."""
    text_lower = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase in text_lower:
            return f"{label} contains banned phrase: '{phrase}'"
    return None


def _check_word_count(
    channel: str,
    content_type: Optional[str],
    body: str,
) -> Optional[str]:
    """Check body word count against the per-content_type window.

    Strips the signature before counting so boilerplate doesn't pad numbers.
    Returns None if the content_type has no registered window (caller falls
    through to the character-length check instead).
    """
    if not content_type:
        return None
    window = WORD_COUNT_WINDOWS.get(content_type)
    if window is None:
        return None
    min_w, max_w = window
    core = _strip_signature(body)
    word_count = _count_words(core)
    if word_count < min_w:
        return (
            f"{channel} body too short for {content_type}: "
            f"{word_count} words (min {min_w})"
        )
    if word_count > max_w:
        return (
            f"{channel} body too long for {content_type}: "
            f"{word_count} words (max {max_w})"
        )
    return None


def _check_one_ask(body: str) -> Optional[str]:
    """Body (before signature) must contain exactly one '?'.

    Multiple question marks signal multiple calls-to-action, which dilutes
    the close. Zero question marks may indicate no CTA at all (let it pass
    here — other checks cover that case).
    """
    core = _strip_signature(body)
    q_count = core.count("?")
    if q_count > 1:
        return (
            f"body contains {q_count} question marks — drafts must have exactly "
            "one call-to-action"
        )
    return None


def _check_crm_detail(
    body: str,
    lead_context: Optional[dict],
) -> Optional[str]:
    """Reject drafts that contain zero references to lead-specific context.

    Acceptable tokens (case-insensitive substring match against body):
    - Contact first name (split from contact_name)
    - City (from lead_context['city'] or parsed from address)
    - work_type
    - Any word >= 5 chars from agent_context

    If lead_context is None or empty, skip this check.
    """
    if not lead_context:
        return None

    body_lower = body.lower()
    tokens: list[str] = []

    # Contact first name
    contact_name = lead_context.get("contact_name") or ""
    first_name = contact_name.strip().split()[0] if contact_name.strip() else ""
    if first_name:
        tokens.append(first_name.lower())

    # City
    city = lead_context.get("city") or ""
    if not city:
        # Try extracting from address field
        address = lead_context.get("address") or ""
        # Heuristic: city is often the second-to-last comma-delimited segment
        parts = [p.strip() for p in address.split(",")]
        if len(parts) >= 2:
            city = parts[-2]
    if city:
        tokens.append(city.strip().lower())

    # work_type
    work_type = lead_context.get("work_type") or ""
    if work_type:
        tokens.append(work_type.strip().lower())

    # agent_context words >= 5 chars
    agent_context = lead_context.get("agent_context") or ""
    if agent_context:
        for word in agent_context.split():
            clean = re.sub(r"[^\w]", "", word).lower()
            if len(clean) >= 5:
                tokens.append(clean)

    if not tokens:
        # No tokens to check against — skip
        return None

    for token in tokens:
        if token and token in body_lower:
            return None

    return "missing CRM-specific detail (body contains no lead-specific context)"


def check_draft(
    *,
    channel: str,
    subject: Optional[str],
    body: str,
    content_type: Optional[str] = None,
    lead_context: Optional[dict] = None,
) -> PostflightResult:
    """Run every postflight rule and return the verdict.

    Parameters
    ----------
    channel:
        "text" or "email".
    subject:
        Subject line (required for email, None/empty for text).
    body:
        Full message body including signature.
    content_type:
        The touch's content_type key (e.g. "check_in_questions_about_estimate").
        Used for per-type word-count windows. If None or unknown, falls back
        to character-length limits.
    lead_context:
        The lead dict enriched by the pipeline. Used for CRM-detail check.
        If None or empty, that check is skipped.
    """
    reasons: list[str] = []

    if not body or not body.strip():
        return PostflightResult(False, ["body empty"])

    # --- Existing per-field checks (dashes, brackets, asterisks) ---
    for label, text in [("body", body), ("subject", subject or "")]:
        if not text:
            continue
        for check in (_check_dashes, _check_brackets, _check_asterisks):
            reason = check(text, label)
            if reason:
                reasons.append(reason)

    rep_fail = _check_fallback_rep(body)
    if rep_fail:
        reasons.append(rep_fail)

    sig_fail = _check_signature(channel, body)
    if sig_fail:
        reasons.append(sig_fail)

    if channel == "email":
        leak = _check_subject_leak(body)
        if leak:
            reasons.append(leak)
        if not subject or not subject.strip():
            reasons.append("email missing subject line")

    # --- v4 new checks (ordered after existing, before length fallback) ---

    # 7. Banned phrases
    banned_fail = _check_banned_phrases(body, "body")
    if banned_fail:
        reasons.append(banned_fail)

    # 8. Word-count window
    wc_fail = _check_word_count(channel, content_type, body)
    if wc_fail:
        reasons.append(wc_fail)

    # 9. One-ask
    one_ask_fail = _check_one_ask(body)
    if one_ask_fail:
        reasons.append(one_ask_fail)

    # 10. CRM detail
    crm_fail = _check_crm_detail(body, lead_context)
    if crm_fail:
        reasons.append(crm_fail)

    # 11. Length fallback (char-based, only for content_types not in WORD_COUNT_WINDOWS)
    has_word_window = content_type and content_type in WORD_COUNT_WINDOWS
    if not has_word_window:
        if channel == "text" and len(body) > 320:
            reasons.append(f"text body too long ({len(body)} chars > 320)")
        if channel == "email" and len(body) > 4000:
            reasons.append(f"email body too long ({len(body)} chars > 4000)")

    return PostflightResult(ok=not reasons, reasons=reasons)


__all__ = ["check_draft", "PostflightResult"]
