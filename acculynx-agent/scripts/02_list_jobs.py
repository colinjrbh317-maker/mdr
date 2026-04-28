"""Script 02: List jobs with filtering, dump all available fields."""

import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


async def main():
    print("=" * 60)
    print("SCRIPT 02: Job Listing & Field Discovery")
    print("=" * 60)

    # Pull recent jobs sorted by modified date
    print("\n1. Pulling 10 most recently modified jobs ...")
    data = await get_json("/jobs", {
        "pageSize": 10,
    })

    print(f"   Total jobs in account: {data.get('count', 'N/A')}")
    print(f"   Page size: {data.get('pageSize', 'N/A')}")

    items = data.get("items", [])
    if items:
        # Show all fields on first job
        print(f"\n2. All fields on a job record ({len(items[0])} fields):")
        first = items[0]
        for key, value in sorted(first.items()):
            val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
            if len(val_str) > 100:
                val_str = val_str[:100] + "..."
            print(f"   {key}: {val_str}")

        # Summary of all 10 jobs
        print(f"\n3. Summary of 10 most recent jobs:")
        print(f"   {'Job #':<12} {'Milestone':<20} {'Modified':<22} {'Category':<18}")
        print(f"   {'-'*12} {'-'*20} {'-'*22} {'-'*18}")
        for job in items:
            milestone = job.get("currentMilestone", {})
            milestone_name = milestone.get("name", "N/A") if isinstance(milestone, dict) else str(milestone)
            print(f"   {str(job.get('jobNumber', 'N/A')):<12} {milestone_name:<20} {str(job.get('modifiedDate', 'N/A'))[:19]:<22} {str(job.get('jobCategory', {}).get('name', 'N/A') if isinstance(job.get('jobCategory'), dict) else job.get('jobCategory', 'N/A')):<18}")

    # Pull a single job with full detail
    if items:
        job_id = items[0].get("id")
        print(f"\n4. Fetching full detail for job {job_id} ...")
        detail = await get_json(f"/jobs/{job_id}")
        print(f"   Detail fields ({len(detail)} fields):")
        for key in sorted(detail.keys()):
            val = detail[key]
            val_str = json.dumps(val) if isinstance(val, (dict, list)) else str(val)
            if len(val_str) > 120:
                val_str = val_str[:120] + "..."
            print(f"   {key}: {val_str}")

    print("\n" + "=" * 60)
    print("JOB LISTING: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
