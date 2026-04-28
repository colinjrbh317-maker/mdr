"""Lead Enricher — pulls contact details from AccuLynx for leads that need them.

The sync service gets job-level data (milestone, dates, job number),
but contact info (phone, email, name) requires separate API calls.

This module fetches contact details and updates the local database.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from acculynx.client import get_json
from db.database import async_session
from db.models import Lead


ENRICH_TTL_HOURS = 24


async def enrich_lead(lead_id: str, force: bool = False) -> dict | None:
    """Fetch full contact details for a lead from AccuLynx.

    Returns a dict with contact info, or None if not found.
    Also updates the local database record.

    Skip if the lead was enriched within ENRICH_TTL_HOURS unless force=True.
    """
    if not force:
        async with async_session() as session:
            cached = await session.execute(select(Lead).where(Lead.id == lead_id))
            lead = cached.scalar_one_or_none()
            if lead and lead.enriched_at:
                ts = lead.enriched_at
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
                if age_hours < ENRICH_TTL_HOURS:
                    return {
                        "contact_id": None,
                        "name": lead.contact_name or "",
                        "phone": lead.contact_phone,
                        "email": lead.contact_email,
                        "sms_opt_out": lead.sms_opt_out,
                        "all_phones": [],
                        "all_emails": [lead.contact_email] if lead.contact_email else [],
                        "from_cache": True,
                    }
    try:
        # Get contacts linked to this job
        contacts_data = await get_json(f"/jobs/{lead_id}/contacts")
        contacts = contacts_data.get("items", [])
        if not contacts:
            return None

        # The job/contacts endpoint returns a reference with a nested contact ID.
        # We need to follow the link to get the actual contact record.
        contact_ref = contacts[0]
        contact_inner = contact_ref.get("contact", {})
        contact_id = contact_inner.get("id") or contact_ref.get("id")

        # Fetch the full contact record
        try:
            contact = await get_json(f"/contacts/{contact_id}")
        except Exception:
            contact = contact_ref  # fallback to whatever we have

        first_name = contact.get("firstName", "")
        last_name = contact.get("lastName", "")
        full_name = f"{first_name} {last_name}".strip()

        # Get phone numbers
        phones = []
        sms_opt_out = False
        try:
            phone_data = await get_json(f"/contacts/{contact_id}/phone-numbers")
            for p in phone_data.get("items", []):
                phones.append({
                    "number": p.get("number", ""),
                    "type": p.get("type", "Unknown"),
                    "sms_opt_out": p.get("smsOptOut", False),
                })
                if p.get("smsOptOut", False):
                    sms_opt_out = True
        except Exception:
            pass

        # Get email addresses
        emails = []
        try:
            email_data = await get_json(f"/contacts/{contact_id}/email-addresses")
            for e in email_data.get("items", []):
                emails.append(e.get("address", ""))
        except Exception:
            pass

        # Pick the best phone (prefer Mobile)
        primary_phone = None
        for p in phones:
            if "mobile" in p["type"].lower():
                primary_phone = p["number"]
                break
        if not primary_phone and phones:
            primary_phone = phones[0]["number"]

        primary_email = emails[0] if emails else None

        # Update local database
        async with async_session() as session:
            result = await session.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if lead:
                lead.contact_name = full_name or lead.contact_name
                lead.contact_phone = primary_phone
                lead.contact_email = primary_email
                lead.sms_opt_out = sms_opt_out
                lead.enriched_at = datetime.now(timezone.utc)
                await session.commit()

        return {
            "contact_id": contact_id,
            "name": full_name,
            "phone": primary_phone,
            "email": primary_email,
            "sms_opt_out": sms_opt_out,
            "all_phones": phones,
            "all_emails": emails,
        }

    except Exception as e:
        print(f"  ⚠️ Enrich failed for {lead_id}: {e}")
        return None


async def enrich_leads_batch(lead_ids: list[str]) -> dict:
    """Enrich multiple leads. Returns summary stats."""
    stats = {"enriched": 0, "failed": 0, "no_contact": 0}

    for lid in lead_ids:
        result = await enrich_lead(lid)
        if result and result["phone"]:
            stats["enriched"] += 1
        elif result:
            stats["no_contact"] += 1
        else:
            stats["failed"] += 1

    return stats
