"""AccuLynx internal API client (the one that powers the AccuLynx UI).

The public REST API at api.acculynx.com/api/v2 does NOT expose the contents
of rep notes, emails, or texts. The internal SPA backend at
my.acculynx.com/api/v4 DOES expose them — that's what the Communications tab
in the AccuLynx UI calls.

We piggyback on a logged-in user's session cookies to authenticate. The
cookies live in .env (see ACCULYNX_SESSION_COOKIE_RAW) and need to be
refreshed manually when they expire (typically every 30-60 days). We
detect expiry and surface a clear error so the operator knows to re-paste.

USAGE: from acculynx.internal_api import fetch_messages_for_job

The internal API is undocumented and could change without notice. We
treat its responses defensively.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx

from config.settings import settings

log = logging.getLogger(__name__)

INTERNAL_BASE = "https://my.acculynx.com/api/v4"

# Required cookie names (the ones that actually authenticate)
AUTH_COOKIE_NAMES = (".ASPXAUTH", "ASP.NET_SessionId")
# These help with anti-bot but aren't strictly required
RECOMMENDED_COOKIE_NAMES = ("cf_clearance", "deviceThumbprint")

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
)


def _parse_cookie_header(cookie_header: str) -> dict[str, str]:
    """Parse a raw `Cookie:` header value into a dict.

    Accepts either pasted Chrome DevTools format ("name=value; name2=value2;")
    or our simpler ".env"-friendly format. Whitespace tolerant.
    """
    out: dict[str, str] = {}
    if not cookie_header:
        return out
    for chunk in cookie_header.split(";"):
        chunk = chunk.strip()
        if not chunk or "=" not in chunk:
            continue
        k, _, v = chunk.partition("=")
        out[k.strip()] = v.strip()
    return out


def _cookies() -> dict[str, str]:
    raw = (settings.acculynx_session_cookie or "").strip()
    if not raw:
        return {}
    return _parse_cookie_header(raw)


def is_configured() -> bool:
    """True if at least the auth cookies are present."""
    cookies = _cookies()
    return all(cookies.get(name) for name in AUTH_COOKIE_NAMES)


def _client(referer_job_id: str = "") -> httpx.AsyncClient:
    """Build a configured async HTTP client mimicking a logged-in browser."""
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
        "X-Device-Time-Zone": "America/New_York",
    }
    if referer_job_id:
        headers["Referer"] = f"https://my.acculynx.com/jobs/{referer_job_id}/communications"
    return httpx.AsyncClient(
        timeout=20,
        cookies=_cookies(),
        headers=headers,
        follow_redirects=False,
    )


_HTML_TAG = re.compile(r"<[^>]+>")
_NBSP = re.compile(r"&nbsp;|\xa0")
_AMP = re.compile(r"&amp;")
_QUOT = re.compile(r"&quot;")
_LT = re.compile(r"&lt;")
_GT = re.compile(r"&gt;")
_APOS = re.compile(r"&#39;|&apos;")
_WS = re.compile(r"\s+")


def _html_to_text(html: str) -> str:
    """Strip HTML tags and decode common entities. AccuLynx Message bodies
    arrive as HTML (e.g. <p>Hi&nbsp;Tyler,</p>)."""
    if not html:
        return ""
    s = _HTML_TAG.sub(" ", html)
    s = _NBSP.sub(" ", s)
    s = _AMP.sub("&", s)
    s = _LT.sub("<", s)
    s = _GT.sub(">", s)
    s = _QUOT.sub('"', s)
    s = _APOS.sub("'", s)
    s = _WS.sub(" ", s).strip()
    return s


# ── Per-lead TTL cache ──────────────────────────────────────────────────────
# Internal API calls are slow (1-3s each) and the same lead's messages get
# fetched 4-8 times during a single layer-page load (4 touches * 2 paths:
# build_agent_context + get_thread_continuity_for_job). A 3-minute TTL is
# more than enough for /review usage and short enough that fresh CRM
# activity shows up by the next click.
import time as _time

_MSG_CACHE: dict[str, tuple[float, list[dict]]] = {}
_MSG_TTL_SECONDS = 180.0


def invalidate_messages_cache(job_id: Optional[str] = None) -> None:
    """Drop cached messages for a single lead, or all leads if no id given."""
    if job_id is None:
        _MSG_CACHE.clear()
    else:
        _MSG_CACHE.pop(job_id, None)


async def fetch_messages_for_job(job_id: str) -> list[dict]:
    """Pull every Communication (email + text + comment) on a job.

    Returns a list of normalized dicts ordered most-recent-first:
      {id, type, created_date, created_by, subject, body_text, recipients}

    Returns [] silently on auth failure / network error so callers can
    fall back to the public API context. Logs a warning so the operator
    knows cookies need refreshing.

    Memoized per-lead with a 3-minute TTL — see _MSG_CACHE above.
    """
    cached = _MSG_CACHE.get(job_id)
    if cached is not None:
        ts, msgs = cached
        if (_time.time() - ts) < _MSG_TTL_SECONDS:
            return msgs

    if not is_configured():
        log.debug("internal_api: cookies not configured, skipping")
        return []

    url = f"{INTERNAL_BASE}/jobs/{job_id}/messages"
    try:
        async with _client(referer_job_id=job_id) as c:
            r = await c.get(url)
        if r.status_code in (302, 401, 403):
            # 302 = redirected to login page (cookies expired silently).
            # 401/403 = explicit auth rejection.
            log.warning(
                "internal_api: AccuLynx session cookies appear EXPIRED "
                "(status=%s, redirect=%s). Run: python scripts/refresh_cookies.py",
                r.status_code,
                r.headers.get("location", ""),
            )
            return []
        if r.status_code != 200:
            log.warning("internal_api: unexpected status %s on %s", r.status_code, url)
            return []
        data = r.json()
    except Exception as exc:
        log.warning("internal_api: fetch failed for %s: %s", job_id, exc)
        return []

    sr = data.get("SearchResults", {}) or {}
    raw_results = sr.get("results", []) if isinstance(sr, dict) else []
    if not isinstance(raw_results, list):
        return []

    out: list[dict] = []
    for m in raw_results:
        if not isinstance(m, dict):
            continue
        msg_type = m.get("Type") or m.get("MessageType") or "Unknown"
        body_text = _html_to_text(m.get("Message") or "")
        recipients = m.get("Recipients") or []
        if isinstance(recipients, list):
            rec_str = ", ".join(
                str(r.get("Name") or r.get("Email") or r) if isinstance(r, dict) else str(r)
                for r in recipients[:5]
            )
        else:
            rec_str = ""

        out.append({
            "id": m.get("Id"),
            "type": msg_type,
            "created_date": m.get("CreatedDate") or m.get("SentDate"),
            "created_by": m.get("CreatedBy"),
            "subject": (m.get("Subject") or "").strip() or None,
            "body_text": body_text,
            "recipients": rec_str,
            "is_admin_message": bool(m.get("AdminMessage")),
        })
    # Most-recent first
    out.sort(key=lambda x: x["created_date"] or "", reverse=True)
    _MSG_CACHE[job_id] = (_time.time(), out)
    return out


async def get_thread_continuity_for_job(job_id: str) -> Optional[dict]:
    """Pull the most recent OUTBOUND email from the rep so the agent's
    follow-up can thread into the same conversation in the homeowner's
    inbox.

    Returns:
      {
        "rep_email":      paulvanwagoner@moderndayroof.com  (or None)
        "rep_name":       "Paul VanWagoner"
        "subject":        "Updated Estimates"
        "synthetic_msgid": "<accuLynx-{Id}@my.acculynx.com>"  (for In-Reply-To)
        "sent_date":      ISO timestamp
        "recipient":      "rugertyler1496@gmail.com"
      }
    or None if no prior email exists.

    Strategy: AccuLynx doesn't expose RFC Message-IDs but we generate a
    synthetic one based on the AccuLynx message UUID. Most email clients
    thread primarily by Subject + From — having In-Reply-To is bonus.
    """
    msgs = await fetch_messages_for_job(job_id)
    if not msgs:
        return None
    # The first email-type message authored by an actual person (not the
    # AccuLynx system / automation account) is the most recent rep email.
    SYSTEM_SENDERS = {"acculynx", "system", "modern day roofing", ""}
    rep_email = next(
        (m for m in msgs
         if m.get("type") == "Email"
         and (m.get("created_by") or "").strip().lower() not in SYSTEM_SENDERS),
        None,
    )
    if not rep_email:
        # Fall back to the most recent Comment by a real person — these are
        # rep notes on the job and tell us who's actively working it, even if
        # no rep email has been sent yet (porch repairs, etc.). We still won't
        # have a synthetic_msgid for threading, but voice/identity is right.
        rep_email = next(
            (m for m in msgs
             if m.get("type") == "Comment"
             and (m.get("created_by") or "").strip().lower() not in SYSTEM_SENDERS),
            None,
        )
        if not rep_email:
            return None

    rep_name = " ".join((rep_email.get("created_by") or "").split())
    subject = (rep_email.get("subject") or "").strip()
    al_id = rep_email.get("id") or ""
    synthetic_msgid = f"<accuLynx-{al_id}@my.acculynx.com>" if al_id else None

    # Try to derive the rep's email from the name. Common pattern at MDR:
    # firstnamelastname@moderndayroof.com (lowercased, no spaces).
    rep_email_addr: Optional[str] = None
    if rep_name:
        cleaned = rep_name.lower().replace(" ", "").replace(".", "")
        # Strip trailing whitespace/non-alpha
        import re as _re
        cleaned = _re.sub(r"[^a-z]", "", cleaned)
        if cleaned:
            rep_email_addr = f"{cleaned}@moderndayroof.com"

    return {
        "rep_email": rep_email_addr,
        "rep_name": rep_name,
        "subject": subject,
        "synthetic_msgid": synthetic_msgid,
        "sent_date": rep_email.get("created_date"),
        "recipient": rep_email.get("recipients") or "",
    }


def post_comment_sync(job_id: str, message: str) -> Optional[str]:
    """Synchronous wrapper around post_comment for sync callers (the
    messaging dispatcher). Same behavior, blocks instead of awaits.
    """
    if not is_configured() or not message or not message.strip():
        return None
    url = f"{INTERNAL_BASE}/jobs/{job_id}/messages"
    body = {"Type": "Comment", "Message": message.strip()}
    try:
        with httpx.Client(
            timeout=20,
            cookies=_cookies(),
            headers={
                "Accept": "application/json, text/plain, */*",
                "User-Agent": USER_AGENT,
                "X-Device-Time-Zone": "America/New_York",
                "Referer": f"https://my.acculynx.com/jobs/{job_id}/communications",
            },
            follow_redirects=False,
        ) as c:
            r = c.post(url, json=body)
        if r.status_code == 200:
            return r.text.strip().strip('"') or "ok"
        log.warning("post_comment_sync: status %s on %s: %s", r.status_code, url, r.text[:200])
        return None
    except Exception as exc:
        log.warning("post_comment_sync: failed for %s: %s", job_id, exc)
        return None


async def post_comment(job_id: str, message: str) -> Optional[str]:
    """Post an internal Comment to a job's Communications tab.

    Uses the internal v4 endpoint with session cookies (the only mechanism
    that lands in the Communications tab where reps actually look).
    Returns the new comment id, or None on failure (we degrade gracefully —
    the agent keeps running, just without CRM-side audit trail).
    """
    if not is_configured():
        log.debug("post_comment: cookies not configured, skipping")
        return None
    if not message or not message.strip():
        return None
    url = f"{INTERNAL_BASE}/jobs/{job_id}/messages"
    body = {"Type": "Comment", "Message": message.strip()}
    try:
        async with _client(referer_job_id=job_id) as c:
            r = await c.post(url, json=body)
        if r.status_code == 200:
            new_id = r.text.strip().strip('"')
            return new_id or "ok"
        if r.status_code in (401, 403):
            log.warning(
                "post_comment: AccuLynx session cookies appear EXPIRED "
                "(status=%s). Refresh ACCULYNX_SESSION_COOKIE in .env.",
                r.status_code,
            )
            return None
        log.warning("post_comment: unexpected status %s on %s: %s", r.status_code, url, r.text[:200])
        return None
    except Exception as exc:
        log.warning("post_comment: failed for %s: %s", job_id, exc)
        return None


# Channel message types — these reach the homeowner's inbox/phone.
# Only these count toward "last MDR outbound" for time anchors and the
# 3-day quiet-period gate. Comments / notes / job-messages are INTERNAL
# CRM artifacts the homeowner never saw and must not be treated as
# something we "sent" to them.
_CHANNEL_TYPE_HINTS = ("email", "text", "sms")
_INTERNAL_NOTE_HINTS = ("comment", "note", "job message", "phone call", "call log", "task")
_INBOUND_TYPE_HINTS = ("incoming", "inbound", "received", "reply from")


def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def _classify(m: dict) -> str:
    """Return 'outbound' | 'inbound' | 'note' for a single AccuLynx message.

    Rules (homeowner-visibility first):
    - 'note' if Type matches an internal-note hint. Notes/comments/phone-call
      logs are CRM artifacts the homeowner never saw — they must NEVER be
      treated as outbound for time-anchor or quiet-period purposes.
    - 'inbound' if Type matches an inbound hint (Incoming Email, Reply from…).
    - 'outbound' if it's a channel message (email/text/sms) AND posted by an
      MDR admin (is_admin_message true).
    - 'note' as the conservative fallback when classification is ambiguous —
      we'd rather LOSE a recency anchor than FABRICATE one.
    """
    t = (m.get("type") or "").lower()
    if any(k in t for k in _INTERNAL_NOTE_HINTS):
        return "note"
    if any(k in t for k in _INBOUND_TYPE_HINTS):
        return "inbound"
    is_channel = any(k in t for k in _CHANNEL_TYPE_HINTS)
    if is_channel and m.get("is_admin_message"):
        return "outbound"
    if is_channel and not m.get("is_admin_message"):
        # Channel message NOT marked admin → likely homeowner reply
        return "inbound"
    return "note"


def _is_outbound(m: dict) -> bool:
    """Backwards-compatible: True only for channel-message outbounds the
    homeowner actually received."""
    return _classify(m) == "outbound"


def summarize_recency(messages: list[dict]) -> dict:
    """Compute last-comm timestamps + relative-day counts for the prompt + UI.

    Returns:
      {
        "last_outbound_at":  ISO str | None,
        "last_outbound_days_ago": int | None,
        "last_outbound_weekday":  "Thursday" | None,
        "last_outbound_date_str": "2026-05-04" | None,
        "last_inbound_at":   ISO str | None,
        "last_inbound_days_ago":  int | None,
        "last_inbound_weekday":   "Monday" | None,
        "last_inbound_date_str":  "2026-05-06" | None,
        "days_since_last_comm":   int | None,   # min of inbound/outbound
        "quiet_period_violated":  bool,         # True if days_since_last_comm < 3
      }
    Empty inputs → all None / False.
    """
    out = {
        "last_outbound_at": None,
        "last_outbound_days_ago": None,
        "last_outbound_weekday": None,
        "last_outbound_date_str": None,
        "last_inbound_at": None,
        "last_inbound_days_ago": None,
        "last_inbound_weekday": None,
        "last_inbound_date_str": None,
        "days_since_last_comm": None,
        "quiet_period_violated": False,
    }
    if not messages:
        return out

    now = datetime.now(timezone.utc)
    last_out: Optional[datetime] = None
    last_in: Optional[datetime] = None

    for m in messages:
        when = _parse_iso(m.get("created_date"))
        if not when:
            continue
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        cls = _classify(m)
        # Internal notes / phone-call logs / comments are NOT homeowner-visible
        # comms — they don't anchor "estimate sent Sunday" claims and they
        # don't trigger the quiet-period gate. Only channel emails/texts count.
        if cls == "outbound":
            if last_out is None or when > last_out:
                last_out = when
        elif cls == "inbound":
            if last_in is None or when > last_in:
                last_in = when

    def _fill(prefix: str, dt: Optional[datetime]) -> None:
        if not dt:
            return
        out[f"{prefix}_at"] = dt.isoformat()
        out[f"{prefix}_days_ago"] = (now.date() - dt.date()).days
        out[f"{prefix}_weekday"] = dt.strftime("%A")
        out[f"{prefix}_date_str"] = dt.strftime("%Y-%m-%d")

    _fill("last_outbound", last_out)
    _fill("last_inbound", last_in)

    candidates = [d for d in (out["last_outbound_days_ago"], out["last_inbound_days_ago"]) if d is not None]
    if candidates:
        days = min(candidates)
        out["days_since_last_comm"] = days
        out["quiet_period_violated"] = days < 3
    return out


def format_messages_for_context(
    messages: list[dict],
    *,
    max_messages: int = 8,
    max_chars_per_message: int = 400,
) -> str:
    """Format messages into a Claude-prompt-ready text block.

    Most recent first, capped at max_messages. Each message body capped
    at max_chars_per_message so a single 5,000-char email doesn't blow the
    prompt budget. Each entry includes (Nd ago, weekday) so the AI can
    refer to dates the way a human rep would ("the estimate I sent
    Thursday" only when Thursday actually was the send date).
    """
    if not messages:
        return ""

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%A %Y-%m-%d")
    lines = [
        f"RECENT ACTIVITY (newest first, from AccuLynx; today is {today_str}).",
        "Direction key:",
        "  OUT  = email or text MDR actually sent to the homeowner (homeowner saw it)",
        "  IN   = email or text the homeowner sent to MDR",
        "  NOTE = internal CRM note / phone-call log / comment — homeowner did NOT see this. "
        "Use NOTE entries for situational context only. NEVER reference a NOTE as if you sent the homeowner anything on that day.",
    ]
    for m in messages[:max_messages]:
        when_dt = _parse_iso(m.get("created_date"))
        if when_dt and when_dt.tzinfo is None:
            when_dt = when_dt.replace(tzinfo=timezone.utc)
        if when_dt:
            days_ago = (now.date() - when_dt.date()).days
            weekday = when_dt.strftime("%A")
            date_str = when_dt.strftime("%Y-%m-%d")
            stamp = f"{date_str} ({weekday}, {days_ago}d ago)"
        else:
            stamp = (m.get("created_date") or "")[:10] or "unknown date"

        who = m.get("created_by") or "Unknown"
        msg_type = m.get("type") or "Note"
        cls = _classify(m)
        direction = {"outbound": "OUT", "inbound": "IN", "note": "NOTE"}.get(cls, "NOTE")
        body = (m.get("body_text") or "").strip()
        if len(body) > max_chars_per_message:
            body = body[:max_chars_per_message - 3] + "..."
        if not body:
            continue
        subject = m.get("subject")
        subj_line = f" — Subject: {subject}" if subject else ""
        lines.append(f"  [{stamp}] {direction} {msg_type} by {who}{subj_line}")
        lines.append(f"      {body}")
    return "\n".join(lines)


# =====================================================================
# Correspondent lookup for SMS sends
# =====================================================================
import re as _re_corr


def _normalize_phone(phone: str) -> str:
    """Strip all non-digits + drop leading 1 (US country code)."""
    digits = _re_corr.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


# Internal v3 address-book endpoint. Captured from a live my.acculynx.com
# session HAR on 2026-05-17. Returns SMS-eligible correspondents AND staff
# for a job along with PhoneNumber, IsOptedIn, and CorrespondentType
# (0=staff, 1=homeowner/contact).
#
# Empirically: passing only requestingTypes[]=5 returns 0 entries. The
# endpoint requires at least one of types 0/1/2 alongside 5 to materialize
# the response. We pass all four — the consumer filters CorrespondentType==1
# for SMS targets.
_ADDRESS_BOOK_PATH = (
    "/api/v3/message-board/{job_id}/address-book"
    "?requestingTypes%5B%5D=0&requestingTypes%5B%5D=1"
    "&requestingTypes%5B%5D=2&requestingTypes%5B%5D=5"
)
_ADDRESS_BOOK_BASE = "https://my.acculynx.com"


def _fetch_address_book_sync(*, job_id: str, rep_slug: Optional[str] = None) -> Optional[list[dict]]:
    """Fetch the full SMS address book for a job. Returns list of dicts:
        {ID, DisplayName, PhoneNumber, IsOptedIn, CorrespondentType}
    Returns None on any failure.
    """
    from .rep_sessions import cookies_for_rep
    cookies, _ = cookies_for_rep(rep_slug, allow_fallback=True)
    if not cookies:
        cookies = _cookies()
    if not cookies:
        return None

    url = f"{_ADDRESS_BOOK_BASE}{_ADDRESS_BOOK_PATH.format(job_id=job_id)}"
    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": USER_AGENT,
        "Origin": "https://my.acculynx.com",
        "Referer": f"https://my.acculynx.com/jobs/{job_id}/communications",
    }
    try:
        with httpx.Client(timeout=15, cookies=cookies, headers=headers, follow_redirects=False) as c:
            r = c.get(url)
    except Exception as exc:
        log.warning("address-book fetch raised for job=%s: %r", job_id, exc)
        try:
            from messaging.alerts import alert_sev2
            alert_sev2(
                source="acculynx.internal_api.address_book",
                error="network_exception",
                message=str(exc),
                context={"job_id": job_id, "rep_slug": rep_slug},
            )
        except Exception:
            pass
        return None
    if r.status_code != 200:
        log.warning("address-book non-200 (job=%s status=%s)", job_id, r.status_code)
        try:
            from messaging.alerts import alert_sev1, alert_sev2
            if r.status_code in (401, 403):
                alert_sev1(
                    source="acculynx.internal_api.address_book",
                    error=f"auth_{r.status_code}",
                    message="bot/rep session rejected by address-book endpoint",
                    context={"job_id": job_id, "status": r.status_code, "rep_slug": rep_slug},
                )
            else:
                alert_sev2(
                    source="acculynx.internal_api.address_book",
                    error=f"status_{r.status_code}",
                    context={"job_id": job_id, "rep_slug": rep_slug},
                )
        except Exception:
            pass
        return None
    try:
        data = r.json()
    except Exception:
        return None
    if not isinstance(data, list):
        return None
    return data


def get_sms_correspondent_id_sync(*, job_id: str, phone: str, rep_slug: Optional[str] = None) -> Optional[str]:
    """Fetch the CorrespondentID for the contact on this job matching `phone`.

    Returns None if not found (allows graceful fallback in the dispatcher).
    Never raises. Matches on normalized US digits-only phone.
    """
    target = _normalize_phone(phone)
    if not target:
        return None
    entries = _fetch_address_book_sync(job_id=job_id, rep_slug=rep_slug)
    if not entries:
        return None
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        # Only homeowners/contacts can receive outbound texts; staff are type 0.
        if entry.get("CorrespondentType") != 1:
            continue
        pv = entry.get("PhoneNumber")
        if pv and _normalize_phone(str(pv)) == target:
            cid = entry.get("ID")
            if cid:
                return str(cid)
    return None


def get_sms_opt_in_sync(*, job_id: str, phone: str, rep_slug: Optional[str] = None) -> Optional[bool]:
    """Return the IsOptedIn flag for the contact matching `phone` on this job.

    Returns True/False when known, None on unknown / lookup failure. Fail-safe
    semantics live in opt_in_check.py — this function just reports raw state.
    """
    target = _normalize_phone(phone)
    if not target:
        return None
    entries = _fetch_address_book_sync(job_id=job_id, rep_slug=rep_slug)
    if not entries:
        return None
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("CorrespondentType") != 1:
            continue
        pv = entry.get("PhoneNumber")
        if pv and _normalize_phone(str(pv)) == target:
            val = entry.get("IsOptedIn")
            if isinstance(val, bool):
                return val
            return None
    return None
