# AccuLynx AI Agent — Email-Only MVP + Austin's Cadence Review

## Context

The AccuLynx agent is ~30–35% built. Sync, lead enrichment, preflight safety checks, and the Claude drafter all work — but **nothing actually sends a message**. SendGrid is in `requirements.txt` and never imported. APScheduler is configured and never wired. The approval endpoint is a one-line stub. The `assigned_rep_id`/`assigned_rep_name` columns exist but sync never writes to them, so even if approvals worked we wouldn't know who to send them to.

On top of the infrastructure gaps, the copy itself has bombs Austin will catch in 30 seconds: hardcoded "231 reviews" and "$250 referral", literal bracket tokens like `[current season]` and `[Google Review Link]` that will reach customers as text, two parallel canon copies (`SOP 04` and `templates_final.md`) loaded into the same prompt with conflicting wording, an empty-rep fallback that produces "this is the Modern Day Roofing team with Modern Day Roofing", and same-day double touches in POST_INSTALL.

**Goal:** Ship an end-to-end testable email-only MVP — agent detects leads, drafts emails, asks the right rep for approval via magic-link, sends from the rep's address with full thread continuity, ingests homeowner replies, and logs everything back to AccuLynx. Plus a hosted review URL where Austin clicks through every cadence layer/touch with real lead data, edits any line of copy, and exports an approved copy file the agent reads at runtime.

SMS is deferred until Twilio A2P is approved. Twilio code paths stay in place but are gated off via `MESSAGING_CHANNELS=email`.

## Decisions Locked (from clarifying questions)

| | |
|---|---|
| **Review UI** | Live web app at a URL. FastAPI + Jinja templates. Real lead data, real Claude drafts, in-place template editing, JSON export |
| **Send identity** | Per-rep architecturally, **but bootstrap as solo-sender for MVP via Colin's personal SendGrid**. From: `Colin Ryan <colin@socialtheorymedia.com>`. Reply-To: `reply+{lead_id}@reply.socialtheorymedia.com`. When Austin onboards, swap to per-rep on `moderndayroof.com` via `reps.yaml` config change. Zero code rewrite |
| **Sending domain** | `socialtheorymedia.com` (Colin owns, can set DNS). This unlocks **full SendGrid Domain Authentication** (DKIM + SPF) on day 1, dramatically better deliverability than gmail-as-sender |
| **Secrets handling** | All keys (`SENDGRID_API_KEY`, `ACCULYNX_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`) live ONLY in `.env` locally and Railway env vars in production. Never in plan files, never in git, never in chat. If a key is ever pasted in chat, treat it as compromised and rotate immediately |
| **Approval flow** | Magic-link email per draft. JWT tokens, 24h expiry, 4h escalation to Austin if no decision |
| **Inbound replies** | SendGrid Inbound Parse → webhook → match to lead via In-Reply-To, pause cadence, optionally auto-draft response |
| **Hosting** | Railway. Persistent SQLite (start) → Postgres later. CNAME `agent.moderndayroof.com` after launch |
| **Rep routing** | Inspect actual `/jobs` payload first, then update sync.py to extract assigned-rep field, then a `reps.yaml` maps rep_id → email + SendGrid sender_id |

## Pre-Execution Checklist (Things Colin Provides)

Before I can run the plan end-to-end and hand you a working demo:

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | SendGrid API key (rotated, fresh) | ✅ in `.env` | Old key rotated, new key local-only |
| 2 | SendGrid Single Sender verified | 🟡 verify in UI | Confirm `colin@socialtheorymedia.com` shows green checkmark in SendGrid → Sender Authentication |
| 3 | SendGrid Domain Authentication on `socialtheorymedia.com` | 🟡 verify in UI | DNS records added in Vercel; click "Verify" in SendGrid → Sender Authentication → Domain. May need 10–30 min for propagation |
| 4 | DNS access for `socialtheorymedia.com` | ✅ Vercel zone | Confirmed |
| 5 | MX record on `reply.socialtheorymedia.com` → `mx.sendgrid.net` priority 10 | ⏳ Vercel DNS, 1 record | Separate from domain auth. Instructions below |
| 6 | Railway account + CLI logged in | ✅ as `colinjrbh317@gmail.com` | Project will be created during Phase A |
| 7 | AccuLynx API key already in `.env` | ✅ confirmed via audit | |
| 8 | Anthropic API key already in `.env` | ✅ confirmed via audit | |
| 9 | Test recipient address | ✅ `colinjrbh317@gmail.com` | Different inbox from sender — perfect for verifying From/Reply-To |
| 10 | Test-lead allowlist (1–2 AccuLynx job IDs) | ⏳ pick during Phase B | I'll surface candidates with `scripts/inspect_jobs.py` |
| 11 | One real homeowner reply to demo inbound | ⏳ optional | I can simulate with a self-reply during Phase H verification |
| 12 | Austin's email for 4-hour escalation | ⏳ confirm before Phase E | Default `austin@moderndayroof.com` from `.env.example` — keep or change? |

