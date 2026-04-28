# SOP: CRM Workflow & Status Rules

## When This Applies
Defines how jobs move through AccuLynx milestones and what each status means. The AI agent uses this to understand where a lead is and what should happen next.

## AccuLynx Milestone Flow

```
Lead → Prospect → Approved → Completed → Invoiced → Closed
                                                        ↘ Dead (at any stage)
```

## Status Definitions

| Status | Meaning | AI Action |
|--------|---------|-----------|
| **Lead** | Appointment booked, no rep visit yet | Monitor for stale (no activity 24h+), run intake cadence |
| **Prospect** | Rep has visited, estimate sent, waiting on contract | Run nurture cadence (SOP 04), this is the critical gap |
| **Approved** | Signed contract received | Monitor for scheduling, run pre-install cadence (SOP 06) |
| **Completed** | Job finished, not yet invoiced | Trigger walkthrough scheduling, satisfaction check |
| **Invoiced** | Invoice sent but unpaid | Monitor for payment, gentle reminders |
| **Closed** | Job paid in full | Start post-close drip campaign (SOP 08) |
| **Dead** | Lost, went with competitor, unresponsive, etc. | No active cadence. May re-engage after 90+ days if appropriate |

## CRM Documentation Rules
- ALL communication logged in AccuLynx Messages tab
- Every call, text, voicemail, email documented
- Notes include: who called, why, what was said, next steps
- Lead source must be tagged on every lead
- No blank notes, "No estimate can be built without this context"

## AI Agent CRM Logging
Every outbound message the AI sends (or that a rep approves) gets logged back to AccuLynx:
- Job Messages tab: "[AI Agent] [Channel] sent to [Contact]: '[message preview]...'"
- Include timestamp, channel (SMS/Email), and whether it was auto-sent or rep-approved

## Status Transition Triggers
The AI agent watches for these transitions and takes action:

| Transition | Trigger | AI Action |
|-----------|---------|-----------|
| New → Lead | Lead created | Start monitoring response time |
| Lead → Prospect | Rep visits, estimate sent | Start nurture cadence |
| Prospect → Approved | Contract signed | Start pre-install cadence |
| Approved → Completed | Install done | Trigger walkthrough scheduling |
| Completed → Invoiced | Invoice sent | Monitor payment status |
| Invoiced → Closed | Payment received | Start drip campaign |
| Any → Dead | Lead lost | Stop all cadences, log reason |

## Cross-Department Communication Timelines

| Event | Who Communicates | To Whom | Timeline |
|-------|-----------------|---------|----------|
| Lead intake | DFI | ISM + Rep | Within 15 min |
| Post-inspection | Rep | ISM + PM | Within 1 hour |
| Estimate sent, no reply | ISM | Rep | 48 hours |
| Contract signed | Rep | PM + DFI + Marketing | Within 1 hour |
| Material scheduling | PM | Rep + COO | 2-5 days before install |
| Walkthrough ready | PM | ISM + Rep | Within 72 hours |
| Review request | Rep + ISM | Marketing | Within 24 hours |
