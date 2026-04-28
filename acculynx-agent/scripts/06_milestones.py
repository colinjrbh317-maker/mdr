"""Script 06: Enumerate all milestones with job counts per stage."""

import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


async def main():
    print("=" * 60)
    print("SCRIPT 06: Pipeline Milestone Enumeration")
    print("=" * 60)

    milestones = {}
    categories = {}
    work_types = {}
    trade_types = {}
    lead_sources = {}
    total_scanned = 0

    # Paginate through all jobs to get complete milestone picture
    print("\n1. Scanning all jobs for milestones ...")
    page_start = 0
    page_size = 25

    while True:
        data = await get_json("/jobs", {
            "pageSize": page_size,
            "pageStartIndex": page_start,
        })

        items = data.get("items", [])
        total_count = data.get("count", 0)

        for job in items:
            total_scanned += 1

            # Milestone
            ms = job.get("currentMilestone", {})
            ms_name = ms.get("name", "Unknown") if isinstance(ms, dict) else str(ms)
            milestones[ms_name] = milestones.get(ms_name, 0) + 1

            # Category
            cat = job.get("jobCategory", {})
            cat_name = cat.get("name", "N/A") if isinstance(cat, dict) else str(cat) if cat else "N/A"
            categories[cat_name] = categories.get(cat_name, 0) + 1

            # Work type
            wt = job.get("workType", {})
            wt_name = wt.get("name", "N/A") if isinstance(wt, dict) else str(wt) if wt else "N/A"
            work_types[wt_name] = work_types.get(wt_name, 0) + 1

            # Trade types
            trades = job.get("tradeTypes", [])
            if isinstance(trades, list):
                for t in trades:
                    t_name = t.get("name", "Unknown") if isinstance(t, dict) else str(t)
                    trade_types[t_name] = trade_types.get(t_name, 0) + 1

            # Lead source
            ls = job.get("leadSource", {})
            ls_name = ls.get("name", "N/A") if isinstance(ls, dict) else str(ls) if ls else "N/A"
            lead_sources[ls_name] = lead_sources.get(ls_name, 0) + 1

        if len(items) < page_size:
            break
        page_start += page_size
        if page_start >= min(total_count, 3000):  # Cap at 3000 for speed
            break

    print(f"   Scanned {total_scanned} of {total_count} total jobs")

    # Milestones
    print(f"\n{'='*60}")
    print(f"PIPELINE MILESTONES ({len(milestones)} stages)")
    print(f"{'='*60}")
    print(f"\n   {'Milestone':<30} {'Count':<8} {'% of Total':<10}")
    print(f"   {'-'*30} {'-'*8} {'-'*10}")
    for ms, count in sorted(milestones.items(), key=lambda x: -x[1]):
        pct = count * 100 / max(total_scanned, 1)
        bar = "█" * int(pct / 2)
        print(f"   {ms:<30} {count:<8} {pct:>5.1f}%  {bar}")

    # Categories
    print(f"\n{'='*60}")
    print(f"JOB CATEGORIES ({len(categories)})")
    print(f"{'='*60}")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   {cat:<30} {count}")

    # Work Types
    print(f"\n{'='*60}")
    print(f"WORK TYPES ({len(work_types)})")
    print(f"{'='*60}")
    for wt, count in sorted(work_types.items(), key=lambda x: -x[1]):
        print(f"   {wt:<30} {count}")

    # Trade Types
    print(f"\n{'='*60}")
    print(f"TRADE TYPES ({len(trade_types)})")
    print(f"{'='*60}")
    for tt, count in sorted(trade_types.items(), key=lambda x: -x[1]):
        print(f"   {tt:<30} {count}")

    # Lead Sources
    print(f"\n{'='*60}")
    print(f"LEAD SOURCES (top 20 of {len(lead_sources)})")
    print(f"{'='*60}")
    for ls, count in sorted(lead_sources.items(), key=lambda x: -x[1])[:20]:
        print(f"   {ls:<40} {count}")

    # Try to get lead source settings
    print(f"\n{'='*60}")
    print(f"CONFIGURED LEAD SOURCES (from company settings)")
    print(f"{'='*60}")
    try:
        ls_settings = await get_json("/company-settings/leads/lead-sources")
        ls_items = ls_settings.get("items", [])
        print(f"   {len(ls_items)} configured lead sources:")
        for ls in ls_items[:30]:
            print(f"   - {ls.get('name', 'N/A')} (id: {ls.get('id', 'N/A')})")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n" + "=" * 60)
    print("MILESTONE ENUMERATION: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