Items 1, 2, 6, 9, 10, 12 are blocking for the demo. Items 3, 4, 5 unlock inbound replies and best-class deliverability — if DNS is hard to reach, we can ship the outbound-only demo first and add inbound after.

## Execution Order

The order is deliberate: **get Austin a review URL with real data and real drafts before building approval/inbound/scheduler.** That way copy gets locked while the harder plumbing is built in parallel.

### Phase A — Foundation (Day 1–2)

Deploy skeleton, wire SendGrid send, add a hard `DRY_RUN` flag.

- Create Railway project, deploy current FastAPI app, attach persistent volume for `agent.db`
- New file: `messaging/sendgrid_email.py` — `send_email(to, subject, body_text, body_html, from_rep, reply_to, message_id, in_reply_to)` returning SendGrid message ID
- Update `config/settings.py`: add `dry_run: bool = True` (default safe), `reply_to_override: str = ""`, `messaging_channels: str = "email"`, `app_base_url: str` (Railway URL)
- Update `.env.example` with the missing knobs (`SENDGRID_FROM_NAME`, `DRY_RUN`, `APP_BASE_URL`, `JWT_SECRET`)
- New script: `scripts/test_send.py` — sends one branded test email to `colinjrbh317@gmail.com`
- Wire `messaging/__init__.py` channel router so `send(channel, ...)` dispatches email today, raises NotImplementedError for SMS until Twilio approval lands

### Phase B — Data Plumbing (Day 2–3)

Make sync write the fields the rest of the system needs.

- New script: `scripts/inspect_jobs.py` — fetches one `/jobs/{id}` and dumps every key. We don't know whether the rep field is `companyRep`, `salesPerson`, `assignedTo`, or nested under `team[]`. Run this first, then patch sync.py with the actual key path.
- Update `engine/sync.py:_upsert_lead()` (around L108–188) to write:
  - `assigned_rep_id` and `assigned_rep_name` (from whatever the inspect script revealed)
  - `address` (from `job.locationAddress` or whatever the actual key is)
- Update `engine/enrich.py` to write `Lead.enriched_at` so the same lead doesn't re-enrich every sync (currently burns 5 API calls per lead per cycle)
- New file: `config/reps.yaml` — **MVP bootstrap (solo-sender Colin via socialtheorymedia.com):**
  ```yaml
  # MVP: every lead routes to Colin until Austin onboards team
  default_rep_email: "colin@socialtheorymedia.com"
  reps:
    - rep_id: "*"  # wildcard, matches any/empty assigned_rep_id
      name: "Colin Ryan"
      email: "colin@socialtheorymedia.com"
      sendgrid_sender_id: "<verified-after-signup>"
      title: "Account Manager"
      signature_phone: "540-553-6007"
  # Post-Austin meeting, replace wildcard with real entries on moderndayroof.com:
  #   - rep_id: "<sierra-duncan-acculynx-id>"
  #     name: "Sierra Duncan"
  #     email: "sierra@moderndayroof.com"
  ```
- Drafter override: when running in solo-sender mode, the prompt's "Assigned Rep" line is forced to the default rep's name regardless of what AccuLynx says, so the body matches the From line. Controlled by a `SOLO_SENDER_MODE=true` env var that defaults to true
- New file: `acculynx/notes.py` — `log_to_acculynx(job_id, note_text)` posts to `/jobs/{id}/messages`. Requires adding `post()` to `acculynx/client.py`
- Verification: run sync against live AccuLynx, confirm rep + address + enriched_at populated for at least 50 leads

### Phase C — Copy Hardening (Day 3–4)

Fix the bombs from the audit before Austin sees anything.

