# Claude Co-Work Task: Extract Real Sales Messages from AccuLynx CRM

## What You're Doing

You are extracting real text message and email conversations between sales reps and homeowners from **AccuLynx**, a roofing CRM platform. This data will be used to train an AI sales agent to match the company's real communication voice.

Use "Min" browser.

The company is **Modern Day Roofing** based in Christiansburg, Virginia.

## How to Access AccuLynx

1. Open **https://app.acculynx.com** in the browser
2. You should already be logged in. If not, stop and ask me for credentials.
3. Once logged in, you'll see the main dashboard.

## What to Extract

You need to collect **real outbound messages** (texts and emails) that reps sent to homeowners. You need a diverse sample across different pipeline stages and scenarios.

### Target: 30 Jobs Total, Spread Across These Categories

Collect messages from **at least 5 jobs in each category**:

| Category | How to Find | What to Look For |
|----------|------------|------------------|
| **New Leads** (recently created) | Filter by milestone "Lead" | Initial outreach texts/emails, appointment confirmations |
| **Prospects** (estimate sent, waiting on signature) | Filter by milestone "Prospect" | Follow-up messages, estimate reminders, "checking in" texts |
| **Approved** (signed but not yet installed) | Filter by milestone "Approved" | Pre-install communication, scheduling confirmations |
| **Closed/Completed** (job finished) | Filter by milestone "Closed" or "Completed" | Thank you messages, review requests, invoice reminders |
| **Stale/Dead Leads** (went cold) | Filter by milestone "Dead" or leads with no recent activity | Re-engagement attempts, "are you still interested?" messages |
| **Active Follow-Up Threads** (multiple back-and-forth) | Look for jobs with 5+ messages | Full conversation threads showing how reps handle objections, questions, scheduling |

### Navigation Steps for Each Job

1. From the dashboard or job list, click on a job
2. Look for the **"Messages"** tab or section within the job record
3. This is where internal notes AND customer-facing messages are logged
4. Also check the **"Activity"** or **"History"** tab — emails sent to customers show up here
5. Look for entries labeled:
   - "Message" or "Text" — these are texts sent to/from the homeowner
   - "Email" — emails sent to the homeowner
   - "Note" — internal notes (less important but grab a few)

### What to Capture for Each Message

For every message you find, record:

- **Job Number** (shown at top of job record)
- **Milestone** the job was at when the message was sent
- **Date/Time** the message was sent
- **Sender** (which rep or staff member sent it)
- **Channel** (Text, Email, or Internal Note)
- **Direction** (Outbound to customer, or Inbound from customer)
- **Full Message Text** — copy the ENTIRE message, word for word. Do not summarize or paraphrase.

## How to Find Jobs

### Using the Job List / Search

- Click **"Jobs"** in the main navigation
- Use the **milestone filter** to filter by Lead, Prospect, Approved, Closed, Dead, etc.
- Sort by **"Modified Date"** to find recently active jobs (more likely to have messages)
- You can also sort by **"Created Date"** to find older jobs for the stale/dead category

### Tips for Finding Good Message Threads

- Jobs with the most activity are the most valuable — they have full conversation threads
- Look for jobs assigned to reps named: **Aric (AJ)**, **Chris Duncan**, **Jake Perdue**, **Joe Furrow**, **Paul VanWagoner** — these are the active sales reps
- Also look for messages from **Karman Link** (Inside Sales Manager) — she handles a lot of follow-up
- Skip jobs that only have internal notes and no customer-facing messages

## Output Format

Save everything to a single markdown file at: **`/Users/colinryan/MDR/acculynx-agent/sops/real_message_samples.md`**

Structure it like this:

```markdown
# Real Message Samples from AccuLynx
Extracted on: [today's date]
Total jobs sampled: [number]
Total messages captured: [number]

---

## Category: New Leads

### Job #[number] — [Homeowner Name or "Redacted"] — Milestone: Lead
**Rep:** [Name]
**Date Range:** [earliest to latest message date]

#### Message 1
- **Date:** 2026-03-15 10:30 AM
- **Sender:** Karman Link
- **Channel:** Text
- **Direction:** Outbound
- **Content:**
> Hi John, this is Karman with Modern Day Roofing. Just confirming your appointment for tomorrow at 10am with AJ. Looking forward to meeting you!

#### Message 2
- **Date:** 2026-03-15 11:45 AM
- **Sender:** John Smith
- **Channel:** Text
- **Direction:** Inbound
- **Content:**
> Sounds good, see you then

[...continue for all messages in this job...]

---

### Job #[number] — [next job...]

[...repeat for all 30 jobs...]

---

## Summary Statistics
- New Lead messages: [count]
- Prospect follow-ups: [count]
- Approved/scheduling messages: [count]
- Closed/review request messages: [count]
- Stale/re-engagement messages: [count]
- Total outbound: [count]
- Total inbound: [count]
- Most active rep: [name]
```

## Important Rules

1. **Copy messages VERBATIM.** Do not clean up typos, grammar, or formatting. We need to see exactly how reps actually write — typos and all.
2. **Include inbound messages too.** We need to see the full back-and-forth, not just what reps sent.
3. **Prioritize variety.** Don't grab 10 jobs from the same rep. Spread across different reps, different services (roof replacement, repair, gutters), and different lead sources.
4. **If a job has a long thread (10+ messages), capture ALL of them.** These full conversations are the most valuable training data.
5. **Skip purely internal notes** unless they show how a rep documented a customer interaction (e.g., "Called homeowner, left VM, will try again tomorrow").
6. **Redact sensitive info if needed** — you can replace full addresses with "[Address]" and last names with initials, but keep first names and the full message text intact.
7. **Don't rush.** Quality matters more than quantity. 20 well-documented job threads are better than 30 shallow ones.

## When You're Done

After saving the file, give me a summary of:
- How many jobs you sampled from each category
- How many total messages you captured
- Which reps were most represented
- Any patterns you noticed (e.g., "most follow-ups are via text not email", "reps rarely personalize messages", etc.)
- Any issues accessing data (e.g., "some jobs had no messages tab visible")

## Create the output directory first

Run this before saving the file:
```bash
mkdir -p /Users/colinryan/MDR/acculynx-agent/sops
```
