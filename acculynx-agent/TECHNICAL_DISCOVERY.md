# Technical Discovery Report — Modern Day Roofing AI Sales Agent

**Prepared by:** Social Theory Media
**Date:** March 26, 2026
**For:** Austin Hungate, CEO — Modern Day Roofing

---

## Executive Summary

We conducted a technical audit of Modern Day Roofing's AccuLynx CRM data to validate the feasibility of an AI-powered sales follow-up system. The findings confirm both the technical viability and the urgent business need.

**The headline number: 463 of your 578 active leads (80%) have gone 48+ hours without any follow-up activity.** The average stale lead has been sitting untouched for 59 days. This represents significant revenue left on the table that an AI sales agent can systematically recover.

---

## Your CRM at a Glance

| Metric | Value |
|--------|-------|
| Total jobs in AccuLynx | 5,517 |
| Active pipeline (Lead + Prospect + Approved) | 578 |
| Leads with no activity in 48+ hours | 463 (80%) |
| Total contacts | 5,517 |
| Active sales reps | 5 |
| Account type | Elite |
| AccuLynx API access | Confirmed and tested |

---

## Pipeline Breakdown

Your pipeline has 6 milestone stages. Here's where your 5,517 jobs sit:

| Milestone | Jobs | % of Total |
|-----------|------|-----------|
| Cancelled | 2,180+ | ~40% |
| Closed (won) | 793+ | ~14% |
| Prospect | 314 | 6% |
| Lead | 188 | 3% |
| Approved | 76 | 1% |
| Completed | 6 | <1% |

**578 jobs are actively in your pipeline right now** — these are the ones the AI agent would monitor and follow up on.

---

## The Follow-Up Gap (The Problem)

Of those 578 active leads, **463 have not been touched in over 48 hours.** Here's how the staleness breaks down:

| Staleness | Number of Leads | What This Means |
|-----------|----------------|-----------------|
| 2-7 days cold | 51 | Hot leads going lukewarm — easiest wins |
| 7-30 days cold | 205 | Warm leads going cold — still recoverable |
| 30-90 days cold | 99 | Cold leads — need re-engagement campaign |
| 90+ days cold | 108 | Long-dormant — some may still convert with the right touch |

**By milestone:**
- **Prospect:** 281 of 314 are stale (89%) — these already had initial contact
- **Lead:** 137 of 188 are stale (72%) — these are brand new leads going cold
- **Approved:** 45 of 76 are stale (59%) — these were approved but never closed

The average stale lead has been sitting for **59 days**. The median is **23 days**. The longest-neglected lead has been untouched for **651 days** (almost 2 years).

---

## Your Sales Team

| Name | Role | Email |
|------|------|-------|
| Aric Jaklitsch | Sales | aj@moderndayroof.com |
| Chris Duncan | Sales | chrisduncan@moderndayroof.com |
| Jake Perdue | Sales | jakeperduemdr@gmail.com |
| Joe Furrow | Sales | joefurrow@moderndayroof.com |
| Paul VanWagoner | Sales | paulvanwagoner@moderndayroof.com |

5 active sales reps, 4 admins, and 1 location admin (10 active users total, plus 10 inactive former employees).

---

## Contact Data Quality

We sampled contact records across the CRM. Quality is excellent for AI-powered outreach:

| Data Point | Availability |
|-----------|-------------|
| Phone number | 100% of contacts |
| Email address | 100% of contacts |
| Mailing address | 100% of contacts |
| SMS opt-out flag | Available on every phone record |
| Phone type (Mobile/Home) | Available — 50% labeled Mobile |

This means the AI agent will have the contact information it needs for every lead in your pipeline.

---

## Lead Sources (Where Your Leads Come From)

| Source | Lead Count |
|--------|-----------|
| Other | 852 |
| Google Ads | 612 |
| Referral | 387 |
| Website Form Submission | 365 |
| Canvassing Team | 191 |
| Facebook | 84 |
| Yard Sign | 48 |
| Roof Giveaway 2024 | 44 |
| Door Knocking | 38 |

Google Ads and website forms account for nearly 1,000 leads — these are high-intent prospects who came to you. The AI agent will be especially effective at keeping these warm.

---

## Activity Tracking (What The AI Agent Can See)

The AccuLynx API provides a complete activity history for every job. The AI agent can see:

- Every message sent or received on a job
- Email activity (sent/received)
- Milestone changes (who moved it and when)
- Estimate creation and modifications
- Invoice and payment activity
- Notes and internal communications
- Who performed each action and when

This activity history is what allows the AI to understand context before drafting a follow-up message. It knows what's already been said, by whom, and how long ago.

---

## What The AI Agent Will Do

Based on this technical discovery, here's how the system would work:

1. **Monitor** — The agent watches your AccuLynx pipeline in real-time via webhooks (instant notifications when anything changes) and periodic scans every 15 minutes.

2. **Detect** — When a lead goes 48+ hours without activity (or whatever threshold you set), the agent flags it and determines the next appropriate follow-up based on your SOP.

3. **Draft** — Using Claude AI with full context (the lead's history, contact info, which milestone they're in, and your SOP rules), the agent drafts a personalized follow-up message.

4. **Route** — During business hours, the drafted message goes to the assigned rep for one-click approval. After hours or for stale leads, pre-approved templates can send automatically.

5. **Send** — Messages go out via iMessage (blue text when possible) with SMS fallback, plus email. All from your business number/identity.

6. **Log** — Every action is logged back to the AccuLynx job file so your team has full visibility.

---

## Technical Feasibility: Confirmed

| Requirement | Status | Notes |
|------------|--------|-------|
| API Authentication | Confirmed | Elite account, full access |
| Read job/contact data | Confirmed | All 16 fields per job, full contact details |
| Activity history | Confirmed | Complete audit trail per job |
| Real-time webhooks | Available | 18+ event types including milestone changes |
| Log actions back to CRM | Confirmed | Can write notes and activity logs to jobs |
| SMS capability | Via LoopMessage/Twilio | AccuLynx API does not send SMS directly — we route through dedicated messaging platforms |
| Email capability | Via SendGrid | Professional transactional email with tracking |

---

## Next Steps

1. **Sign agreement and begin build** — 2-3 week implementation timeline
2. **Provide the 118-page SOP** — We'll encode your exact follow-up sequences into the AI engine
3. **Set up messaging accounts** — LoopMessage (iMessage), Twilio (SMS fallback), SendGrid (email)
4. **Configure and test** — Start with a small batch of stale leads, verify quality, then scale

---

*This report was generated from live AccuLynx API data pulled on March 26, 2026. All numbers reflect the current state of Modern Day Roofing's CRM.*
