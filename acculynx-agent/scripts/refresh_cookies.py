"""Headless Playwright login that refreshes AccuLynx session cookies per-rep.

The internal AccuLynx API requires four session cookies (.ASPXAUTH,
ASP.NET_SessionId, cf_clearance, deviceThumbprint). For SMS-via-rep-
impersonation, each sales rep needs their OWN four cookies so that texts
go through that rep's AccuLynx session and land from THEIR provisioned
phone number — not a single shared bot number.

This script seeds and refreshes cookies for any rep slug:

    python scripts/refresh_cookies.py                       # bot account (default)
    python scripts/refresh_cookies.py --rep austin          # specific rep
    python scripts/refresh_cookies.py --rep austin --headed # FIRST RUN per rep
    python scripts/refresh_cookies.py --all                 # refresh every rep

Each rep gets:
  acculynx/profiles/{slug}/        - persistent Chrome profile (Cloudflare cookies)
  acculynx/sessions/{slug}.json    - 4 captured cookies + metadata

Credentials per rep come from .env vars named:
  ACCULYNX_LOGIN_EMAIL_{SLUG}      e.g., ACCULYNX_LOGIN_EMAIL_AUSTIN
  ACCULYNX_LOGIN_PASSWORD_{SLUG}   e.g., ACCULYNX_LOGIN_PASSWORD_AUSTIN

For the bot account (default), uses:
  ACCULYNX_LOGIN_EMAIL
  ACCULYNX_LOGIN_PASSWORD

First-run flow (required ONCE per rep to seed cf_clearance):
  1. Run with --headed --rep <slug>
  2. Browser opens. If credentials in .env, it submits them.
  3. If 2FA appears, complete it manually. If a Cloudflare challenge appears,
     wait for it to pass.
  4. Script captures 4 cookies and writes to acculynx/sessions/{slug}.json.
  5. Future runs can be headless because the persistent profile carries the
     Cloudflare clearance forward.

Caveats:
  - If AccuLynx adds 2FA/MFA on the login form, headless will break and
    you need to re-do --headed.
  - cf_clearance is IP+UA-bound. Running from a different machine requires
    re-doing --headed from that machine.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from playwright.async_api import async_playwright

from acculynx.rep_sessions import (
    ALL_COOKIES,
    BOT_FALLBACK_SLUG,
    PROFILES_DIR,
    REQUIRED_COOKIES,
    check_health,
    profile_dir,
    save_session,
)

LOGIN_URL = "https://my.acculynx.com/signin"
POST_LOGIN_DETECT = "my.acculynx.com"


def _creds_for_slug(slug: str) -> tuple[str, str]:
    """Resolve email/password env vars for a rep slug.

    For the bot fallback we use the legacy ACCULYNX_LOGIN_EMAIL / _PASSWORD
    so this stays backwards-compatible with the existing .env. For other
    reps we use a slug-suffixed env var.
    """
    if slug == BOT_FALLBACK_SLUG:
        return (
            os.environ.get("ACCULYNX_LOGIN_EMAIL", ""),
            os.environ.get("ACCULYNX_LOGIN_PASSWORD", ""),
        )
    suffix = slug.upper().replace("-", "_")
    return (
        os.environ.get(f"ACCULYNX_LOGIN_EMAIL_{suffix}", ""),
        os.environ.get(f"ACCULYNX_LOGIN_PASSWORD_{suffix}", ""),
    )


async def login_and_capture(
    *,
    slug: str,
    email: str,
    password: str,
    headless: bool = True,
) -> dict:
    """Login + warmup + cookie capture for a single rep slug.

    Uses a per-slug persistent Chrome profile so Cloudflare's cf_clearance
    survives across runs. First call (preferably --headed) earns the
    clearance; subsequent headless calls reuse it.
    """
    prof_dir = profile_dir(slug)
    use_persistent = prof_dir.exists() or not headless
    prof_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        common_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--no-sandbox",
        ]
        user_agent = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/147.0.0.0 Safari/537.36"
        )

        if use_persistent:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(prof_dir),
                headless=headless,
                args=common_args,
                user_agent=user_agent,
                viewport={"width": 1280, "height": 800},
                locale="en-US",
                timezone_id="America/New_York",
            )
            browser = None
        else:
            browser = await p.chromium.launch(headless=headless, args=common_args)
            context = await browser.new_context(
                user_agent=user_agent,
                viewport={"width": 1280, "height": 800},
                locale="en-US",
                timezone_id="America/New_York",
            )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        page = await context.new_page()

        # Visit homepage first so Cloudflare gets to challenge a fresh
        # session before any form interaction. No-op when profile is warm.
        try:
            await page.goto("https://my.acculynx.com/", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
        except Exception:
            pass

        # Already-logged-in detection (persistent profile case).
        try:
            if "/jobs" in page.url or "/dashboard" in page.url or (
                "/signin" not in page.url and "/login" not in page.url and "my.acculynx.com" in page.url
            ):
                test_url = "https://my.acculynx.com/dashboard"
                await page.goto(test_url, wait_until="domcontentloaded", timeout=15000)
                if "/signin" not in page.url and "/login" not in page.url:
                    print(f"[{slug}] Persistent session valid — skipping credential entry")
                    return await _capture_cookies_after_warmup(page, context, browser)
        except Exception:
            pass

        # Credential entry path.
        if not email or not password:
            await (browser.close() if browser else context.close())
            raise RuntimeError(
                f"No credentials for slug '{slug}'. Set "
                f"ACCULYNX_LOGIN_EMAIL{'' if slug == BOT_FALLBACK_SLUG else '_' + slug.upper().replace('-', '_')} "
                f"and ACCULYNX_LOGIN_PASSWORD... in .env."
            )

        await page.goto(LOGIN_URL, wait_until="domcontentloaded")

        email_selector_candidates = [
            'input[name="Email"]', '#Email', 'input[type="email"]',
            'input[name="EmailAddress"]', '#EmailAddress',
        ]
        password_selector_candidates = [
            'input[name="Password"]', '#Password', 'input[type="password"]',
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
            await (browser.close() if browser else context.close())
            raise RuntimeError("Could not find email input on login page")
        await email_input.fill(email)

        password_input = await first_visible(password_selector_candidates)
        if not password_input:
            await (browser.close() if browser else context.close())
            raise RuntimeError("Could not find password input on login page")
        await password_input.fill(password)

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

        try:
            await page.wait_for_url(
                lambda url: POST_LOGIN_DETECT in url and "/login" not in url and "/signin" not in url,
                timeout=60000 if not headless else 30000,
            )
        except Exception:
            # In headed mode, give the user a chance to clear 2FA / Cloudflare.
            if not headless:
                print(f"[{slug}] Login didn't auto-complete. If a 2FA / CAPTCHA is showing, complete it now. Waiting up to 120s...")
                try:
                    await page.wait_for_url(
                        lambda url: POST_LOGIN_DETECT in url and "/login" not in url and "/signin" not in url,
                        timeout=120000,
                    )
                except Exception:
                    await (browser.close() if browser else context.close())
                    raise RuntimeError("Login did not complete within 120s. 2FA, CAPTCHA, or wrong creds.")
            else:
                await (browser.close() if browser else context.close())
                raise RuntimeError("Login did not complete (still on login page). Re-run with --headed.")

        return await _capture_cookies_after_warmup(page, context, browser)


async def _capture_cookies_after_warmup(page, context, browser) -> dict:
    """Warmup-navigate to a real job page so AccuLynx JS sets deviceThumbprint."""
    warmup_job_id = os.environ.get(
        "ACCULYNX_WARMUP_JOB_ID",
        "b54f39d8-ba98-4a79-97df-1112ab3a3ca8",  # TEST TEST - safe target
    )
    try:
        await page.goto(
            f"https://my.acculynx.com/jobs/{warmup_job_id}/communications",
            wait_until="networkidle",
            timeout=30000,
        )
        await page.wait_for_timeout(2500)
    except Exception as exc:
        print(f"WARN: warmup navigation failed: {exc}", file=sys.stderr)

    all_cookies = await context.cookies()
    captured = {c["name"]: c["value"] for c in all_cookies if c["name"] in ALL_COOKIES}
    if browser is not None:
        await browser.close()
    else:
        await context.close()

    missing = [n for n in ALL_COOKIES if n not in captured]
    if not all(captured.get(c) for c in REQUIRED_COOKIES):
        raise RuntimeError(f"Login succeeded but core auth cookies missing: {missing}")
    if missing:
        print(
            f"WARN: Captured only {sorted(captured.keys())}; missing {missing}. "
            "SMS will 401 until cf_clearance + deviceThumbprint populate. "
            "Run with --headed to earn the Cloudflare clearance the first time.",
            file=sys.stderr,
        )
    return captured


async def refresh_one(slug: str, headless: bool) -> int:
    email, password = _creds_for_slug(slug)
    print(f"\n=== Refreshing session for slug='{slug}' (headless={headless}) ===")
    try:
        cookies = await login_and_capture(
            slug=slug, email=email, password=password, headless=headless,
        )
    except Exception as exc:
        print(f"[{slug}] FAILED: {exc}", file=sys.stderr)
        return 1
    save_session(rep_slug=slug, cookies=cookies, rep_email=email)
    h = check_health(slug)
    print(f"[{slug}] saved. status={h.status}, cookies={sorted(cookies.keys())}")
    return 0


async def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh AccuLynx session cookies per rep.")
    parser.add_argument("--rep", default=BOT_FALLBACK_SLUG, help=f"Rep slug to refresh (default: {BOT_FALLBACK_SLUG})")
    parser.add_argument("--all", action="store_true", help="Refresh every rep in config/reps.yaml that has a profile slug.")
    parser.add_argument("--headed", action="store_true", help="Show the browser (use for first-run per rep).")
    args = parser.parse_args()

    # Lazily load env so settings.py loads .env first
    from config.settings import settings  # noqa: F401

    headless = not args.headed

    if args.all:
        from config.reps import all_reps, bot_account
        slugs: list[str] = []
        bot = bot_account()
        if bot.get("acculynx_profile_slug"):
            slugs.append(bot["acculynx_profile_slug"])
        for rep in all_reps():
            if rep.acculynx_profile_slug and rep.acculynx_profile_slug not in slugs:
                slugs.append(rep.acculynx_profile_slug)
        if not slugs:
            print("No rep slugs configured. Edit config/reps.yaml.", file=sys.stderr)
            return 1
        rc = 0
        for slug in slugs:
            rc |= await refresh_one(slug, headless=headless)
        return rc

    return await refresh_one(args.rep, headless=headless)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
