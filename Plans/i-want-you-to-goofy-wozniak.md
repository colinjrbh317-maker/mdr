# Google Ads Landing Page Optimization Plan

## Context

We have 8 PPC landing pages live at `/lp/{slug}` ([src/pages/lp/[campaign].astro](../src/pages/lp/[campaign].astro)). The 3 priority pages for paid traffic are:

- `/lp/roof-replacement` — highest ticket value
- `/lp/roof-repair` — highest intent / fastest close
- `/lp/branded` — defensive on competitors bidding "Modern Day Roofing"

Colin's audit identified blocking problems on these pages: logo invisible on mobile, form pushed below the fold, redundant content, em-dashes in copy, and no Hotjar loaded on the LP layout (so form-submit events fire into the void). Goal: make these 3 pages best-in-class for mobile conversion before the upcoming Alicia + PPC manager meeting.

---

## Approved Decisions

- **Skills bundle (confirmed):** `homepage-audit` + `direct-response-copy` + `marketing-psychology` + `de-ai-ify`
- **Dynamic location:** Hybrid — `?city=` ValueTrack param + Vercel Edge IP geo fallback
- **Baseline screenshots:** Skip — ship the rebuild directly
- **Scope:** 3 priority pages only (`roof-replacement`, `roof-repair`, `branded`)

**Skill execution order:**
1. `homepage-audit` — score each of the 3 pages, identify highest-leverage gaps
2. `marketing-psychology` — apply behavioral principles to layout + copy decisions
3. `direct-response-copy` — rewrite hero headline, subhead, CTA, risk-reversal microcopy
4. `de-ai-ify` — final pass to strip em-dashes, AI jargon, hedging
5. Build the changes
6. `homepage-audit` again on the rebuilt pages to confirm score lift

---

## Current State — What We Found

### Hotjar (just implemented site-wide, but NOT on LPs)
- Loaded in [src/layouts/Layout.astro](../src/layouts/Layout.astro) (main site) ✅
- **MISSING from [src/layouts/LandingPageLayout.astro](../src/layouts/LandingPageLayout.astro)** ❌
- Site ID: `5444251` (component: [src/components/analytics/Hotjar.astro](../src/components/analytics/Hotjar.astro))
- Impact: All `hj()` calls in [LeadCaptureForm.tsx:63-69, 85](../src/components/forms/LeadCaptureForm.tsx) silently no-op on the LPs

### Form Submit Conversion Tracking (audit)
[LeadCaptureForm.tsx:49-69](../src/components/forms/LeadCaptureForm.tsx) fires on success:
| Event | Status | Notes |
|---|---|---|
| GA4 `generate_lead` | ✅ Fires | But no Google Ads conversion linked yet |
| Meta `Lead` | ✅ Fires | Pixel loaded in LP layout |
| Hotjar `form_submitted` event | ⚠️ Code present, no-op (Hotjar not loaded on LP) |
| Hotjar `identify` (name/email/phone) | ⚠️ Same — no-op |
| Google Ads conversion (`AW-XXX/XXX`) | ❌ Not wired |
| AccuLynx CRM lead creation | ✅ Fires server-side; auto-tags `google-ads` source from gclid ([src/lib/acculynx.ts:309](../src/lib/acculynx.ts)) |

### Mobile UX Issues (confirmed via code review)
1. **Logo invisible on mobile** — [lp/[campaign].astro:103](../src/pages/lp/[campaign].astro). `/assets/logos/mdr-logo-dark.svg` does NOT exist in `/public/assets/logos/` (verified — folder has `LOGO.webp`, no `mdr-logo-dark.svg`). The onerror fallback inserts text with `text-text-primary` (dark color) — invisible on white header but the SVG itself just 404s.
2. **Form below the fold on mobile** — Hero stacks: headline (text-3xl) → subheadline (text-lg) → form. On a 375px viewport, the form is ~500px below the fold.
3. **Redundant trust signals** — Rendered twice: hidden in hero on mobile (`hidden lg:flex`), then again as a separate trust bar section.
4. **"What Happens After You Reach Out" section** — 3-step trust block adds ~400px but doesn't help conversion above the form.
5. **Sticky bottom bar** — Eats 110px of mobile real estate, has a 3-line stacked layout (offer text + "Limited time" + button).
6. **Em-dashes**: 5 in the LP file (lines 16, 22, 41, 47, 50, 52, 60 in copy strings + line 232 footer "&mdash;"). 1 more in [LeadCaptureForm.tsx:172](../src/components/forms/LeadCaptureForm.tsx) ("Or text us —").

### "Landing Page Scale" Search Result
No standalone rubric file found in `Plans/` or `SOPs/`. The `homepage-audit` skill provides a structured scoring framework that fills this gap — that's what I'll use unless you have a specific rubric saved elsewhere you want me to pull in.

---

## Proposed Changes

### A. Wire Up the Stack (Quick Wins — Phase 1)

