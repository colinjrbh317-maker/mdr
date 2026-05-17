# SMS Launch Readiness Runbook

**Owner:** Colin
**Window:** Mon 2026-05-18, ~30 minutes
**Goal:** Move the AccuLynx AI sales agent's SMS channel from "code shipped" to "100% confident every lead gets a text."

## How SMS actually sends

The agent does **not** use Twilio. It impersonates a sales rep's logged-in AccuLynx web session and POSTs to AccuLynx's internal `v3` messaging endpoint.

- Each rep has 4 cookies (`.ASPXAUTH`, `ASP.NET_SessionId`, `cf_clearance`, plus the AccuLynx CSRF token) stored at `acculynx/sessions/{slug}.json`.
- The bot account (`mdrai-acculynx`) is the fallback sender when a rep's session is missing or expired.
- If *all* HTTP sends fail, the agent posts a `Comment` on the AccuLynx job containing the unsent message body **and** emails `colinjrbh317@gmail.com` so no lead is ever silently dropped.

Two operating modes:

- **Solo-sender mode** (current): every text goes from the bot account. Simplest. `SOLO_SENDER_MODE=true`.
- **Per-rep mode**: text appears as if from the assigned rep's identity. Requires seeded cookies for every rep. `SOLO_SENDER_MODE=false`.

---

## 1. Pre-flight checks (5 min)

- [ ] In AccuLynx admin, confirm the `mdrai-acculynx` bot user has the **Calls & Texts** permission.
- [ ] Confirm the bot user has a **provisioned outbound phone number** attached (no number = silent failure on send).
- [ ] Open `.env` and verify:
  - `ACCULYNX_LOGIN_EMAIL=` (bot account)
  - `ACCULYNX_LOGIN_PASSWORD=` (bot account)
  - `ALERT_EMAIL_TO=colinjrbh317@gmail.com`
  - `OPS_PHONE=+19084999449` (TEST TEST recipient)
- [ ] Confirm git is clean and on `main`: `git status && git rev-parse --abbrev-ref HEAD`.
- [ ] Confirm Python venv is active: `source .venv/bin/activate && which python`.

---

## 2. Seed the bot session (5 min)

The bot session is the fallback for every send, so this **must** be valid before anything else.

```bash
cd /Users/colinryan/MDR/acculynx-agent
python scripts/refresh_cookies.py --headed
```

- [ ] Chromium opens. Log in with the **bot** credentials.
- [ ] Complete any 2FA challenge in the visible browser window.
- [ ] Wait for the script to print all 4 cookies captured: `.ASPXAUTH`, `ASP.NET_SessionId`, `cf_clearance`, CSRF token.
- [ ] Confirm `acculynx/sessions/mdrai-acculynx.json` exists and `mtime` is from the last 60 seconds:

```bash
ls -la acculynx/sessions/mdrai-acculynx.json
```

> **Important:** Run this on the **same machine + IP** that will run the agent in production. `cf_clearance` is bound to IP fingerprint. Seeding on your laptop and deploying to a different box will fail.

---

## 3. Seed each rep's session (10 min — *skip if launching in solo-sender mode*)

Only do this if you're flipping `SOLO_SENDER_MODE=false` at launch. Otherwise skip and move on.

For each rep with credentials in `.env` (e.g. Austin → `ACCULYNX_LOGIN_EMAIL_AUSTIN` / `ACCULYNX_LOGIN_PASSWORD_AUSTIN`):

```bash
python scripts/refresh_cookies.py --headed --rep austin
```

- [ ] Log in as that rep, complete 2FA if prompted.
- [ ] Verify `acculynx/sessions/austin.json` exists with fresh mtime.
- [ ] Repeat for every rep listed in `config/reps.yaml`.

Once all rep sessions are seeded, flip the mode:

```bash
# in .env
SOLO_SENDER_MODE=false
```

Bulk refresh (headless, only works after at least one headed seed per rep):

```bash
python scripts/refresh_cookies.py --all
```

---

## 4. Smoke test — no send (2 min)

```bash
python scripts/smoke_test_sms.py
```

