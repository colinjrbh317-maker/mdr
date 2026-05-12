# MDR AccuLynx AI Sales Agent — Finish-Line Plan

**Target:** Demo-ready Thursday 5/14 9:30am, full Monday 5/18 launch.
**Source of truth:** [May-08 meeting transcript](/Users/colinryan/Downloads/May-08-01-59-PM-b1fba36c-a926.md)
**Codebase:** [acculynx-agent/](acculynx-agent/) — Python 3.11 + FastAPI + Anthropic SDK + SQLite, deployed on Railway.

---

## Context

Austin (CEO) and Alicia approved the demo on 5/8. The system is "ready to go into Black Cat" — pending:
1. A handful of behavior changes they called out in the meeting (escalation routing, acronym training, 6pm hammer-send + reminder cascade, inbound auto-reply path).
2. A mobile-friendly **rep portal** so the 5 sales reps can approve/edit drafts from their phones — the current Jinja UI at [templates/review/base.html](acculynx-agent/templates/review/base.html) has a fixed 240px sidebar and isn't usable on mobile.
3. Loading the 5 real reps into the system — [config/reps.yaml](acculynx-agent/config/reps.yaml) currently has only a solo-Colin wildcard entry.

**Launch sequence Austin laid out at [transcript line 437]:** Training Thursday → reps put notes in AccuLynx Thursday-Sunday → full live launch Monday.

---

## Architecture decisions (locked)

| Decision | Choice |
|---|---|
| Rep portal | **Next.js on Vercel** at `app.moderndayroof.com` (or similar), talks to FastAPI/Railway over JSON |
| Rep auth | **Email magic link** → 30-day signed cookie session |
| SMS for Monday launch | **In scope** (gated by Twilio A2P approval landing by Thursday — fallback below) |
| Inbound auto-reply | **In scope** (high-confidence ≥90%, 2–3 min random delay, BCC rep) |
| Deferred to v2 | Rilla transcript ingestion, per-rep tone training, custom ChatGPT-style ad-hoc UI, AccuLynx official API migration (parallel-track this week) |

---

## Critical files to modify

**Backend (FastAPI/Railway):**
- [acculynx-agent/config/reps.yaml](acculynx-agent/config/reps.yaml) — load 5 real reps + per-rep Twilio numbers
- [acculynx-agent/ai/drafter.py](acculynx-agent/ai/drafter.py) — add acronym glossary (VM/HO/FR/etc.), reinforce "reference last contact with specific timing" rule, banned-phrase list for "follow up"/"checking in" already present
- [acculynx-agent/engine/scheduler.py](acculynx-agent/engine/scheduler.py) — add `daily_hammer_send_job` (cron 17:00, 17:30, 17:45, 17:55, 18:00 ET), fix `escalation_job` to actually send emails (line 133 says "deferred to v2")
- [acculynx-agent/engine/approval_flow.py](acculynx-agent/engine/approval_flow.py) — escalation now routes to assigned rep's email + CC Sierra (not a single `escalation_email`)
- [acculynx-agent/api/webhooks.py](acculynx-agent/api/webhooks.py) — inbound auto-reply branch: classify reply → if objective + confidence ≥0.90 → draft → wait 2–3min → auto-send + BCC rep + log; else escalate to rep+Sierra
- New: [acculynx-agent/ai/classifier.py](acculynx-agent/ai/classifier.py) — Claude-based inbound classifier (intent + confidence + category)
- New: [acculynx-agent/messaging/twilio_sms.py](acculynx-agent/messaging/twilio_sms.py) — `send_sms()` matching `SendResult` shape; update [messaging/__init__.py](acculynx-agent/messaging/__init__.py:120-125) to route SMS
- New: [acculynx-agent/api/portal_api.py](acculynx-agent/api/portal_api.py) — JSON API for Next.js portal (`/api/portal/queue`, `/api/portal/messages/{id}`, `/api/portal/messages/{id}/decision`, magic-link auth endpoints)
- [acculynx-agent/api/main.py](acculynx-agent/api/main.py) — CORS for Vercel origin, mount portal_api router