1. **Add Hotjar to `LandingPageLayout.astro`** — single import line. Activates session recordings + heatmaps + the existing event calls.
2. **Fix the logo** — replace SVG ref with the existing [LOGO.webp](../public/assets/logos/LOGO.webp), or generate a proper inline SVG with white-on-dark fallback.
3. **Add Google Ads conversion event** — needs the Conversion ID + Label from the PPC manager. Wire into [LeadCaptureForm.tsx:49](../src/components/forms/LeadCaptureForm.tsx) success handler:
   ```ts
   gtag('event', 'conversion', { send_to: 'AW-XXXXX/YYYYY', value: 1.0, currency: 'USD' });
   ```
4. **Add phone-click conversion** — fires on every `tel:` click in the LP (header + footer + sticky bar).

### B. Mobile-First Hero Rebuild (Phase 2)

Restructure [lp/[campaign].astro:124-173](../src/pages/lp/[campaign].astro) to put the form ABOVE the headline on mobile (form-first), keeping the desktop side-by-side layout:

```
MOBILE (<lg)              DESKTOP (≥lg)
┌──────────────────┐      ┌──────────┬─────────┐
│ Logo  |  📞 Call │      │ Logo  |  📞 Call   │
├──────────────────┤      ├──────────┴─────────┤
│ HEADLINE (1 line)│      │ HEADLINE │ FORM    │
│ Subhead (1 line) │      │ Subhead  │ CARD    │
│ ⭐ trust bar (4) │      │ Trust    │         │
├──────────────────┤      └──────────┴─────────┘
│  ┃ FORM CARD  ┃ │
│  ┃ Step 1     ┃ │
│  ┃ [Continue] ┃ │
└──────────────────┘
```