**0. Strip em-dashes from all copy — non-negotiable.** Colin's directive: agent never writes em-dashes (`—`) or en-dashes (`–`).
   - `sops/templates_final.md`, `sops/04_*`, `sops/10_*`, `sops/real_message_samples.md` — replace every `—` and `–` with periods, commas, or parentheses (whichever reads natural). Example: `"this is Joe with Modern Day Roofing — happy to help"` becomes `"this is Joe with Modern Day Roofing. Happy to help."`
   - `ai/drafter.py` system prompt — add hard rule: `"NEVER use em-dashes (—) or en-dashes (–). Use periods, commas, semicolons, or parentheses instead. This applies to subject lines too."`
   - **Postflight regex check** in `engine/preflight.py` (or new `engine/postflight.py`): after Claude returns a draft, scan the body and subject for `[—–]`. If found, regenerate up to 2 retries. If still present after retries, mark the draft as `error` and surface it for manual edit. This is a hard gate before the message ever reaches the queue.
   - Add a unit test: feed the drafter a touch where the source template originally had em-dashes, assert output has none.

1. **Extract hardcoded facts** to `config/stats.yaml` — `review_count: 231`, `referral_amount: 250`, `crew_arrival_window: "6–8 AM"`, `install_lead_time_weeks: "2–3"`. Inject into prompt as structured data, not template strings
2. **Substitute or remove bracket tokens** in `sops/templates_final.md`. Either:
   - Replace `[current season]` with code that computes season from date and injects it
   - Replace `[Google Review Link]` with an actual short URL from `stats.yaml`
   - Replace `[Position]`, `[rep]@moderndayroof.com`, `[Coordinator]` with values from `reps.yaml`
   - Anything that can't be substituted → strip the bracket entirely from the template
3. **Fix subject parser** in `ai/drafter.py:131–135` — tolerate `**Subject:**`, missing blank line, and trailing whitespace. Use a regex: `^\**Subject:\**\s*(.+?)$`
4. **Fix rep fallback grammar** — if `assigned_rep_name` is empty, drafter should *fail loud* (Approval row stays in `error` state, surfaced in dashboard) rather than ship "the Modern Day Roofing team with Modern Day Roofing"
5. **Pick one canon for the prompt.** Stop loading both `SOP 04` and `templates_final.md` simultaneously. Plan: keep `templates_final.md` as the single touch-template source, use `SOP 04` only for cadence timing reference (not fed to Claude). Update `ai/sop_loader.py` accordingly.
6. **Stagger POST_INSTALL** — change `cadence.py` Layer 8 to `Touch(7, "text", ...)` and `Touch(9, "email", ...)` so customer doesn't get both same day
7. **Add missing personalization fields** to `lead_context` — address, appointment_time, install_date, last_inbound_message_text. Even if some come from new AccuLynx fields, define them all in the dataclass so future enrichment is plug-in
8. **SOP-04-vs-cadence.py mismatch** — update `04_estimate_sent_nurture_sequence.md` so it accurately reflects the 4-touch ESTIMATE_FOLLOWUP layer (not the legacy 12-touch fantasy). Or refactor cadence.py to actually run 12 touches. Default: update SOP 04 to match code.

### Phase D — Cadence Review Web App (Day 4–6) — **The Austin Deliverable**

The hosted URL Austin will spend an hour clicking through.

- New file: `api/review.py` — FastAPI router mounted at `/review`
- New dir: `templates/review/` (Jinja2):
  - `layout.html` — sidebar with all 11 layers, breadcrumbs, save/export buttons
  - `index.html` — landing: lead picker (dropdown from synced DB, filterable by milestone)
  - `layer.html` — for a given lead + layer, render every touch as a card showing channel, day offset, autonomous_ok, generated draft, and the source template
  - `editor.html` — modal/inline editor for any template
- Backend routes:
  - `GET /review` — landing page
  - `GET /review/{lead_id}/{layer_name}` — render all touches for that layer with live Claude drafts (cached for 60s per lead+touch+template-hash)
  - `POST /review/templates/{layer}/{touch}` — save edited template back to a `config/copy.yaml` overlay (touches `templates_final.md` is too risky; overlay wins at draft time)
  - `GET /review/export` — download a single approved `copy.yaml` Austin can hand back