**Frontend (new Next.js app):**
- New repo or `acculynx-agent/portal/` — Next.js 15 + App Router + Tailwind + shadcn/ui
- Pages: `/login` (magic link request), `/auth/callback`, `/queue` (pending approvals list, mobile-first), `/queue/[id]` (draft detail + approve/edit/skip), `/sent` (sent log), `/settings` (rep profile)
- Reuses Modern Day Roofing design tokens from `src/` of the website (Barlow Condensed + DM Sans, accent `#C0392B`)

---

## Reuse already-built primitives

- **JWT magic-link plumbing** — [engine/approval_flow.py:43-60](acculynx-agent/engine/approval_flow.py:43) already signs + verifies tokens for approve/edit/skip; the rep-portal session cookie reuses the same `jwt` library + `settings.jwt_secret`.
- **Why-this-lead context** — [engine/approval_flow.py:84-122](acculynx-agent/engine/approval_flow.py:84) (`_build_why_now`) already produces the per-draft context string; the portal queue card reuses it verbatim.
- **AccuLynx interaction fetch** — [engine/approval_flow.py:72-81](acculynx-agent/engine/approval_flow.py:72) (`_fetch_recent_interactions`) feeds the portal's "recent activity" panel.
- **Dispatch router** — [messaging/__init__.py](acculynx-agent/messaging/__init__.py) already enforces DRY_RUN + allowlist; Twilio just plugs into it.
- **Thread continuity** — [engine/approval_flow.py:372-389](acculynx-agent/engine/approval_flow.py:372) already derives from-email + In-Reply-To from the latest rep email; inbound auto-replies reuse this so the homeowner sees the AI reply in the same thread.
- **Testbench feedback DB** — [api/review.py](acculynx-agent/api/review.py) `TestbenchVerdict` already feeds Google Sheets via [engine/sheets.py](acculynx-agent/engine/sheets.py); portal "edit and approve" diff goes to the same table.
- **Postflight regex gates** — [engine/postflight.py](acculynx-agent/engine/postflight.py) catches em-dashes, banned phrases, brackets — applies to inbound auto-reply drafts too.

---

## Work breakdown (ordered, with day targets)

### Day 1 (Mon 5/12) — Backend foundations

1. **Wire the 5 real reps** ([config/reps.yaml](acculynx-agent/config/reps.yaml))
   - One row each for Aric, Chris, Jake, Joe, Paul with `rep_id` matching AccuLynx user UUID (already documented in the comment block), `first_name`, `email`, `signature_phone`, `sendgrid_sender_email`, and new `twilio_phone` field.
   - Add Sierra's row as escalation-only (no AccuLynx rep_id, used for CC routing).
   - Flip `SOLO_SENDER_MODE=false` in `.env`. SendGrid Single Sender verification for each rep (~5 min each) — sequence this with Alicia.

2. **Drafter prompt updates** ([ai/drafter.py:38-91](acculynx-agent/ai/drafter.py:38))
   - Add acronym glossary block: VM = voicemail, HO = homeowner, FR = full replacement, RR = roof repair, EST = estimate, PP = Platinum Pledge, GAF = manufacturer name. Place inside the user prompt's "REP CONTEXT" section so it's parsed when notes mention them.
   - Strengthen rule 7 (PERSONALIZATION) — promote to a hard requirement: "Always reference the last point of contact with specific timing ('a few weeks ago when we sent the gold and silver options', 'after Paul left you a voicemail on Tuesday'). Use the AccuLynx-pulled last-interaction record. If timing data is missing, omit timing rather than invent it."

3. **Escalation routing fix** ([engine/approval_flow.py](acculynx-agent/engine/approval_flow.py))
   - `create_approval_request` already accepts `rep` arg — confirm `cadence_job` ([engine/scheduler.py:44](acculynx-agent/engine/scheduler.py:44)) is passing the **assigned** rep, not falling through to default.
   - When auto-reply or inbound escalation fires, route `to=rep.email`, `cc=[sierra_email]`. Add `cc` field to `DispatchResult` flow.

### Day 2 (Tue 5/13) — Scheduler + Twilio

