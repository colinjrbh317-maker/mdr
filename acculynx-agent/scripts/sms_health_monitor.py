"""Nightly AccuLynx session health monitor.

Designed to be run from cron. For every configured rep (and the bot fallback),
it diagnoses the on-disk session, attempts a headless refresh of anything that
isn't healthy, and emails Colin if any session is unrecoverable so he can
re-run the headed refresh before the next outbound SMS fails at the gate.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from acculynx.rep_sessions import (
    BOT_FALLBACK_SLUG,
    SessionHealth,
    check_health,
    list_sessions,
)
from config.reps import all_reps, bot_account
from config.settings import settings
from messaging.sendgrid_email import send_email

REFRESH_SCRIPT = Path(__file__).resolve().parent / "refresh_cookies.py"
REFRESH_TIMEOUT_SECONDS = 90
UNHEALTHY_STATUSES = {"stale", "degraded", "missing"}


@dataclass
class SlugReport:
    slug: str
    before_status: str
    before_age_days: Optional[float]
    attempted_refresh: bool = False
    refresh_stdout: str = ""
    refresh_stderr: str = ""
    refresh_returncode: Optional[int] = None
    refresh_error: Optional[str] = None
    after_status: str = ""
    after_age_days: Optional[float] = None
    ok: bool = False


def _collect_slugs(only_rep: Optional[str]) -> list[str]:
    if only_rep:
        return [only_rep]
    ordered: list[str] = []
    seen: set[str] = set()

    def add(slug: str) -> None:
        slug = (slug or "").strip()
        if slug and slug not in seen:
            ordered.append(slug)
            seen.add(slug)

    add(BOT_FALLBACK_SLUG)
    bot = bot_account()
    add(bot.get("acculynx_profile_slug", ""))
    for rep in all_reps():
        add(rep.acculynx_profile_slug)
    for slug in list_sessions():
        add(slug)
    return ordered


def _fmt_age(age_days: Optional[float]) -> str:
    if age_days is None:
        return "n/a"
    return f"{age_days:.1f}d"


def _run_refresh(slug: str) -> tuple[Optional[int], str, str, Optional[str]]:
    try:
        result = subprocess.run(
            [sys.executable, str(REFRESH_SCRIPT), "--rep", slug],
            capture_output=True,
            text=True,
            timeout=REFRESH_TIMEOUT_SECONDS,
            cwd=str(REFRESH_SCRIPT.resolve().parent.parent),
        )
        return result.returncode, result.stdout, result.stderr, None
    except subprocess.TimeoutExpired as exc:
        return None, exc.stdout or "", exc.stderr or "", f"timeout after {REFRESH_TIMEOUT_SECONDS}s"
    except Exception as exc:
        return None, "", "", f"{type(exc).__name__}: {exc}"


def _diagnose(slug: str, *, allow_refresh: bool) -> SlugReport:
    before: SessionHealth = check_health(slug)
    report = SlugReport(
        slug=slug,
        before_status=before.status,
        before_age_days=before.age_days,
        after_status=before.status,
        after_age_days=before.age_days,
    )

    if before.status == "healthy":
        report.ok = True
        return report

    if not allow_refresh:
        report.ok = False
        return report

    if before.status in UNHEALTHY_STATUSES:
        report.attempted_refresh = True
        rc, out, err, error = _run_refresh(slug)
        report.refresh_returncode = rc
        report.refresh_stdout = out
        report.refresh_stderr = err
        report.refresh_error = error

        after = check_health(slug)
        report.after_status = after.status
        report.after_age_days = after.age_days

    report.ok = report.after_status == "healthy"
    return report


def _print_report(reports: list[SlugReport]) -> None:
    print("=" * 72)
    print("AccuLynx Session Health Monitor")
    print("=" * 72)
    for r in reports:
        line = (
            f"[{'OK ' if r.ok else 'BAD'}] {r.slug:<28} "
            f"before={r.before_status:<9} age={_fmt_age(r.before_age_days):<7}"
        )
        if r.attempted_refresh:
            rc = r.refresh_returncode if r.refresh_returncode is not None else "ERR"
            line += f" refresh(rc={rc}) -> after={r.after_status:<9} age={_fmt_age(r.after_age_days)}"
        print(line)
        if r.refresh_error:
            print(f"    refresh error: {r.refresh_error}")
        if r.attempted_refresh and not r.ok and r.refresh_stderr:
            tail = r.refresh_stderr.strip().splitlines()[-3:]
            for ln in tail:
                print(f"    stderr: {ln}")
    healthy = sum(1 for r in reports if r.ok)
    print("-" * 72)
    print(f"Summary: {healthy}/{len(reports)} healthy, {len(reports) - healthy} need attention")
    print("=" * 72)


def _build_email_body(reports: list[SlugReport], all_ok: bool) -> tuple[str, str, str]:
    bad = [r for r in reports if not r.ok]
    if all_ok:
        subject = f"AccuLynx session monitor: all {len(reports)} sessions healthy"
    else:
        subject = f"AccuLynx session degraded: {len(bad)} rep(s) need headed refresh"

    lines: list[str] = []
    lines.append(f"AccuLynx Session Health Monitor")
    lines.append(f"Checked: {len(reports)} session(s)")
    lines.append(f"Healthy: {len(reports) - len(bad)}")
    lines.append(f"Needs attention: {len(bad)}")
    lines.append("")

    if bad:
        lines.append("Sessions needing headed refresh:")
        lines.append("")
        for r in bad:
            lines.append(f"  {r.slug}")
            lines.append(f"    before: {r.before_status} (age {_fmt_age(r.before_age_days)})")
            if r.attempted_refresh:
                lines.append(
                    f"    headless refresh: rc={r.refresh_returncode} -> "
                    f"after {r.after_status} (age {_fmt_age(r.after_age_days)})"
                )
                if r.refresh_error:
                    lines.append(f"    error: {r.refresh_error}")
            lines.append(f"    fix: python scripts/refresh_cookies.py --rep {r.slug} --headed")
            lines.append("")

    lines.append("All sessions:")
    for r in reports:
        tag = "OK " if r.ok else "BAD"
        line = f"  [{tag}] {r.slug} before={r.before_status} age={_fmt_age(r.before_age_days)}"
        if r.attempted_refresh:
            line += f" after={r.after_status} age={_fmt_age(r.after_age_days)}"
        lines.append(line)

    body_text = "\n".join(lines)

    html_lines = ["<pre style=\"font-family:monospace;font-size:13px;\">"]
    html_lines.append(body_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    html_lines.append("</pre>")
    body_html = "\n".join(html_lines)

    return subject, body_text, body_html


def _send_alert(reports: list[SlugReport], all_ok: bool) -> None:
    recipient = settings.sms_alert_recipient
    if not recipient:
        print("No sms_alert_recipient configured; skipping email.")
        return
    subject, body_text, body_html = _build_email_body(reports, all_ok)
    result = send_email(
        to_email=recipient,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        from_email=settings.sendgrid_from_email,
        from_name=settings.sendgrid_from_name,
    )
    if result.sent:
        print(f"Alert email sent to {recipient} (sg_id={result.sendgrid_message_id})")
    else:
        print(f"Alert email FAILED to {recipient}: {result.error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="AccuLynx session health monitor")
    parser.add_argument("--always-email", action="store_true",
                        help="Send a digest email even when everything is healthy.")
    parser.add_argument("--no-refresh", action="store_true",
                        help="Diagnose only; do not attempt headless refresh.")
    parser.add_argument("--rep", default=None,
                        help="Limit the check to a single rep slug.")
    args = parser.parse_args()

    slugs = _collect_slugs(args.rep)
    if not slugs:
        print("No slugs to check.")
        return 0

    reports = [_diagnose(slug, allow_refresh=not args.no_refresh) for slug in slugs]
    _print_report(reports)

    all_ok = all(r.ok for r in reports)
    if not all_ok or args.always_email:
        _send_alert(reports, all_ok)

    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
