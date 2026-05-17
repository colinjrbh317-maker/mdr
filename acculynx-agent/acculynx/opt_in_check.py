"""SMS opt-in pre-flight check (launch-eve safety net).

Before we POST to AccuLynx's v3 text endpoint we ask AccuLynx's internal v4
API whether the contact has SMS opt-in turned ON. If it's clearly OFF, we
return a clean verdict so the dispatcher can fall back to posting a Comment
instead of attempting the send. If we can't determine state (endpoint
changed, network error, contact not in the response), we ALLOW the send.
The audit-trail value is the goal; not preventing every edge case.

This module is read-only — it never posts, never mutates. It is also
synchronous because the dispatcher is synchronous. Use httpx.Client, not
requests, to stay consistent with the rest of the codebase.

The exact v4 endpoint URL for fetching a job's contacts/correspondents and
their opt-in flag is undocumented and may evolve. We try a few candidates
in order and stop at the first 200. We then walk the response JSON looking
for the entry whose Id matches the provided correspondent_id, and within
that entry we look for any boolean field whose key looks opt-in-ish
(matches `(?i)opt.?in|opt.?out|text|sms`).

USAGE:
    from acculynx.opt_in_check import check_opt_in_sync
    result = check_opt_in_sync(
        job_id="abc123",
        correspondent_id="def456",
        phone="+15555550123",
        rep_slug="austin",
    )
    if not result.can_send:
        # opt_in_state == "off" — fall back to Comment
        ...
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

import httpx

from .internal_api import INTERNAL_BASE, USER_AGENT
from .rep_sessions import cookies_for_rep
from config.settings import settings

log = logging.getLogger(__name__)


# Candidate v4 URLs to fetch the contacts/correspondents on a job, in the
# order we'll try them. The first 200 wins.
_CANDIDATE_PATHS = (
    "/jobs/{job_id}/correspondents",
    "/jobs/{job_id}/contacts",
    "/jobs/{job_id}/communications/contacts",
)

# Field-name patterns that look like SMS opt-in state. Matched case
# insensitively against JSON keys. e.g., SmsOptedIn, TextOptIn, CanReceiveText,
# OptInText, IsOptedIn, OptOutText.
_OPT_IN_KEY_RE = re.compile(r"opt.?in|opt.?out|text|sms", re.IGNORECASE)

# Keys we'll inspect to match an entry against the provided correspondent_id.
_ID_KEYS = ("Id", "CorrespondentId", "CorrespondentID", "ContactId", "ContactID")


@dataclass
class OptInResult:
    can_send: bool          # final verdict: True = send, False = block
    opt_in_state: str       # "on" | "off" | "unknown" | "endpoint_failed"
    correspondent_id: Optional[str]
    phone_normalized: Optional[str]
    raw_field_seen: Optional[str]  # e.g., "SmsOptedIn=true"
    detail: str             # human-readable explanation


def _normalize_phone(phone: str) -> str:
    """Strip everything except digits and a leading +."""
    if not phone:
        return ""
    digits = re.sub(r"[^\d+]", "", phone)
    return digits


def _headers(job_id: str) -> dict[str, str]:
    return {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
        "X-Device-Time-Zone": "America/New_York",
        "Referer": f"https://my.acculynx.com/jobs/{job_id}/communications",
    }


def _iter_entries(payload):
    """Yield dict entries from a v4 response that could be a list or a
    {"results": [...]} / {"SearchResults": {"results": [...]}} envelope."""
    if isinstance(payload, list):
        for x in payload:
            if isinstance(x, dict):
                yield x
        return
    if not isinstance(payload, dict):
        return
    # Common envelopes seen elsewhere in the v4 API.
    for key in ("results", "Results", "items", "Items", "data", "Data"):
        inner = payload.get(key)
        if isinstance(inner, list):
            for x in inner:
                if isinstance(x, dict):
                    yield x
            return
    sr = payload.get("SearchResults")
    if isinstance(sr, dict):
        inner = sr.get("results")
        if isinstance(inner, list):
            for x in inner:
                if isinstance(x, dict):
                    yield x
            return
    # Last resort: a single contact dict.
    yield payload


def _entry_matches(entry: dict, correspondent_id: str) -> bool:
    if not correspondent_id:
        return False
    target = str(correspondent_id).strip().lower()
    for key in _ID_KEYS:
        val = entry.get(key)
        if val is None:
            continue
        if str(val).strip().lower() == target:
            return True
    return False


def _find_opt_in_field(entry: dict) -> Optional[tuple[str, bool]]:
    """Return (key_name, bool_value) for the first opt-in-ish boolean field
    found on `entry`. None if no such field is present.

    We only consider true booleans (or "true"/"false" strings) — never None,
    never numeric coercions — because falsy ambiguity would silently block
    sends.
    """
    for key, value in entry.items():
        if not isinstance(key, str):
            continue
        if not _OPT_IN_KEY_RE.search(key):
            continue
        if isinstance(value, bool):
            return key, value
        if isinstance(value, str):
            v = value.strip().lower()
            if v == "true":
                return key, True
            if v == "false":
                return key, False
    return None


def check_opt_in_sync(
    *,
    job_id: str,
    correspondent_id: str,
    phone: str,
    rep_slug: Optional[str] = None,
) -> OptInResult:
    """Pre-flight check before sending SMS via AccuLynx.

    Fail-safe: any inability to determine state allows the send. The only
    way this returns can_send=False is when we get a 200 from a candidate
    endpoint, locate the contact entry by id, find an opt-in-ish boolean
    field, and it is False.
    """
    phone_n = _normalize_phone(phone)

    if not settings.sms_opt_in_check_enabled:
        log.info(
            "opt_in_check: disabled by settings; allowing send (job=%s correspondent=%s)",
            job_id, correspondent_id,
        )
        return OptInResult(
            can_send=True,
            opt_in_state="unknown",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=None,
            detail="check disabled by settings",
        )

    cookies, effective_slug = cookies_for_rep(rep_slug)
    if not cookies:
        log.info(
            "opt_in_check: no session cookies for rep_slug=%s; allowing send "
            "(job=%s correspondent=%s)",
            rep_slug, job_id, correspondent_id,
        )
        return OptInResult(
            can_send=True,
            opt_in_state="unknown",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=None,
            detail="no session; allowing send",
        )

    headers = _headers(job_id)
    last_status: Optional[int] = None
    matched_entry: Optional[dict] = None
    matched_url: Optional[str] = None

    with httpx.Client(
        timeout=15,
        cookies=cookies,
        headers=headers,
        follow_redirects=False,
    ) as c:
        for path in _CANDIDATE_PATHS:
            url = f"{INTERNAL_BASE}{path.format(job_id=job_id)}"
            try:
                r = c.get(url)
            except Exception as exc:
                log.info(
                    "opt_in_check: network error on %s: %s (job=%s sender=%s)",
                    url, exc, job_id, effective_slug,
                )
                continue
            last_status = r.status_code
            if r.status_code != 200:
                log.info(
                    "opt_in_check: %s returned %s (job=%s sender=%s)",
                    url, r.status_code, job_id, effective_slug,
                )
                continue
            try:
                data = r.json()
            except Exception as exc:
                log.info(
                    "opt_in_check: %s 200 but JSON parse failed: %s",
                    url, exc,
                )
                continue
            # First 200 wins. Try to find the matching entry here.
            for entry in _iter_entries(data):
                if _entry_matches(entry, correspondent_id):
                    matched_entry = entry
                    matched_url = url
                    break
            # Whether or not we found the entry, we stop trying further
            # candidates: this endpoint owns the contact list for this job.
            matched_url = matched_url or url
            break

    if last_status is None or (matched_url is None and last_status != 200):
        log.info(
            "opt_in_check: all candidate endpoints failed (last_status=%s); "
            "allowing send (job=%s correspondent=%s)",
            last_status, job_id, correspondent_id,
        )
        return OptInResult(
            can_send=True,
            opt_in_state="endpoint_failed",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=None,
            detail="all candidate endpoints failed; allowing send",
        )

    if matched_entry is None:
        log.info(
            "opt_in_check: endpoint %s returned 200 but correspondent_id=%s "
            "not present in response; allowing send (job=%s)",
            matched_url, correspondent_id, job_id,
        )
        return OptInResult(
            can_send=True,
            opt_in_state="unknown",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=None,
            detail="endpoint OK but correspondent not found in response; allowing send",
        )

    field = _find_opt_in_field(matched_entry)
    if field is None:
        log.info(
            "opt_in_check: endpoint %s returned 200 and matched correspondent=%s "
            "but no opt-in field found; allowing send (job=%s keys=%s)",
            matched_url, correspondent_id, job_id, list(matched_entry.keys()),
        )
        return OptInResult(
            can_send=True,
            opt_in_state="unknown",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=None,
            detail="endpoint OK but no opt-in field found in response; allowing send",
        )

    key_name, value = field
    raw = f"{key_name}={'true' if value else 'false'}"
    if value:
        log.info(
            "opt_in_check: SMS opt-in ON (%s) for correspondent=%s job=%s",
            raw, correspondent_id, job_id,
        )
        return OptInResult(
            can_send=True,
            opt_in_state="on",
            correspondent_id=correspondent_id,
            phone_normalized=phone_n,
            raw_field_seen=raw,
            detail=f"opt-in confirmed via {key_name}",
        )

    log.info(
        "opt_in_check: SMS opt-in OFF (%s) for correspondent=%s job=%s; "
        "dispatcher should fall back to Comment",
        raw, correspondent_id, job_id,
    )
    return OptInResult(
        can_send=False,
        opt_in_state="off",
        correspondent_id=correspondent_id,
        phone_normalized=phone_n,
        raw_field_seen=raw,
        detail="contact has SMS opt-in OFF in AccuLynx",
    )


__all__ = ["OptInResult", "check_opt_in_sync"]