Specific moves:
- Reduce hero headline to `text-2xl md:text-4xl lg:text-5xl` so it fits on one line at 375px
- Drop the duplicate trust bar (keep one block, mobile-visible)
- Defer "What Happens After" to BELOW the form
- Shrink sticky bar to single line: "📞 (540) 553-6007 — Call Now" (60px instead of 110px)
- Remove "$500 Off" sticky bar copy (it's not in any current ad creative — message-match risk)

### C. Dynamic Location Population (Phase 3)

Three strategies, **recommend hybrid (#1 + #3)**:

| # | Strategy | Setup | UX | Recommendation |
|---|---|---|---|---|
| 1 | **Google Ads ValueTrack param** — final URL `?city={LOCATION(City)}` → JS reads param → writes `sessionStorage.mdr_location` → existing swap script in [lp/[campaign].astro:266-281](../src/pages/lp/[campaign].astro) handles render | 30 min code + Ads ops | Brief flash of "Southwest Virginia" before swap | ✅ Use as primary |
| 2 | **Per-city static URLs** — `/lp/roof-replacement/roanoke` etc. via getStaticPaths. Best message-match | 2 hrs code + ad group rebuild | Zero flash, zero JS | Use ONLY for top 3 cities |
| 3 | **Vercel Edge `request.geo`** — server-side IP geo, sets cookie, no flash | 1 hr code, requires switching the `lp/` route to `prerender = false` (SSR) | Best UX, works for organic too | ✅ Use as fallback when no `?city=` |

**Recommended hybrid implementation:**
1. JS reads `?city=` param first (PPC traffic always has it)
2. Falls back to Vercel Edge geolocation
3. Falls back to "Southwest Virginia"
4. Replaces `[Location]` in headline + subheadline + form CTA

### D. Copywriting Framework (Phase 4)

Apply the **PAS + Direct-Response 5-Point Hero** framework via the `direct-response-copy` and `marketing-psychology` skills:

For each of the 3 priority pages:
1. **Hero headline** — Outcome + Location + Time/Specificity (e.g., "Get a Free Roof Replacement Quote in Roanoke — Same-Day Inspection")
2. **Subhead** — One pain + one mechanism (e.g., "GAF Master Elite installers. $0 down financing. 1,000+ Virginia roofs.")
3. **Above-form trust line** — 3 hard proofs (5.0 / 1,000+ / GAF Master Elite)
4. **CTA button** — Action + benefit ("Get My Free Quote") not "Submit"
5. **Below-form risk reversal** — "No high-pressure sales. No obligation. Inspection takes 20 minutes."

**Em-dash policy:** Replace all em-dashes with periods, commas, or parentheses. Run `de-ai-ify` skill on final copy.

**Per-page differentiation:**
- **Roof Replacement** — Lead with financing ($89/mo) + warranty
- **Roof Repair** — Lead with speed (same-day diagnosis) + price transparency
- **Branded** — Lead with reputation (5.0 / GAF Master Elite / Top 2% of US Roofers)

### E. Hotjar Tracking Plan (Phase 5)

With Hotjar loaded on the LP, configure in Hotjar dashboard:
- **Session recordings** filtered by URL contains `/lp/`
- **Heatmaps** for each of the 3 priority pages (separate recordings)
- **Funnel**: page_view → form_started → form_step_1_completed → form_submitted (events already fire from [track-events.ts](../src/lib/track-events.ts))
- **Custom event setup** in dashboard: `form_submitted`, `phone_click`, `form_started` — these all already fire

---

## Implementation Phases (Execution Order)

| Phase | Scope | Est. | Blocking |
|---|---|---|---|
| 1 | Wire Hotjar into LP layout + fix logo + remove em-dashes | 30 min | None |
| 2 | Mobile hero rebuild (form-first stacking, headline sizing, dedupe trust bar, condensed sticky bar) | 90 min | None |
| 3 | Dynamic location: ValueTrack param reader + Edge geo fallback | 90 min | Need PPC manager to add `?city={LOCATION(City)}` to ad URLs |
| 4 | Copywriting pass on the 3 priority pages (homepage-audit → direct-response-copy → de-ai-ify) | 2 hrs | Need ad copy from PPC manager for message match |
| 5 | Google Ads conversion ID wired into form submit + phone click | 15 min | Need Conversion ID + Label from PPC manager |
| 6 | Hotjar dashboard setup (heatmaps, funnels, recordings filter) | 30 min | Need Hotjar dashboard access |

**Phases 1, 2, 4 can ship before the meeting.** Phases 3, 5, 6 depend on inputs from Alicia / PPC manager.

---

## Critical Files to Modify

- [src/layouts/LandingPageLayout.astro](../src/layouts/LandingPageLayout.astro) — add Hotjar
- [src/pages/lp/[campaign].astro](../src/pages/lp/[campaign].astro) — mobile rebuild, headline sizing, copy rewrite, em-dash removal, location swap upgrade
- [src/components/forms/LeadCaptureForm.tsx](../src/components/forms/LeadCaptureForm.tsx) — add Google Ads conversion event, remove em-dash on line 172
- [src/lib/track-events.ts](../src/lib/track-events.ts) — add helper for Google Ads conversion (optional)
- New: `src/components/common/LocationResolver.astro` — reads `?city=`, falls back to Vercel geo
- New: `src/middleware.ts` (if going Edge geo route) — sets cookie from `request.geo`

---

## Verification Plan

After the rebuild, for each of the 3 priority pages:

1. **After-rebuild screenshots**: Run `npm run dev`, screenshot `/lp/roof-replacement`, `/lp/roof-repair`, `/lp/branded` at 375px (iPhone SE), 768px (iPad), 1440px (desktop). Save 9 screenshots to `SCREENSHOTS/lp-after/` for the Alicia meeting.
2. **Lighthouse mobile score**: Target ≥90 Performance, ≥95 Accessibility on each page.
3. **Form submit smoke test**: Submit a test lead on each page in dev. Verify:
   - Network tab shows POST to `/api/submit-form`
   - Console shows `gtag('event', 'generate_lead', ...)` fires
   - Console shows `gtag('event', 'conversion', ...)` fires (after PPC manager provides ID)
   - Console shows `fbq('track', 'Lead', ...)` fires
   - `window.hj` exists and `hj('event', 'form_submitted')` is queued
4. **Hotjar verification**: After deploy, check Hotjar dashboard within 24 hrs — confirm session recordings appear and `form_submitted` shows up under Events.
5. **Em-dash zero-count**: `grep -n "—" src/pages/lp/\[campaign\].astro src/components/forms/LeadCaptureForm.tsx src/layouts/LandingPageLayout.astro` returns nothing.
6. **Location swap**: Visit `/lp/roof-replacement?city=Blacksburg` — confirm headline reads "Full Roof Replacement in Blacksburg." Visit without param from a Roanoke IP — confirm headline reads "Full Roof Replacement in Roanoke."
7. **`homepage-audit` re-score**: Run the skill against the live URLs after deploy. Target ≥85/100 on each priority page.

---

## Open Questions for Alicia / PPC Manager

These need answers before Phases 3, 5, 6 can ship:

1. **Google Ads Conversion ID + Label** (format: `AW-XXXXXXXXX/AbCdEfGhIj`) — for the conversion event
2. **Top 5–10 cities** to support in dynamic location (probably Christiansburg, Roanoke, Blacksburg, Salem, Radford — confirm)
3. **Current ad copy** for each ad group — needed for message-match (LP headline should mirror ad headline within 70%)
4. **$500 off offer** — is it currently in any ad creative? If not, removing from sticky bar is safe.
5. **Hotjar dashboard access** — for funnel + heatmap setup
6. **Ads ValueTrack params** — confirm PPC manager will add `?city={LOCATION(City)}&utm_source=google&utm_campaign={campaignid}` to all final URLs

---

## Out of Scope (For Now)

- The other 5 LPs (`roof-financing`, `roof-inspection-christiansburg`, `roof-inspection-roanoke`, `roofing-company`, `competitors`) — handled in a follow-up after the 3 priority pages are validated
- Per-city static URLs (Strategy #2 in dynamic location) — defer until we see if dynamic swap works
- A/B testing framework — defer; ship V1 first, measure for 2 weeks
