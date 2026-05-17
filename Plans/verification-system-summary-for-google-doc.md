# Verification System — Plain English Rundown

**For: Colin · Date: 2026-05-17**

> Save target: Google Doc. Auth expired during build — to push this to Google Docs, run `gws auth login` and then I'll create the doc. This file is the fallback so the content is never lost.

---

## The problem we're solving

Right now, when Claude builds something for you, this is what happens:

1. Claude builds it.
2. Claude says "done."
3. You manually click around, check your inbox, look at the site.
4. You find a bug.
5. You send the bug back to Claude.
6. Claude fixes it.
7. Repeat 3–6 a few times.

That cycle wastes hours and you can never fully trust Claude until YOU test it.

**Goal:** Make Claude prove its own work before saying done — so you only test ONCE, after Claude has already verified everything itself.

---

## How the new system works (5 layers, simple version)

### Layer 1 — The "Verify" skill (already built)
A checklist Claude runs after building anything. Adjusts to what you're building (website, app, calculator, email pipeline, etc.).

### Layer 2 — Auto-trigger
A "Stop hook" — a tripwire — sits at the end of every Claude conversation. When Claude tries to say "I'm done," the tripwire asks: "Did you run Verify? No? Go run it now."

Starts in **SOFT mode** (polite warning + voice notification). Once trusted, switch to **HARD mode** (Claude literally cannot end a turn without verifying).

### Layer 3 — Different checklists for different things
- **Websites (MDR, PlanWell):** build → test → click through every page in a real browser → check console for errors → screenshot for visual differences
- **Calculators (PlanWell FERS / TSP / Supplement):** run 1,000 random valid inputs, check the math holds (no negative pensions, no NaN, consistent results)
- **Email pipelines:** submit a test form → wait 30s → check the test inbox → confirm the email arrived
- **SMS pipelines (MDR AccuLynx):** send test SMS → poll AccuLynx API → confirm delivery
- **Deploys:** deploy to preview URL → hit it with a real browser → check no new errors → no performance regressions

### Layer 4 — Test inboxes & test phones
Instead of sending test emails to your real Gmail:
- **Mailtrap** (free) — dedicated test inbox. Every test form submission goes here.
- **Gmail plus-addressing** (colin+verify@gmail.com) — only for occasional production smoke tests.
- **Twilio test credentials** — for SMS tests. No charge, no real phone vibrates.

### Layer 5 — Workflow upgrades
- `/verify` — full check
- `/verify --quick` — fast stuff only (~5s)
- `/verify --deploy` — full deploy roundtrip
- `/verify --adversarial` — Claude tries to BREAK its own work, finds edge cases
- Nightly automated checks (catches overnight drift before you ever know)

---

## Why MDR + PlanWell get special attention

### MDR (Modern Day Roofing)
**What can break without you noticing:**
- Contact form stops sending → you lose leads silently
- AccuLynx SMS stops sending → leads don't get followed up
- A service or area page goes blank after a Sanity update
- Phone number drifts to wrong number after a CMS edit
- Mobile speed regresses → Google penalizes you

**What the new system catches:**
- Daily form submit → confirms it arrives in Mailtrap + AccuLynx
- Daily SMS test → confirms it sends through AccuLynx v3
- Daily screenshot diff → flags any visual change to top 6 pages
- Phone-number check → fails if site no longer shows Alicia's real phone
- Performance budget → fails if pages get slower

### PlanWell (Financial Planning for Federal Employees) — the dangerous one
**What can break without you noticing:**
- A calculator returns the wrong pension number → federal employee makes a wrong retirement decision → potential lawsuit
- Mailchimp campaign fails to send → 1,680 subscribers don't get the newsletter
- Zoom webinar registration silently breaks → no attendees on webinar day
- n8n workflow stops firing → automations silently dead
- Article ships with broken internal links

**What the new system catches:**
- **Property-based calculator tests** — 1,000 random valid inputs per calculator, asserts mathematical invariants (pension grows with years of service, supplement positive for retirees under 62, etc.). This alone reduces real risk by an order of magnitude.
- Mailchimp test send → polls Mailtrap → confirms delivery
- Zoom OAuth → registers a test attendee → confirms via Zoom API
- n8n health check before AND after any workflow change
- Webhook-server health endpoint check
- Dead-link scanner on every article

---

## New tools we're adding

**Already paid for, underused:**
- **Firecrawl** — nightly site drift detection, competitor monitoring (Cenvar, Roman Roofing for MDR; Serving Those Who Serve, Fed Corner for PlanWell), content opportunity discovery, post-deploy fact-checking
- **PostHog** — query "any new errors in last 5 min after deploy?"
- **n8n MCP** — workflow health checks
- **Sanity MCP** — read-back verification after writes
- **Claude in Chrome** — interactive browser checks

**Worth installing:**
- **Sentry MCP** — real-user error tracking. Biggest miss right now.
- **BrowserTools MCP** — built-in Lighthouse/SEO/A11y audits
- **Microsoft Playwright MCP** — official Playwright integration
- **Anthropic's webapp-testing skill** — battle-tested patterns
- **addyosmani/web-quality-skills** — accessibility, performance, SEO plug-ins
- **Vercel deploy-to-vercel skill** — official Vercel deploy

**New CLIs:**
- `sanity`, `lighthouse`, `@axe-core/cli`, `linkinator`, `wrangler` (if needed), `fast-check` + `pixelmatch` per-project

---

## Phased rollout

**Week 1 — Foundation**
- Install Sentry, BrowserTools, Playwright MCPs
- Install missing CLIs
- Wire auto-trigger in soft mode
- Set up Mailtrap

**Week 2 — High-risk wins**
- PlanWell calculator property tests (biggest risk reduction)
- `.claude-verify.json` for MDR and PlanWell
- MDR AccuLynx SMS verification
- Nightly Firecrawl drift detection

**Week 3 — Polish**
- Competitor monitoring
- Switch to "ask first" mode
- Visual regression
- PostHog funnel checks

**Week 4+ — Lock it in**
- GitHub Actions for nightly Verify
- Hard mode
- Adversarial mode
- Dashboard

---

## What this means in practice

**Before:**
1. "Claude, build me X."
2. Claude says done.
3. You spend 20 min clicking around.
4. You find 2 bugs.
5. Back-and-forth for an hour.

**After:**
1. "Claude, build me X."
2. Claude builds, runs the right checklist, catches its own bugs, fixes them, re-runs, reports: "✅ build passed, all 8 routes verified, contact form roundtrip succeeded, calculator passed 1000 property tests, no new Sentry errors, Lighthouse 94. Screenshots attached."
3. You glance and ship.

---

## One-line summary

"Claude builds → Colin tests → bugs back-and-forth" becomes "Claude builds → Claude tests itself → Colin reviews the proof." Time saved per build: 30–60 minutes. Calculator-math errors at PlanWell that could harm clients: essentially zero with property testing.
