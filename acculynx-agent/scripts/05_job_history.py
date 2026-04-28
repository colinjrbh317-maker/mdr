"""Script 05: Explore job history/activity logs for sample jobs."""

import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


async def main():
    print("=" * 60)
    print("SCRIPT 05: Job History & Activity Logs")
    print("=" * 60)

    # Get 5 recently modified jobs
    print("\n1. Pulling 5 recent jobs for history sampling ...")
    jobs_data = await get_json("/jobs", {
        "pageSize": 5,
    })

    jobs = jobs_data.get("items", [])
    all_action_types = {}
    history_entry_count = 0

    for job in jobs:
        job_id = job.get("id")
        job_num = job.get("jobNumber", "N/A")
        ms = job.get("currentMilestone", {})
        ms_name = ms.get("name", "N/A") if isinstance(ms, dict) else str(ms)

        print(f"\n{'='*50}")
        print(f"Job #{job_num} | Milestone: {ms_name}")
        print(f"{'='*50}")

        # Get job history
        try:
            history = await get_json(f"/jobs/{job_id}/history", {"includes": "createdBy"})
            entries = history.get("items", [])
            history_entry_count += len(entries)
            print(f"   History entries: {len(entries)}")

            if entries:
                # Show first entry structure
                print(f"\n   First entry structure (all fields):")
                for key, val in sorted(entries[0].items()):
                    val_str = json.dumps(val) if isinstance(val, (dict, list)) else str(val)
                    if len(val_str) > 100:
                        val_str = val_str[:100] + "..."
                    print(f"     {key}: {val_str}")

                # Show recent 10 entries
                print(f"\n   Recent activity (up to 10 entries):")
                for entry in entries[:10]:
                    action = entry.get("action", entry.get("type", entry.get("description", "Unknown")))
                    date = str(entry.get("date", entry.get("createdDate", "N/A")))[:19]
                    created_by = entry.get("createdBy", {})
                    actor = "System"
                    if isinstance(created_by, dict):
                        actor = created_by.get("displayName", created_by.get("name", "System"))
                    description = entry.get("description", entry.get("details", ""))
                    if isinstance(description, str) and len(description) > 80:
                        description = description[:80] + "..."

                    print(f"     {date} | {actor:<20} | {action}")
                    if description:
                        print(f"       Detail: {description}")

                    # Track action types
                    action_str = str(action)
                    all_action_types[action_str] = all_action_types.get(action_str, 0) + 1

        except Exception as e:
            print(f"   History fetch error: {e}")

        # Also check milestone history
        try:
            milestones = await get_json(f"/jobs/{job_id}/milestones")
            ms_items = milestones.get("items", [])
            print(f"\n   Milestone history ({len(ms_items)} entries):")
            for m in ms_items[:5]:
                print(f"     {json.dumps(m)[:120]}")
        except Exception as e:
            print(f"   Milestone history error: {e}")

    # Summary
    print(f"\n{'='*60}")
    print(f"HISTORY ANALYSIS SUMMARY:")
    print(f"{'='*60}")
    print(f"   Jobs analyzed: {len(jobs)}")
    print(f"   Total history entries: {history_entry_count}")
    print(f"   Avg entries per job: {history_entry_count / max(len(jobs), 1):.1f}")
    print(f"\n   Action types found:")
    for action, count in sorted(all_action_types.items(), key=lambda x: -x[1]):
        print(f"     {action}: {count}")

    print("\n" + "=" * 60)
    print("JOB HISTORY EXPLORATION: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