Expected output: every preflight check `PASS`. This validates:
- All required `.env` keys present
- Bot session cookies parse and are non-empty
- AccuLynx `/me` endpoint authenticates with the cookies
- The v3 messaging endpoint is reachable (dry HEAD/GET probe, no body sent)
- Alert email transport (SMTP/SES) credentials resolve

- [ ] Every check is green. If any fail, do **not** proceed — fix and re-run.

---

## 5. Alert path test (1 min)

Prove the failure-mode alert actually reaches Colin's phone.

```bash
python scripts/smoke_test_sms.py --alert-test
```

- [ ] Email arrives at `colinjrbh317@gmail.com` within ~30s.
- [ ] Push notification visible on phone (Gmail app foregrounded).
- [ ] Subject line clearly says it's a test (so future real alerts aren't dismissed as drills).

---

## 6. Canary live send (2 min)

Lock the blast radius to the TEST TEST job *before* enabling real sends.

In `.env`:

```bash
TEST_LEAD_ALLOWLIST=b54f39d8-ba98-4a79-97df-1112ab3a3ca8
MESSAGING_CHANNELS=email,sms
DRY_RUN=false
```

Then:

```bash
python scripts/smoke_test_sms.py --send
```

- [ ] Text arrives at (908) 499-9449 within ~15 seconds.
- [ ] Open AccuLynx → TEST TEST job → **Texts** tab. Confirm:
  - The outbound message is logged
  - The "From" identity matches expectation (bot in solo mode; assigned rep in per-rep mode)
- [ ] No `Comment` fallback was posted (would indicate the HTTP send actually failed and the email path silently succeeded).
- [ ] No alert email was triggered.

If the canary fails: keep `DRY_RUN=false` off, re-investigate, do not widen the allowlist.

---

## 7. Cowork opt-in audit (10 min)

Before opening the floodgates, verify the launch cohort has either implicit or explicit SMS opt-in (TCPA/A2P posture).

- [ ] Open Claude Cowork.
- [ ] Paste the full contents of `docs/cowork_opt_in_audit_prompt.md`.
- [ ] Have it inspect **10 real leads** from the current pipeline.
- [ ] For each lead it should classify: `explicit_optin`, `implicit_optin`, `unknown`, `do_not_text`.
- [ ] Save its output to `docs/launch_cohort_optin_audit_2026-05-18.md`.
- [ ] Manually spot-check 2 of the 10 against the source-of-truth in AccuLynx.

If >20% of the cohort lands in `unknown` or `do_not_text`, tighten the launch cohort (see step 8) — don't go wide.

---

## 8. Launch (decision point)

**Recommended path: canary cohort, not wide open.**

Pick 5–10 specific leads from the opt-in audit who are `explicit_optin` or strong `implicit_optin` (recently engaged inbound). Put their job IDs in `TEST_LEAD_ALLOWLIST`:

```bash
TEST_LEAD_ALLOWLIST=<id1>,<id2>,<id3>,...
```

Let the agent run for 24 hours on the canary. Watch:
- AccuLynx Texts tab on each job
- `colinjrbh317@gmail.com` inbox for any alert emails
- `data/agent.log` for any retries/fallbacks

Only after a clean 24h do you remove `TEST_LEAD_ALLOWLIST` entirely (or comment it out) to open SMS to every eligible lead.

- [ ] Canary cohort defined and saved.
- [ ] Agent run kicked off (`python -m acculynx_agent.run` or whatever the cron entry is).
- [ ] 24h hold timer set on your calendar before widening.

---

## 9. Cron the nightly health monitor

```bash
crontab -e
```

Append:

```cron
0 3 * * * cd /Users/colinryan/MDR/acculynx-agent && .venv/bin/python scripts/sms_health_monitor.py >> data/cron-sms-health.log 2>&1
```

- [ ] Cron line added.
- [ ] Tail the log tomorrow morning to confirm it actually fired:

```bash
tail -n 50 data/cron-sms-health.log
```

The monitor checks: cookie age per session, last successful send timestamp, fallback-rate over last 24h, alert delivery latency. It emails Colin if anything trips a threshold.

---

## 10. Rollback plan

If anything looks wrong post-launch, in order of severity:

