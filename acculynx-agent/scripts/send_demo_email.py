"""Send a one-shot demo email to colinjrbh317@gmail.com explaining what shipped.

Uses the canonical SendGrid path (messaging.dispatch) so it goes through the
real pipeline: DRY_RUN gate, Reply-To routing, the works.

Run from the worktree:
    .venv/bin/python scripts/send_demo_email.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Use the main repo's venv but the worktree's CODE.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> int:
    import os
    # Make sure DRY_RUN is off for this one-shot demo (env from .env is honored).
    os.environ.setdefault("DRY_RUN", "false")

    from config.settings import settings
    from messaging import dispatch

    subject = "[Agent demo] What I built for you this week"

    body = f"""\
Colin,

This is a real send from the AccuLynx AI agent through SendGrid. If you got it,
the pipe works.

Here's what shipped on the inspiring-stonebraker-e5dfcc branch over the last
few days, end to end:


─────────────────────────────────────────────────────────────────────
1) THE NEW REP PORTAL  (Next.js 15 + Tailwind, deploys to Vercel)
─────────────────────────────────────────────────────────────────────

A mobile-first app at app.moderndayroof.com. Reps sign in with a magic
link, see a list of pending drafts as cards, tap one, and hit a big green
Approve / amber Edit / grey Skip bar pinned to the thumb zone.

Routes built (10 total):
   /login            magic-link request
   /auth/callback    verify token, set 30-day session cookie
   /queue            card list of pending approvals
   /queue/[id]       full draft + lead context + recent AccuLynx activity
   /queue/[id]/edit  full-screen editor
   /upload           paste / drop Rilla transcripts onto a lead
   /sent             last 50 sent messages per rep
   /settings         profile + sign out

Why it's better than the old Jinja review UI: that one had a 240px sidebar
and was unusable on a phone. This one is mobile-primary - 56x56 touch
targets, 12px gaps so you can't fat-finger, fixed action bar in the bottom
72px of the screen (thumb zone), pull-to-refresh on /queue ONLY (so you
don't accidentally lose state mid-edit), optimistic UI with 5s undo toast.


─────────────────────────────────────────────────────────────────────
2) THE 6 PM DEADLINE - REMINDER CASCADE + AUTO-SEND
─────────────────────────────────────────────────────────────────────

Per Austin's call on 5/8, reps now have a hard deadline. The agent fires
escalating reminders, then sends the original draft if they don't decide:

   5:00 pm ET   First reminder        to rep
   5:30 pm ET   Second reminder       to rep
   5:45 pm ET   Third reminder        to rep
   5:55 pm ET   FINAL reminder        to rep, Sierra CC'd
   6:00 pm ET   AUTO-SENDS to homeowner, AccuLynx note logged as
                "AUTO-SENT (rep did not respond by deadline)"

This runs on APScheduler CronTrigger, timezone-locked to America/New_York
(handles DST automatically). Precision is ~1 second. Mon-Fri only. There's
a kill-switch flag (AUTO_SEND_ENABLED) in case Austin changes his mind in
training Thursday.


─────────────────────────────────────────────────────────────────────
3) INBOUND AUTO-REPLY - WHEN HOMEOWNERS WRITE BACK
─────────────────────────────────────────────────────────────────────

When the homeowner replies, a new Claude-based classifier
(ai/classifier.py) tags the message as:

   objective_question, scheduling, objection, complaint, dead_lead, other

…with a confidence score and category (warranty, financing, hours,
process, pricing, other).

Decision tree:
   - objective_question + confidence >= 0.90 + safe category
     => Auto-reply with a 120-180s random delay (so it doesn't feel like
        a bot), BCC the assigned rep, log as AUTO-REPLY to AccuLynx.
   - objection / complaint / pricing
     => Email the assigned rep, CC Sierra (sierraduncanmdr@gmail.com),
        pause cadence. Per your transcript: "the sales reps technically
        supposed to handle the objections."
   - dead_lead (e.g. "we're selling the house")
     => Send empathy + door-open template, pause cadence permanently.
   - everything else
     => Old behavior: pause + email rep.

The 2-3 min delay uses schedule_one_shot() backed by APScheduler's
DateTrigger - the agent now genuinely "schedules things in the future."


─────────────────────────────────────────────────────────────────────
4) THE AGENT CAN NOW SCHEDULE ARBITRARY FUTURE SENDS
─────────────────────────────────────────────────────────────────────

Just added: MessageQueue.scheduled_for column + new scheduled_send_job
that polls every minute. Drafter (or rep, in v2) sets:

   msg.status = "scheduled"
   msg.scheduled_for = datetime(2026, 5, 19, 13, 0, tzinfo=timezone.utc)

…and the agent fires it Tuesday at 9 am ET. Survives container restarts
because it's in the SQLite DB, not in-memory. No rep approval required -
the schedule itself is authorization.


─────────────────────────────────────────────────────────────────────
5) FIVE REAL REPS + TWILIO SMS
─────────────────────────────────────────────────────────────────────

config/reps.yaml replaced the solo-Colin wildcard with Aric, Chris, Jake,
Joe, Paul - each with rep_id (AccuLynx UUID), email, signature_phone,
sendgrid_sender_email, and a new twilio_phone field.

Twilio is fully wired (messaging/twilio_sms.py with E.164 normalization,
dry-run gating, per-rep from_phone). It's GATED behind MESSAGING_CHANNELS
- currently "email" only, flip to "email,sms" when A2P approval lands. No
redeploy needed.

SMS signature collapses to just the first name (single line) per Alicia's
note in the transcript. Email keeps the 3-line block.


