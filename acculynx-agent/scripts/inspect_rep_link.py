"""Find where rep assignment lives in AccuLynx.

Tries: /jobs/{id}/contacts, /users, /jobs/{id}/team, /jobs/{id}/sales-rep,
and any other plausible endpoints.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from acculynx import client


async def try_endpoint(path: str) -> tuple[bool, str]:
    try:
        data = await client.get_json(path)
        return True, json.dumps(data, indent=2, default=str)[:2000]
    except Exception as exc:
        return False, str(exc)


async def main() -> int:
    job_ids_resp = await client.get_json("/jobs", params={"pageSize": 5})
    jobs = job_ids_resp.get("items", [])
    if not jobs:
        print("No jobs.")
        return 1

    job_id = jobs[0]["id"]
    print(f"Using job_id={job_id}\n")

    candidates = [
        f"/jobs/{job_id}/contacts",
        f"/jobs/{job_id}/team",
        f"/jobs/{job_id}/users",
        f"/jobs/{job_id}/sales-rep",
        f"/jobs/{job_id}/assigned-users",
        f"/jobs/{job_id}/messages",
        f"/jobs/{job_id}/history",
        "/users",
    ]

    for path in candidates:
        ok, payload = await try_endpoint(path)
        print(f"=== {path} ===")
        print(f"  ok={ok}")
        print(payload[:1500])
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