4. **6pm hammer-send + reminder cascade** ([engine/scheduler.py](acculynx-agent/engine/scheduler.py))
   - Replace the `escalation_job` stub (currently just sets `escalated=True` per [scheduler.py:133](acculynx-agent/engine/scheduler.py:133)) with a real `approval_nudge_job` running on `CronTrigger(hour=17, minute='0,30,45,55')` ET that emails reps "X pending approvals expire at 6pm" with deep links.
   - Add `auto_send_at_6pm_job` on `CronTrigger(hour=18, minute=0, day_of_week='mon-fri')` ET — for each pending-approval older than X hours, send the original (unedited) draft and log to AccuLynx with a "auto-sent: rep did not respond by 6pm" note. **Default behavior: send.** (Confirm with Austin Thursday; if he wants "nudge-only, never auto-send", we flip a flag.)
   - Skip weekends and after-hours (already partial logic in [engine/sync.py:475](acculynx-agent/engine/sync.py:475) `is_business_hours`).

5. **Twilio SMS** ([messaging/twilio_sms.py](acculynx-agent/messaging/twilio_sms.py) new + [messaging/__init__.py:120-125](acculynx-agent/messaging/__init__.py:120))
   - New `send_sms(to_phone, body, from_phone, lead_id)` using `twilio` SDK. Mirror `SendResult` shape from [messaging/sendgrid_email.py](acculynx-agent/messaging/sendgrid_email.py).
   - Per-rep `from_phone` resolved via `reps.yaml.twilio_phone` based on assigned rep.
   - Drafter SMS rule already exists in [ai/drafter.py:65-77](acculynx-agent/ai/drafter.py:65) — adjust signature to skip "Best regards" + email/website for text channel (transcript: "I don't think we're at the signature in the text"). Use just `{first_name}` (e.g. "Joe") per Alicia at [transcript line 254].
   - Flip `MESSAGING_CHANNELS=email,sms` in `.env` once A2P approval lands.
   - **Fallback if A2P delays:** Monday launches email-only; SMS toggles on via env var when approval arrives, no redeploy needed.

6. **Inbound auto-reply path** ([api/webhooks.py:26-102](acculynx-agent/api/webhooks.py:26) + new [ai/classifier.py](acculynx-agent/ai/classifier.py))
   - Before the current "pause + email rep" path, classify the inbound with Claude: `intent` (objective_question | scheduling | objection | complaint | dead_lead | other), `confidence` (0-1), `category` (warranty | financing | hours | process | pricing | other).
   - **Decision tree:**
     - `intent=objective_question` AND `confidence≥0.90` AND `category∈{warranty,financing,hours,process}` → draft reply via drafter → run postflight → schedule send with `random.uniform(120, 180)` second delay → BCC the assigned rep → log auto-send to AccuLynx.
     - `intent=complaint` OR `intent=objection` OR mentions of pricing/anger → escalate to rep's email + CC Sierra. (Per transcript: "the sales reps technically supposed to handle the objections.")
     - `intent=dead_lead` (e.g. "selling the house") → send the empathy + door-open template Austin asked for at [transcript line 363], then pause cadence permanently with reason `homeowner_dead`.
     - Everything else → current flow (pause + email rep).
   - The 2–3 min delay implemented via APScheduler one-shot job, not `asyncio.sleep` (survives restarts).

### Day 3 (Wed 5/14) — Rep portal (Next.js + API)

7. **Portal JSON API** ([api/portal_api.py](acculynx-agent/api/portal_api.py) new)
   - `POST /api/portal/auth/request-link` — email → JWT signed link to `app.moderndayroof.com/auth/callback?token=…`
   - `GET  /api/portal/auth/callback?token=…` — verify, set 30-day signed cookie, redirect to `/queue`
   - `GET  /api/portal/queue` — pending approvals for this rep (deserialized for mobile)
   - `GET  /api/portal/messages/{id}` — full draft + context + recent interactions (reuses `_build_notification_email` payload)
   - `POST /api/portal/messages/{id}/approve|edit|skip` — wraps existing `approve_and_send` / `record_edit` / `skip` in [engine/approval_flow.py](acculynx-agent/engine/approval_flow.py)
   - `GET  /api/portal/sent` — last 50 sent messages for this rep
   - All endpoints require `X-Portal-Session` cookie; reuses `jwt_secret`.