1. **Disable SMS only (keep email running):**
   ```bash
   # .env
   MESSAGING_CHANNELS=email
   ```
   Restart the agent. Email path is untouched.

2. **Full freeze (no outbound at all):**
   ```bash
   DRY_RUN=true
   ```
   Agent will log intended sends without executing.

3. **Restore Twilio/A2P path** if re-enabled in code: flip the messaging provider flag and recycle.

4. The `Comment` fallback **already** preserves every message that fails to send via HTTP. Even in a full outage, no lead text is permanently lost — it's sitting on the AccuLynx job for a human to send manually.

---

## What breaks this

Known failure modes, in rough order of likelihood:

- **AccuLynx triggers a 2FA challenge on login.** Headless cookie refresh fails. Fix: `refresh_cookies.py --headed --rep <slug>` and complete the prompt in the visible browser.
- **`cf_clearance` expires (~30–60 days, IP-bound).** Sends start 403'ing. Fix: headed re-seed from the production IP. Health monitor flags this automatically.
- **AccuLynx changes the v3 endpoint URL or payload schema.** All sends fail simultaneously. Smoke test catches it; CI alarm + Cowork re-capture session of the network traffic to update the client.
- **Bot account loses the Calls & Texts permission.** Every send 401/403s. AccuLynx admin issue — alert Alicia. Solo-sender mode is fully broken until restored; per-rep mode degrades gracefully (rep sessions still work).
- **Bot account loses its provisioned phone number.** Sends 200 OK with no actual delivery. Watch the AccuLynx Texts tab on canary day — if the message logs but doesn't arrive on the test phone, this is the cause.
- **Rep account deactivated or password rotated.** Impersonation fails for that rep; agent falls back to bot. Re-seed when reactivated.
- **Production machine IP changes** (DHCP lease, VPN, ISP swap). `cf_clearance` invalidates immediately. Headed re-seed required.
- **Disk fills / `acculynx/sessions/` becomes unreadable.** All sessions fail at the same time. `df -h` should be in the health monitor.

---

## Testing ideas (build confidence beyond the smoke test)

1. **Five-scenario blast at TEST TEST.** Send 5 messages back-to-back simulating: (a) clean first-touch, (b) reply to an opt-out keyword, (c) send with an artificially expired `.ASPXAUTH` cookie to force fallback, (d) send with network dropped mid-flight (toggle Wi-Fi), (e) send to a lead with no phone on file. Verify each path either succeeds or fails *loudly*.

2. **Live thread continuity test.** Have a rep manually send a real message from the AccuLynx UI to a homeowner. Five minutes later, trigger the agent on that same lead and confirm the agent's outbound text **appends to the existing thread**, not a new one.

3. **Real-time UI observation.** Run `smoke_test_sms.py --send` while watching the AccuLynx Texts tab live. Confirm the message appears within ~3 seconds with the correct sender identity.

4. **Forced auth failure.** Manually corrupt the bot's `.ASPXAUTH` cookie (open the JSON, scramble 5 chars). Trigger a send. Confirm: (a) alert email lands within 60s, (b) `Comment` fallback fires on the job, (c) message body is preserved verbatim in the comment. Then restore the cookie and re-send to verify recovery.

5. **Per-rep identity verification.** With `SOLO_SENDER_MODE=false`, send a test from Austin's profile. Have someone reply from the homeowner's phone. Confirm the reply lands in **Austin's existing AccuLynx thread**, not in the bot's threads or a brand-new conversation.

6. **Daylight-savings / timezone test.** Schedule a send via the agent at a boundary time (e.g., 11:59 PM local) and confirm the AccuLynx timestamp matches expectation. Past launch readiness, but worth doing in week 1.

7. **Concurrency test.** Trigger sends to 3 different leads in the same 10-second window. Confirm no cookie races, no double-sends, no thread bleed.

---

## Done definition

You can declare SMS launch-ready when **all of these are true**:

- [ ] Steps 1–6 completed with green checks.
- [ ] Opt-in audit saved to disk and spot-checked.
- [ ] Canary cohort defined; agent running against canary only.
- [ ] Cron health monitor installed and verified.
- [ ] Rollback flags documented and known by muscle memory.
- [ ] At least 3 of the testing ideas above executed.