─────────────────────────────────────────────────────────────────────
6) ESCALATION ROUTING - REP TO, SIERRA CC
─────────────────────────────────────────────────────────────────────

Per Austin's call at transcript line 309 ("the sales folder is gummed
up"), inbound escalations now go TO the assigned rep, CC
sierraduncanmdr@gmail.com - NOT to sales@moderndayroof.com. SendGrid
helpers (messaging/sendgrid_email.py) now accept cc / bcc params with
de-duplication.


─────────────────────────────────────────────────────────────────────
7) ACRONYM GLOSSARY + LAST-CONTACT TIMING
─────────────────────────────────────────────────────────────────────

Drafter prompt now translates rep shorthand:

   VM = voicemail        HO = homeowner
   FR = full replacement RR = roof repair
   EST = estimate        PP = Platinum Pledge (GAF warranty)
   GAF = (brand, kept)

If a rep writes "Left VM 5/12, HO wants FR" in AccuLynx notes, the
draft will say "After my voicemail Monday - you mentioned wanting a full
replacement." Acronyms NEVER leak to the homeowner.

Hard rule added: every draft must reference the last point of contact
with specific timing ("a few weeks ago when we sent the gold and silver
options"). If timing data is missing, omit rather than invent.


─────────────────────────────────────────────────────────────────────
8) RILLA TRANSCRIPT INGESTION (manual upload track)
─────────────────────────────────────────────────────────────────────

After two parallel Opus agents found that Rilla has no public outbound
API (the Portable.io connector page is an SEO landing page, not a real
product), v1 ships a manual-upload UX in the portal:

   - /upload page: lead typeahead -> drop/paste transcript -> persists
     to Lead.rilla_transcript + Lead.rilla_uploaded_at
   - Drafter (engine/context_builder.py) auto-prepends transcripts to
     the REP CONTEXT block when present, headed "RILLA MEETING TRANSCRIPT
     (verbatim, treat as ground truth)"
   - Mirrors back to AccuLynx as a [AI Agent] internal note

Reps can upload from their phone using the iOS share sheet after a
meeting. Sets us up for Track C (email-recap interception) and Track D
(rep-authenticated browser extension) without re-architecture later.


─────────────────────────────────────────────────────────────────────
9) THURSDAY TRAINING DOC
─────────────────────────────────────────────────────────────────────

acculynx-agent/docs/sales_rep_training.md - one-pager for Aric, Chris,
Jake, Joe, Paul. Covers sign-in, portal tour, approve/edit/skip flow,
acronym glossary, the 5pm-6pm cascade, inbound auto-reply behavior,
Twilio SMS notes, FAQ. Print this Thursday.


─────────────────────────────────────────────────────────────────────
WHY IT'S BETTER THAN WHAT EXISTED MONDAY
─────────────────────────────────────────────────────────────────────

Before: review UI was desktop-Jinja (240px sidebar, unusable mobile),
escalations dead-routed, 6pm "hammer" was a no-op stub, inbound replies
just paused the cadence with no triage, single shared sender, no SMS,
no future scheduling.

After: phone-first portal in the reps' pockets, accurate escalation to
assigned-rep + Sierra, real cron-driven 5pm cascade + 6pm auto-send,
intelligent inbound classifier that auto-resolves objective questions
and routes the rest correctly, per-rep email sender identity + per-rep
Twilio number (gated), arbitrary future scheduling via DB column +
1-min poll job, full Rilla manual-upload path with mirroring back to
AccuLynx.

Three git commits, ~2000 LOC, builds clean (next build: 10 routes
~125KB JS; tsc --noEmit: 0 errors). Pushed to
claude/inspiring-stonebraker-e5dfcc.


───────────────────────────────────────────────────────────
SCHEDULING - HOW PRECISE? (since you asked)
───────────────────────────────────────────────────────────

APScheduler AsyncIOScheduler with timezone=America/New_York. CronTrigger
fires within ~1 second of target wall-clock (Railway containers are
NTP-synced). DST handled automatically. Two future-scheduling
mechanisms:

   Short horizon  -> schedule_one_shot() with DateTrigger
                     (used for inbound 2-3 min delay)

   Long horizon   -> MessageQueue.scheduled_for column + 1-min poll
                     (used when agent says "send this Tuesday 9am")

A redeploy at the firing moment has a 600s misfire_grace_time - the
job runs as soon as the app is back up, so a 6pm send becomes 6:01pm,
not "skipped."

Full breakdown in acculynx-agent/docs/PRODUCTION_SETUP.md, which also
lists EVERY remaining manual step you need to do (Railway, Vercel, DNS,
SendGrid, Twilio, AccuLynx) to take this to production by Thursday.


- Buff (Colin's PAI)
"""

    print(f"From:    {settings.sendgrid_from_name} <{settings.sendgrid_from_email}>")
    print(f"To:      colinjrbh317@gmail.com")
    print(f"Subject: {subject}")
    print(f"DRY_RUN: {settings.dry_run}")
    print()

    result = dispatch(
        channel="email",
        to_email="colinjrbh317@gmail.com",
        to_name="Colin Ryan",
        subject=subject,
        body_text=body,
        lead_id="demo-build-summary",
    )

    print(f"sent:                {result.sent}")
    print(f"dry_run:             {result.dry_run}")
    print(f"blocked_reason:      {result.blocked_reason}")
    print(f"external_message_id: {result.external_message_id}")
    print(f"status_code:         {result.status_code}")
    if result.error:
        print(f"error:               {result.error}")
    return 0 if (result.sent or result.dry_run) else 1


if __name__ == "__main__":
    raise SystemExit(main())
