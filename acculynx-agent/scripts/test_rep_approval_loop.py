"""Rep onboarding test — verifies that approval emails actually land, the
magic-link click resolves on the agent, and the Approval row updates.

USAGE:
    # Test every rep in config/reps.yaml that has a non-empty email:
    python scripts/test_rep_approval_loop.py --all

    # Test a single rep by slug:
    python scripts/test_rep_approval_loop.py --slug austin

    # Skip the live email send (dry-run the harness itself):
    python scripts/test_rep_approval_loop.py --slug austin --dry

The script seeds a synthetic Lead + MessageQueue + Approval row, calls the
same create_approval_request() the agent uses in production, prints the
magic-link URLs, and polls the DB for up to 10 minutes waiting for the
rep to click. When it sees `approvals.decided_at` populated it reports the
elapsed time and exits success.

If `app_base_url` is localhost, prints a reminder that the rep's click will
only resolve if the agent is reachable from their browser (use a tunnel).
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow running as `python scripts/test_rep_approval_loop.py` from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from config.reps import Rep, all_reps  # noqa: E402
from config.settings import settings  # noqa: E402
from db.database import async_session, init_db  # noqa: E402
from db.models import Approval, Lead  # noqa: E402
from engine.approval_flow import create_approval_request  # noqa: E402


SYNTHETIC_LEAD_PREFIX = "rep-onboarding-test-"
SAMPLE_BODY = (
    "Hey {first_name}, this is a launch-readiness test sent from the agent. "
    "If you're reading this, the approval email path works. Please click "
    "either Approve or Skip below so we can confirm the click resolves.\n\n"
    "— MDR AI"
)


async def _seed_lead(rep: Rep) -> str:
    lead_id = f"{SYNTHETIC_LEAD_PREFIX}{rep.email.split('@')[0]}"
    async with async_session() as session:
        existing = (await session.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
        if existing:
            return lead_id
        lead = Lead(
            id=lead_id,
            job_number="REP-TEST",
            contact_name=f"{rep.first_name} (synthetic test)",
            contact_email=rep.email,
            contact_phone="+15555550100",
            address="N/A",
            milestone="Prospect",
            assigned_rep_id=rep.rep_id,
            assigned_rep_name=rep.name,
            is_active=True,
            layer_name="ESTIMATE_FOLLOWUP",
            layer_entered_date=datetime.now(timezone.utc),
            cadence_name="ESTIMATE_FOLLOWUP",
            cadence_start_date=datetime.now(timezone.utc),
            cadence_touch_index=0,
        )
        session.add(lead)
        await session.commit()
    return lead_id


async def test_rep(rep: Rep, *, dry: bool, poll_minutes: int) -> bool:
    if not rep.email:
        print(f"  [SKIP] {rep.name}: no email configured")
        return False

    lead_id = await _seed_lead(rep)
    print(f"  Seeded synthetic lead {lead_id}")

    body = SAMPLE_BODY.format(first_name=rep.first_name or rep.name)

    print(f"  Creating approval request → {rep.email}")
    result = await create_approval_request(
        lead_id=lead_id,
        channel="email",
        subject="[LAUNCH TEST] Please click to verify the approval loop",
        body=body,
        cadence_name="ESTIMATE_FOLLOWUP",
        touch_index=0,
        content_type="rep_onboarding_test",
        rep=rep,
    )
    print(f"    message_id   = {result['message_id']}")
    print(f"    approval_id  = {result['approval_id']}")
    print(f"    sent={result['notification_sent']} dry_run={result['notification_dry_run']} err={result['notification_error']}")
    print(f"    approve link = {result['links']['approve']}")
    print(f"    skip link    = {result['links']['skip']}")

    if dry:
        print("  --dry: not polling for click")
        return True

    if "localhost" in settings.app_base_url or "127.0.0.1" in settings.app_base_url:
        print(
            "  ⚠ app_base_url is local — the click will only resolve if the rep's browser "
            "can reach this machine. Use cloudflared/ngrok and set APP_BASE_URL to the "
            "tunnel URL before running this for a real rep."
        )

    approval_id = result["approval_id"]
    deadline = datetime.now(timezone.utc).timestamp() + poll_minutes * 60
    started = datetime.now(timezone.utc)
    print(f"  Polling for click for up to {poll_minutes} min...")
    while datetime.now(timezone.utc).timestamp() < deadline:
        async with async_session() as session:
            r = await session.execute(select(Approval).where(Approval.id == approval_id))
            ap = r.scalar_one_or_none()
        if ap and ap.decided_at:
            elapsed = (ap.decided_at - started).total_seconds() if ap.decided_at else None
            print(f"  ✓ {rep.name} clicked: decision={ap.decision} after {elapsed:.0f}s")
            return True
        await asyncio.sleep(5)
    print(f"  ✗ {rep.name}: no click within {poll_minutes} min")
    return False


async def main() -> int:
    parser = argparse.ArgumentParser()
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--all", action="store_true", help="Test every rep with an email")
    g.add_argument("--slug", help="Test a single rep by acculynx_profile_slug or rep_id")
    parser.add_argument("--dry", action="store_true", help="Don't poll after send")
    parser.add_argument("--poll-minutes", type=int, default=10)
    args = parser.parse_args()

    await init_db()

    reps = all_reps()
    if args.slug:
        reps = [r for r in reps if (getattr(r, "acculynx_profile_slug", "") == args.slug
                                   or r.rep_id == args.slug
                                   or (r.email and r.email.split("@")[0] == args.slug))]
        if not reps:
            print(f"No rep matched slug={args.slug!r}")
            return 2

    print(f"Testing {len(reps)} rep(s). app_base_url={settings.app_base_url}")
    if settings.dry_run:
        print("WARNING: DRY_RUN=true — the approval *notification* email may also be suppressed.")
    print("-" * 70)

    results = []
    for rep in reps:
        print(f"\nRep: {rep.name} <{rep.email}>")
        ok = await test_rep(rep, dry=args.dry, poll_minutes=args.poll_minutes)
        results.append((rep.name, ok))

    print("\n" + "=" * 70)
    print("RESULTS")
    for name, ok in results:
        print(f"  {'✓' if ok else '✗'}  {name}")
    return 0 if all(ok for _, ok in results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
