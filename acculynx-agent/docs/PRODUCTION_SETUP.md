# Production Setup — What You Need to Do Manually

**Goal:** Take the AI agent from "running on Colin's laptop via ngrok" to "running 24/7 in production with 5 reps using it" by Thursday 9:30 AM.

**Current state:** code is complete; everything below is infra / credentials / DNS / approvals that only you can do.

---

## Gap Audit — Where We Are Right Now

| Component | Status | Action Required |
|---|---|---|
| **Code (backend + portal)** | ✅ Built, tested, pushed to `claude/inspiring-stonebraker-e5dfcc` | Merge to main when ready |
| **Hosting (Railway)** | ❌ **Not set up.** Currently running locally via ngrok (`parmesan-wad-backless.ngrok-free.dev`) | Create Railway project — see §1 |
| **Portal hosting (Vercel)** | ❌ Not deployed | Deploy Next.js portal — see §2 |
| **DNS — `app.moderndayroof.com`** | ❌ Not pointed | Add CNAME → Vercel — see §3 |
| **DNS — `reply.moderndayroof.com`** | ❌ Not set up | Add MX records for SendGrid Inbound Parse — see §3 |
| **SendGrid sender identity** | ⚠️ Currently `colin@socialtheorymedia.com` | Verify each rep as Single Sender OR Domain Auth `moderndayroof.com` — see §4 |
| **SendGrid Inbound Parse** | ❌ Not configured for `reply.moderndayroof.com` | Configure webhook — see §4 |
| **Twilio account / phones** | ❌ Not provisioned | A2P registration + per-rep phone purchase — see §5 |
| **AccuLynx rep UUIDs** | ⚠️ 1 of 5 confirmed (Aric) | Run `scripts/inspect_rep_link.py` — see §6 |
| **AccuLynx webhooks** | ⚠️ Registered to ngrok URL | Re-register to Railway URL after §1 — see §6 |
| **Env vars in production** | ❌ Currently only local `.env` | Copy to Railway — see §7 |
| **JWT_SECRET** | ⚠️ Set locally but probably needs rotation for prod | Generate fresh secret — see §7 |
| **`DRY_RUN=false` + `SOLO_SENDER_MODE=false`** | ❌ Local is `DRY_RUN=false` but solo-mode is still ON | Flip after rep verification — see §8 |
| **Test lead allowlist** | ❌ Empty | Add 2–3 test job IDs to gate production - see §8 |

---

## 1. Railway — Backend Deployment

**Why:** ngrok is a tunnel from your laptop. Close your laptop → the agent dies. Reps can't approve drafts, the 6pm cron doesn't fire, AccuLynx webhooks 404.

**Steps (10 minutes):**

```bash
cd /Users/colinryan/MDR/acculynx-agent
railway login                       # browser auth
railway init                        # new project; name: "mdr-acculynx-agent"
railway link                        # link this dir to the project
railway up                          # first deploy
railway domain                      # generate a *.up.railway.app URL
```

This uses the existing `railway.toml` and `Procfile` — no config needed. Build is Nixpacks (auto-detects `requirements.txt`).

After it deploys, note the Railway URL (e.g. `https://mdr-acculynx-agent-production.up.railway.app`) — you'll set it as `APP_BASE_URL` in §7.

**Database persistence:** SQLite at `data/agent.db` gets ephemeral storage by default. Add a Railway volume:

```bash
railway volume create --mount-path /app/data
```

This makes the DB survive redeploys.

**Verify:**
```bash
curl https://mdr-acculynx-agent-production.up.railway.app/health
# expect: {"ok":true}
```

---

## 2. Vercel — Portal Deployment

```bash
cd /Users/colinryan/MDR/acculynx-agent/portal
pnpm install
vercel login                        # if not already
vercel link                         # new project; name: "mdr-rep-portal"
vercel env add NEXT_PUBLIC_API_BASE_URL production
# paste your Railway URL from §1
vercel --prod
```

**Verify:**
- Open the `*.vercel.app` URL Vercel prints → see the login screen with Barlow Condensed "MDR PORTAL" header.

---

## 3. DNS — `app.moderndayroof.com` + `reply.moderndayroof.com`

In GoDaddy (Alicia controls):

**For `app.moderndayroof.com`** (the portal):
- Type: `CNAME`
- Host: `app`
- Points to: `cname.vercel-dns.com`
- TTL: 600

Then in Vercel project settings → Domains, add `app.moderndayroof.com`. Vercel will tell you it's configured once the CNAME propagates (~10 min).