- Drafter change: `ai/drafter.py` looks for `config/copy.yaml` overlay first, falls back to `templates_final.md` second
- Top-bar status: shows which leads have been previewed, which templates have edits, count of approved touches
- **Hand-off**: send Austin the URL `https://mdr-agent.up.railway.app/review`, watch him click through, capture his edits in `copy.yaml`

### Phase E — Approval Flow (Day 6–8)

The magic-link email a rep gets when a draft needs review.

- New file: `engine/approval_flow.py`:
  - `create_approval(message_queue_id, rep_email, rep_name)` — creates `Approval` row with JWT-signed token (24h expiry), sends rep email
  - `validate_token(action_id, token)` — verifies signature, expiry, single-use
  - `approve(action_id)` → flips `MessageQueue.status` to `approved`, calls `messaging.send()`, logs to AccuLynx, posts back HTML success page
  - `edit(action_id)` → renders edit form pre-filled with draft body, POST handler saves edited body and proceeds
  - `skip(action_id, reason)` → marks skipped, advances cadence touch index, no send
- New template: `templates/email/approval_request.html` — branded HTML email with three buttons (`Approve & Send`, `Edit First`, `Skip This One`), plus full draft preview, lead summary
- New template: `templates/approve/edit.html`, `templates/approve/success.html`, `templates/approve/skipped.html`
- Update `api/main.py:95–98` stub → real `api/approvals.py` router with three routes
- 4-hour escalation: APScheduler job runs every 30 min, finds approvals where `created_at < now - 4h AND decision IS NULL`, sends second email to `escalation_email` (Austin)

### Phase F — Inbound + Threading (Day 8–10)

SendGrid Inbound Parse so the agent sees replies and threads correctly.

- DNS (on `socialtheorymedia.com` for MVP, swap to `moderndayroof.com` later): add MX record `reply.socialtheorymedia.com → mx.sendgrid.net` (priority 10)
- SendGrid: configure Inbound Parse with hostname `reply.socialtheorymedia.com`, webhook URL `https://mdr-agent.up.railway.app/api/webhooks/inbound-email`
- Send-side: when sending an email, set `Reply-To: reply+{lead_id}@reply.socialtheorymedia.com` (sub-address routing). The lead_id is in the address itself, so we don't need In-Reply-To matching for routing
- New file: `messaging/inbound_parser.py` — parse SendGrid multipart payload, extract `to`, `from`, `subject`, `text`, `html`, `In-Reply-To`, `References`
- New route: `POST /api/webhooks/inbound-email`:
  - Parse payload
  - Extract `lead_id` from `reply+<id>@reply.moderndayroof.com`
  - Persist as inbound `MessageQueue` row with `direction="inbound"`
  - Set `Lead.is_paused = True` and `pause_reason = "homeowner replied"`
  - Send escalation email to assigned rep: "Sarah replied to your follow-up — open thread"
  - Optionally: queue a Claude draft response (rep approval still required)
- New columns on `MessageQueue`:
  - `message_id_header` (TEXT) — RFC 2822 Message-ID we set on outbound (`<uuid@moderndayroof.com>`)
  - `in_reply_to` (TEXT) — we set this on the next outbound when threading
  - `direction` (TEXT) — `outbound` | `inbound`
- Migration script: `db/migrations/002_threading.sql`

### Phase G — Production Runner (Day 10)

Wire the scheduler so the system actually runs.

- New file: `engine/scheduler.py` — APScheduler `BackgroundScheduler`:
  - `sync_job` — every 15 min, run `sync_pipeline()`
  - `cadence_job` — every 5 min, run `find_leads_needing_followup()` → `enrich` → `preflight` → `draft` → `create_approval` (or autonomous send if `autonomous_ok=True` AND business hours)
  - `escalation_job` — every 30 min, find stalled approvals
  - `cleanup_job` — daily, expire old tokens, archive sent messages
- Wire scheduler into `api/main.py:lifespan()` — start on app startup, shut down clean on app shutdown
- Add `BUSINESS_HOURS=9-18` and `BUSINESS_DAYS=mon-fri` env config; preflight blocks autonomous sends outside hours

### Phase H — Verification

End-to-end smoke test, in this order:

