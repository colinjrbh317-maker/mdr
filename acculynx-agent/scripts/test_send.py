"""Phase A smoke test, send one branded email to verify SendGrid is wired up.

Usage:
    # Dry run (default, no actual send):
    python scripts/test_send.py colinjrbh317@gmail.com

    # Real send (requires DRY_RUN=false in .env):
    DRY_RUN=false python scripts/test_send.py colinjrbh317@gmail.com

    # Real send overriding env via flag:
    python scripts/test_send.py --live colinjrbh317@gmail.com
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Make the project root importable when running this script directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a smoke-test email via SendGrid.")
    parser.add_argument("recipient", help="email address to send to")
    parser.add_argument(
        "--live",
        action="store_true",
        help="override DRY_RUN and actually deliver",
    )
    parser.add_argument(
        "--lead-id",
        default="smoke-test",
        help="fake lead id used to build the per-lead Reply-To",
    )
    args = parser.parse_args()

    if args.live:
        os.environ["DRY_RUN"] = "false"

    # Import AFTER possibly mutating env, so settings picks it up.
    from config.settings import settings
    from messaging import dispatch

    subject = "Smoke test from the AccuLynx AI agent"
    body_text = (
        f"Hey there,\n\n"
        f"Quick smoke test from the agent. If you got this, the SendGrid pipe is wired up.\n\n"
        f"Sent from: {settings.sendgrid_from_name} <{settings.sendgrid_from_email}>\n"
        f"Reply-To routes through: reply+{args.lead_id}@{settings.sendgrid_reply_subdomain}\n"
        f"Channel router: {settings.messaging_channels}\n"
        f"Solo-sender mode: {settings.solo_sender_mode}\n"
        f"Dry run: {settings.dry_run}\n\n"
        f"Reply to this email to test the inbound parse webhook (after Phase F is up).\n\n"
        f"Colin"
    )

    print("Recipient:    ", args.recipient)
    print("From:         ", f"{settings.sendgrid_from_name} <{settings.sendgrid_from_email}>")
    print("Subject:      ", subject)
    print("Channels:     ", settings.messaging_channels)
    print("Dry run:      ", settings.dry_run)
    print("API key set:  ", bool(settings.sendgrid_api_key))
    print()

    result = dispatch(
        channel="email",
        to_email=args.recipient,
        to_name="Colin Ryan",
        subject=subject,
        body_text=body_text,
        lead_id=args.lead_id,
    )

    print("Result:")
    print(f"  sent:                {result.sent}")
    print(f"  dry_run:             {result.dry_run}")
    print(f"  blocked_reason:      {result.blocked_reason}")
    print(f"  external_message_id: {result.external_message_id}")
    print(f"  rfc_message_id:      {result.rfc_message_id}")
    print(f"  status_code:         {result.status_code}")
    if result.error:
        print(f"  error:               {result.error}")

    return 0 if (result.sent or result.dry_run) else 1


if __name__ == "__main__":
    raise SystemExit(main())
