"""End-to-end test: Pick a real lead, enrich, load SOPs, draft a message with Claude.

This does NOT send any messages — it only shows what the AI would write.

Usage: python scripts/test_draft.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from ai.drafter import draft_message
from config.settings import settings
from db.database import async_session, init_db
from engine.enrich import enrich_lead
from engine.sync import find_leads_needing_followup, sync_pipeline


async def main():
    print("=" * 60)
    print("END-TO-END TEST: AI Message Drafting")
    print("=" * 60)

    if not settings.anthropic_api_key:
        print("\n❌ ANTHROPIC_API_KEY not set in .env")
        print("   Add it and try again.")
        return

    await init_db()

    # Step 1: Find a lead that needs follow-up
    print("\n1️⃣  Finding leads needing follow-up...")
    due_leads = await find_leads_needing_followup()

    if not due_leads:
        print("   No leads due. Running sync first...")
        await sync_pipeline()
        due_leads = await find_leads_needing_followup()

    if not due_leads:
        print("   Still no leads due. Creating a test scenario...")
        # Fall back to any Prospect lead
        async with async_session() as session:
            result = await session.execute(
                select(lead_model).where(lead_model.milestone == "Prospect").limit(1)
            )
            lead = result.scalar_one_or_none()
            if lead:
                due_leads = [{
                    "lead_id": lead.id,
                    "job_number": lead.job_number,
                    "contact_name": lead.contact_name,
                    "milestone": lead.milestone,
                    "assigned_rep_name": lead.assigned_rep_name,
                    "touch": {
                        "channel": "text",
                        "content_type": "check_in_questions_about_estimate",
                        "day_offset": 2,
                        "autonomous_ok": True,
                        "touch_index": 0,
                    },
                    "days_since_cadence_start": 2,
                    "total_attempts": 0,
                    "sms_opt_out": False,
                }]

    if not due_leads:
        print("   ❌ No leads found at all. Is the database synced?")
        return

    target = due_leads[0]
    print(f"   Found: Job #{target['job_number']} at {target['milestone']}")

    # Step 2: Enrich contact details
    print("\n2️⃣  Enriching contact details from AccuLynx...")
    contact = await enrich_lead(target["lead_id"])
    if contact:
        print(f"   Name: {contact['name']}")
        print(f"   Phone: {contact['phone']}")
        print(f"   Email: {contact['email']}")
        target["contact_name"] = contact["name"] or target.get("contact_name")
        target["contact_phone"] = contact["phone"]
        target["contact_email"] = contact["email"]
        target["sms_opt_out"] = contact["sms_opt_out"]
    else:
        print("   ⚠️ No contact data — using placeholder name")
        target["contact_name"] = target.get("contact_name") or "Homeowner"

    # Step 3: Draft the message with Claude
    print(f"\n3️⃣  Drafting {target['touch']['channel']} message with Claude...")
    print(f"   Content type: {target['touch']['content_type']}")
    print(f"   Day offset: {target['touch']['day_offset']}")

    result = await draft_message(
        lead_context=target,
        touch_info=target["touch"],
        milestone=target["milestone"],
    )

    # Step 4: Show the result
    print("\n" + "=" * 60)
    if result["escalation"]:
        print(f"⚠️  ESCALATION: {result['escalation']}")
    else:
        print(f"📨 DRAFTED MESSAGE ({result['channel'].upper()}):")
        if result["subject"]:
            print(f"   Subject: {result['subject']}")
        print(f"\n   {result['body']}")
    print("=" * 60)

    print("\n✅ End-to-end test complete. No messages were sent.")


if __name__ == "__main__":
    asyncio.run(main())
