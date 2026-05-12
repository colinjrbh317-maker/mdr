# Rilla → MDR AI Sales Agent: Integration Brief

**Date:** 2026-05-11
**Author:** Research-only investigation (read-only, no code)
**Question:** Can MDR's AI sales agent ingest Rilla transcripts per lead, and what's the realistic path?

---

## TL;DR (read this if nothing else)

Rilla **does not publish a customer-facing API or webhook surface**. The only "webhook" endpoint discoverable on the public web (`api.apirilla.com/webhooks/spotio`) is **inbound to Rilla** — third parties push activity data INTO Rilla, not the other way around. Rilla consumes CRM APIs (via Merge.dev) to enrich its own recordings; it does not push transcripts back out to CRMs as a documented product feature.

**Realistic path:** For v1 we have **no clean integration**. The CEO's own workaround — "take that whole transcript and put in the notes" — is genuinely the right v1 move. For v2, the highest-EV path is a **direct partnership ask to Rilla's CS team** for either (a) a custom webhook/export, or (b) early access to their developer platform if one is on the roadmap. Building against an undocumented internal API at `app.rillavoice.com` is technically possible but is a fragility/ToS risk for a paying customer relationship MDR wants to keep.

---

## 1. Does Rilla have a public/customer API?

**No public/customer-facing API.** Evidence:

