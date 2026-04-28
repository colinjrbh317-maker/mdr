"""Script 07: List all users/reps with roles and contact info."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acculynx.client import get_json


async def main():
    print("=" * 60)
    print("SCRIPT 07: Users & Sales Reps")
    print("=" * 60)

    # Get all active users
    print("\n1. Fetching active users ...")
    users_data = await get_json("/users")
    users = users_data.get("items", [])

    print(f"   Total active users: {len(users)}")

    # Show all fields on first user
    if users:
        print(f"\n2. User record fields:")
        for key in sorted(users[0].keys()):
            print(f"   - {key}")

    # Full user listing
    print(f"\n3. Complete user list:")
    print(f"   {'Name':<25} {'Role':<20} {'Email':<35} {'Phone':<15} {'Mobile':<15} {'Status':<10}")
    print(f"   {'-'*25} {'-'*20} {'-'*35} {'-'*15} {'-'*15} {'-'*10}")

    roles = {}
    sales_reps = []

    for user in users:
        name = user.get("displayName", f"{user.get('firstName', '')} {user.get('lastName', '')}".strip())
        role = user.get("role", {})
        role_name = role.get("name", "N/A") if isinstance(role, dict) else str(role)
        email = user.get("email", "N/A")
        phone = user.get("phone", "N/A") or "N/A"
        mobile = user.get("mobilePhone", "N/A") or "N/A"
        status = user.get("status", "N/A")

        print(f"   {name:<25} {role_name:<20} {email:<35} {phone:<15} {mobile:<15} {status:<10}")

        roles[role_name] = roles.get(role_name, 0) + 1

        if "sales" in role_name.lower() or "sale" in role_name.lower():
            sales_reps.append({
                "name": name,
                "email": email,
                "phone": phone,
                "mobile": mobile,
                "id": user.get("id"),
            })

    # Role breakdown
    print(f"\n4. Role breakdown:")
    for role, count in sorted(roles.items(), key=lambda x: -x[1]):
        print(f"   {role}: {count}")

    # Sales reps specifically
    print(f"\n5. Identified Sales Reps: {len(sales_reps)}")
    for rep in sales_reps:
        print(f"   - {rep['name']} | {rep['email']} | {rep['mobile']}")

    # Also check inactive users
    print(f"\n6. Checking inactive users ...")
    try:
        inactive = await get_json("/users", {"status": "inactive"})
        inactive_users = inactive.get("items", [])
        print(f"   Inactive users: {len(inactive_users)}")
        for u in inactive_users[:5]:
            name = u.get("displayName", "N/A")
            role = u.get("role", {})
            role_name = role.get("name", "N/A") if isinstance(role, dict) else "N/A"
            print(f"   - {name} ({role_name})")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n" + "=" * 60)
    print("USER LISTING: COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
