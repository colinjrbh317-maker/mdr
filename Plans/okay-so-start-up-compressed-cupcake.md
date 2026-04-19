# $500 Promo Discipline + Intent-Based CRO Overhaul

## Context

Today, the $500 Off promo is fired at anyone who lingers on any page: desktop exit-intent popup (after a 3-emoji "situation" funnel), a 5-minute engagement popup, and a mobile inactivity popup. That trains visitors the discount is free for waiting — it destroys the price anchor on $20k+ roof replacements, wastes margin on low-intent browsers (blog readers, FAQ visitors), and makes MDR look desperate.

Additionally, the site under-uses existing infrastructure: PostHog is fully wired for events + feature flags + session recording, `business-hours.ts` already knows whether MDR is open, and SocialProofToast already owns the bottom-left desktop slot — but none of these tools shape the offer strategy.

**Goal**: Turn $500 Off into a disciplined, intent-gated closing tool. Replace it in low-intent placements with free-inspection and financing messaging. Use PostHog to tier offers by intent signal. Layer roofing-specific enhancements (phone-click rescue, business-hours-aware CTAs, weather-triggered storm urgency, real scarcity, form-abandonment recovery) on top of a clean baseline.

**Outcome**: $500 only shows to visitors who have demonstrated shopping intent. Financing stays sitewide. Free inspection is the universal offer. Higher-intent leads get discount; mid-intent get financing; low-intent get inspection. Same traffic, better margin, stronger brand.

---

## Phases

Each phase is independently shippable. Phase 1 is the prerequisite for everything else.

---

### Phase 1 — Baseline Discipline (this pass)

**What changes**

1. **ExitIntentPopup** ([src/components/cro/ExitIntentPopup.tsx](src/components/cro/ExitIntentPopup.tsx))
   - Remove the "situation" step (3-emoji grid + headline "What's your roofing situation?"). Open directly on the $500 offer + name/phone form.
   - Drop `selectedService` state; lead source stays `exit-intent-popup`, sales qualifies on call.
   - Add `pageIsHighIntent(path)` helper in the component: returns `true` for `/`, `/services/*`, `/areas/*`, `/gallery`, `/contact`, `/offers/*`, `/lp/*`. Skip mount on everything else (blog, FAQ, about, warranty, privacy, terms, community, financing, roofing-systems, team, reviews, emergency).
   - Already fed `currentPage` from [src/layouts/Layout.astro:175](src/layouts/Layout.astro).

2. **EngagementPopup** ([src/components/cro/EngagementPopup.tsx](src/components/cro/EngagementPopup.tsx))
   - Replace $500 messaging with **financing**: headline "Payments from $89/mo — 0% down", sub "See if you qualify in 60 seconds", CTA button links to `/financing` (no form on this popup — pure interstitial).
   - Keep 5-min + engagement trigger logic, session-storage guards, and PostHog capture (event name becomes `engagement_popup_shown`).

3. **MobileRetentionPopup** ([src/components/cro/MobileRetentionPopup.tsx](src/components/cro/MobileRetentionPopup.tsx))
   - Replace $500 messaging with **free inspection**: headline "Free Roof Inspection — 20 Minutes, No Obligation", sub "We'll be in and out." Keep name/phone mini-form.
   - Update success copy (remove "apply your $500 discount"). Keep AccuLynx submission path.

4. **PromoBanner** ([src/components/cro/PromoBanner.astro](src/components/cro/PromoBanner.astro))
   - Delete file. Already unused ([src/pages/services/[slug].astro:19](src/pages/services/[slug].astro) comment confirms).

5. **AnnouncementBar** ([src/components/layout/AnnouncementBar.astro:68](src/components/layout/AnnouncementBar.astro))
   - No change. Already clean.

**Unchanged (keep as-is)**
- `/offers/500-off` dedicated LP
- `/lp/[campaign]` mobile sticky bar (paid-ad traffic came for the promo)
- Chat widget promo guardrails ([src/pages/api/chat.ts:289-296](src/pages/api/chat.ts))

**Verification**
- Build: `npm run build && npm run preview`
- Load `/blog/[any-post]` on desktop → idle 20s → move cursor to top → ExitIntent should **not** appear
- Load `/services/roof-replacement` → same flow → ExitIntent **should** appear, straight to offer (no emoji step)
- Load any page, scroll past 50% + click 3 times + wait 5min → EngagementPopup shows financing, not $500
- Load any page on mobile → idle → MobileRetention shows free inspection, not $500

---

### Phase 2 — Intent-Based Offer Tiering (PostHog-driven)

**What changes**

