"""SMS smoke test harness for AccuLynx-impersonation sends.

Runs an ordered series of preflight checks against the TEST TEST prospect
(Colin's own number) so the operator knows the SMS pipeline is launch-ready.

Usage:
    python scripts/smoke_test_sms.py                 # preflight only, no send
    python scripts/smoke_test_sms.py --send          # actually send a test SMS
    python scripts/smoke_test_sms.py --rep austin    # pick a specific rep slug
    python scripts/smoke_test_sms.py --alert-test    # send a fake failure alert
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import settings
from messaging import dispatch
from messaging.sms_alerts import alert_sms_failure
from acculynx.rep_sessions import check_health, list_sessions, BOT_FALLBACK_SLUG
from acculynx.send_text import TextSendResult
from acculynx.opt_in_check import check_opt_in_sync
from acculynx.internal_api import get_sms_correspondent_id_sync


JOB_ID = "b54f39d8-ba98-4a79-97df-1112ab3a3ca8"
CORRESPONDENT_ID = "b3d53f86-2d47-f111-8af3-ea808804e890"
PHONE = "(908) 499-9449"
NAME = "TEST TEST"


class Tally:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.warned = 0
        self.skipped = 0
        self.total_required = 0

    def passed_(self, msg: str, required: bool = True) -> None:
        if required:
            self.total_required += 1
        self.passed += 1
        print(f"[PASS] {msg}")

    def failed_(self, msg: str, required: bool = True) -> None:
        if required:
            self.total_required += 1
        self.failed += 1
        print(f"[FAIL] {msg}")

    def warned_(self, msg: str) -> None:
        self.warned += 1
        print(f"[WARN] {msg}")

    def skipped_(self, msg: str) -> None:
        self.skipped += 1
        print(f"[SKIP] {msg}")


def section(title: str) -> None:
    print()
    print(f"=== {title} ===")


def check_settings(t: Tally) -> None:
    section("1. Settings sanity")
    try:
        print(f"  dry_run                    = {settings.dry_run}")
        print(f"  messaging_channels         = {settings.messaging_channels!r}")
        print(f"  test_lead_allowlist        = {settings.test_lead_allowlist!r}")
        print(f"  sendgrid_api_key set?      = {bool(settings.sendgrid_api_key)}")
        print(f"  sms_alert_recipient        = {settings.sms_alert_recipient!r}")
        print(f"  sms_alerts_enabled         = {settings.sms_alerts_enabled}")
        print(f"  sms_opt_in_check_enabled   = {settings.sms_opt_in_check_enabled}")

        channels = {c.strip().lower() for c in settings.messaging_channels.split(",") if c.strip()}

        if settings.dry_run:
            t.failed_("dry_run is True — SMS will silently no-op")
        else:
            t.passed_("dry_run is False")

        if "sms" not in channels:
            t.failed_("'sms' not in messaging_channels")
        else:
            t.passed_("'sms' is in messaging_channels")
    except Exception as exc:
        t.failed_(f"settings check raised: {exc!r}")


def check_cookies(t: Tally) -> None:
    section("2. Cookie health")
    try:
        slugs = list(dict.fromkeys([*list_sessions(), BOT_FALLBACK_SLUG]))
        for slug in slugs:
            try:
                h = check_health(slug)
                age = f"{h.age_days:.1f}d" if h.age_days is not None else "n/a"
                print(
                    f"  {slug:25s} status={h.status:9s} "
                    f"required={h.has_required} recommended={h.has_recommended} age={age}"
                )
                if slug == BOT_FALLBACK_SLUG:
                    if h.status == "healthy" and h.has_required and h.has_recommended:
                        t.passed_(f"bot fallback session '{slug}' is healthy")
                    else:
                        t.failed_(
                            f"bot fallback '{slug}' not healthy "
                            f"(status={h.status}, required={h.has_required}, recommended={h.has_recommended})"
                        )
                else:
                    if h.status != "healthy":
                        t.warned_(f"rep '{slug}' is {h.status}")
            except Exception as exc:
                t.failed_(f"check_health({slug!r}) raised: {exc!r}")
    except Exception as exc:
        t.failed_(f"cookie health loop raised: {exc!r}")


def check_correspondent(t: Tally, rep_slug: str | None) -> None:
    section("3. Correspondent lookup")
    try:
        cid = get_sms_correspondent_id_sync(job_id=JOB_ID, phone=PHONE, rep_slug=rep_slug)
        print(f"  returned correspondent_id = {cid!r}")
        if cid == CORRESPONDENT_ID:
            t.passed_("correspondent lookup matches expected ID")
        else:
            t.failed_(f"correspondent lookup mismatch: expected {CORRESPONDENT_ID!r}, got {cid!r}")
    except Exception as exc:
        t.failed_(f"get_sms_correspondent_id_sync raised: {exc!r}")


def check_opt_in(t: Tally, rep_slug: str | None) -> None:
    section("4. Opt-in pre-flight")
    try:
        r = check_opt_in_sync(
            job_id=JOB_ID,
            correspondent_id=CORRESPONDENT_ID,
            phone=PHONE,
            rep_slug=rep_slug,
        )
        print(f"  can_send         = {r.can_send}")
        print(f"  opt_in_state     = {r.opt_in_state}")
        print(f"  correspondent_id = {r.correspondent_id}")
        print(f"  phone_normalized = {r.phone_normalized}")
        print(f"  raw_field_seen   = {r.raw_field_seen}")
        print(f"  detail           = {r.detail}")
        if r.can_send:
            t.passed_(f"opt-in OK (state={r.opt_in_state})")
        else:
            t.failed_(f"opt-in blocks send: {r.detail} (state={r.opt_in_state})")
    except Exception as exc:
        t.failed_(f"check_opt_in_sync raised: {exc!r}")


def run_alert_test(t: Tally, rep_slug: str | None) -> None:
    section("5. Alert-test (fake failure email)")
    try:
        fake = TextSendResult(
            sent=False,
            delivered=None,
            message_id=None,
            status_code=401,
            error="auth",
            raw_response="<smoke-test fake response>",
            sender_slug=rep_slug or BOT_FALLBACK_SLUG,
        )
        alert_sms_failure(
            job_id=JOB_ID,
            rep_slug=rep_slug or BOT_FALLBACK_SLUG,
            rep_name="Smoke Test",
            to_phone=PHONE,
            to_name=NAME,
            body_text=f"smoke-test fake alert {datetime.now(timezone.utc).isoformat()}",
            result=fake,
            fallback_comment_posted=False,
        )
        t.passed_(f"Sent test failure alert to {settings.sms_alert_recipient}. Check inbox.")
    except Exception as exc:
        t.failed_(f"alert_sms_failure raised: {exc!r}")


def run_live_send(t: Tally, rep_slug: str | None) -> None:
    section("6. Live send")
    try:
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        body = f"smoke test {ts}"
        result = dispatch(
            channel="sms",
            to_phone=PHONE,
            to_name=NAME,
            body_text=body,
            lead_id=JOB_ID,
            acculynx_job_id=JOB_ID,
            acculynx_correspondent_id=CORRESPONDENT_ID,
            rep_slug=rep_slug,
            rep_name="Test",
        )
        print(f"  sent             = {result.sent}")
        print(f"  dry_run          = {result.dry_run}")
        print(f"  blocked_reason   = {result.blocked_reason}")
        print(f"  external_message_id = {result.external_message_id}")
        print(f"  status_code      = {result.status_code}")
        print(f"  error            = {result.error}")
        if result.sent:
            t.passed_(f"live SMS dispatched (body: {body!r})")
        else:
            reason = result.error or result.blocked_reason or "unknown"
            t.failed_(f"live SMS not sent: {reason}")
    except Exception as exc:
        t.failed_(f"dispatch raised: {exc!r}")


def main() -> int:
    ap = argparse.ArgumentParser(description="SMS smoke test for AccuLynx pipeline")
    ap.add_argument("--send", action="store_true", help="actually send a test SMS")
    ap.add_argument("--rep", default=None, help="rep slug to send through (defaults to bot fallback)")
    ap.add_argument("--alert-test", action="store_true", help="send a fake failure alert email")
    args = ap.parse_args()

    t = Tally()

    print(f"Target: {NAME}  phone={PHONE}")
    print(f"Job:    {JOB_ID}")
    print(f"Corr:   {CORRESPONDENT_ID}")
    print(f"Rep:    {args.rep or '(bot fallback)'}")

    check_settings(t)
    check_cookies(t)
    check_correspondent(t, args.rep)
    check_opt_in(t, args.rep)

    if args.alert_test:
        run_alert_test(t, args.rep)
    else:
        section("5. Alert-test")
        t.skipped_("--alert-test not set")

    if args.send:
        run_live_send(t, args.rep)
    else:
        section("6. Live send")
        t.skipped_("--send not set")

    print()
    print("=" * 60)
    if t.failed == 0:
        summary = f"{t.passed}/{t.passed} PASS — launch-ready"
        if t.warned:
            summary += f" ({t.warned} warnings)"
        if t.skipped:
            summary += f" ({t.skipped} skipped)"
        print(summary)
        return 0
    total = t.passed + t.failed
    print(f"{t.passed}/{total} PASS, {t.failed} FAIL — see above")
    return 1


if __name__ == "__main__":
    sys.exit(main())
