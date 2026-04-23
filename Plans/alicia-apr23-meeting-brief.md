# Pre-Meeting Brief — Alicia + PPC Manager (Thu 4pm, Apr 23)

## Everything from April 13 — Current Status

### ✅ Done (no action needed)

| Area | Status |
|---|---|
| AccuLynx direct API (Gravity Forms removed) | Live |
| Spam filter (lenient scoring, not binary block) | `src/lib/spam-filter.ts` |
| Google rating → 5.0 everywhere | Homepage, About, LPs, Reviews |
| Stats updated → 1,000+ roofs | StatsCounter + LPs |
| Team photos fixed (Rodrigo/AJ/Paul rotation) | Re-uploaded |
| "Schedule Inspection" button contrast | Fixed on About |
| Announcement bar → "0% Down Financing" | AnnouncementBar.astro |
| Exit-intent $500 off popup | ExitIntentPopup.tsx |
| 5-min + intent-signal engagement popup | EngagementPopup.tsx |
| Two-tab referral form (Referring / Referred) | ReferralForm.tsx |
| Referral leads tag as `parentLeadSource = "Referral"` | acculynx.ts |
| Hearth payment calculator on results screen | FinancingFunnel.tsx |
| Low-credit copy: "no credit effect until funded" | Per Alicia's exact words |
| Roof quiz: "Comparing Both (Shingles & Metal)" option | RoofQuiz.tsx:220 |
| Roof quiz: "Outside service area" option | Added |
| All 8 Google Ads LPs | `/lp/*` — noindex, dynamic location |
| Hotjar wired on LPs | Site ID 5444251, form + phone events firing |
| TCPA SMS consent checkbox on all lead forms | Required for Google Ads + carrier compliance |
| Google Search Console | Alicia granted access (Apr 22) |
| llms.txt + robots.txt (AI crawlers + noindex LPs) | Shipped |
| 301 redirects for WordPress URLs | In vercel.json |

### 🚧 Blocked on Alicia (content)