New `src/lib/intent-tier.ts` — single source of truth for visitor intent tier. Returns one of: `cold | warm | hot`.

Signals (tracked via PostHog events + localStorage flags):
- **hot**: clicked `tel:` link without completing call, OR started a form and didn't submit, OR visited `/offers/500-off` this session, OR ≥2 sessions with ≥1 service/area page view each
- **warm**: viewed ≥2 service pages in session, OR ≥90s on a single service/area page, OR clicked pricing/financing anchor
- **cold**: first-pageview, blog/FAQ/about/community only, <90s on page

Tier resolution runs on `window` load + after each relevant event, writes to `sessionStorage.mdr_intent_tier`.

**Where it's used**
- `ExitIntentPopup` shows the $500 offer only when tier === `hot`. For `warm`, swaps to "Get a Free Quote" (no discount). For `cold`, doesn't mount at all.
- `EngagementPopup` shows financing for `cold` + `warm`, and bumps to "$500 off if you book today" for `hot` (rare combo — they engaged 5 min AND already showed prior intent).
- `StickyMobileCTA` reads tier for CTA copy ("Call" vs "Get $500 Off" vs "Free Inspection").

**PostHog wiring**
- Add `phone_click`, `form_started`, `form_field_focus` events in relevant components.
- Use PostHog feature flags (already available — `getFeatureFlag`, `isFeatureEnabled` in [src/components/analytics/PostHog.astro:16](src/components/analytics/PostHog.astro)) for A/B testing tier thresholds without redeploys.
- Capture `intent_tier_resolved` on every pageview with the tier — feeds dashboards.

**New files**: `src/lib/intent-tier.ts`, `src/lib/track-events.ts` (wrapper exposing `track('phone_click', {...})` that fans out to PostHog + GA4 + Meta)

**Verification**
- PostHog Live Events view shows `intent_tier_resolved` firing on load
- Click tel: link from homepage → refresh → tier is `hot` → ExitIntent shows $500 panel
- Read a blog post for 3 min → exit → ExitIntent does not mount
- Feature-flag override via PostHog UI changes tier thresholds without code change

---

### Phase 3 — Phone-Click Abandonment Popup (mobile-first)

**What changes**

New `src/components/cro/PhoneClickRescuePopup.tsx`. Behavior:
- Global listener on `document` for clicks on any `a[href^="tel:"]`.
- On click: set `sessionStorage.mdr_phone_clicked_at = Date.now()`, fire PostHog `phone_click`.
- 90s later, if no `form_submitted` and no `tel_call_back_detected`, show popup: "Didn't get through? We'll call you in 10 minutes." Name + phone form.
- Submits via existing `/api/submit-form` with `source: "phone-click-rescue"`.
- Uses `getBusinessHoursInfo()` from [src/lib/business-hours.ts](src/lib/business-hours.ts) — shows "call you in 10 minutes" (open) vs "call you first thing Monday" (closed).
- Mobile priority (full-screen bottom sheet), desktop gets smaller toast.
- 24h localStorage cooldown to avoid repeat.

Mount in [src/layouts/Layout.astro](src/layouts/Layout.astro) alongside other CRO components, `client:idle`.

**Verification**
- Tap phone number in header → cancel call → wait 90s → popup appears with correct business-hours phrase
- Submit form → lead appears in AccuLynx tagged `phone-click-rescue`
- PostHog funnel: `phone_click` → `phone_rescue_shown` → `form_submitted` conversion rate visible

---

### Phase 4 — Business-Hours–Aware CTAs

**What changes**

New `src/components/common/SmartCTA.astro` + `SmartCTA.tsx` (Astro for static pages, React for interactive). Reads `getBusinessHoursInfo()`:
- **Open**: Primary button = "Call Now: 540-XXX" (tel: link), secondary = "Request Callback"
- **Closed**: Primary button = "Request Callback" (scroll to hero form or opens popup), secondary = "Call Monday: 540-XXX"
- Sub-line: "Open now — typical response 3 min" vs "Closed — we'll reach out Monday morning"

Replace hardcoded CTAs in:
- [src/components/home/HeroErie.astro](src/components/home/HeroErie.astro) (hero)
- [src/components/home/StickyMobileCTA.astro](src/components/home/StickyMobileCTA.astro) (sticky mobile bar)
- [src/components/layout/Footer.astro](src/components/layout/Footer.astro) (footer CTA block)
- Service page template CTA sections

**Note**: `getBusinessHoursInfo()` already works SSR + client. Astro version runs at build time (ISR every 60s — close enough); React version is authoritative at runtime.