**For `reply.moderndayroof.com`** (homeowner replies route through here):
- Type: `MX`
- Host: `reply`
- Value: `mx.sendgrid.net`
- Priority: `10`
- TTL: 3600

This lets homeowners reply to `reply+<lead-id>@reply.moderndayroof.com` and SendGrid forwards to our webhook.

---

## 4. SendGrid

### 4a. Sender identity (one of these two)

**Option A — Single Sender per rep (fast, 5 min each):**
SendGrid → Settings → Sender Authentication → Single Sender Verification.
Add a sender for each rep:
- `aric@moderndayroof.com`
- `chris@moderndayroof.com`
- `jake@moderndayroof.com`
- `joe@moderndayroof.com`
- `paul@moderndayroof.com`

Each gets a verification email. They click the link. Done.

**Option B — Domain Authentication (better deliverability, 30 min):**
SendGrid → Settings → Sender Authentication → Authenticate Your Domain → `moderndayroof.com`. SendGrid gives you 3 CNAME records → Alicia adds them in GoDaddy → verify. All `@moderndayroof.com` addresses work without per-sender verification.

**Recommendation:** Go with Option B if Alicia has 30 minutes for the DNS changes. Otherwise Option A is fine for Monday launch.

### 4b. Inbound Parse webhook

SendGrid → Settings → Inbound Parse → Add Host & URL:
- Host: `reply.moderndayroof.com`
- URL: `https://<railway-url>/webhooks/sendgrid-inbound?token=<random-secret>`
- Check ☑ POST raw
- Check ☑ Spam Check

Generate the token with `python -c "import secrets; print(secrets.token_urlsafe(32))"` and set it as `SENDGRID_INBOUND_TOKEN` in Railway env (and add a matching guard in `api/webhooks.py` if not already there).

---

## 5. Twilio (SMS)

**Note:** SMS is fully implemented in code but gated behind `MESSAGING_CHANNELS`. Monday can launch **email-only** if Twilio isn't approved in time — flip SMS on later via env var, no redeploy.

### 5a. A2P 10DLC Brand + Campaign registration

Twilio Console → Messaging → Regulatory Compliance → A2P 10DLC:
1. **Register brand** for "Modern Day Roofing LLC" — EIN, phone, website, contact email. ~$4 one-time.
2. **Submit campaign** — Use case: "Customer Care / Account Notification". Sample messages should include: appointment reminders, follow-ups, the standard opt-out language ("Reply STOP to opt out").
3. **Wait for approval.** T-Mobile is typically 24–72 hours; AT&T can be 1–2 weeks.

### 5b. Per-rep phone numbers

Once approved, in Twilio Console → Phone Numbers → Buy:
- Buy 1 number per rep (Aric, Chris, Jake, Joe, Paul). Local 540 area code preferred.
- For each number, configure:
  - **A MESSAGE COMES IN** → Webhook → `https://<railway-url>/webhooks/twilio-sms` (POST)
- Add the numbers to `config/reps.yaml` under each rep's `twilio_phone` field.

### 5c. Env

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
MESSAGING_CHANNELS=email,sms     # flip from "email" to enable SMS
```

---

## 6. AccuLynx

### 6a. Real rep UUIDs

Currently `config/reps.yaml` has Aric's real UUID and TBD placeholders for Chris/Jake/Joe/Paul. Run:

```bash
cd /Users/colinryan/MDR/acculynx-agent
.venv/bin/python scripts/inspect_rep_link.py
```

This pulls the AccuLynx users list and prints each rep's UUID. Copy them into `config/reps.yaml` and commit.

### 6b. Webhooks re-registration

Webhooks currently point at the ngrok URL. After Railway is live:

```bash
.venv/bin/python scripts/register_webhook.py \
  --base-url https://<railway-url> \
  --token $ACCULYNX_WEBHOOK_TOKEN
```

This registers (or replaces) the AccuLynx webhook consumer URL so milestone changes and note updates land on Railway.

---

## 7. Environment Variables — Railway

Copy these to Railway → Project → Variables. **Bold = required for launch.** Italic = optional/has-default.

```bash
# ── Anthropic ──
ANTHROPIC_API_KEY=sk-ant-...         # required
CLAUDE_MODEL=claude-sonnet-4-6        # default fine

# ── AccuLynx ──
ACCULYNX_API_KEY=...                  # required
ACCULYNX_SESSION_COOKIE=...           # required (internal API)
ACCULYNX_LOGIN_EMAIL=...              # for auto-refresh
ACCULYNX_LOGIN_PASSWORD=...
ACCULYNX_WEBHOOK_TOKEN=...            # required (matches §6b)

