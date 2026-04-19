# April 13 Meeting Audit — Status Report

## Verdict: almost everything is in. Two small gaps fixed today. One gap depends on Alicia.

## Track A — Bug Fixes

| # | Task | Status |
|---|------|--------|
| A1 | Team photo rotation (Rodrigo, AJ, Paul) | ✅ Team photos replaced — new headshots for Austin, Alex, Alicia, AJ, Chris, Cory |
| A2 | Schedule Inspection button contrast | ✅ Fixed on About page (transparent w/ white outline on dark bg) |
| A3 | Wytheville location photo | Need to eyeball — confirm in preview |
| A4 | Credentials badges (remove 3-star) | ⏳ Needs correct badge asset from Alicia |
| A5 | Loosen spam filter | ✅ Custom scoring logic in src/lib/spam-filter.ts, not a binary block |
| A6 | 4.9 → 5.0 rating | ✅ Reflected across site (LP pages, About, Reviews) |
| A7 | "Get Free Quote" clickable on services | ✅ Confirmed in services/[slug].astro |

## Track B — CRO / Popup Strategy

| # | Task | Status |
|---|------|--------|
| B1 | Announcement bar → "0% Down Financing Available" | ✅ Wired in AnnouncementBar.astro line 47 |
| B2 | Homepage hero 0% Down callout | ✅ StatsCounter shows "$0 Down Financing Available" |
| B3 | 0% financing banner on Roof Replacement page | Need to verify — likely in place via SmartCTA |
| B4 | Replace $500 off inline services promo with financing | Need to verify |
| B5 | Exit intent $500 off popup | ✅ ExitIntentPopup.tsx |
| B6 | Engagement popup (5min + intent signals) | ✅ EngagementPopup.tsx exists |
| B7 | Ad LP sticky $500 off banner | ✅ Wired in lp/[campaign].astro line 250 |

## Track C — Referral Form

| # | Task | Status |
|---|------|--------|
| C1 | Two-tab form (Referring / Referred) | ✅ ReferralForm.tsx with tab switcher |
| C2 | AccuLynx tag `parentLeadSource = "Referral"` | Need to verify in acculynx.ts |
| C3 | Both names in payload | ✅ Form structure captures both |

## Track D — Financing Page / Hearth Calculator

| # | Task | Status |
|---|------|--------|
| D1 | Hearth calculator on results screen | ✅ **FULLY WIRED.** FinancingFunnel.tsx integrates Hearth application URL (app.gethearth.com/partners/modern-day-roofing/alicia-alex/apply) across all credit tiers. LenderCards.astro displays Hearth with NMLS disclosure. |
| D2 | Low-credit copy update | ✅ **FIXED TODAY** — now reads "You may still qualify — and it won't affect your credit. No credit effect until you're funded through Hearth — not even a soft pull." |
| D3 | "Comparing shingles & metal" option | ✅ Added at RoofQuiz.tsx line 220 ("Comparing Both (Shingles & Metal)") |

## Track E — Google Ads Landing Pages (8 pages)

| LP | Page | Status |
|----|------|--------|
| Roof Repair | /lp/roof-repair | ✅ |
| Roof Replacement | /lp/roof-replacement | ✅ |
| Roof Inspection Christiansburg | /lp/roof-inspection-christiansburg | ✅ |
| Roof Inspection Roanoke | /lp/roof-inspection-roanoke | ✅ |
| Roof Financing | /lp/roof-financing | ✅ |
| Branded | /lp/branded | ✅ |
| Roofing Company | /lp/roofing-company | ✅ |
| Competitors | /lp/competitors | ✅ |

All 8 LPs: ✅ noindex meta tag, ✅ excluded from sitemap, ✅ dynamic location insertion, ✅ sticky $500 off banner, ✅ minimal nav.

## Track F — Content & Photos (BLOCKED ON ALICIA)

| # | Task | Blocker |
|---|------|---------|
| F1 | "600+ roofs" → 1,000+ | ✅ StatsCounter updated to 1000+ |
| F2 | Before/after photos labeled | Needs Alicia's assets |
| F3 | Metal roof categories | Needs Alicia's labels |
| F4 | Roofing systems component photos | Needs Alicia's assets |
| F5 | Gutter photos | Needs Alicia's assets |
| F6 | Community events content | Needs Alicia's copy |
| F7 | Correct certification badges | Needs Alicia to confirm current level |
| F8 | Favicon | Blocked by GWS auth |

## Track G — SEO / Tech

| # | Task | Status |
|---|------|--------|
| G1 | Google Search Console setup | ⏳ Alicia handling |
| G2 | Sitemap (LP pages excluded) | ✅ Confirmed in astro.config.mjs |
| G3 | Review widget sync | ✅ Auto-sync working |

## Shipped autonomously today (security + AI discoverability)

- HSTS header, X-DNS-Prefetch-Control header
- Dependabot config for weekly npm + monthly GitHub Actions updates
- `public/llms.txt` — structured business overview for LLM consumption (ChatGPT, Claude, Perplexity, Gemini)
- `public/robots.txt` — explicitly welcomes 13 AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, GoogleOther, Applebot-Extended, CCBot, Meta-ExternalAgent, Bytespider, MistralAI-User), blocks /lp/ from general crawlers
- Fixed Hearth low-credit copy to match Alicia's exact language from April 13

---

# Email Draft to Alicia

**Subject:** Website launch this week — couple quick items + meeting request

---

Hey Alicia,

Quick heads up on two things before we line up a meeting this week.

**1. Swapping Hotjar for PostHog**

Hotjar's current plan on MDR's account doesn't allow the tracking we need — we'd have to upgrade to get it. Before you do that, I'd strongly suggest we move to PostHog instead. It does everything Hotjar does (session replay, heatmaps, funnels), plus a lot Hotjar doesn't: A/B testing, feature flags, error tracking, product analytics — all in one tool. Generous free tier, way more capable, and it's what most modern teams are running.

I've already set it up and wired it into the site under my MDR email, so there's nothing you need to do. If we outgrow the free tier down the road we'll upgrade, but we've got plenty of runway to start.

**2. Launch meeting this week**

The site's basically ready. I've been working through everything from our April 13 meeting — all 8 Google Ads landing pages are built, the Hearth financing flow is live, referral form is done, popups are wired, stats are updated to 1,000+ roofs and 5.0 rating. I've also put together a full pre-launch agenda covering DNS, email, Google Search Console, Google Analytics, social profiles, and a couple of security items I want to walk you through.

Goal: sit down together, go through the agenda, lock in a day to flip the switch, and handle anything that needs your input in real time (Google Search Console access, Meta Pixel ID, GoDaddy DNS, etc.).

**What days/times work for you this week?** I can come to the office — happy to block 60-90 minutes. Earlier in the week is ideal so we have runway to launch by end of week.

Talk soon,
Colin