**Verification**
- Visit site Tue 10am → all primary CTAs say "Call Now"
- Visit site Sat 2pm → all primary CTAs say "Request Callback", with "We'll reach out Monday morning" sub-line
- Mobile sticky bar matches desktop state

---

### Phase 5 — Smart Return-Visitor Unlock

**What changes**

Not just "visited twice." Tier visitor on return based on **prior-session engagement depth**, persisted in localStorage:

```
mdr_visitor_history: {
  sessions: [
    { started_at, max_scroll_pct, pages_viewed, phone_clicks, form_starts, service_pages_viewed }
  ],
  earned_tier: 'cold' | 'warm' | 'hot'
}
```

Earn `hot` on return only if **prior session** had ≥1 of:
- Viewed 2+ service pages
- Clicked a tel: link
- Started a form (focused any field in hero/contact form)
- Spent ≥3 min on a single service/area page
- Visited `/offers/500-off` or `/financing`

On return with earned `hot`: show welcome-back banner on first interaction (top of page, dismissible): "Welcome back — your $500 off is still available. [Claim now →]"

Cold returns (just bounced last time) get no promo, only the standard flow.

**Feeds into** Phase 2's `intent-tier.ts` as an additional `hot` signal.

**Verification**
- Session 1: bounce after 10s on homepage → session 2: no welcome banner, no promo
- Session 1: view 3 service pages, click phone → session 2: welcome banner appears, tier = hot, ExitIntent shows $500

---

### Phase 6 — Weather-Triggered Storm Urgency

**What changes**

New `src/pages/api/storm-check.ts` — SSR endpoint, 6-hour cache:
- Reads visitor location via Vercel's `x-vercel-ip-city` / `x-vercel-ip-region` headers (free on Vercel). Fallback: static map of MDR service area ZIPs.
- Queries NOAA Storm Events API or OpenWeather (decision below) for hail ≥1" or wind ≥58mph events in visitor's county in last 14 days.
- Returns `{ recent_storm: bool, event_type, date, severity, location }`.

Client-side `useStormCheck()` hook calls endpoint on load, writes to `sessionStorage.mdr_storm_alert`.

Consumers:
- **AnnouncementBar** ([src/components/layout/AnnouncementBar.astro](src/components/layout/AnnouncementBar.astro)) — if storm alert, prepend top-priority message: "⚡ Hail reported in Roanoke on Oct 12 — free damage inspection" with link to `/contact?source=storm-alert`.
- **ExitIntentPopup** — if storm alert + tier ≥ warm, swap to storm-damage variant (no $500 — urgency + insurance claim angle is enough). Copy: "Recent storm in your area? Free damage assessment + insurance claim help."
- **Hero headline** on homepage — subtle badge "Storm damage in [City]? We're booking emergency inspections."

**Open question**: NOAA SWDI is free but clunky; OpenWeather has paid tier. Recommend NOAA free tier — stored in PostHog for measurement before upgrading.

**Verification**
- Mock `x-vercel-ip-city: Roanoke` header in dev → storm-check returns real NOAA data
- Dev-only override `?storm=hail&city=Roanoke` forces alert → AnnouncementBar + ExitIntent change accordingly
- If NOAA returns no events → fallback to normal flow (no alert shown)

---

### Phase 7 — Real Scarcity on $500 Offer

**What changes**

