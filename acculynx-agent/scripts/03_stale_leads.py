"""Script 03: Find stale leads — 48+ hours without activity at active pipeline milestones."""
from __future__ import annotations

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        return datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


async def pull_milestone_jobs(milestone: str) -> list:
    """Pull all jobs at a given milestone using the milestones filter."""
    all_jobs = []
    page_start = 0
    page_size = 25
    while True:
        data = await get_json("/jobs", {
            "pageSize": page_size,
            "pageStartIndex": page_start,
            "milestones": milestone,
        })
        items = data.get("items", [])
        all_jobs.extend(items)
        if len(items) < page_size:
            break
        page_start += page_size
    return all_jobs


async def main():
    print("=" * 60)
    print("SCRIPT 03: Stale Lead Detection")
    print("=" * 60)

    now = datetime.now(timezone.utc)
    threshold = now - timedelta(hours=48)
    print(f"\n   Current time (UTC): {now.strftime('%Y-%m-%d %H:%M')}")
    print(f"   Stale threshold (48h): {threshold.strftime('%Y-%m-%d %H:%M')}")

    # Pull jobs from active pipeline milestones
    target_milestones = ["Lead", "Prospect", "Approved"]
    all_active_jobs = []

    for ms in target_milestones:
        print(f"\n1. Pulling '{ms}' jobs ...")
        jobs = await pull_milestone_jobs(ms)
        print(f"   Found {len(jobs)} jobs at '{ms}'")
        all_active_jobs.extend(jobs)

    print(f"\n   TOTAL ACTIVE PIPELINE: {len(all_active_jobs)} jobs")

    # Detect stale leads
    stale_leads = []
    for job in all_active_jobs:
        ms = job.get("currentMilestone", "Unknown")
        ms_name = ms if isinstance(ms, str) else "Unknown"

        modified = parse_date(job.get("modifiedDate"))
        if modified and modified < threshold:
            hours_stale = (now - modified).total_seconds() / 3600

            # Extract contact name
            contacts = job.get("contacts", [])
            contact_name = "N/A"
            if contacts and isinstance(contacts, list) and len(contacts) > 0:
                c = contacts[0]
                if isinstance(c, dict):
                    contact_inner = c.get("contact", c)
                    if isinstance(contact_inner, dict):
                        contact_name = f"{contact_inner.get('firstName', '')} {contact_inner.get('lastName', '')}".strip() or "N/A"

            # Extract address
            addr = job.get("locationAddress", {})
            address = ""
            if isinstance(addr, dict):
                parts = [addr.get("street1", ""), addr.get("city", "")]
                state = addr.get("state", "")
                if isinstance(state, dict):
                    parts.append(state.get("abbreviation", ""))
                elif state:
                    parts.append(str(state))
                address = ", ".join(p for p in parts if p)

            stale_leads.append({
                "job_id": job.get("id"),
                "job_number": job.get("jobNumber", "N/A"),
                "job_name": job.get("jobName", "N/A"),
                "milestone": ms_name,
                "modified": modified.strftime("%Y-%m-%d %H:%M") if modified else "N/A",
                "hours_stale": round(hours_stale, 1),
                "days_stale": round(hours_stale / 24, 1),
                "contact": contact_name,
                "address": address,
            })

    # Sort by staleness (most stale first)
    stale_leads.sort(key=lambda x: -x["hours_stale"])

    print(f"\n{'='*60}")
    print(f"STALE LEADS: {len(stale_leads)} of {len(all_active_jobs)} active leads")
    print(f"(No activity for 48+ hours)")
    print(f"{'='*60}\n")

    if stale_leads:
        print(f"   {'Job #':<10} {'Name':<30} {'Milestone':<12} {'Days':<8} {'Last Activity':<18} {'Location':<30}")
        print(f"   {'-'*10} {'-'*30} {'-'*12} {'-'*8} {'-'*18} {'-'*30}")
        for lead in stale_leads[:75]:
            name = lead['job_name'][:28] if lead['job_name'] else lead['contact'][:28]
            print(f"   {str(lead['job_number']):<10} {name:<30} {lead['milestone']:<12} {lead['days_stale']:<8} {lead['modified']:<18} {lead['address'][:30]:<30}")

        # Stats breakdown
        print(f"\n{'='*60}")
        print(f"STALE LEAD STATS:")
        print(f"{'='*60}")

        by_milestone = {}
        for lead in stale_leads:
            ms = lead["milestone"]
            by_milestone[ms] = by_milestone.get(ms, 0) + 1

        print(f"\n   By Milestone:")
        for ms, count in sorted(by_milestone.items(), key=lambda x: -x[1]):
            total_ms = sum(1 for j in all_active_jobs if (j.get("currentMilestone") if isinstance(j.get("currentMilestone"), str) else "?") == ms)
            print(f"   {ms:<15} {count} stale / {total_ms} total ({count*100//max(total_ms,1)}% stale)")

        avg_days = sum(l["days_stale"] for l in stale_leads) / len(stale_leads)
        max_days = max(l["days_stale"] for l in stale_leads)
        median_days = sorted(l["days_stale"] for l in stale_leads)[len(stale_leads)//2]

        print(f"\n   Staleness Distribution:")
        print(f"   Average: {avg_days:.1f} days")
        print(f"   Median: {median_days:.1f} days")
        print(f"   Max: {max_days:.1f} days")
        print(f"   2-7 days stale: {sum(1 for l in stale_leads if 2 <= l['days_stale'] <= 7)}")
        print(f"   7-30 days stale: {sum(1 for l in stale_leads if 7 < l['days_stale'] <= 30)}")
        print(f"   30-90 days stale: {sum(1 for l in stale_leads if 30 < l['days_stale'] <= 90)}")
        print(f"   90+ days stale: {sum(1 for l in stale_leads if l['days_stale'] > 90)}")

    else:
        print("   No stale leads found — all active leads have recent activity!")

    print("\n" + "=" * 60)
    print("STALE LEAD DETECTION: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
