"""Postflight checks on AI-drafted messages before they enter the queue.

Drafts that fail any check are returned with a reason so the drafter can
regenerate (up to N retries). If a draft still fails after retries, the
upstream caller marks it as `error` and surfaces it for manual edit.

Current checks:
1. NO_EM_DASHES   — the body and subject must contain zero em-/en-dashes.
                    Colin's directive: agent never writes em-dashes.
2. NO_BRACKETS    — leftover [Token] placeholders that didn't get substituted.
                    e.g., "[current season]", "[Position]", "[Google Review Link]"
3. NO_FALLBACK_REP_GRAMMAR
                  — catches "the Modern Day Roofing team with Modern Day Roofing"
                    and similar awkward grammar from the empty-rep fallback.
4. SUBJECT_FORMAT — for email: subject must be set. If body still starts with
                    "Subject:" or "**Subject:**" (parser leakage), reject.
5. LENGTH         — text messages over 320 chars; emails over 4000 chars.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

DASH_PATTERN = re.compile(r"[—–―−]")
BRACKET_PATTERN = re.compile(r"\[[^\]]+\]")
SUBJECT_LEAK_PATTERN = re.compile(r"^\s*\**\s*[Ss]ubject\s*:\s*", re.MULTILINE)
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


@dataclass
class PostflightResult:
    ok: bool
    reasons: list[str]


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


def check_draft(
    *,
    channel: str,
    subject: Optional[str],
    body: str,
) -> PostflightResult:
    """Run every postflight rule and return the verdict."""
    reasons: list[str] = []

    if not body or not body.strip():
        return PostflightResult(False, ["body empty"])

    for label, text in [("body", body), ("subject", subject or "")]:
        if not text:
            continue
        for check in (_check_dashes, _check_brackets):
            reason = check(text, label)
            if reason:
                reasons.append(reason)

    rep_fail = _check_fallback_rep(body)
    if rep_fail:
        reasons.append(rep_fail)

    if channel == "email":
        leak = _check_subject_leak(body)
        if leak:
            reasons.append(leak)
        if not subject or not subject.strip():
            reasons.append("email missing subject line")

    if channel == "text" and len(body) > 320:
        reasons.append(f"text body too long ({len(body)} chars > 320)")
    if channel == "email" and len(body) > 4000:
        reasons.append(f"email body too long ({len(body)} chars > 4000)")

    return PostflightResult(ok=not reasons, reasons=reasons)


__all__ = ["check_draft", "PostflightResult"]