New `src/pages/api/capacity.ts` — returns inspection slots remaining this week:
- **V1 (ship first)**: Hardcoded weekly capacity (e.g., 12 slots), decremented by count of `form_submitted` events in PostHog for the current ISO week (queried via PostHog's HogQL API), with a floor of 3.
- **V2 (later)**: Query AccuLynx calendar API directly for real crew availability. Depends on AccuLynx API capability (needs research — flag for later).

`/offers/500-off` + ExitIntent `hot` variant show: "Only **3 inspection slots left this week** — book by Friday to lock in $500 off." Updates every 10 min.

**Anti-abuse**: Never show count ≥10 (always "filling up"). Never show 0 (always floor at "1 left — book today").

**Verification**
- PostHog query returns real submission count, endpoint returns capacity math correctly
- Offers page shows dynamic count, not hardcoded
- Number decreases as real leads come in through the day

---

### Phase 8 — Form Abandonment Recovery

**What changes**

Extend `LeadCaptureForm.tsx` + `LeadCaptureFormMini.tsx` + `ContactForm.tsx` + `FinancingFunnel.tsx`:
- Fire `form_started` on first field focus (once per form per session)
- Track partial field values in memory (not sent anywhere — privacy)
- On `beforeunload` or 30s of inactivity after partial fill: show inline rescue prompt ("Want us to call you instead? Just name + phone.") with pre-filled name if entered.
- PostHog `form_abandoned` event with `fields_filled_count`.

**Tie to Phase 2**: `form_started` is a `hot`-tier signal.

**Verification**
- Focus name field, type 3 chars, wait 30s → rescue prompt appears
- Submit rescue mini-form → lead in AccuLynx tagged `form-abandonment-rescue`
- PostHog funnel: `form_started` → `form_abandoned` → `rescue_submitted`

---

## Decisions Locked (from clarifying questions)

- **Return-visitor threshold (Phase 5)**: **Broad** — any ONE of 2+ service pages, tel: click, form field focus, 3+ min on service/area page, or visit to `/offers`/`/financing` earns `hot` tier on return.
- **Storm API (Phase 6)**: **NOAA SWDI free** tier. No spend. Upgrade later only if measurable lift.
- **Capacity V1 (Phase 7)**: **PostHog-derived** slot count. Query real `form_submitted` counts for current ISO week with floor of 3 and ceiling display of "filling up" ≥10.
- **Discount cap**: **$500 everywhere**. No tiered amounts, no free-upgrade substitutes. Single, consistent $500 Off message wherever the promo is authorized.

### Deferred / Skipped (with reasoning)

- **Job-size–aware offer tiers** — Rejected. All promo surfaces stay at $500 off. Simpler, consistent brand message, no margin approval needed.
- **GAF Golden Pledge as primary angle over $500** — Rejected. $500 is more universally compelling.
- **Local social proof in popups (new component)** — Not needed. Existing `SocialProofToast` ([src/components/cro/SocialProofToast.tsx](src/components/cro/SocialProofToast.tsx)) already owns the bottom-left slot. **Optimization instead**: tie the toast's city selection to visitor's Vercel-header city (Phase 6 dependency) so "Sarah in Christiansburg" shows to Christiansburg visitors, not Roanoke ones. Cheap upgrade once Phase 6 ships.

---

## Critical Files Touched (summary)

| File | Phase |
|---|---|
| `src/components/cro/ExitIntentPopup.tsx` | 1, 2, 6 |
| `src/components/cro/EngagementPopup.tsx` | 1, 2 |
| `src/components/cro/MobileRetentionPopup.tsx` | 1 |
| `src/components/cro/PromoBanner.astro` | 1 (delete) |
| `src/components/cro/SocialProofToast.tsx` | 6 (optimize) |
| `src/components/cro/PhoneClickRescuePopup.tsx` | 3 (new) |
| `src/components/common/SmartCTA.{astro,tsx}` | 4 (new) |
| `src/lib/intent-tier.ts` | 2 (new) |
| `src/lib/track-events.ts` | 2 (new) |
| `src/lib/visitor-history.ts` | 5 (new) |
| `src/lib/business-hours.ts` | reused (4) |
| `src/pages/api/storm-check.ts` | 6 (new) |
| `src/pages/api/capacity.ts` | 7 (new) |
| `src/components/forms/LeadCaptureForm*.tsx` | 8 |
| `src/layouts/Layout.astro` | 1, 3 |
| `src/components/home/HeroErie.astro`, `StickyMobileCTA.astro`, `Footer.astro` | 4 |

## Reused Infrastructure

- **PostHog** ([src/components/analytics/PostHog.astro](src/components/analytics/PostHog.astro)): already initialized with feature flags + autocapture + session recording. Use `getFeatureFlag` + `posthog.capture` throughout.
- **business-hours.ts** ([src/lib/business-hours.ts](src/lib/business-hours.ts)): `getBusinessHoursInfo()` — reuse in Phase 3 + 4.
- **submit-form** ([src/pages/api/submit-form.ts](src/pages/api/submit-form.ts)): all new popups post here; existing spam + AccuLynx path handles new sources.
- **AnnouncementBar rotation pattern** ([src/components/layout/AnnouncementBar.astro:43-69](src/components/layout/AnnouncementBar.astro)): use this pattern for dynamic message injection in Phase 6.

---

## Rollout Order Recommendation

1. **Phase 1 now** (baseline — 45 min)
2. **Phase 2 + 3 + 4 this week** (intent tier + phone rescue + business-hours CTAs — all read existing infra, ~4 hours total)
3. **Phase 5 next week** (return-visitor history needs careful localStorage design)
4. **Phase 6 after that** (weather — external API + infra work, 1 day)
5. **Phase 7 + 8** after all above ship and have PostHog data to measure lift

---

## Remaining Open Item

- **SocialProofToast optimization (post–Phase 6)**: intended to tie toast city selection to visitor's Vercel-detected city. Confirm during Phase 6 execution when city-detection is live — not blocking.