8. **Next.js portal** (new directory `acculynx-agent/portal/` or sibling repo `mdr-rep-portal/`)

   **Stack:** Next.js 15 App Router · Tailwind 4 · shadcn/ui · Vercel deploy.

   **Design system (informed by UI/UX Pro Max recommendations):**
   - **Style direction:** *Soft UI Evolution* + *Micro-interactions* hybrid. Better contrast for outdoor/sunlight readability than glassmorphism, haptic-feeling button states for tactile confidence, no decorative chrome.
   - **Typography:** **Keep Barlow Condensed (display) + DM Sans (body)** — already in the marketing site, and this exact pairing is the "Sports/Fitness/action/energetic" combo in the design DB. Reinforces brand continuity; matches the rugged-premium voice.
   - **Palette:** Marketing site tokens are correct as primary surface. Layer in high-contrast action colors for outdoor readability:
     - Approve: `#16A34A` (green-600) — keep
     - Reject/Skip: `#EF4444` (red-500) for destructive only; Skip itself is neutral `#6B7280`
     - Edit: `#D4A054` (existing amber accent)
     - Warning/expiring: `#F59E0B` (approval expires soon)
     - Brand red `#C0392B` reserved for header bar + brand moments, NOT button primary, so it doesn't compete with approve-green.
   - **Background:** `#FFFFFF` for cards, `#F7F7F5` page background, `#F0EDE8` warm-cream chip backgrounds.
   - **Body text minimum 16px** on mobile, `1.55` line-height — readable in direct sunlight.

   **Pages:**
   - `/login` — single email field, big "Send me a link" button.
   - `/auth/callback` — token verify, redirect.
   - `/queue` — **card list, not a table.** Each card: homeowner name (Barlow Condensed 20px), staleness pill, channel badge (email/text), one-line draft preview, "expires at 6:00 PM" countdown if late afternoon. Pull-to-refresh enabled here (and ONLY here).
   - `/queue/[id]` — full detail. Top: lead context block + "why this lead now" line + recent AccuLynx interactions accordion. Middle: the draft (subject + body, monospace pre block). Bottom: **fixed action bar in thumb zone with three buttons — Approve (green), Edit (amber), Skip (neutral grey)**. Each button min 56×56px (well above 44×44 minimum), 12px gap between, full-width on mobile.
   - `/queue/[id]/edit` — full-screen textarea (subject + body), Save & Send button fixed at bottom.
   - `/sent` — paginated list of last 50 sent messages for the rep with delivery status + AccuLynx note link.
   - `/settings` — toggle "send me approval emails too" (defaults off once portal is in use), sign-out.

   **Mobile-first rules (UI/UX Pro Max-driven):**
   - **Touch targets ≥ 56×56px** for approve/edit/skip — beats 44×44 minimum, important for gloves.
   - **8px+ gap** between adjacent interactive elements (no rage-tapping the wrong button).
   - **Disable pull-to-refresh on detail pages** (`overscroll-behavior: contain`) — accidental refresh while reviewing a draft is infuriating.
   - **Same touch sizes desktop and mobile** — no shrinking on wide screens; the portal is mobile-primary even when reps use a laptop in the office.
   - **No emoji as icons.** Lucide React icons (`Check`, `Pencil`, `SkipForward`, `Clock`, `AlertTriangle`).
   - **Loading & state:** skeleton screens on `/queue` (200ms shimmer), button disabled + spinner during async approve/edit/skip, success toast slides in from top.
   - **Optimistic UI:** approve/skip remove the card from `/queue` immediately, with an "Undo" toast for 5s before the API call commits.
   - **prefers-reduced-motion** respected — kills all but instant transitions for sensitive users.
   - **Auto-refresh** `/queue` every 90s via SWR while tab is visible.

   **Pitfalls to avoid (called out by UI/UX Pro Max for this use case):**
   - Tightly packed approve/edit/skip — easy to misfire with cold/gloved hands. 12px gap is the floor.
   - Using `#C0392B` brand red as the primary button color — that's the destructive/error color in users' muscle memory. Use it for the header strip only; keep approve green.
   - Modals over the detail page — they break the flow on mobile keyboards. Inline confirmation instead.
   - Glass / low-opacity cards — fail in direct sunlight. Solid white cards only.

   **Connect to Railway via** `NEXT_PUBLIC_API_BASE_URL` env var; CORS allowlist Vercel preview + prod domains in [api/main.py](acculynx-agent/api/main.py).

9. **Domain + DNS** — add `app.moderndayroof.com` CNAME → Vercel (Alicia controls GoDaddy per transcript line 508).