1. **Before/after photos** labeled by roof type (she has them in assets for all 3 main services)
2. **Real photos** for Roofing Systems page components (roof deck, leak barrier, catch-all system)
3. **More gutter photos** (most roofs get them together, hard to isolate)
4. **Certification badges** — correct current Presidents Club tier (we have the 3-star asset, need confirmation that's current)
5. **Metal roof photo labels** — timber steel vs. metal shingle vs. standing seam
6. **Community events content** — CTE takeover, annual roof giveaway, veterans giveaway
7. **Warranty page content** — extended info she promised
8. **Wytheville location photo** — she said current one looks too urban/dense
9. **"600+ roofs" true number** — she said "probably way more than 1,000" + "10,000 square alone last year" (use whichever she prefers)

### 🚧 Blocked on PPC Manager (today's meeting)

1. **Google Ads account ID** — `AW-XXXXXXXXX`
2. **Lead conversion action** — `AW-XXX/AbCdEfG` (for form submit)
3. **Call conversion action** — `AW-XXX/HiJkLmN` (for phone click)
4. **Final URL template** confirmed: `?city={LOCATION(City)}&utm_source=google&utm_campaign={campaignid}`
5. **Ad copy for each ad group** — we need this to tune LP headline for message-match (70%+ overlap)
6. **Campaign structure** — which campaigns point to which LP (so he/she can set final URLs correctly)

Once PPC manager hands over items 1–3, we drop them into Vercel env vars and conversion tracking is live.

---

## What Colin Needs to Get from Today's Meeting

### From Alicia

- [ ] **"Roofs completed" number + squares** — pick the number she wants on the site
- [ ] Access / link to the Hearth calculator widget (her assets Drive folder)
- [ ] Confirm Presidents Club tier (3-star still current?)
- [ ] Photo asset handoff (before/after, roofing systems components, gutters, metal roof labels) — Drive link is fine
- [ ] Metal roof photo labels (timber steel / metal shingle / standing seam)
- [ ] Confirm service area whitelist (22 cities currently — Christiansburg, Blacksburg, Radford, Roanoke, Salem, Vinton, Bedford, Troutville, Daleville, Hollins, Cave Spring, Floyd, Pulaski, Dublin, Lexington, Covington, Wytheville, Smith Mountain Lake, Moneta, Rocky Mount, Fincastle, Buchanan). Add/remove?
- [ ] Community events content + photos (CTE takeover, roof giveaway, veterans event)
- [ ] Warranty page content
- [ ] Final decision on monthly billing vs. annual prepay (Austin question)

### From PPC Manager

- [ ] Google Ads `AW-XXXXXXXXX` account ID
- [ ] Lead conversion action ID + label
- [ ] Call conversion action ID + label
- [ ] Confirm ValueTrack param will be added: `?city={LOCATION(City)}&utm_source=google&utm_campaign={campaignid}`
- [ ] Current ad copy per ad group (for message-match tuning)
- [ ] Which LP each ad group should point to
- [ ] Access to Google Ads dashboard (if needed for deeper integration)

### Share With Alicia / PPC Manager

- [ ] 8 LP URLs — `/lp/roof-repair`, `/roof-replacement`, `/branded`, `/roofing-company`, `/competitors`, `/roof-financing`, `/roof-inspection-christiansburg`, `/roof-inspection-roanoke`
- [ ] TCPA SMS consent is now on every form (required for Google Ads compliance)
- [ ] Hotjar is live on LPs — session recordings, heatmaps, `form_submitted` + `phone_click_lp` events
- [ ] Dynamic location strategy — PPC = 100% accurate via ValueTrack; organic = whitelisted IP geo (shows "Southwest Virginia" if detected city isn't in service area, never shows a wrong city)

---

## Pre-Launch Checklist (2–4 Week Window, per Alicia's April 13 preference)

### Tech / DNS (Colin-driven)

- [ ] Confirm Vercel production domain target (moderndayroof.com)
- [ ] Get GoDaddy DNS access (or whoever hosts the domain) — needs A/CNAME records updated at cutover
- [ ] Snapshot all current WordPress URLs one more time + confirm 301 redirects in vercel.json cover every one
- [ ] Verify `/referral-program/` redirect points to `/referral-program` (not `/`) — per migration plan
- [ ] Verify `/test-home/financing/` redirects to `/financing`
- [ ] Submit new sitemap to Google Search Console (Colin has access)
- [ ] Request removal of old sitemap + old indexed URLs that 301 to new paths
- [ ] Confirm GA4 property matches the one on WordPress (don't create a new one, inherit traffic history)
- [ ] Confirm A2P 10DLC Twilio registration is complete (submitted last week)
- [ ] Complete Google Ads env vars in Vercel (3 vars from PPC manager)

### Content (Alicia-driven)

- [ ] Real photos plugged into Roofing Systems page
- [ ] Before/afters uploaded and labeled
- [ ] Correct certification badges swapped
- [ ] Community events page filled in
- [ ] Warranty page expanded
- [ ] "Roofs completed" number locked

### QA before cutover

- [ ] Click every nav link — 200, no 404
- [ ] Submit test lead from every form (ContactForm, LeadCaptureForm, LeadCaptureFormMini, ReferralForm) — verify AccuLynx lead appears + GA4 event + Meta Lead + Hotjar event
- [ ] Submit test lead from each of the 3 priority LPs
- [ ] Click-to-call from header/footer/sticky on mobile LP
- [ ] Financing quiz → Hearth handoff
- [ ] Chat widget (Claude-powered) → lead capture
- [ ] Hotjar session recording shows up in dashboard
- [ ] All images load (no broken refs)
- [ ] Lighthouse mobile ≥90 perf, ≥95 a11y on all 3 priority LPs

### Launch Day

- [ ] Cut DNS over (A/CNAME → Vercel)
- [ ] Verify SSL cert issues immediately
- [ ] Submit sitemap-index.xml to Google Search Console
- [ ] Request indexing on top 20 priority pages (homepage, 3 LPs, top 5 areas, top 5 services, financing, about, contact, reviews)
- [ ] Turn on Google Ads campaigns with the new final URLs
- [ ] Monitor Vercel runtime logs for 404s / 500s for first 24 hrs
- [ ] Watch Hotjar for odd user behavior (misclicks, rage clicks, short sessions)

---

## Proposed Meeting Agenda (4pm today, 45–60 min)

1. **Walkthrough (10 min)** — Colin demos 3 priority LPs, TCPA form, Hotjar dashboard, financing funnel
2. **PPC manager handoff (15 min)** — get conversion IDs + ad copy + final URL confirmation; discuss message-match between ads and LP headlines
3. **Content gap list (10 min)** — Alicia commits on photos / stats / warranty / events content + timeline (is 1 week realistic for her?)
4. **Launch date (10 min)** — lock a target (e.g., Monday May 11 or Wed May 13) + DNS cutover plan
5. **Open questions + billing (5 min)** — Austin payment decision

---

## Recommendation for Meeting Tone

Alicia said on April 13: *"I would rather it be perfect, maybe even four or five weeks."* She does NOT want to be rushed. Lead with confidence about what's done (the list is long) but propose a launch date she can comfortably accept. **Suggest: content freeze by Fri May 1, QA week of May 4, launch Mon May 11.** Gives her 8 days for content, 7 days for QA, 18 days total from today.
