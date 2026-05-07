"""Register / manage / inspect AccuLynx webhook subscriptions for this app.

Usage:

  # Show what's currently subscribed
  python scripts/register_webhook.py list

  # Register OUR subscription against a public URL (e.g. ngrok or Railway).
  # Embeds the auth token from .env automatically.
  python scripts/register_webhook.py register https://abc.ngrok.app

  # Re-point an existing subscription to a new URL (e.g. Railway after ngrok)
  python scripts/register_webhook.py rotate https://prod.example.com

  # Soft-delete a subscription by id
  python scripts/register_webhook.py disable <subscription_id>
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from urllib.parse import urlencode, urlparse, urlunparse

# Allow running as ``python scripts/register_webhook.py``
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from acculynx.webhooks import (
    DESIRED_TOPICS,
    create_subscription,
    delete_subscription,
    list_subscriptions,
)
from config.settings import settings


def _consumer_url(base_url: str) -> str:
    """Append our receiver path + auth token to the base URL.

    Example: https://abc.ngrok.app -> https://abc.ngrok.app/api/webhooks/acculynx?token=XXX
    """
    parsed = urlparse(base_url.rstrip("/"))
    if not parsed.scheme:
        raise SystemExit("Need an https:// URL — got: " + base_url)
    if parsed.scheme != "https":
        print(f"WARN: AccuLynx prefers https. Got {parsed.scheme}://", file=sys.stderr)
    if not settings.acculynx_webhook_token:
        raise SystemExit("ACCULYNX_WEBHOOK_TOKEN is empty in .env. Generate one first.")
    return urlunparse((
        parsed.scheme, parsed.netloc, "/api/webhooks/acculynx", "",
        urlencode({"token": settings.acculynx_webhook_token}), "",
    ))


async def cmd_list() -> None:
    subs = await list_subscriptions()
    print(f"=== {len(subs)} subscription(s) on this AccuLynx account ===\n")
    for s in subs:
        ours = "(OURS)" if "/api/webhooks/acculynx" in s.get("consumerUrl", "") else ""
        print(f"  id:       {s['id']} {ours}")
        print(f"  status:   {s.get('status')}")
        print(f"  url:      {s.get('consumerUrl')}")
        print(f"  topics:   {s.get('topicNames')}")
        print(f"  created:  {s.get('createdDate')}")
        print()


async def cmd_register(base_url: str) -> None:
    consumer_url = _consumer_url(base_url)
    tech = settings.escalation_email or "colinjrbh317@gmail.com"
    print(f"Registering subscription:")
    print(f"  consumerUrl: {consumer_url}")
    print(f"  topics:      {DESIRED_TOPICS}")
    print(f"  techContact: {tech}")
    new_id = await create_subscription(consumer_url, DESIRED_TOPICS, tech)
    print(f"\n✓ Created subscription: {new_id}")


async def cmd_rotate(new_base_url: str) -> None:
    """Replace an existing OUR-subscription with a new URL. Disables the old one."""
    subs = await list_subscriptions()
    ours = [s for s in subs if "/api/webhooks/acculynx" in s.get("consumerUrl", "")
            and s.get("status") == "Enabled"]
    if not ours:
        print("No active OUR subscription found — running register instead")
        await cmd_register(new_base_url)
        return
    for s in ours:
        print(f"Disabling old: {s['id']}  url={s['consumerUrl']}")
        await delete_subscription(s["id"])
    await cmd_register(new_base_url)


async def cmd_disable(sub_id: str) -> None:
    ok = await delete_subscription(sub_id)
    print(f"disabled {sub_id}: {ok}")


async def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1]
    if cmd == "list":
        await cmd_list()
    elif cmd == "register" and len(sys.argv) >= 3:
        await cmd_register(sys.argv[2])
    elif cmd == "rotate" and len(sys.argv) >= 3:
        await cmd_rotate(sys.argv[2])
    elif cmd == "disable" and len(sys.argv) >= 3:
        await cmd_disable(sys.argv[2])
    else:
        print(__doc__)


if __name__ == "__main__":
    asyncio.run(main())