10. **Rilla manual-upload track (Track B from Phase 2 plan — shipping with launch)**
    - DB migration: add `Lead.rilla_transcript` (Text, nullable) and `Lead.rilla_uploaded_at` (DateTime, nullable) columns in [db/models.py](acculynx-agent/db/models.py).
    - New endpoint `POST /api/portal/rilla-transcripts` in [api/portal_api.py](acculynx-agent/api/portal_api.py) — body `{lead_id, transcript, source: 'paste'|'upload'|'email'}`, persists transcript, optionally writes back to AccuLynx as an internal note via [acculynx/notes.py](acculynx-agent/acculynx/notes.py).
    - New Next.js page `/upload` — lead typeahead (hits `GET /api/portal/leads/search?q=…`), drag-drop file zone (accepts `.txt`, `.md`, `.pdf`, `.json`), large paste textarea fallback, em-dash stripping client-side before submit.
    - Drafter loader update: [ai/drafter.py:129-136](acculynx-agent/ai/drafter.py:129) — if `lead.rilla_transcript` is present, prepend it to the REP CONTEXT block with header "RILLA MEETING TRANSCRIPT (verbatim, treat as ground truth)". Truncate to ~6k tokens with leading summary to stay under prompt budget.
    - Add a "📎 Add transcript" link on every `/queue/[id]` card so reps can attach context the moment they realize the AI is missing it (no nav required).

### Day 4 (Thu 5/14 morning, pre-9:30am) — Polish + training prep

10. **Onboarding deck for the Thursday training** (1-pager)
    - "Here's a draft email. You have until 6pm to Approve / Edit / Skip from your phone."
    - Screenshot of `/queue` and `/queue/[id]`.
    - "If you ignore it, we send the original at 6pm and log the auto-send to AccuLynx."
    - "Notes you put in AccuLynx are what the AI reads. The more context you give, the better it gets."
    - Acronym list (VM/HO/FR/EST/PP) so reps know what's in the prompt.

11. **Smoke tests in DRY_RUN mode**
    - Trigger one draft per rep via the testbench, confirm portal renders correctly, approve/edit/skip each.
    - Trigger one inbound (`POST /api/webhooks/inbound-email` with crafted form data) per intent class to confirm classification + routing.
    - Trigger one 5:00pm reminder + one 6:00pm hammer-send (override the clock in test mode).

### Day 5–7 (Fri–Sun) — Launch readiness

12. Real reps verified as SendGrid Single Senders.
13. Twilio A2P registration final (if not landed: launch email-only Monday, flip SMS env when approved).
14. Reach out to AccuLynx Sales re: official API access (parallel, no blocker).

### Monday 5/18 — Launch

15. `DRY_RUN=false`, `SOLO_SENDER_MODE=false`, `MESSAGING_CHANNELS=email[,sms]`.
16. Watch logs through Tuesday EOD.

---

## Phase 2 (deferred, tracked separately)

### Rilla integration — get-creative strategy (research-backed)

