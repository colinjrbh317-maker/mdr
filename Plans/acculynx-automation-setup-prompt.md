# AccuLynx Automation Fix — Computer Use Prompt

> Copy-paste this entire prompt into Claude (computer use mode) with the AccuLynx browser open and logged in.

---

## YOUR TASK

You need to **update 4 existing automations** in AccuLynx's Automation Manager for Modern Day Roofing. These automations were recently created but need their **trigger changed** because the AccuLynx API cannot set job statuses programmatically.

**The change:** Switch all 4 automations from triggering on "Submitted for Status: New Web Lead" to triggering on the **"Changed to Lead"** milestone instead. This way they fire automatically when the website API creates a new job (which defaults to the "Lead" milestone).

---

## NAVIGATION

1. In AccuLynx's top navigation bar, click **"Tools"**
2. In the dropdown, click **"Automation Manager"**
3. You should see the list of all automations

---

## FIND THESE 4 AUTOMATIONS

Look for these 4 automations that were just recently created:

1. **New Web Lead — Instant Customer Email**
2. **New Web Lead — Instant Customer Text**
3. **New Web Lead — Internal Sales Alert**
4. **New Web Lead — 24hr Follow-Up**

They should all currently show a trigger of "When the status is submitted for New Web Lead" or similar wording.

---

## FOR EACH OF THE FIRST 3 AUTOMATIONS (A, B, C):

### Update the Trigger

1. Click on the automation to edit it
2. Find the trigger configuration (Step 1)
3. **Change the trigger from:**
   - Job → "Submitted for Status" → "New Web Lead"
4. **Change it to:**
   - **Milestones** → **"Changed to Lead"**
   - This is under the "Milestones" section (second section in the trigger picker), NOT the "Job" section
   - Select the radio button for **"Changed to Lead"**
5. **Leave all filters as-is** (ALL categories, ALL work types, ALL trade types — no filters)
6. **Keep the action (email or text) exactly as it is** — don't change the message content, subject, recipients, or anything in Step 2
7. Save the automation
8. Make sure it's still **ENABLED/ON**

### The 3 automations to update this way:

**Automation A — "New Web Lead — Instant Customer Email"**
- Trigger: Change to **Milestones → Changed to Lead**
- Action: Keep as-is (sends email to Primary Contact)

**Automation B — "New Web Lead — Instant Customer Text"**
- Trigger: Change to **Milestones → Changed to Lead**
- Action: Keep as-is (sends text to Primary Contact)

**Automation C — "New Web Lead — Internal Sales Alert"**
- Trigger: Change to **Milestones → Changed to Lead**
- Action: Keep as-is (sends email to Sierra/Alicia internally)

---

## FOR AUTOMATION D (24hr Follow-Up) — SPECIAL HANDLING:

The 24hr follow-up automation currently triggers "AFTER 1 Day in New Web Lead status." Since we're moving away from the "New Web Lead" status, we need a different approach.

**Check if this trigger option exists:**
- Under **Milestones**, look for **"Changed to Status"** with a dropdown, and see if there's a way to set a time delay (like "After 1 Day")
- Or check if there's an option like "After X time in Lead milestone"

**If a time-delayed milestone trigger exists:**
- Set it to: After 1 Day in "Lead" milestone
- Keep the email action as-is

**If NO time-delayed milestone trigger exists:**
- **Keep this automation as-is** with the "New Web Lead" status trigger
- It can serve as a manual safety net — if someone sets a job to "New Web Lead" status manually, it'll still send the 24hr follow-up
- OR delete it and note that this automation needs a different solution

---

## IMPORTANT — DO NOT TOUCH OTHER AUTOMATIONS

There are ~35+ other automations in the system. Do NOT modify, delete, or duplicate any of them. Only touch the 4 "New Web Lead" automations listed above.

---

## AFTER UPDATING — VERIFY

Go back to the Automation Manager list view and confirm:

1. [ ] **New Web Lead — Instant Customer Email** — now shows trigger "Changed to Lead" (milestone)
2. [ ] **New Web Lead — Instant Customer Text** — now shows trigger "Changed to Lead" (milestone)
3. [ ] **New Web Lead — Internal Sales Alert** — now shows trigger "Changed to Lead" (milestone)
4. [ ] **New Web Lead — 24hr Follow-Up** — either updated with delay trigger or left as-is (note which)
5. [ ] All 4 automations are ENABLED/ON
6. [ ] All other ~35 existing automations are still there and unchanged
7. [ ] The email/text content and recipients are unchanged for all 4

Take a screenshot of the automation list showing the updated triggers for confirmation.

---

## UI REFERENCE — How the Trigger Picker Works

The "Select Trigger" modal has three sections:

**Job** — "Trigger based on job events":
- Initial Customer Appointment, Lead Assigned, Submitted for Approval, Submitted for Closed, Submitted for Completed, Submitted for Invoiced, Submitted for Prospect, Submitted for Status (with dropdown)

**Milestones** — "Trigger based on job milestone changes":
- **Changed to Lead** ← THIS IS THE ONE WE WANT FOR A, B, C
- Changed to Prospect, Changed to Approved, Changed to Completed, Changed to Invoiced, Changed to Closed, Changed to Dead, Changed to Status (with dropdown)

**Orders** — "Trigger based on approved order events":
- (Don't touch this section)

---

## WHY THIS CHANGE

The website API creates a Contact + Job in AccuLynx when someone fills out a form. New jobs automatically get the **"Lead" milestone**. By triggering automations on "Changed to Lead," they fire instantly when the API creates the job — no manual status-setting needed.

The API also now auto-assigns **Sierra Duncan** as the company representative, so leads won't sit unassigned.

**Complete flow after this fix:**
```
Customer fills website form
  → API creates Contact + Job (milestone = "Lead")
  → API assigns Sierra Duncan as company rep
  → "Changed to Lead" automations fire instantly:
     → Customer gets confirmation email (A)
     → Customer gets confirmation text (B)
     → Sierra gets internal alert (C)
     → If nobody acts in 24hrs → follow-up (D, if updated)
  → Sierra sees the lead in AccuLynx, assigned to her
  → When she sets appointment → existing automations take over
```
