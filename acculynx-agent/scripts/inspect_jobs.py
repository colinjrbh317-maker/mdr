"""Inspect AccuLynx /jobs payload to discover field names.

We need the actual key path for the assigned-rep field (likely something like
companyRep, salesPerson, assignedTo, primarySalesperson, etc.) and the address
field. Sync.py never wrote these because the original implementer didn't know
the exact key names. This script answers that.

Usage:
    python scripts/inspect_jobs.py           # First 3 jobs, all keys
    python scripts/inspect_jobs.py --grep rep
    python scripts/inspect_jobs.py --job-id <guid>
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from acculynx import client


def flatten(obj: Any, prefix: str = "") -> dict[str, Any]:
    """Flatten a nested dict to dotted key paths. Lists become [0], [1] indices."""
    out: dict[str, Any] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else k
            out.update(flatten(v, key))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            key = f"{prefix}[{i}]"
            out.update(flatten(v, key))
    else:
        out[prefix] = obj
    return out


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3, help="how many jobs to inspect")
    parser.add_argument("--grep", help="filter keys containing this substring (case-insensitive)")
    parser.add_argument("--job-id", help="inspect a specific job id")
    parser.add_argument("--raw", action="store_true", help="dump raw JSON instead of flattened")
    args = parser.parse_args()

    if args.job_id:
        print(f"Fetching job {args.job_id}...")
        job = await client.get_json(f"/jobs/{args.job_id}")
        jobs = [job]
    else:
        print(f"Fetching first {args.limit} jobs...")
        page = await client.get_json("/jobs", params={"pageSize": args.limit})
        jobs = page.get("items", [])[: args.limit]

    if not jobs:
        print("No jobs returned.")
        return 1

    for i, job in enumerate(jobs, 1):
        print(f"\n{'='*70}")
        print(f"JOB {i}: id={job.get('id')} jobNumber={job.get('jobNumber')} milestone={job.get('currentMilestone', {}).get('name') if isinstance(job.get('currentMilestone'), dict) else job.get('currentMilestone')}")
        print('='*70)

        if args.raw:
            print(json.dumps(job, indent=2, default=str))
            continue

        flat = flatten(job)
        for key in sorted(flat):
            if args.grep and args.grep.lower() not in key.lower():
                continue
            val = flat[key]
            sval = repr(val) if not isinstance(val, str) else val
            if len(sval) > 100:
                sval = sval[:100] + "..."
            print(f"  {key:60s} = {sval}")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
