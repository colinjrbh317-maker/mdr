# SOP: Estimate Sent, Nurture Sequence

## When This Applies
Estimate has been sent to homeowner but they haven't signed. This is the CRITICAL follow-up gap where most leads are lost.

## Pipeline Stage
**Prospect** (estimate sent, waiting on decision)

## The 12-Touch Cadence
This sequence starts when the estimate is sent. Maximum 12 contact attempts before marking dead.

| Touch | Day Offset | Channel | Content Type |
|-------|-----------|---------|-------------|
| 1 | Day 0 | Email | Estimate delivery + thank you (see SOP 03) |
| 2 | Day 2 | Text | "Wanted to check if you had questions about the estimate" |
| 3 | Day 5 | Text | "Checking in on the proposal, happy to go over anything" |
| 4 | Day 10 | Email | Value add, financing options, warranty details, FAQ |
| 5 | Day 14 | Text | "Still thinking it over? No pressure, just here if you need us" |
| 6 | Day 21 | Email | Soft urgency, seasonal scheduling, crew availability |
| 7 | Day 30 | Text | "Just want to make sure we haven't lost touch" |
| 8 | Day 38 | Email | Social proof, recent project photos, reviews |
| 9 | Day 45 | Text | Re-engagement, "Things change, still here if you need us" |
| 10 | Day 52 | Email | Final value pitch, what sets MDR apart |
| 11 | Day 60 | Text | "Last check-in before we close your file" |
| 12 | Day 67 | Email | Final, "We're closing this out, reach out anytime in the future" |

## Dead Lead Rule
A homeowner should NEVER be marked as dead unless:
- They have gone with another contractor
- They've explicitly expressed disinterest
- They've been contacted **12 times** (via text, email, voicemail, etc.)

## AI Agent Role at This Stage
This is where the AI agent provides the MOST value:
- Automatically advance through the cadence based on elapsed time since estimate sent
- Draft personalized messages using lead context (service type, roof age, urgency)
- During business hours (8am-6pm Mon-Sat): send draft to rep for approval
- After hours (6pm-8am Mon-Sat + all day Sunday): send autonomously using these templates
- Log every outbound message back to AccuLynx
- If homeowner replies: pause cadence and alert assigned rep immediately

## Communication Tone
Helpful, patient, never pushy. Reference their specific project. Offer value (financing info, warranties, crew availability) rather than just "checking in."

## Example Messages

**Touch 2 (Day 2, Text):**
"Hi [Name], this is [Rep Name] with Modern Day Roofing. Just wanted to check if you had any questions about the estimate we sent over. Happy to go over anything, give me a call anytime at [Phone]."

**Touch 4 (Day 10, Email):**
"Hi [Name], I wanted to follow up on the estimate we discussed. I know choosing a roofing contractor is a big decision. If financing is a concern, we offer several options that can make this more manageable. I'm happy to walk you through them. Just reply to this email or call me at [Phone]."

**Touch 7 (Day 30, Text):**
"Hi [Name], just checking in from Modern Day Roofing. I know timing is everything, if your situation has changed or you'd like an updated estimate, we're here. No pressure at all."

**Touch 11 (Day 60, Text, final warning):**
"Hi [Name], this is [Rep Name] with Modern Day Roofing. I wanted to reach out one more time before we close out your file. If you're still considering the project, we'd love to help. Otherwise, feel free to reach out anytime in the future. Wishing you the best!"

## Do NOT
- Use text to deliver bad news or discuss pricing changes
- Create urgency that isn't real ("limited time" when there's no actual deadline)
- Send more than 12 contact attempts total
- Continue sequence if homeowner says they went with another company, mark dead and send graceful close (see AJ's example: "I appreciate you letting me know. If anything changes or you need a second opinion down the road, don't hesitate to reach out.")