# ── SendGrid ──
SENDGRID_API_KEY=SG...                # required
SENDGRID_FROM_EMAIL=noreply@moderndayroof.com   # or per-rep — see thread continuity below
SENDGRID_FROM_NAME=Modern Day Roofing
SENDGRID_REPLY_SUBDOMAIN=reply.moderndayroof.com   # change from socialtheorymedia.com
SENDGRID_INBOUND_TOKEN=...            # required (matches §4b)

# ── Twilio (skip if launching email-only) ──
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# ── Channels ──
MESSAGING_CHANNELS=email              # flip to "email,sms" after A2P approval

# ── Modes ──
DRY_RUN=false                         # required for real sends
SOLO_SENDER_MODE=false                # required to route to real reps (not Colin)
USE_THREAD_CONTINUITY_SEND=true       # send FROM the rep's @moderndayroof.com address

# ── Allowlist (kill switch) ──
TEST_LEAD_ALLOWLIST=                  # leave EMPTY to allow all leads after launch.
                                      # Set to comma-separated job IDs for restricted testing.

# ── Escalation ──
ESCALATION_EMAIL=austin@moderndayroof.com
ESCALATION_CC_EMAIL=sierraduncanmdr@gmail.com    # already in code default

# ── Auto-send-at-6pm ──
AUTO_SEND_ENABLED=true                # kill-switch if Austin changes his mind in training
APPROVAL_NUDGE_MINUTES=0,30,45,55     # 5:00 / 5:30 / 5:45 / 5:55 pm ET
AUTO_SEND_HOUR=18                     # 6 pm ET
AUTO_SEND_MINUTE=0

# ── Inbound auto-reply ──
INBOUND_AUTO_REPLY_MIN_CONFIDENCE=0.90
INBOUND_AUTO_REPLY_MIN_DELAY_SECONDS=120
INBOUND_AUTO_REPLY_MAX_DELAY_SECONDS=180

# ── URLs ──
APP_BASE_URL=https://<railway-url>                       # required for magic links
PORTAL_BASE_URL=https://app.moderndayroof.com            # required for magic links
PORTAL_CORS_ORIGINS=https://app.moderndayroof.com,https://*.vercel.app

# ── Auth ──
JWT_SECRET=                           # generate fresh: python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Generate a fresh JWT_SECRET for prod:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Don't reuse the local-dev secret — it's effectively burned.

---

## 8. Pre-Launch Flips (Monday morning)

Do these in order after Thursday training, NOT before:

1. **Confirm rep UUIDs are populated** (§6a)
2. **Confirm all 5 reps are SendGrid-verified** (§4a)
3. **Confirm Twilio approval status** — if approved, set `MESSAGING_CHANNELS=email,sms`. If not, `MESSAGING_CHANNELS=email`.
4. **`SOLO_SENDER_MODE=false`** — flips routing from Colin → real reps
5. **`TEST_LEAD_ALLOWLIST=`** (empty) — allows all leads. Or set to 2–3 test job IDs to soft-launch.
6. **`DRY_RUN=false`** — already set locally, confirm in Railway
7. **Redeploy Railway** to pick up env changes: `railway up` (or auto on git push if connected)

---

## How Scheduling Works (and Why It's Precise)

### The runtime loop

The agent runs **APScheduler `AsyncIOScheduler`** inside the FastAPI app, with `timezone="America/New_York"`. It's started by `api/main.py:lifespan` when Railway boots the container. All times below are ET; APScheduler handles DST switches automatically (no manual UTC math).

| Job | Trigger | When |
|---|---|---|
| `sync_job` | Interval | Every 15 min — pulls pipeline state from AccuLynx |
| `cadence_job` | Interval | Every 5 min — finds leads due for follow-up, drafts, queues for approval |
| `approval_nudge_job` | Cron | **17:00, 17:30, 17:45, 17:55 ET, Mon–Fri** — escalating "please approve" reminders |
| `auto_send_at_deadline_job` | Cron | **18:00 ET, Mon–Fri** — auto-fires every still-pending draft to the homeowner |
| `scheduled_send_job` | Interval | **Every 1 min** — checks `MessageQueue.scheduled_for` and fires due agent-scheduled drafts |
| `cookie_health_job` | Cron | 09:00 ET daily — verifies AccuLynx internal-API session cookie |

### Precision

APScheduler's CronTrigger fires within **~1 second** of the target wall-clock time. The scheduler thread sleeps until the next job and wakes on the system clock. Railway containers use NTP-synced clocks, so 18:00:00 ET means 18:00:00 ET ± a few hundred ms — well within the precision we need.

