"""Loader for config/stats.yaml — live business facts for the drafter."""

from __future__ import annotations

import functools
from pathlib import Path

import yaml

STATS_YAML = Path(__file__).resolve().parent / "stats.yaml"


@functools.lru_cache(maxsize=1)
def load_stats() -> dict:
    if not STATS_YAML.exists():
        return {}
    with STATS_YAML.open() as fp:
        return yaml.safe_load(fp) or {}


def stats_block_for_prompt() -> str:
    """Format the stats as a readable block to inject into the drafter prompt.

    Used by ai/drafter.py to give Claude live numbers instead of stale strings.
    """
    s = load_stats()
    if not s:
        return ""
    co = s.get("company", {})
    rev = s.get("google_reviews", {})
    ref = s.get("referral", {})
    inst = s.get("install", {})
    war = s.get("warranties", {})
    lines = [
        "LIVE BUSINESS FACTS (use these exact numbers if a touch references them):",
        f"- Company: {co.get('name', 'Modern Day Roofing')} ({co.get('short_name', 'MDR')})",
        f"- Phone: {co.get('phone', '540-553-6007')}",
        f"- Service area: {co.get('service_area', 'Virginia')}",
        f"- Certifications: {', '.join(co.get('certifications') or []) or 'None'}",
        f"- Google reviews: {rev.get('count', 'unknown')} at {rev.get('rating', 'n/a')} stars",
        f"- Referral program: ${ref.get('amount_dollars', 0)} {ref.get('description', '')}".rstrip(),
        f"- Install crew arrival window: {inst.get('arrival_window', 'morning')}",
        f"- Typical install lead time: {inst.get('lead_time_weeks', '2 to 3')} weeks after signed contract",
        f"- Warranties: {war.get('manufacturer', '')}; plus {war.get('workmanship', '')}",
    ]
    return "\n".join(lines)


__all__ = ["load_stats", "stats_block_for_prompt"]
