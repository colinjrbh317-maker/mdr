"""One-shot backfill: pre-populate agent_context for every active Prospect.

Why this exists: when Austin opens /review tomorrow, we want him to see
real context like "milestone-change comment from rep: Estimated Cost was
Too High" — not blank fields. This script walks every active Prospect
and pulls history + estimates + appointments to populate the context now.

After this runs once, the live system keeps context fresh via:
  - Webhooks (instant updates on milestone changes, custom field edits)
  - The drafter calling build_agent_context() on every draft

Run with:
  python scripts/backfill_context.py [--all|--prospects|--dry-run]

Defaults to --prospects (active Prospects only). --all hits every active
lead which is much slower (1 API call per lead).
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from db.database import async_session
from db.models import Lead
from engine.context_builder import build_agent_context


async def main(scope: str = "prospects", dry_run: bool = False) -> None:
    async with async_session() as s:
        q = select(Lead).where(Lead.is_active == True)
        if scope == "prospects":
            q = q.where(Lead.milestone == "Prospect")
        result = await s.execute(q)
        leads = list(result.scalars())

    print(f"Backfill scope: {scope}, candidates: {len(leads)}, dry_run={dry_run}")

    enriched = 0
    skipped = 0
    failed = 0
    for i, lead in enumerate(leads, 1):
        try:
            ctx = await build_agent_context(lead.id)
            if not ctx:
                skipped += 1
                if i % 20 == 0:
                    print(f"  [{i}/{len(leads)}] enriched={enriched} skipped={skipped} failed={failed}")
                continue

            if dry_run:
                print(f"\n--- {lead.contact_name or lead.id[:8]} ({lead.milestone}) ---")
                print(ctx[:400])
            else:
                async with async_session() as s:
                    fresh = (await s.execute(select(Lead).where(Lead.id == lead.id))).scalar_one()
                    fresh.agent_context = ctx
                    fresh.agent_context_updated_at = datetime.now(timezone.utc)
                    await s.commit()
            enriched += 1
        except Exception as e:
            failed += 1
            print(f"  fail {lead.id[:8]} {lead.contact_name}: {e}")

        if i % 10 == 0:
            print(f"  [{i}/{len(leads)}] enriched={enriched} skipped={skipped} failed={failed}")

    print(f"\nDone. enriched={enriched} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    args = sys.argv[1:]
    dry = "--dry-run" in args
    scope = "prospects"
    if "--all" in args:
        scope = "all"
    asyncio.run(main(scope=scope, dry_run=dry))
