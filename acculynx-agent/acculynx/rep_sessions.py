"""Per-rep AccuLynx session manager.

Each sales rep gets their own persistent set of 4 cookies on disk so that
outbound SMS goes through THEIR AccuLynx session and arrives from THEIR
provisioned AccuLynx phone number. Without this, every text would come from
a single bot account number which:
  (a) wouldn't thread into the homeowner's existing conversation with the
      rep (different sender = different SMS thread on the homeowner's phone)
  (b) confuses the rep who can't see the convo in their Texts tab

Layout on disk:
  acculynx/sessions/
    mdrai-acculynx.json     <- bot fallback (used when lead has no assigned rep)
    austin.json
    paulvanwagoner.json
    alexbohm.json
    ...

Each file looks like:
  {
    "rep_slug": "austin",
    "rep_email": "austin@moderndayroof.com",
    "acculynx_user_id": "88887648-9d02-4ece-ab42-56c0d64d07bc",
    "captured_at": "2026-05-17T19:34:00Z",
    "cookies": {
      ".ASPXAUTH": "...",
      "ASP.NET_SessionId": "...",
      "cf_clearance": "...",
      "deviceThumbprint": "..."
    }
  }

Health rules:
  - "healthy" = all 4 cookies present
  - "degraded" = only .ASPXAUTH + ASP.NET_SessionId (Comments still work; SMS will 401)
  - "missing" = no file or no cookies
  - "stale" = captured_at older than STALE_AFTER_DAYS

Why JSON files rather than .env vars: keeping 4 cookies × N reps in a flat
.env becomes a mess fast, and Chrome profiles live alongside each session
file (acculynx/profiles/{slug}/) for matching headed-refresh flows.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

SESSIONS_DIR = Path(__file__).resolve().parent / "sessions"
PROFILES_DIR = Path(__file__).resolve().parent / "profiles"

REQUIRED_COOKIES = (".ASPXAUTH", "ASP.NET_SessionId")
RECOMMENDED_COOKIES = ("cf_clearance", "deviceThumbprint")
ALL_COOKIES = REQUIRED_COOKIES + RECOMMENDED_COOKIES

# After this many days, we flag the cookies as stale and prompt a refresh.
# ASP.NET session cookies can last weeks; cf_clearance often 30-60 days.
STALE_AFTER_DAYS = 25

# Bot fallback used when a lead has no assigned rep (or the assigned rep has
# no session captured yet). Matches the slug we use for the dedicated bot
# user (mdrai.acculynx).
BOT_FALLBACK_SLUG = "mdrai-acculynx"


@dataclass
class SessionHealth:
    rep_slug: str
    status: str            # "healthy" | "degraded" | "missing" | "stale"
    has_required: bool     # .ASPXAUTH + ASP.NET_SessionId
    has_recommended: bool  # cf_clearance + deviceThumbprint
    missing_cookies: list[str]
    captured_at: Optional[datetime]
    age_days: Optional[float]

    @property
    def can_send_sms(self) -> bool:
        # SMS requires all 4 (Cloudflare gates v3 endpoint on the recommended pair).
        return self.has_required and self.has_recommended

    @property
    def can_post_comments(self) -> bool:
        # Comments at v4 only need the core auth pair.
        return self.has_required


def session_file(rep_slug: str) -> Path:
    return SESSIONS_DIR / f"{rep_slug}.json"


def profile_dir(rep_slug: str) -> Path:
    return PROFILES_DIR / rep_slug


def list_sessions() -> list[str]:
    """All rep slugs that have a session file on disk."""
    if not SESSIONS_DIR.exists():
        return []
    return sorted(p.stem for p in SESSIONS_DIR.glob("*.json"))


def load_session(rep_slug: str) -> Optional[dict]:
    """Load a rep's session blob. None if missing/corrupt."""
    path = session_file(rep_slug)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("rep_sessions.load_session(%s) failed: %s", rep_slug, exc)
        return None