1. **Test send** — `python scripts/test_send.py colinjrbh317@gmail.com` → confirm email received, From line shows rep identity, Reply-To routes to `reply+test@reply.moderndayroof.com`
2. **Sync run** — `python -m engine.sync` against live AccuLynx → confirm `assigned_rep_name` populated for 100% of synced leads
3. **Review URL walk-through** — open `https://mdr-agent.up.railway.app/review`, click through 3 leads × 11 layers, confirm Claude drafts render and edits save to `copy.yaml`
4. **Approval E2E (DRY_RUN=true)** — trigger one cadence touch for a test lead → verify approval email arrives → click "Approve" → verify the OUTBOUND email is generated but NOT sent (dry run), and an Action row marks `would_have_sent`
5. **Approval E2E (DRY_RUN=false, single test lead)** — set `TEST_LEAD_ALLOWLIST=<one job id with your own email>`, send to your own email, click Approve, verify outbound email lands in your inbox
6. **Inbound parse** — reply to the email above, watch the webhook fire, confirm `MessageQueue` has the inbound row, lead is paused, rep gets escalation email
7. **AccuLynx note write-back** — in AccuLynx, open the test lead's Activity tab, confirm `[AI Agent] Email sent to <homeowner>: '<preview>...'` note appears
8. **Scheduler smoke test** — let it run for 24 hours on the test allowlist, confirm cadence advances, no duplicate sends, business-hours respected
9. **Austin review session** — book 60 min, screen-share the review URL, capture every edit/comment, ship `copy.yaml` v1

## Critical Files

**New (built):**
- `messaging/sendgrid_email.py`, `messaging/inbound_parser.py`, `messaging/__init__.py` (router)
- `engine/approval_flow.py`, `engine/scheduler.py`
- `acculynx/notes.py`
- `api/review.py`, `api/approvals.py`, `api/webhooks.py`
- `templates/email/approval_request.html`
- `templates/review/layout.html`, `index.html`, `layer.html`, `editor.html`
- `templates/approve/edit.html`, `success.html`, `skipped.html`
- `config/reps.yaml`, `config/stats.yaml`, `config/copy.yaml`
- `db/migrations/002_threading.sql`
- `scripts/inspect_jobs.py`, `scripts/test_send.py`, `scripts/verify_send.py`

**Modified (existing):**
- `sops/templates_final.md`, `sops/04_estimate_sent_nurture_sequence.md`, `sops/10_tone_voice_and_communication_standards.md`, `sops/real_message_samples.md` — strip every `—` and `–`, replace with `.`, `,`, `;`, or `()`
- `engine/preflight.py` (or new `engine/postflight.py`) — em-dash regex gate with regenerate-on-fail
- `engine/sync.py` — populate `assigned_rep_id/name`, `address`, `enriched_at`
- `engine/enrich.py` — set `enriched_at`
- `acculynx/client.py` — add `post()`
- `ai/drafter.py` — robust subject parser, address+appointment+last-inbound in lead_context, fail-loud on missing rep, single canon (drop SOP 04)
- `ai/sop_loader.py` — drop SOP 04 from prompt loading
- `config/settings.py` — `dry_run`, `reply_to_override`, `app_base_url`, `jwt_secret`, `messaging_channels`, `business_hours`, `business_days`
- `config/cadence.py` — Layer 8 stagger (text day 7, email day 9)
- `api/main.py` — wire scheduler in `lifespan()`, mount review/approvals/webhooks routers
- `sops/templates_final.md` — substitute or strip every `[bracket]` token (audit Section 3)
- `sops/04_estimate_sent_nurture_sequence.md` — align with cadence.py reality
- `.env.example`, `requirements.txt` (add `jinja2`, `pyjwt`, `python-multipart`)
- `db/models.py` — `MessageQueue.message_id_header`, `in_reply_to`, `direction`

**Reference (read-only, but reused):**
- `ai/drafter.py` system prompt and user-prompt template (already solid foundation)
- `engine/preflight.py` 8-point checks (reused as-is)
- `scripts/simulate.py` (reused as the always-safe dry run path)

## What's Out of Scope (Deferred to v2)

- SMS (waiting on Twilio A2P approval; channel router wired so flipping `messaging_channels=email,sms` is one config change)
- Per-rep dashboard with login (magic-link approval is sufficient for MVP)
- A/B testing of templates v1–v5 (Phase 2)
- Drip / re-engagement layers active beyond email (DRIP layer code stays defined; we just don't autostart it for any leads in MVP)
- Postgres migration (SQLite + Railway volume holds for first 6 months easily)
- Webhook receiver for AccuLynx milestone changes (still 15-min polling for MVP — fine since cadence is daily-grain)