Two research briefs produced these findings:
- [agent #1 brief — Rilla baseline integration audit](Plans/users-colinryan-downloads-may-08-01-59-humble-treasure-agent-a567b6f7a6ba8de0d.md)
- [agent #2 brief — Portable.io Rilla connector deep-dive](Plans/users-colinryan-downloads-may-08-01-59-humble-treasure-agent-a6e90e45577eb031c.md)

**Key findings (synthesized):**

1. **The Portable.io Rilla connector at https://portable.io/connectors/rilla/mysql is an SEO landing page, not a shipped product.** Rilla is absent from Portable's actual `/connectors` catalog. The Salesforce variant of the same page literally says *"Request A Connector"* with a contact form. Portable's pricing for custom-built connectors starts at ~$33k/yr and depends on Rilla cooperating with Portable, which they likely won't (Rilla uses Merge.dev to *ingest* CRM data inbound, but explicitly does not expose data outbound through Merge per [their case study](https://www.merge.dev/case-studies/rilla)). **Portable.io is not the path.**

2. **`api.apirilla.com` infrastructure exists** ([documented in SPOTIO's integration](https://support.spotio.com/hc/en-us/articles/14530983742743-SPOTIO-Rilla-Voice)) — but the documented direction is INBOUND-to-Rilla, not outbound. Worth asking Rilla CS, not worth assuming.

3. **Three things we can't confirm from public sources but matter a lot:**
   - Does Rilla email a recap/summary to the rep after each meeting? (Gong, Otter, Fireflies all do — but Rilla's marketing emphasizes in-app review, not email recaps.)
   - Does Rilla's web app have a per-recording "Download transcript" / "Export MD" button?
   - Does Rilla iOS share-sheet support exist? (App exists at [apps.apple.com](https://apps.apple.com/us/app/rilla-the-end-of-ridealongs/id1488233758).)

   **A "yes" to any one of these collapses the engineering problem to a half-day workflow.** Three CS questions answer all of them.

---

**Strategy — three parallel tracks, ranked by expected value:**

#### Track A — Three CS questions to Rilla (cost: $0, decision-shaping)

Austin or Alicia emails their Rilla CS rep this week:

> Hi, three quick questions for an integration we're building:
> 1. Does Rilla offer per-recording download or export of the transcript / AI summary (markdown, PDF, JSON — any format) from the web app?
> 2. Can Rilla CC or BCC a meeting recap email to an additional address after a recording is processed?
> 3. Is there a gated / enterprise outbound webhook or bulk-export API for transcripts?

One reply tells us whether v2 is "half a day" or "months."

#### Track B — Manual-upload affordance in the rep portal (½ day, ships with launch)

Build this in v1, regardless of what Rilla says:

- New page `/upload` in the Next.js portal: rep picks an AccuLynx lead from a typeahead, pastes (or drops a file containing) the Rilla transcript, and the portal:
  - Strips em-dashes via existing [scripts/strip_em_dashes.py](acculynx-agent/scripts/strip_em_dashes.py) logic
  - POSTs to a new `POST /api/portal/rilla-transcripts` endpoint
  - Persists to a new `Lead.rilla_transcript` column + `rilla_uploaded_at` timestamp
  - Drafter loader picks it up automatically as REP CONTEXT block (joins the existing `agent_context` field per [ai/drafter.py:129-136](acculynx-agent/ai/drafter.py:129))
  - Optionally syncs back to AccuLynx as an internal note via the existing [acculynx/notes.py](acculynx-agent/acculynx/notes.py) so Alicia sees it in her source of truth

Universal fallback that works even if Rilla never cooperates. Austin already endorsed this approach at [transcript line 391](Downloads/May-08-01-59-PM-b1fba36c-a926.md): *"the best thing for the sales guys is take that whole entire transcribe of their meeting and they need to put in the notes."* This is just a better, faster UX than copy-pasting into AccuLynx.

Reps could even do it from their phone right after a meeting using the Rilla iOS share sheet → "Save to Files" → upload via portal.

#### Track C — Email-recap interception (½–1 day, conditional on Track A answer 2)

If Rilla's recap-email feature exists (track A confirms), set up MDR's existing SendGrid Inbound Parse infrastructure to receive forwarded Rilla emails at `rilla+<rep>@reply.moderndayroof.com`:

- Reps set up a Gmail filter: "if from `noreply@rillavoice.com`, auto-forward to `rilla+aric@reply.moderndayroof.com`"
- Reuses [messaging/inbound_parser.py](acculynx-agent/messaging/inbound_parser.py) — we already parse subaddressed emails for AccuLynx replies, this is the same pattern with a different address prefix
- New parser in `messaging/rilla_recap_parser.py` extracts customer name + transcript + summary, fuzzy-matches to an AccuLynx lead by name+address, writes to `Lead.rilla_transcript`
- Fully automatic after the one-time filter setup per rep

#### Track D (defer) — Rep-authenticated browser extension

If Tracks A/B/C don't get us to where we want, build a Chrome extension that runs in the rep's own browser session at `app.rillavoice.com`. The extension scrapes the DOM of the current recording page and POSTs the transcript to `POST /api/portal/rilla-transcripts`.

**Why this is defensible legally:** the scrape happens client-side in the rep's authenticated browser tab — same as the rep manually copy-pasting, just automated. No server-side scraping, no shared credentials, no ToS violation around automated access (the rep is the actor; the extension is a power-user tool). Same principle as Grammarly or 1Password.

2–3 days of work + ongoing maintenance when Rilla changes their DOM. **Defer until Tracks A–C are exhausted.**

---

**v1 launch decision (Monday 5/18):** Ship **Track B (manual upload)** with the rest of the launch — it's a clean half-day of work, the storage column architecture sets us up for Tracks C and D drop-in later, and reps can start populating it from day one. Track A email goes out Tuesday after launch; Track C ships within 2 weeks if Rilla recap emails exist.

**Don't:**
- Spend $33k/yr on Portable.io for a connector that doesn't exist.
- Scrape `app.rillavoice.com` server-side (ToS + relationship risk on a $4k/seat enterprise product).
- Wait for Rilla to ship a public API before doing anything — manual upload gives us 80% of the value at 5% of the effort.

### Other deferred items

- Per-rep tone training (separate Google Sheets feedback per rep, fine-tune system prompt with few-shot examples per rep).
- Custom ChatGPT-style ad-hoc message UI (sales rep types "tell Broughton he's on schedule next week" → portal composes + sends + logs to AccuLynx).
- AccuLynx official API migration (parallel-track this week — Colin to reach out).

---

## Verification (end-to-end, before declaring done)

1. **Drafter rules** — generate 10 drafts in `/review/testbench` covering each layer; assert: zero em-dashes, zero "follow up"/"checking in", every draft references last contact with specific timing.
2. **Acronym handling** — seed a lead with rep note "Left VM 5/12, HO wants FR estimate" → drafted text mentions voicemail + full-replacement without exposing the acronyms.
3. **6pm hammer-send** — at 16:55 ET set system clock forward (or use APScheduler test mode) → verify reminder fires at 5:00/5:30/5:45/5:55, auto-send fires at 6:00, AccuLynx note logs "auto-sent: rep did not respond by 6pm".
4. **Inbound auto-reply** — fire 4 synthetic SendGrid inbound payloads (objective question / objection / dead lead / complaint) → confirm each routes correctly; auto-reply only fires for objective with delay 120–180s; BCC reaches the rep.
5. **Mobile portal** — open `/queue` on iPhone Safari at 375px width → approve, edit, skip each work without horizontal scroll; magic-link login works in Gmail iOS app.
6. **Twilio SMS** (if launched) — send one SMS from each rep's Twilio number in DRY_RUN, confirm signature is just first name + Modern Day Roofing, no email/website block.
7. **Escalation routing** — synthetic inbound with `intent=complaint` → assert outbound notification `to=rep.email`, `cc=sierra@moderndayroof.com`.
8. **End-to-end on real (test) lead** — run the full flow on one allowlisted real lead in production with `DRY_RUN=true`: draft → portal approve → AccuLynx note → simulated homeowner reply → auto-reply → AccuLynx note. Confirm every step appears in AccuLynx Communications tab.

---

## Confirmed contacts and decisions

- **Sierra's email for AI-agent escalation CCs:** `sierraduncanmdr@gmail.com` (NOT a moderndayroof.com address — confirmed by Colin).
- **AI-agent escalation routing:** primary recipient is the **assigned rep's** `first.last@moderndayroof.com`, with `sierraduncanmdr@gmail.com` on CC. Austin explicitly rejected routing through `sales@moderndayroof.com` at [transcript line 309](Downloads/May-08-01-59-PM-b1fba36c-a926.md) — *"the sales folder is gummed up."*
- **Separate concern — website chatbot lead notifications:** the `sales@moderndayroof.com` address Alicia mentioned at [transcript line 88-91](Downloads/May-08-01-59-PM-b1fba36c-a926.md) is for the *website chatbot* lead alerts, not the AI agent. That's a separate fix on the marketing site's chatbot → AccuLynx form middleware (route the form notification email to `sales@moderndayroof.com` so both Sierra and Alicia receive it, even when Sierra is out). Tracked, but lives in the [main MDR site repo](src/), not the AccuLynx agent.
- **6pm auto-send:** confirmed — at 6pm with no rep decision, the **original (unedited) draft auto-sends to the homeowner** and a "auto-sent: rep did not respond by 6pm" note is logged to AccuLynx. Reps are explicitly told this in training Thursday: per Austin at [transcript line 235-238](Downloads/May-08-01-59-PM-b1fba36c-a926.md), *"You need to. Yes or no. It exactly. Like you don't have a choice."*
- **Portal subdomain:** `app.moderndayroof.com` confirmed.
- **Twilio A2P status:** Colin to verify by Wednesday EOD. Plan ships email-Monday with SMS flipping on via env var the moment A2P approves.
