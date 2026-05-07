"""Health check for the AccuLynx internal-API session cookie.

Run this from cron / scheduler. If the cookie is dead, it emails you so
you know to refresh it. If healthy, it exits 0 silently.

Usage:
  python scripts/check_cookie.py            # one-shot check
  python scripts/check_cookie.py --notify   # email on failure
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

from acculynx.internal_api import (
    AUTH_COOKIE_NAMES,
    INTERNAL_BASE,
    USER_AGENT,
    _cookies,
    is_configured,
)
from config.settings import settings


async def health_check() -> dict:
    """Hit a known-cheap endpoint to validate cookies.

    Returns {ok, status_code, message}.
    """
    if not is_configured():
        return {"ok": False, "status_code": None, "message": "Cookie not configured in .env"}

    cookies = _cookies()
    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": USER_AGENT,
        "X-Device-Time-Zone": "America/New_York",
        "Referer": "https://my.acculynx.com/",
    }

    # Pick any active lead from our DB to probe with
    from sqlalchemy import select
    from db.database import async_session
    from db.models import Lead

    probe_lead_id = None
    async with async_session() as s:
        r = await s.execute(select(Lead.id).where(Lead.is_active == True).limit(1))
        row = r.first()
        if row:
            probe_lead_id = row[0]

    if not probe_lead_id:
        return {"ok": False, "status_code": None, "message": "No active leads in DB to probe"}

    url = f"{INTERNAL_BASE}/jobs/{probe_lead_id}/messages"
    try:
        async with httpx.AsyncClient(timeout=15, cookies=cookies, headers=headers) as c:
            r = await c.get(url)
        if r.status_code == 200:
            return {"ok": True, "status_code": 200, "message": "Cookie is valid"}
        if r.status_code in (401, 403):
            return {
                "ok": False,
                "status_code": r.status_code,
                "message": "EXPIRED — refresh ACCULYNX_SESSION_COOKIE in .env",
            }
        return {
            "ok": False,
            "status_code": r.status_code,
            "message": f"Unexpected status {r.status_code}",
        }
    except Exception as exc:
        return {"ok": False, "status_code": None, "message": f"Network error: {exc}"}


async def main() -> int:
    notify = "--notify" in sys.argv
    result = await health_check()
    when = datetime.now(timezone.utc).isoformat(timespec="seconds")
    status = "✓" if result["ok"] else "✗"
    print(f"[{when}] {status} AccuLynx cookie: {result['message']}")

    if not result["ok"] and notify:
        # Send notification email via the same SendGrid we already use
        try:
            from messaging.sendgrid_email import send_email
            send_email(
                to_email=settings.escalation_email or "colinjrbh317@gmail.com",
                subject="[MDR Agent] AccuLynx session cookie EXPIRED",
                body_text=(
                    f"Cookie health check failed at {when}.\n\n"
                    f"Status: {result.get('status_code')}\n"
                    f"Message: {result['message']}\n\n"
                    "ACTION: Re-paste the Cookie header from a logged-in AccuLynx Chrome session "
                    "into ACCULYNX_SESSION_COOKIE in .env and restart the server.\n\n"
                    "Steps:\n"
                    "  1. Open my.acculynx.com in Chrome (must be logged in).\n"
                    "  2. Open DevTools → Network tab.\n"
                    "  3. Click any job.\n"
                    "  4. Find any /api/v4/... request, right-click → Copy → Copy as cURL.\n"
                    "  5. Extract the Cookie: header from the cURL, paste into .env.\n"
                ),
                from_email=settings.sendgrid_from_email,
                from_name="MDR Agent Monitor",
            )
            print(f"[{when}] notification email sent")
        except Exception as exc:
            print(f"[{when}] failed to send notification: {exc}")

    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
