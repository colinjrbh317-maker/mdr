# MDR AI Sales Agent — Lead Pipeline

## The Full Journey

Every lead flows through these 10 layers. The AI knows exactly where each lead is and writes messages appropriate to that layer. Leads can move forward, skip layers, or go backwards based on what happens in AccuLynx.

```
                          ┌─────────────────────────────────────┐
                          │         LEAD ENTERS SYSTEM          │
                          │   (web form, call, referral, etc.)  │
                          └──────────────┬──────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: FIRST CONTACT                                                  │
│  ─────────────────────                                                   │
│  Goal: Make contact, qualify, get appointment scheduled                   │
│  Tone: Warm, quick, professional                                         │
│  Channels: Text + Email                                                  │
│                                                                          │
│  Touch 1 (Day 0): Text — "Hi [Name], this is MDR. Thanks for reaching   │
│                    out about your roofing project..."                     │
│  Touch 2 (Day 0): Email — Intro with rep name, phone, what to expect    │
│  Touch 3 (Day 1): Text — "Tried calling earlier, wanted to connect..."  │
│                                                                          │
│  EXIT: Appointment scheduled → Layer 2                                   │
│  EXIT: No response after 3 touches → Layer 6 (Going Cold)               │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                            Appointment Scheduled
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: PRE-APPOINTMENT                                                │
│  ────────────────────────                                                │
│  Goal: Confirm appointment, reduce no-shows                              │
│  Tone: Friendly, helpful, logistical                                     │
│  Channels: Text + Email                                                  │
│                                                                          │
│  * AccuLynx handles: appointment confirmation text + 3-day email +       │
│    day-of text (EXISTING AUTOMATIONS — AI monitors, doesn't duplicate)   │
│                                                                          │
│  AI ONLY acts if: appointment not confirmed 2 hours before               │
│  Touch: Text — "Just confirming we're still on for today at [time]..."   │
│                                                                          │
│  EXIT: Appointment happens → Layer 3                                     │
│  EXIT: No-show → Layer 6 (Going Cold)                                    │
│  EXIT: Cancels → Layer 1 (reschedule) or Layer 6 (Going Cold)           │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                              Rep Inspects Property
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: POST-INSPECTION                                                │
│  ────────────────────────                                                │
│  Goal: Deliver estimate, set expectations                                │
│  Tone: Professional, confident, grateful                                 │
│  Channels: Email (primary) + Text (support)                              │
│                                                                          │
│  * AccuLynx handles: "Thank you for meeting" email (DAY AFTER)           │
│                                                                          │
│  AI acts if estimate not sent within 24h:                                │
│  Touch: Email — "Thank you for meeting with [Rep]. Your estimate is      │
│          attached. Please call us with any questions."                    │
│                                                                          │
│  EXIT: Estimate delivered → Layer 4                                      │
│  EXIT: Rep marks as no-damage / not a fit → Layer 10 (Closed - No Sale) │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                              Estimate Delivered
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: ESTIMATE FOLLOW-UP                    *** THE MONEY ZONE ***   │
│  ───────────────────────────                                             │
│  Goal: Answer questions, overcome objections, get signature              │
│  Tone: Helpful, patient, value-focused (NOT pushy)                       │
│  Channels: Alternating Text + Email                                      │
│                                                                          │
│  Touch 1 (Day 2):  Text  — "Any questions about the estimate?"          │
│  Touch 2 (Day 5):  Text  — "Checking in on the proposal"               │
│  Touch 3 (Day 10): Email — Financing options + warranty info             │
│  Touch 4 (Day 14): Text  — "No pressure, still here if you need us"    │
│                                                                          │
│  EXIT: Signs contract → Layer 7 (Pre-Install)                            │
│  EXIT: Says "getting other estimates" → Layer 5                          │
│  EXIT: Says "need more time" → Layer 5                                   │
│  EXIT: No response after 4 touches → Layer 5                            │
│  EXIT: Says "went with someone else" → Layer 10 (Closed - Lost)         │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                          Still Undecided / Going Quiet
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: NURTURE                                                        │
│  ────────────────                                                        │
│  Goal: Stay top-of-mind, provide value, don't lose them                  │
│  Tone: Patient, low-pressure, value-driven                               │
│  Channels: Alternating Text + Email (wider spacing)                      │
│                                                                          │
│  Touch 1 (Day 21): Email — Seasonal scheduling / crew availability      │
│  Touch 2 (Day 30): Text  — "Just making sure we haven't lost touch"     │
│  Touch 3 (Day 38): Email — Social proof (reviews, recent project photos)│
│  Touch 4 (Day 45): Text  — "Things change, still here if you need us"   │
│                                                                          │
│  EXIT: Re-engages (replies, calls) → Back to Layer 4                     │
│  EXIT: Signs contract → Layer 7 (Pre-Install)                            │
│  EXIT: No response after 4 touches → Layer 6                            │
│  EXIT: Explicitly declines → Layer 10 (Closed - Lost)                    │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                               Still No Response
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 6: GOING COLD                                                     │
│  ───────────────────                                                     │
│  Goal: Last chance before closing the file                               │
│  Tone: Respectful, final, leave the door open                            │
│  Channels: Text + Email (final attempts)                                 │
│                                                                          │
│  Touch 1 (Day 52): Email — What sets MDR apart (last value pitch)       │
│  Touch 2 (Day 60): Text  — "Last check-in before we close your file"   │
│  Touch 3 (Day 67): Email — "Closing out, reach out anytime in future"   │
│                                                                          │
│  EXIT: Re-engages → Back to Layer 4 or 5                                 │
│  EXIT: Signs → Layer 7                                                   │
│  EXIT: No response after 3 touches → Layer 10 (Closed - Unresponsive)   │
│  EXIT: 90 days later → Layer 11 (Re-engagement)                         │
└──────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                         THEY SIGNED THE CONTRACT
═══════════════════════════════════════════════════════════════════════════

                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 7: PRE-INSTALL                                                    │
│  ────────────────────                                                    │
│  Goal: Keep customer informed, reduce anxiety, prep for install          │
│  Tone: Excited, reassuring, organized                                    │
│  Channels: Email (primary) + Text (reminders)                            │
│                                                                          │
│  * AccuLynx handles: Welcome email, install reminders (1-week, 1-day)    │
│                                                                          │
│  AI acts on: Weather delays, scheduling gaps, unscheduled jobs           │
│  Touch: Text — "Quick update on your project timeline..."               │
│  Touch: Email — "Your install date is confirmed for [date]..."          │
│                                                                          │
│  EXIT: Install complete → Layer 8                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                               Install Complete
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 8: POST-INSTALL                                                   │
│  ─────────────────────                                                   │
│  Goal: Satisfaction check, collect review, close out cleanly             │
│  Tone: Grateful, warm, brief                                            │
│  Channels: Text + Email                                                  │
│                                                                          │
│  Touch 1 (Day 7):  Text  — "How's the new roof? Any concerns?"         │
│  Touch 2 (Day 7):  Email — Review request link                          │
│                                                                          │
│  * AccuLynx handles: Review email (if "Ask for Review" status set)       │
│                                                                          │
│  EXIT: Invoice paid → Layer 9                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                Job Fully Closed
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 9: DRIP (Post-Close)                                              │
│  ──────────────────────────                                              │
│  Goal: Stay front-of-mind, upsell services, generate referrals          │
│  Tone: Casual, appreciative, non-pushy                                   │
│  Channels: Email (primary) + occasional Text                             │
│                                                                          │
│  Touch 1 (Day 30):  Text  — "How's the new roof holding up?"           │
│  Touch 2 (Day 90):  Email — Seasonal checkup + gutters/siding offer    │
│  Touch 3 (Day 180): Email — Referral program ($250 per referral)        │
│  Touch 4 (Day 365): Email — Anniversary + maintenance offer             │
│                                                                          │
│  EXIT: Refers someone → New lead enters Layer 1                          │
│  EXIT: Wants more work → New job enters Layer 1                          │
│  EXIT: Drip complete (1 year) → Done                                     │
└──────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                            SPECIAL LAYERS
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 10: CLOSED (Dead / Lost / Unresponsive)                           │
│  ─────────────────────────────────────────────                           │
│  No active messaging. Lead is filed away.                                │
│                                                                          │
│  Sub-categories:                                                         │
│  • Went with competitor — Graceful close sent, door left open            │
│  • Unresponsive (12 attempts) — File closed, eligible for L11 at 90d    │
│  • No damage / not a fit — No further contact                            │
│  • Customer requested no contact — Permanent stop                        │
│                                                                          │
│  EXIT: 90 days pass → Layer 11 (if not "no contact")                     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 11: RE-ENGAGEMENT                                                 │
│  ───────────────────────                                                 │
│  Goal: One last shot at reviving a dead lead                             │
│  Tone: Casual, low-key, "just checking in"                               │
│  Channels: Text + Email                                                  │
│                                                                          │
│  Touch 1 (Day 0): Text  — "Hi [Name], it's been a while. Still need    │
│                    that roof looked at?"                                  │
│  Touch 2 (Day 7): Email — Value offer or seasonal promo                 │
│  Touch 3 (Day 14): Text — Final attempt                                 │
│                                                                          │
│  EXIT: Re-engages → Back to Layer 4                                      │
│  EXIT: No response → Permanently closed (no more contact ever)           │
└──────────────────────────────────────────────────────────────────────────┘


## Movement Rules

FORWARD (natural progression):
  Layer 1 → 2 → 3 → 4 → 5 → 6 → 10 → 11

SKIP FORWARD (accelerated):
  Layer 1 → 7 (signed immediately after first contact — rare but happens)
  Layer 4 → 7 (signed during estimate follow-up)
  Layer 5 → 7 (signed during nurture)

BACKWARD (re-engagement):
  Layer 5 → 4 (went quiet, then replied with questions)
  Layer 6 → 4 (was going cold, then called back)
  Layer 6 → 5 (was going cold, then replied but not ready)
  Layer 10 → 11 → 4 (dead lead re-engages after 90 days)

HARD STOPS (no more messaging):
  Any Layer → ESCALATION (angry customer, complaint, legal) — human takes over
  Any Layer → STOP (customer replies STOP via Twilio) — permanent SMS stop
  Layer 11 → No response after 3 touches → permanently done, never contact again


## Layer-to-AccuLynx Mapping

  Layer  │ AccuLynx Milestone │ Who Handles
  ───────┼───────────────────┼──────────────────────
  1      │ Lead               │ AI + AccuLynx auto
  2      │ Lead (appt set)    │ AccuLynx auto (AI monitors)
  3      │ Lead → Prospect    │ AccuLynx auto + AI gap-fill
  4      │ Prospect           │ *** AI OWNS THIS ***
  5      │ Prospect           │ *** AI OWNS THIS ***
  6      │ Prospect           │ *** AI OWNS THIS ***
  7      │ Approved           │ AccuLynx auto (AI gap-fill)
  8      │ Completed/Invoiced │ AI + AccuLynx auto
  9      │ Closed             │ *** AI OWNS THIS ***
  10     │ Dead/Cancelled     │ AI (close message only)
  11     │ Dead (90+ days)    │ *** AI OWNS THIS ***
```
