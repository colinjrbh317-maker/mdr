"""Script 01: Test AccuLynx API authentication and print account info."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get, get_json


async def main():
    print("=" * 60)
    print("SCRIPT 01: AccuLynx API Authentication Test")
    print("=" * 60)

    # Test basic auth with a minimal request
    print("\n1. Testing authentication with GET /jobs?pageSize=1 ...")
    resp = await get("/jobs", {"pageSize": 1})
    print(f"   Status: {resp.status_code}")
    print(f"   Account Type: {resp.headers.get('x-accu-api-account-type', 'N/A')}")
    print(f"   Company Name: {resp.headers.get('x-accu-api-companyname', 'N/A')}")
    print(f"   Company ID: {resp.headers.get('x-accu-api-companyid', 'N/A')}")
    print(f"   Client Type: {resp.headers.get('x-accu-api-clienttype', 'N/A')}")
    print(f"   API Key Name: {resp.headers.get('x-accu-api-keyname', 'N/A')}")

    data = resp.json()
    print(f"\n   Total Jobs in Account: {data.get('count', 'N/A')}")

    # Get company settings
    print("\n2. Fetching company settings ...")
    settings = await get_json("/company-settings")
    print(f"   Company: {settings.get('name', 'N/A')}")
    tz = settings.get("timeZoneInfo", {})
    print(f"   Timezone: {tz.get('name', 'N/A')}")
    print(f"   UTC Offset: {tz.get('baseUtcOffset', 'N/A')}")
    print(f"   DST Support: {tz.get('supportsDaylightSavingTime', 'N/A')}")
    print(f"   Has Insurance: {settings.get('hasInsurance', 'N/A')}")

    print("\n" + "=" * 60)
    print("AUTH TEST: SUCCESS")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
