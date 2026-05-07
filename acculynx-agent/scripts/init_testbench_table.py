"""One-shot script to create the testbench_verdicts table.

Usage (from project root):
    python scripts/init_testbench_table.py

Safe to re-run — `create_all` is idempotent (won't drop/recreate existing tables).
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Path bootstrap — allow running from project root or scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.database import engine
from db.models import Base, TestbenchVerdict  # noqa: F401 — ensures model is registered


async def main() -> None:
    print("Creating testbench_verdicts table (if not exists)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Done.")

    # Verify the table exists by checking metadata
    table_names = list(Base.metadata.tables.keys())
    if "testbench_verdicts" in table_names:
        print(f"Confirmed: testbench_verdicts is registered in metadata.")
        print(f"All tables: {', '.join(sorted(table_names))}")
    else:
        print("WARNING: testbench_verdicts not found in metadata — check import.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