**Caveats:**
- If the container is restarting at the firing moment, the job gets a 600-second `misfire_grace_time` — APScheduler will run it on the next available tick once the app is back up. We won't *skip* a 6pm send because of a redeploy; we'll just shift it slightly.
- The default in-memory `JobStore` means `DateTrigger` one-shots (used for the inbound-reply 2–3 min delay) don't survive a hard crash. For now this is acceptable — a missed auto-reply just lands in the rep's escalation inbox via the existing fallback. If we wanted these to survive, we'd swap to `SQLAlchemyJobStore` against the same SQLite DB (10-line change, can do later).

### Giving the Agent Future-Scheduling Power

There are **two** mechanisms, and the agent picks based on horizon:

**1. Short-horizon (seconds to minutes)** — `schedule_one_shot()` in `engine/scheduler.py`:

```python
schedule_one_shot(
    coro_fn=lambda: _auto_reply_send(message_id),
    run_in_seconds=random.uniform(120, 180),
    job_id=f"inbound-reply-{message_id}",
)
```

Used today for: the 2–3 min random delay before inbound auto-replies (so it doesn't look bot-instant).

**2. Long-horizon (hours to days)** — set `MessageQueue.scheduled_for` + `status='scheduled'`:

```python
# Drafter / agent code wants to say "send this Tuesday at 9am":
msg = MessageQueue(
    lead_id=lead.id,
    channel="email",
    subject="...",
    body="...",
    status="scheduled",
    scheduled_for=datetime(2026, 5, 19, 13, 0, tzinfo=timezone.utc),  # 9am ET = 13:00 UTC
)
session.add(msg)
```

`scheduled_send_job` runs every minute and fires anything past-due. This survives restarts (it's in the database, not in memory). No rep approval required — the schedule itself is the authorization. Used when the AGENT (not a rep) decides "the right moment for this touch is X."

**Today's cadence engine uses neither directly** — it computes "next due touch" from layer rules in `engine/sync.py:find_leads_needing_followup()`. The `scheduled_for` column gives us a clean escape hatch for: rep says "send this on Friday morning" from the portal (v2 feature), or the agent overrides the cadence calendar with a specific datetime.

---

## What's NOT Yet Built (Heads-Up for Thursday)

- **Vercel deploy is manual** — no auto-deploy on `git push` until you connect the repo in Vercel UI.
- **Portal sign-in flow assumes SendGrid is live** — the magic link comes from SendGrid. If you're testing the portal before §4 is done, use the JWT secret + the `/auth/callback?token=...` URL directly.
- **No SMS until §5 lands** — fully implemented, gated by `MESSAGING_CHANNELS`.
- **No persistent job store** — see the precision caveats above. Fine for v1.

---

## Quick Smoke-Test Checklist (Before Thursday Training)

Run these in sequence once §1–§7 are done:

1. **Health:** `curl https://<railway>/health` → `{"ok":true}` ✓
2. **Login:** Open `https://app.moderndayroof.com` → enter your email → check inbox for magic link → click it → land on `/queue` ✓
3. **Send a draft (DRY):** `railway run python scripts/test_send.py colinjrbh317@gmail.com` ✓
4. **Trigger cadence by hand:** `railway run python scripts/test_draft.py` — generates a draft for an allowlisted lead and queues it for approval ✓
5. **Portal approve:** open `/queue` on your phone → tap the draft → tap **Approve** → check that the AccuLynx Communications tab gets an `[AI Agent]` note within 30s ✓
6. **Inbound auto-reply:** reply to your test email from §3 with "What's your warranty?" → wait 2–3 min → confirm the AI replied + the AccuLynx note logged the auto-reply ✓
7. **6pm auto-send:** (skip on Thursday — wait for first real Monday) ✓

---

## TL;DR — Critical-Path Order

If you only have a few hours:

1. **§1 Railway up** (10 min) — unblocks everything else
2. **§7 env vars** (10 min) — copy `.env` into Railway, generate fresh JWT
3. **§4a Single Senders** (5 min × 5 reps = 25 min) — fastest deliverability path
4. **§2 Vercel deploy** (5 min) — portal goes live
5. **§3 DNS app subdomain** (5 min + ~10 min propagation) — `app.moderndayroof.com` works
6. **§6a UUIDs** (5 min) — real reps wired in
7. **§6b webhook re-register** (2 min) — AccuLynx hits Railway
8. **Thursday training** — `DRY_RUN=true` for the demo
9. **Monday** — flip `DRY_RUN=false`, `SOLO_SENDER_MODE=false`, watch logs

Everything from §5 (Twilio) and §3 second half (`reply.moderndayroof.com` MX) can wait until Tuesday-Wednesday next week.