- GetApp's product profile explicitly states "Rilla does not have an API available."([GetApp profile](https://www.getapp.com/emerging-technology-software/a/rillavoice/))
- The Rilla homepage and product pages make no mention of an API, developer platform, webhooks, or developer docs.([rilla.com](https://www.rilla.com/))
- No developer portal, no `developers.rilla.com`, no public OpenAPI/Swagger spec, no GitHub org. Confirmed via direct search.
- The only public endpoint at `api.apirilla.com` is **inbound** — a webhook receiver Rilla exposes for third parties (SPOTIO) to push activity events into Rilla.([SPOTIO+Rilla](https://support.spotio.com/hc/en-us/articles/14530983742743-SPOTIO-Rilla-Voice))

What they DO have, via Merge.dev's Unified CRM API, is **inbound consumption** of CRM data (Salesforce, HubSpot, Zoho, Pipedrive, MS Dynamics) — but this is one-way INTO Rilla to enrich recordings. They are not reselling those Merge connections as an outbound feed.([Merge.dev case study](https://www.merge.dev/case-studies/rilla))

## 2. What data exists (and where it lives)

Inside Rilla's customer-facing web app (`app.rillavoice.com`), the data we want clearly exists:

- Full transcripts with **speaker diarization** (who-said-what)
- Timestamps per utterance
- AI-generated summaries
- Sentiment/coaching scores
- Linked CRM context (prospect, product, deal outcome) when a CRM integration is enabled — but **AccuLynx is NOT one of those CRMs**

So the data we want exists. We just have no documented machine-readable way to pull it out.

## 3. Auth model

Unknown publicly. The Rilla web app uses session-cookie auth (standard SaaS login). No public OAuth client registration, no API key UI surfaced to customers. Any "auth model" discussion is moot until Rilla offers an API.

## 4. Existing integrations — and the critical AccuLynx gap

**Rilla's confirmed integrations:**
- CRMs via Merge.dev: Salesforce, HubSpot, Zoho, Pipedrive, MS Dynamics([Merge.dev](https://www.merge.dev/case-studies/rilla))
- ServiceTitan (home services CRM)([ServiceTitan marketplace](https://marketplace.servicetitan.com/partner/rillavoice))
- CompanyCam (photos sync into ride-alongs)([CompanyCam help](https://help.companycam.com/en/articles/9491938-integrate-companycam-rilla))
- SPOTIO (field sales activity webhook)([SPOTIO](https://spotio.com/integrations/rillavoice/))

**AccuLynx is NOT in Rilla's integration list.** And critically, Rilla is **not on AccuLynx's AppConnections list** either. The full AccuLynx integration list — ABC Supply, QXO, SRS, QuickBooks, Sage Intacct, AccuFi, GreenSky, HubSpot, Hatch, EagleView, GAF QuickMeasure, Geospan, Hover, RoofSnap, RoofScope, CompanyCam, Angi, Roofle, SalesRabbit, Spotio, Zapier, Google Maps, HailWatch, CoreLogic Hail Maps, Calendar apps, CallRail — has **zero conversation-intelligence tools**.([AccuLynx integrations](https://acculynx.com/integrations/))

This means option (c) from the question — "Rilla → AccuLynx sync → we read from AccuLynx" — **does not exist as a built integration**. Nothing automatically writes Rilla transcripts to AccuLynx job notes today.

(Sidebar: SPOTIO is on both lists. In theory a Rube-Goldberg path is Rilla → SPOTIO webhook → SPOTIO → AccuLynx. SPOTIO is the inbound side though, not the outbound side, so this almost certainly doesn't work either. Not worth pursuing.)

## 5. Webhook support (outbound from Rilla)

**No documented outbound webhooks.** The Merge.dev case study describes webhooks flowing INTO Rilla when CRM appointment fields change. No mention of Rilla firing webhooks OUT when a recording completes. This is the single biggest gap for our use case.

## 6. Lead matching

Moot until #1 or #5 resolves. If/when Rilla exposes transcripts, the linkage to AccuLynx would have to be heuristic: customer name + address + appointment date/time + sales rep. There is no shared canonical ID (Rilla doesn't store an `acculynx_job_id` because Rilla doesn't integrate with AccuLynx). MDR would need a fuzzy-match layer.

## 7. Backdoor / scraping the customer-facing web app

Technically feasible, practically risky. `app.rillavoice.com` is a standard SPA. A session-cookie scraping approach (same pattern MDR already uses with AccuLynx) could likely pull transcripts via the internal JSON endpoints visible in Chrome DevTools.

**Risks:**
- Almost certainly violates Rilla's ToS for a paying customer
- Rilla is well-funded (UiPath co-founder backing per [TechCrunch](https://techcrunch.com/2022/12/01/uipath-speech-analytics-sales-teams-software-rillavoice/)) and Austin/Alicia have a CS relationship there worth more than the integration
- Internal endpoints are unversioned — could break on any deploy
- If detected, Rilla can lock the account
- ~$4,000+/seat/year cost means MDR loses real money if the account is revoked

I would **not** recommend this path unless Rilla explicitly refuses an export request.

## 8. Pricing / API gating

Rilla is enterprise-priced ($199–$349/seat/month, ~$4,000+/seat/year, $1,500–$5,000 implementation).([SalesAsk pricing](https://www.salesask.com/rilla-pricing-guide-2026)) MDR is already paying enterprise rates. If they had an API tier, MDR is the right customer profile for it — which is exactly why **asking CS directly is the right first move**.

## 9. Integration paths ranked

| Rank | Path | Feasibility | Effort | Risk |
|------|------|-------------|--------|------|
| 1 | **Email/Slack CS at Rilla** and ask for: (a) outbound webhook for recording completion, (b) bulk export endpoint, or (c) AccuLynx sync on their roadmap | High — they sell on integrations | Low (one conversation) | Low |
| 2 | **Manual paste** of transcript into AccuLynx job notes by reps — agent reads from AccuLynx notes (which we already do) | High — works today | Low (process change only) | Low |
| 3 | **Rilla-hosted bulk export via human-in-loop** — CSV/JSON download of completed recordings from Rilla web app, dropped into S3, agent ingests nightly | Medium — depends on what their UI exports | Medium | Low |
| 4 | **Wait for Rilla to ship a public API** — they've already invested in Merge.dev for inbound; outbound is the obvious next step | Medium-term | None now | None |
| 5 | **Zapier/Make middleware** — Rilla has no Zapier listing, so this isn't real | N/A | N/A | N/A |
| 6 | **Session-cookie scrape of `app.rillavoice.com`** | Technically yes | High | High (ToS + fragility) |

## 10. Risk / reward — is it even worth it?

**The honest answer: marginal for v1.**

What AccuLynx notes already give us:
- Job stage, address, contact, photos, measurements, estimates, communication log
- Whatever the rep typed up after the appointment

What a Rilla transcript adds:
- Verbatim objections the prospect raised
- What the rep actually said vs. what they wrote in notes
- Sentiment signal (was it a warm prospect or a tire-kicker)
- Patterns across reps (the coaching signal Rilla's actually built for)

For an **AI sales agent that drafts follow-ups, prioritizes leads, and surfaces objections**, transcripts are 3–5x richer than notes. But Austin's instinct — "best thing for sales guys is take that whole transcript and put in the notes" — is correct because:

1. AccuLynx is the source of truth Alicia's team already lives in
2. A rep pasting a Rilla summary into a job note is a 30-second action that immediately closes the data gap with zero engineering
3. The agent already reads AccuLynx; no new ingestion plumbing needed
4. This is reversible — if Rilla ships an API in 2026, swap in automation

The 80/20 here is: **make the paste-into-notes workflow frictionless** (maybe a Rilla shortcut / Chrome extension MDR builds for reps), and revisit when Rilla ships outbound webhooks.

---

## Final Recommendation

**Three-step plan:**

1. **v1 (now):** Manual workaround. Reps copy Rilla AI Summary into AccuLynx job notes at appointment close. Agent ingests from AccuLynx as it already does. Cost: a process tweak, zero engineering. *This is the CEO's instinct and it's right.*

2. **v1.5 (next 30 days):** Have Austin or Alicia email Rilla's CS rep with a direct ask: "We're building an AI sales agent. Do you have (a) outbound webhooks on the roadmap, (b) a bulk transcript export, or (c) AccuLynx on your integration roadmap?" One conversation tells us whether v2 is 3 months or 18 months away. Cost: one email.

3. **v2 (when Rilla ships an API or grants an export):** Build a FastAPI ingester that receives Rilla webhooks → fuzzy-matches to AccuLynx job by (customer name + address + appointment date + rep) → stores transcript in our agent's per-lead context store → re-indexes that lead's embeddings. Plan for this architecturally now, but don't build until the API exists.

**Do NOT:** Scrape `app.rillavoice.com` via session cookies. The relationship value and ToS risk both dwarf the engineering win — especially when option #1 captures most of the EV.

---

## Sources

- [Rilla — homepage](https://www.rilla.com/)
- [Rilla — Home Services industry page](https://www.rilla.com/industry/home-services)
- [Rilla — Mr. Roofing case study](https://www.rilla.com/testimonials/mr-roofing)
- [Rilla customer app login](https://app.rillavoice.com/)
- [Merge.dev — Rilla CRM integrations case study](https://www.merge.dev/case-studies/rilla) *(primary source on Rilla's integration architecture)*
- [GetApp — Rilla profile (states "no API available")](https://www.getapp.com/emerging-technology-software/a/rillavoice/)
- [ServiceTitan Marketplace — Rillavoice](https://marketplace.servicetitan.com/partner/rillavoice)
- [SPOTIO + Rilla integration support article](https://support.spotio.com/hc/en-us/articles/14530983742743-SPOTIO-Rilla-Voice)
- [SPOTIO Rillavoice partner page](https://spotio.com/integrations/rillavoice/)
- [CompanyCam + Rilla integration help](https://help.companycam.com/en/articles/9491938-integrate-companycam-rilla)
- [AccuLynx — full integrations list (Rilla absent)](https://acculynx.com/integrations/)
- [AccuLynx — AppConnections](https://acculynx.com/appconnections/)
- [SalesAsk — Rilla pricing 2026](https://www.salesask.com/rilla-pricing-guide-2026)
- [TechCrunch — Rillavoice funding (UiPath co-founder)](https://techcrunch.com/2022/12/01/uipath-speech-analytics-sales-teams-software-rillavoice/)
- [Deepgram — Rilla customer story (powers Rilla's STT)](https://deepgram.com/ai-apps/rillavoice)
- [G2 — Rilla reviews](https://www.g2.com/products/rilla/reviews)
- [Capterra — Rilla profile](https://www.capterra.com/p/10016798/Rilla/)
