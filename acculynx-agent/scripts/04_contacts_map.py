"""Script 04: Map contact data availability — phones, emails, smsOptOut per job."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


async def main():
    print("=" * 60)
    print("SCRIPT 04: Contact Data Mapping")
    print("=" * 60)

    # Pull 20 recent jobs to sample contact data
    print("\n1. Pulling 20 recent jobs for contact sampling ...")
    jobs_data = await get_json("/jobs", {
        "pageSize": 20,
    })

    jobs = jobs_data.get("items", [])
    print(f"   Got {len(jobs)} jobs")

    # Also pull contacts directly to see the data model
    print("\n2. Pulling contacts list (first 20) ...")
    contacts_data = await get_json("/contacts", {"pageSize": 20})
    print(f"   Total contacts in account: {contacts_data.get('count', 'N/A')}")

    contacts = contacts_data.get("items", [])
    if contacts:
        print(f"\n   Sample contact fields:")
        first = contacts[0]
        for key, val in sorted(first.items()):
            print(f"     {key}: {val}")

    # For each job, get contacts and their phone/email data
    print(f"\n3. Detailed contact data for {min(10, len(jobs))} jobs:")

    stats = {
        "jobs_checked": 0,
        "contacts_found": 0,
        "with_phone": 0,
        "with_email": 0,
        "with_sms_opt_out": 0,
        "with_address": 0,
        "phone_types": {},
    }

    for job in jobs[:10]:
        job_id = job.get("id")
        job_num = job.get("jobNumber", "N/A")
        stats["jobs_checked"] += 1

        print(f"\n   --- Job #{job_num} (ID: {job_id}) ---")

        # Get job contacts
        try:
            job_contacts = await get_json(f"/jobs/{job_id}/contacts")
            contact_items = job_contacts.get("items", [])
            print(f"   Contacts on job: {len(contact_items)}")

            for jc in contact_items:
                contact_ref = jc.get("contact", {})
                contact_id = contact_ref.get("id") if isinstance(contact_ref, dict) else None
                is_primary = jc.get("isPrimary", False)
                relation = jc.get("relationToPrimary", "N/A")

                if not contact_id:
                    print(f"   No contact ID found in: {jc}")
                    continue

                stats["contacts_found"] += 1
                print(f"   Contact ID: {contact_id} | Primary: {is_primary} | Relation: {relation}")

                # Get contact detail
                contact_detail = await get_json(f"/contacts/{contact_id}")
                name = f"{contact_detail.get('firstName', '')} {contact_detail.get('lastName', '')}".strip()
                print(f"   Name: {name}")

                # Address
                addr = contact_detail.get("mailingAddress", {})
                if addr and isinstance(addr, dict) and addr.get("street1"):
                    stats["with_address"] += 1
                    city = addr.get("city", "")
                    state = addr.get("state", {})
                    state_name = state.get("abbreviation", "") if isinstance(state, dict) else str(state)
                    print(f"   Address: {addr.get('street1', '')}, {city}, {state_name} {addr.get('zipCode', '')}")

                # Phone numbers
                try:
                    phones = await get_json(f"/contacts/{contact_id}/phone-numbers")
                    phone_items = phones.get("items", [])
                    if phone_items:
                        stats["with_phone"] += 1
                    for phone in phone_items:
                        phone_type = phone.get("type", "Unknown")
                        stats["phone_types"][phone_type] = stats["phone_types"].get(phone_type, 0) + 1
                        sms_opt_out = phone.get("smsOptOut", False)
                        if sms_opt_out:
                            stats["with_sms_opt_out"] += 1
                        print(f"   Phone: {phone.get('number', 'N/A')} | Type: {phone_type} | SMS Opt-Out: {sms_opt_out}")
                except Exception as e:
                    print(f"   Phone fetch error: {e}")

                # Email addresses
                try:
                    emails = await get_json(f"/contacts/{contact_id}/email-addresses")
                    email_items = emails.get("items", [])
                    if email_items:
                        stats["with_email"] += 1
                    for email in email_items:
                        print(f"   Email: {email.get('address', email.get('emailAddress', 'N/A'))}")
                except Exception as e:
                    print(f"   Email fetch error: {e}")

        except Exception as e:
            print(f"   Error fetching contacts: {e}")

    # Summary
    print(f"\n{'='*60}")
    print(f"CONTACT DATA SUMMARY (from {stats['jobs_checked']} jobs):")
    print(f"{'='*60}")
    print(f"   Total contacts sampled: {stats['contacts_found']}")
    print(f"   With phone number: {stats['with_phone']} ({stats['with_phone']*100//max(stats['contacts_found'],1)}%)")
    print(f"   With email: {stats['with_email']} ({stats['with_email']*100//max(stats['contacts_found'],1)}%)")
    print(f"   With SMS opt-out flag: {stats['with_sms_opt_out']}")
    print(f"   With mailing address: {stats['with_address']} ({stats['with_address']*100//max(stats['contacts_found'],1)}%)")
    print(f"   Phone types found: {stats['phone_types']}")
    print(f"\n   Total contacts in account: {contacts_data.get('count', 'N/A')}")

    print("\n" + "=" * 60)
    print("CONTACT MAPPING: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
