"""Headless Playwright login that refreshes the AccuLynx session cookies.

The internal API at my.acculynx.com requires session cookies that expire
every 30-60 days. Manually pasting from Chrome DevTools every couple
months is fragile — when those cookies die, the agent loses access to
Communications content. This script automates the refresh.

How it works:
  1. Reads ACCULYNX_LOGIN_EMAIL + ACCULYNX_LOGIN_PASSWORD from .env
  2. Opens a headless Chromium session
  3. Navigates to my.acculynx.com login
  4. Submits credentials
  5. Waits for the post-login redirect that proves auth succeeded
  6. Extracts the .ASPXAUTH + ASP.NET_SessionId + cf_clearance + deviceThumbprint cookies
  7. Writes them back to .env as ACCULYNX_SESSION_COOKIE
  8. Exits 0 on success, 1 on failure

Usage:
  python scripts/refresh_cookies.py             # one-shot refresh
  python scripts/refresh_cookies.py --headed    # show the browser (debug)

Designed to be run by:
  - Cron / launchd weekly
  - The cookie_health_job in engine/scheduler.py when expiry detected
  - A human ops engineer when something goes sideways

Caveats:
  - If AccuLynx adds 2FA / MFA / CAPTCHA on the login form this breaks.
  - Recommended: use a DEDICATED AccuLynx user account ("agent-bot@...")
    so it's isolated from any human account that might enable 2FA.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from playwright.async_api import async_playwright

LOGIN_URL = "https://my.acculynx.com/signin"
POST_LOGIN_DETECT = "my.acculynx.com"  # any my.acculynx.com URL after login = success
COOKIES_TO_CAPTURE = (".ASPXAUTH", "ASP.NET_SessionId", "cf_clearance", "deviceThumbprint")
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
ENV_KEY = "ACCULYNX_SESSION_COOKIE"


async def login_and_capture(*, email: str, password: str, headless: bool = True) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/147.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        await page.goto(LOGIN_URL, wait_until="domcontentloaded")

        # AccuLynx login form (verified 2026-05-03): name="Email" + name="Password",
        # SIGN IN button has no type attribute. Fall-back selectors kept for resilience.
        email_selector_candidates = [
            'input[name="Email"]',
            '#Email',
            'input[type="email"]',
            'input[name="EmailAddress"]',
            '#EmailAddress',
        ]
        password_selector_candidates = [
            'input[name="Password"]',
            '#Password',
            'input[type="password"]',
        ]

        async def first_visible(selectors: list[str]):
            for sel in selectors:
                el = page.locator(sel).first
                try:
                    if await el.count() and await el.is_visible():
                        return el
                except Exception:
                    pass
            return None

        email_input = await first_visible(email_selector_candidates)
        if not email_input:
            await browser.close()
            raise RuntimeError("Could not find email input on login page")

        await email_input.fill(email)

        password_input = await first_visible(password_selector_candidates)
        if not password_input:
            await browser.close()
            raise RuntimeError("Could not find password input on login page")

        await password_input.fill(password)

        # Try common submit patterns. AccuLynx's SIGN IN button has no `type`
        # attribute — match by text. Avoid the "Sign in with Google" variant.
        submitted = False
        for sel in [
            'button:has-text("SIGN IN"):not(:has-text("Google"))',
            'button:has-text("Sign In"):not(:has-text("Google"))',
            'button:has-text("Log In"):not(:has-text("Google"))',
            'button[type="submit"]:not(:has-text("Google"))',
            'input[type="submit"]',
        ]:
            try:
                btn = page.locator(sel).first
                if await btn.count() and await btn.is_visible():
                    await btn.click()
                    submitted = True
                    break
            except Exception:
                pass
        if not submitted:
            await password_input.press("Enter")

        # Wait for navigation away from /login (success signal)
        try:
            await page.wait_for_url(
                lambda url: POST_LOGIN_DETECT in url and "/login" not in url,
                timeout=30000,
            )
        except Exception:
            await browser.close()
            raise RuntimeError("Login did not complete (still on login page after submit). 2FA, CAPTCHA, or wrong creds.")

        # Pull cookies
        all_cookies = await context.cookies()
        captured = {c["name"]: c["value"] for c in all_cookies if c["name"] in COOKIES_TO_CAPTURE}
        await browser.close()

        missing = [n for n in COOKIES_TO_CAPTURE if n not in captured]
        if ".ASPXAUTH" not in captured or "ASP.NET_SessionId" not in captured:
            raise RuntimeError(f"Login appeared to succeed but core auth cookies missing: {missing}")
        return captured


def write_env(cookies: dict) -> None:
    """Replace the ACCULYNX_SESSION_COOKIE line in .env (or append if missing)."""
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items() if v)
    text = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.exists() else ""
    lines = text.splitlines()
    new_lines: list[str] = []
    replaced = False
    for line in lines:
        if line.startswith(f"{ENV_KEY}="):
            new_lines.append(f"{ENV_KEY}='{cookie_str}'")
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        new_lines.append(f"{ENV_KEY}='{cookie_str}'")
    ENV_PATH.write_text("\n".join(new_lines).rstrip() + "\n", encoding="utf-8")


async def main() -> int:
    headless = "--headed" not in sys.argv

    # Lazily load env so settings.py loads .env first
    from config.settings import settings  # noqa: F401

    email = os.environ.get("ACCULYNX_LOGIN_EMAIL", "")
    password = os.environ.get("ACCULYNX_LOGIN_PASSWORD", "")
    if not email or not password:
        print(
            "Missing ACCULYNX_LOGIN_EMAIL or ACCULYNX_LOGIN_PASSWORD in .env.\n"
            "Add a dedicated AccuLynx bot user's credentials, then re-run.",
            file=sys.stderr,
        )
        return 1

    try:
        cookies = await login_and_capture(email=email, password=password, headless=headless)
    except Exception as exc:
        print(f"Refresh failed: {exc}", file=sys.stderr)
        return 1

    write_env(cookies)
    print(f"Refreshed {len(cookies)} cookies, written to {ENV_PATH}")
    print(f"Captured: {sorted(cookies.keys())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