def load_cookies(rep_slug: str) -> dict[str, str]:
    """Just the cookies dict for a rep, or empty dict if no session."""
    data = load_session(rep_slug)
    if not data:
        return {}
    return data.get("cookies") or {}


def save_session(
    *,
    rep_slug: str,
    cookies: dict[str, str],
    rep_email: Optional[str] = None,
    acculynx_user_id: Optional[str] = None,
) -> None:
    """Persist a rep's session blob to disk. Creates the directory if needed."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    existing = load_session(rep_slug) or {}
    payload = {
        "rep_slug": rep_slug,
        "rep_email": rep_email or existing.get("rep_email", ""),
        "acculynx_user_id": acculynx_user_id or existing.get("acculynx_user_id", ""),
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "cookies": {k: v for k, v in cookies.items() if v},
    }
    session_file(rep_slug).write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )


def check_health(rep_slug: str) -> SessionHealth:
    """Diagnose a rep's session: are the cookies there, are they fresh?"""
    data = load_session(rep_slug)
    if not data:
        return SessionHealth(
            rep_slug=rep_slug, status="missing",
            has_required=False, has_recommended=False,
            missing_cookies=list(ALL_COOKIES),
            captured_at=None, age_days=None,
        )
    cookies = data.get("cookies") or {}
    has_required = all(cookies.get(c) for c in REQUIRED_COOKIES)
    has_recommended = all(cookies.get(c) for c in RECOMMENDED_COOKIES)
    missing = [c for c in ALL_COOKIES if not cookies.get(c)]

    captured_at_raw = data.get("captured_at")
    captured_at: Optional[datetime] = None
    age_days: Optional[float] = None
    if captured_at_raw:
        try:
            captured_at = datetime.fromisoformat(captured_at_raw.replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - captured_at).total_seconds() / 86400
        except ValueError:
            pass

    if not has_required:
        status = "degraded" if cookies else "missing"
    elif not has_recommended:
        status = "degraded"
    elif age_days is not None and age_days > STALE_AFTER_DAYS:
        status = "stale"
    else:
        status = "healthy"

    return SessionHealth(
        rep_slug=rep_slug, status=status,
        has_required=has_required, has_recommended=has_recommended,
        missing_cookies=missing,
        captured_at=captured_at, age_days=age_days,
    )


def cookies_for_rep(rep_slug: Optional[str], *, allow_fallback: bool = True) -> tuple[dict[str, str], str]:
    """Resolve cookies for a rep with fallback to the bot account.

    Returns (cookies_dict, effective_slug) so the caller can log which
    identity actually sent the message. effective_slug == BOT_FALLBACK_SLUG
    when we fell back, == rep_slug when the rep's own session was used,
    == "" when nothing was usable.
    """
    if rep_slug:
        cookies = load_cookies(rep_slug)
        if cookies and all(cookies.get(c) for c in REQUIRED_COOKIES):
            return cookies, rep_slug

    if allow_fallback:
        cookies = load_cookies(BOT_FALLBACK_SLUG)
        if cookies and all(cookies.get(c) for c in REQUIRED_COOKIES):
            return cookies, BOT_FALLBACK_SLUG

    return {}, ""


def healthiest_session_summary() -> dict:
    """Snapshot of every rep's session health. For the monitor script."""
    return {slug: check_health(slug).__dict__ for slug in list_sessions()}


__all__ = [
    "SessionHealth",
    "REQUIRED_COOKIES", "RECOMMENDED_COOKIES", "ALL_COOKIES",
    "BOT_FALLBACK_SLUG", "STALE_AFTER_DAYS",
    "SESSIONS_DIR", "PROFILES_DIR",
    "session_file", "profile_dir",
    "list_sessions", "load_session", "load_cookies", "save_session",
    "check_health", "cookies_for_rep", "healthiest_session_summary",
]
