"""Simulation Mode — Full pipeline dry run against real AccuLynx data.

Runs the ENTIRE agent pipeline but sends NOTHING. Instead, it generates
a detailed report showing exactly what the AI would do to every lead.

This is your dress rehearsal. Run it as many times as you want.

Usage:
    python scripts/simulate.py              # Full simulation
    python scripts/simulate.py --limit 10   # Only process first 10 due leads
    python scripts/simulate.py --milestone Prospect  # Only Prospect leads
"""

import argparse
import asyncio
import json
import sys
import os
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings
from db.database import init_db
from engine.enrich import enrich_lead
from engine.preflight import preflight_check
from engine.sync import (
    find_leads_needing_followup,
    is_business_hours,
    sync_pipeline,
    check_recent_activity,
)

# Only import drafter if Claude API key is available
HAS_CLAUDE = bool(settings.anthropic_api_key)
if HAS_CLAUDE:
    from ai.drafter import draft_message


class SimulationReport:
    """Collects and formats simulation results."""

    def __init__(self):
        self.start_time = datetime.now()
        self.sync_stats = {}
        self.leads_due = []
        self.results = []  # Per-lead results
        self.summary = {}

    def add_result(self, lead_data: dict, enrichment: Optional[dict],
                   preflight: dict, draft: Optional[dict], activity: dict):
        self.results.append({
            "lead": lead_data,
            "enrichment": enrichment,
            "preflight": preflight,
            "draft": draft,
            "activity": activity,
        })

    def generate(self) -> str:
        """Generate the full simulation report as formatted text."""
        lines = []
        lines.append("=" * 70)
        lines.append("  MDR AI SALES AGENT — SIMULATION REPORT")
        lines.append(f"  Generated: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"  Mode: DRY RUN (no messages sent)")
        lines.append("=" * 70)

        # Sync summary
        lines.append(f"\n📡 SYNC RESULTS")
        lines.append(f"  Total jobs in AccuLynx:  {self.sync_stats.get('synced', 0)}")
        lines.append(f"  Recent leads (assigned layers): {self.sync_stats.get('new', 0)}")
        lines.append(f"  Old leads (skipped backfill): {self.sync_stats.get('skipped_backfill', 0)}")
        lines.append(f"  Sync errors: {self.sync_stats.get('errors', 0)}")

        # Pipeline overview
        lines.append(f"\n🔍 PIPELINE ANALYSIS")
        lines.append(f"  Leads needing follow-up: {len(self.leads_due)}")
        lines.append(f"  Currently business hours (EST): {is_business_hours()}")
        if is_business_hours():
            lines.append(f"  → Messages would go to REPS for approval")
        else:
            lines.append(f"  → Messages would send AUTONOMOUSLY (after hours)")

        # Per-lead breakdown
        approved_count = 0
        blocked_count = 0
        blocked_reasons = {}
        drafted_texts = []
        drafted_emails = []
        escalations = []

        for r in self.results:
            lead = r["lead"]
            pf = r["preflight"]
            draft = r["draft"]
            enrichment = r["enrichment"]
            activity = r["activity"]

            lines.append(f"\n{'─' * 70}")
            name = enrichment.get("name", "Unknown") if enrichment else lead.get("contact_name", "Unknown")
            lines.append(f"  📋 {name}")
            layer = lead.get('layer_name', lead.get('cadence_name', '?'))
            lines.append(f"     Job: #{lead.get('job_number', 'N/A')} | Milestone: {lead['milestone']} | Layer: {layer}")
            lines.append(f"     Layer Goal: {lead.get('layer_goal', 'N/A')}")
            lines.append(f"     Phone: {enrichment.get('phone', 'N/A') if enrichment else 'Not enriched'}")
            lines.append(f"     Email: {enrichment.get('email', 'N/A') if enrichment else 'Not enriched'}")
            lines.append(f"     Touch #{lead['touch_index'] + 1} | Channel: {lead['touch']['channel']} | Type: {lead['touch']['content_type']}")
            days_in_layer = lead.get('days_since_layer_start', lead.get('days_since_cadence_start', '?'))
            lines.append(f"     Days in layer: {days_in_layer} | Total attempts: {lead.get('total_attempts', 0)}")

            # Activity check
            if activity.get("has_human_activity"):
                lines.append(f"     ⚠️  Human activity detected in last 24h — would SKIP")
            if activity.get("entries"):
                for e in activity["entries"][:3]:
                    lines.append(f"        Recent: {e['date']} by {e['actor']}")

            # Preflight
            if pf["approved"]:
                approved_count += 1
                lines.append(f"     ✅ PREFLIGHT: APPROVED (all {len(pf['check_results'])} checks passed)")
            else:
                blocked_count += 1
                failed_checks = [k for k, v in pf["check_results"].items() if not v]
                reason = ", ".join(failed_checks)
                lines.append(f"     ❌ PREFLIGHT: BLOCKED — {reason}")
                for fc in failed_checks:
                    blocked_reasons[fc] = blocked_reasons.get(fc, 0) + 1

            # Draft
            if draft:
                if draft.get("escalation"):
                    lines.append(f"     🚨 ESCALATION: {draft['escalation']}")
                    escalations.append({"lead": name, "reason": draft["escalation"]})
                elif draft.get("body"):
                    channel = draft["channel"].upper()
                    lines.append(f"     📨 DRAFTED MESSAGE ({channel}):")
                    if draft.get("subject"):
                        lines.append(f"        Subject: {draft['subject']}")
                    # Indent the message body
                    for msg_line in draft["body"].split("\n")[:15]:
                        lines.append(f"        {msg_line}")
                    if len(draft["body"].split("\n")) > 15:
                        lines.append(f"        [... truncated ...]")

                    if channel == "TEXT":
                        drafted_texts.append({"lead": name, "body": draft["body"]})
                    else:
                        drafted_emails.append({"lead": name, "subject": draft.get("subject"), "body": draft["body"][:200]})
            elif pf["approved"]:
                lines.append(f"     ⚠️  No draft generated (Claude API key not configured)")

        # Summary
        lines.append(f"\n{'=' * 70}")
        lines.append(f"  SUMMARY")
        lines.append(f"{'=' * 70}")
        lines.append(f"  Total leads evaluated: {len(self.results)}")
        lines.append(f"  ✅ Approved (would send): {approved_count}")
        lines.append(f"  ❌ Blocked (would NOT send): {blocked_count}")
        lines.append(f"  📱 Text messages drafted: {len(drafted_texts)}")
        lines.append(f"  📧 Emails drafted: {len(drafted_emails)}")
        lines.append(f"  🚨 Escalations triggered: {len(escalations)}")

        if blocked_reasons:
            lines.append(f"\n  Blocked reasons breakdown:")
            for reason, count in sorted(blocked_reasons.items(), key=lambda x: -x[1]):
                lines.append(f"    {count}x {reason}")

        if escalations:
            lines.append(f"\n  Escalations:")
            for e in escalations:
                lines.append(f"    {e['lead']}: {e['reason']}")

        lines.append(f"\n  ⏱️  Simulation completed in {(datetime.now() - self.start_time).seconds}s")
        lines.append(f"  📁 No messages were sent. This was a dry run.")
        lines.append("=" * 70)

        return "\n".join(lines)


async def run_simulation(limit: int = 0, milestone_filter: str = "", layer_filter: str = ""):
    """Run the full simulation pipeline."""
    report = SimulationReport()

    print("Starting simulation...")

    # Step 1: Sync from AccuLynx
    await init_db()
    print("  Syncing from AccuLynx...")
    report.sync_stats = await sync_pipeline()

    # Step 2: Find leads needing follow-up
    print("  Finding leads needing follow-up...")
    due_leads = await find_leads_needing_followup()
    report.leads_due = due_leads

    # Apply filters
    if milestone_filter:
        due_leads = [d for d in due_leads if d["milestone"] == milestone_filter]
        print(f"  Filtered to milestone={milestone_filter}: {len(due_leads)} leads")

    if layer_filter:
        due_leads = [d for d in due_leads if d.get("layer_name") == layer_filter]
        print(f"  Filtered to layer={layer_filter}: {len(due_leads)} leads")

    if limit and limit < len(due_leads):
        due_leads = due_leads[:limit]
        print(f"  Limited to first {limit} leads")

    # Step 3: Process each lead
    for i, lead in enumerate(due_leads):
        print(f"  Processing {i+1}/{len(due_leads)}: {lead.get('contact_name', 'Unknown')}...")

        # Enrich contact
        enrichment = await enrich_lead(lead["lead_id"])
        if enrichment:
            lead["contact_name"] = enrichment.get("name") or lead.get("contact_name")
            lead["contact_phone"] = enrichment.get("phone")
            lead["contact_email"] = enrichment.get("email")
            lead["twilio_stop"] = False

        # Check activity
        activity = await check_recent_activity(lead["lead_id"], hours=24)

        # Preflight check
        preflight = await preflight_check(lead)

        # Draft message (only if preflight passed AND Claude is configured)
        draft = None
        if preflight["approved"] and HAS_CLAUDE:
            try:
                draft = await draft_message(lead, lead["touch"], lead["milestone"])
            except Exception as e:
                draft = {"channel": lead["touch"]["channel"], "body": None,
                         "subject": None, "escalation": f"Draft error: {str(e)[:100]}"}

        report.add_result(lead, enrichment, preflight, draft, activity)

    # Generate and save report
    report_text = report.generate()
    print(report_text)

    # Save to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        f"simulation_{timestamp}.txt",
    )
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w") as f:
        f.write(report_text)
    print(f"\n📄 Report saved to: {report_path}")

    # Write to Google Sheets
    try:
        from engine.sheets import SheetsReporter
        print("\n📊 Writing to Google Sheets...")
        sheets = SheetsReporter()
        sheets.ensure_sheet_exists()
        run_id = sheets.write_simulation_run(report.results)
        print(f"📊 Google Sheet: {sheets.get_sheet_url()}")
    except Exception as e:
        print(f"⚠️ Google Sheets write failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MDR AI Agent Simulation")
    parser.add_argument("--limit", type=int, default=0, help="Max leads to process")
    parser.add_argument("--milestone", type=str, default="", help="Filter by milestone")
    parser.add_argument("--layer", type=str, default="", help="Filter by layer name (e.g., ESTIMATE_FOLLOWUP)")
    parser.add_argument("--no-sheets", action="store_true", help="Skip Google Sheets write")
    args = parser.parse_args()

    asyncio.run(run_simulation(limit=args.limit, milestone_filter=args.milestone, layer_filter=args.layer))
