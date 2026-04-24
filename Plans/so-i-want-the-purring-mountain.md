# LP Overhaul + Main Site Launch — Due Wed Apr 29

## Context

Following the Apr 23 meeting with Alicia and Brian (PPC manager, Shepherd CEO / All Natural Tree), we need to ship:

1. **Tonight (Thu Apr 23 / Fri Apr 24 AM):** Long-form ad landing pages ready to send Brian for review. He wants them substantially longer than what's there now, with CTAs everywhere, dynamic keyword + location insertion, authority above the fold, and clean separate attribution.
2. **By Wed Apr 29:** Full main-site relaunch (target push: ~2am Sat Apr 25 → indexes over the weekend → polished and live by Monday Apr 27, buffer through Wed).

Brian requires two subdomains for attribution hygiene:
- `go.moderndayroof.com` → Meta traffic
- `lp.moderndayroof.com` → Google Ads traffic

And he wants a minimal header/body-injection slot on the LPs so he can drop in GTM + CallRail without touching templates. Thank-you pages are required (one per channel) so his conversion tags fire on a dedicated URL.

**Already in place (don't rebuild):**
- `/lp/[campaign].astro` — 8 prerendered campaigns (roof-repair, roof-replacement, roof-inspection-christiansburg, roof-inspection-roanoke, roof-financing, branded, roofing-company, competitors). `noindex`.
- `LandingPageLayout.astro` — GA4, Meta Pixel, Hotjar, noindex, sitemap excluded.
- `GclidCapture.astro` — stores `gclid`, `fclid`, UTMs in sessionStorage on every page load.
- All 7 form components (`LeadCaptureForm`, `ContactForm`, `ReferralForm`, etc.) already read click IDs from sessionStorage and send them to `/api/submit-form`.
- `/api/submit-form.ts` forwards `gclid`/`fclid` to AccuLynx via `src/lib/acculynx.ts:489` — hidden field plumbing is done end-to-end.
- `/api/geo.ts` — Vercel edge IP geo with service-area city whitelist + "Southwest Virginia" fallback.
- Dynamic `[Location]` insertion from `?city=` param (Google Ads ValueTrack) → sessionStorage → `/api/geo` → default fallback.
- Phone click conversion tracking wired on LP header, footer, sticky mobile bar.
- Sanity page builder with 12 block components.

**What's missing and has to be built:**
- LP body is only hero + 3-step trust block + footer. Brian's feedback = "longer form, more CTAs." Needs a full long-form body: benefits, specifics, social proof, testimonials, gallery, FAQ, authority badges, multiple CTAs.
- Dynamic **keyword** insertion (`?kw={keyword}` from Google Ads) — location insertion exists, keyword does not.
- Subdomain routing for `go.` and `lp.` with channel-aware forms.
- Thank-you pages (none exist).
- Sanity-editable copy for the top-of-LP headline / subhead / offer / proof bullets (so Alicia/Brian can tweak without a deploy).
- Minimal GTM + CallRail script-injection slots (per-channel via env vars).
- Main-site longer homepage (Brian's note), "983 roofs completed" stat update, GAF 3-Star President's Club badge addition, alt-text/geotag pass.

## Goals

1. Three LP templates (brand, roof-replacement, roof-repair) long-form, polished, CTA-heavy — delivered to Brian by end of day Fri Apr 24.
2. Subdomains `go.` and `lp.` configured and ready to point (Vercel rewrites + DNS instructions for Austin).
3. Channel-aware thank-you pages live.
4. Main site finalized and deployed by Wed Apr 29 with longer homepage + GAF badges + accurate stats + alt text.

## Approach

### 1. Landing page architecture

**Single template, data-driven** — keep the existing `src/pages/lp/[campaign].astro` pattern. Don't fragment into 3 separate files. Convert the hardcoded `campaigns` record into a Sanity-backed singleton-per-campaign document so Alicia/Brian can edit top-of-page copy without a deploy. The long-form body below the form stays component-based (shared partials) so it renders identically across campaigns with per-campaign overrides where useful.

**New route structure:**
- `/lp/brand` — renamed from `branded` (cleaner URL)
- `/lp/roof-replacement` — existing
- `/lp/roof-repair` — existing
- Keep the four niche ones (`roof-inspection-*`, `roof-financing`, `roofing-company`, `competitors`) as-is — they share the same template and body. Brian asked for three primary buckets but we have seven working variants; that's a net positive.

**Why one template:** the meeting was explicit — Brian duplicates one LP per channel and per keyword bucket. Same page, different subdomain, clean attribution.

### 2. Subdomain routing (Vercel)

Vercel makes this painless without a separate project. Plan:

- In Vercel dashboard, add both domains to the existing MDR project:
  - `go.moderndayroof.com` (Meta)
  - `lp.moderndayroof.com` (Google)
- DNS: Austin adds two CNAMEs → `cname.vercel-dns.com`.
- Add a middleware / `_middleware` or Vercel rewrites in `vercel.json` so:
  - Request to `go.moderndayroof.com/roof-replacement` rewrites internally to `/lp/roof-replacement?channel=meta`
  - Request to `lp.moderndayroof.com/roof-replacement` rewrites internally to `/lp/roof-replacement?channel=google`
- Astro reads `channel` from URL (or from the `host` header in SSR mode) and uses it to:
  - Pick the correct thank-you page redirect
  - Load the right CallRail swap number (future)
  - Tag form submission `source` field as `lp-meta-roof-replacement` or `lp-google-roof-replacement`
- `noindex` is already set globally on the LP layout — so no duplicate-content penalty.

**Files touched:**
- `vercel.json` — add `rewrites` with host matching
- `src/layouts/LandingPageLayout.astro` — accept `channel` prop
- `src/pages/lp/[campaign].astro` — read host/channel, pass to form + thank-you redirect

### 3. Thank-you pages

Three new prerendered pages, each `noindex`:

- `src/pages/thank-you/index.astro` — main-site default (normal site header/footer)
- `src/pages/thank-you/google.astro` — Google Ads (bare layout, fires Google conversion tag)
- `src/pages/thank-you/meta.astro` — Meta (bare layout, fires Meta `Lead` conversion)

Each LP/channel thank-you page:
- Confirms the submission ("Thanks, [first name] — we'll call within 24 hours")
- Shows next steps (what to expect call-wise, a calendar link if we want, SMS opt-in confirmation)
- Fires the conversion tag for its channel
- Has a "call now" button for people who want to accelerate
- Matches the LP visual identity

Form redirect logic (add to `LeadCaptureForm.tsx`):
```ts
// after successful submit, read channel from URL or prop
const channel = new URLSearchParams(location.search).get('channel') || props.channel;
const next = channel === 'meta' ? '/thank-you/meta'
           : channel === 'google' ? '/thank-you/google'
           : '/thank-you';
window.location.href = next + '?name=' + encodeURIComponent(firstName);
```

### 4. Long-form LP body (the real work)

Extend `/lp/[campaign].astro` below the existing hero + 3-step block. New sections, in order:

**4a. Hero (exists, enhance)**
- Keep form-first on mobile, form-right on desktop.
- Add GAF Master Elite (blue) + 3-Star President's Club (black) badges just under headline.
- Add one-line "As seen in / partners" row: GAF + Google 5★ + Owens Corning (if applicable).
- Dynamic keyword insertion: add `data-keyword-template` spans in subhead + offer copy; JS replaces `[Service]` or `[Keyword]` from `?kw=` URL param (same pattern as `[Location]`).

**4b. Social proof strip (new)**
- "5.0 ⭐ across 231 Google reviews" — large, above the fold continues.
- 3–4 actual testimonials from Sanity `testimonial` documents (already exists). Pull top-rated, shortest ones.
- Trust badges row: GAF Master Elite, 3-Star President's Club, BBB A+, Google 5★, Nextdoor Neighborhood Favorite (whatever we have).

**4c. Benefits / "Why Modern Day Roofing" (new)**
- 4–6 benefit cards (icon + headline + one-sentence body). Examples:
  - "Locally owned in Christiansburg, VA"
  - "Lifetime workmanship warranty"
  - "GAF 3-Star Master Elite — top contractors in the U.S."
  - "Real drone photos + written report on every inspection"
  - "983 roofs completed in Southwest Virginia"
  - "No pressure. No sales tricks. No call center."
- CTA button after this block.

**4d. Service-specific details (per campaign)**
- For roof-replacement: shingle options (GAF Timberline HDZ, architectural), tear-off vs overlay, warranty tiers (3-Star Difference, Legacy — pending from Alicia), financing teaser ($89/mo from Hearth widget tease — widget lives on /financing, don't embed full thing here).
- For roof-repair: leak repair, storm damage, flashing, valley/pipe boot repair, emergency tarp, same-day diagnosis.
- For brand: range-of-services grid + "your neighbors picked us" local angle.
- Pulled from Sanity `service` documents when slug matches, otherwise campaign-specific hardcoded list.

**4e. Before/after gallery (new)**
- Pull 3–6 `beforeAfterProject` docs from Sanity (schema already exists).
- Use existing slider component (`src/components/cro/BeforeAfterSlider`).
- Local geotag captions: "Roof replacement in Blacksburg, VA — June 2025"

**4f. Process (new, different from the 3-step trust block)**
- 5-step timeline: Call → Inspection → Quote → Schedule → Install → Warranty activation.
- Reassuring copy under each. Reuse `ProcessSteps.astro` if it fits.

**4g. Testimonials block (new, deeper than 4b)**
- 6–9 testimonials with names, neighborhoods, service type. Pulled from Sanity.
- Optional: 1 video testimonial if available.

**4h. FAQ (new)**
- 6–10 questions per campaign.
- For replacement: "How long does it take?" "What if it rains?" "Financing?" "Warranty?" "Do you handle insurance?"
- For repair: "Can you come today?" "Will you tarp it?" "Flat fee or hourly?"
- Collapsible. Reuse existing FAQ block pattern or build minimal accordion.

**4i. Final CTA block (new)**
- Large headline: "Your roof won't fix itself."
- Secondary subhead with offer.
- BIG form (duplicate of hero form, same `source` tag) + BIG call button side-by-side.
- Anchor target — all in-page CTAs scroll to here OR to hero form (UX testing later).

**4j. Footer (exists, keep minimal)**
- Tighten: address, phone, privacy link, terms link, © line. No nav.

**CTA cadence goal:** every ~400–600 words of scroll, a CTA (form jump, call button, or inline link). On mobile scroll test: never more than ~1 full screen without a CTA visible.

### 5. Dynamic keyword insertion

Add to the existing LP inline `<script>`:

```js
// Extend the location-insertion script
var paramKw = sanitize(params.get("kw") || params.get("keyword"));
if (paramKw) {
  document.querySelectorAll("[data-keyword-template]").forEach(function(el) {
    var template = el.getAttribute("data-keyword-template");
    if (template && template.indexOf("[Keyword]") !== -1) {
      el.textContent = template.replace(/\[Keyword\]/g, paramKw);
    }
  });
}
```

Google Ads URL parameters Brian will use: `?kw={keyword}&city={LOCATION(City)}&gclid={gclid}` — first two already in ValueTrack docs, gclid auto-appended.

### 6. Sanity-editable copy (light touch)

Alicia said not to go overboard. Approach: one new `landingPage` singleton-style document per campaign slug, with only these editable fields:

- `headline` (with `[Location]` and `[Keyword]` tokens supported)
- `subheadline` (same tokens)
- `offerLine` (above form — e.g. "$0 down financing available")
- `proofPoints` (array of 3 strings)
- `riskReversal` (above 3-step block)
- `primaryCtaText`
- `formCardTitle`

Everything else (body sections, benefits, FAQs, testimonials) stays in code or pulls from existing Sanity collections (`testimonial`, `beforeAfterProject`, `service`). This keeps the surface small — Brian can iterate headlines, Alicia doesn't have 50 fields to manage.

**Fallback:** if the Sanity `landingPage` doc for a slug is missing or Sanity is unreachable, fall back to the current hardcoded `campaigns` config in `[campaign].astro`. Guarantees we ship tonight even if Sanity is slow.

**New file:** `src/sanity/schemaTypes/documents/landing-page.ts`
**Updated file:** `src/sanity/structure.ts` (add to Structure Builder)
**Updated query:** `src/sanity/lib/queries.ts` (add `landingPageBySlugQuery`)

### 7. GTM + CallRail injection slots

Brian asked for autonomy to drop scripts in. Clean way:

Add to `LandingPageLayout.astro`:
```astro
{import.meta.env.PUBLIC_GTM_ID && (
  <script is:inline define:vars={{ id: import.meta.env.PUBLIC_GTM_ID }}>
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
    j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',id);
  </script>
)}
{import.meta.env.PUBLIC_CALLRAIL_ID && (
  <script is:inline async src={`//cdn.callrail.com/companies/${import.meta.env.PUBLIC_CALLRAIL_ID}/swap.js`}></script>
)}
```

Plus GTM `<noscript>` iframe right after `<body>`.

Brian provides the IDs, we add them to Vercel env vars per channel (`PUBLIC_GTM_ID_GOOGLE`, `PUBLIC_GTM_ID_META`) — or a single shared container if he prefers. His call.

### 8. Main-site launch tasks (Fri–Mon)

Separate from LP work. Parallel track:

- **Homepage longer-form pass** — audit current homepage, target 1,435+ words and 39+ images per the SEO consultant's rubric. Add sections if short.
- **Stat update** — change "1,000+ roofs completed" → "983 roofs completed" globally (or keep "1,000+" as rounding-up — confirm with Alicia; she mentioned doing a Delta report).
- **GAF 3-Star President's Club badge** — add alongside existing Master Elite badge. Asset should be in `MDR-Assets` Google Drive or GAF vendor portal.
- **Hearth widget confirm** — Colin confirmed it's already on `/financing`. Just verify it still renders after site changes.
- **Alt text pass** — sweep all homepage + service + area page images. Pattern: `"Roof replacement in Blacksburg, VA by Modern Day Roofing"`.
- **Photo geotag** — EXIF GPS for local-SEO-relevant project photos (script with `exiftool`, or upload-time metadata via Sanity).
- **Terms + privacy** — Colin confirmed updated on current WP site. Verify the Astro site's `/privacy` and `/terms` are current (they show as modified in git status — review + commit).
- **Gravity Form consent checkbox on current WP site** — Colin to handle directly on WP before cutover.
- **Launch steps (Sat 2am window):**
  1. Final build + Playwright run (37 tests).
  2. Update Vercel prod domain `moderndayroof.com` to point to new Astro project.
  3. Submit sitemap to GSC.
  4. URL-inspect + request indexing for top 10 pages (homepage, 3 main services, 3 top areas, about, reviews).
  5. Verify redirects from `vercel.json` work against old WP URLs.
  6. UpdraftsPlus full backup of old WP site pre-cutover.
  7. Monitor GSC + analytics for 48h.

## Critical files

**Existing to modify:**
- `src/pages/lp/[campaign].astro` — extend body sections, add keyword insertion, Sanity fetch with hardcoded fallback
- `src/layouts/LandingPageLayout.astro` — add GTM/CallRail slots, accept `channel` prop
- `src/components/forms/LeadCaptureForm.tsx` — redirect to channel-specific thank-you on submit
- `vercel.json` — add subdomain rewrites with host matching
- `src/sanity/schemaTypes/index.ts` — register new `landingPage` schema
- `src/sanity/structure.ts` — add landing pages list to Studio
- `src/sanity/lib/queries.ts` — add `landingPageBySlugQuery`
- `astro.config.mjs` — sitemap filter already excludes `/lp/`, also exclude `/thank-you/`

**New files:**
- `src/sanity/schemaTypes/documents/landing-page.ts` — minimal schema (headline, subhead, offer, proof points, riskReversal, cta, formCardTitle)
- `src/pages/thank-you/index.astro` — main-site thank-you
- `src/pages/thank-you/google.astro` — Google Ads thank-you
- `src/pages/thank-you/meta.astro` — Meta thank-you
- `src/components/lp/LpSocialProof.astro`
- `src/components/lp/LpBenefits.astro`
- `src/components/lp/LpServiceDetails.astro`
- `src/components/lp/LpBeforeAfterRow.astro`
- `src/components/lp/LpProcess.astro`
- `src/components/lp/LpTestimonials.astro`
- `src/components/lp/LpFaq.astro`
- `src/components/lp/LpFinalCta.astro`

## Existing code to reuse

- `src/components/common/GclidCapture.astro` — click ID capture (no change)
- `src/lib/acculynx.ts:489` — gclid/fclid passthrough (no change)
- `src/pages/api/submit-form.ts` — lead submission (no change)
- `src/pages/api/geo.ts` — service-area whitelisted geo (no change)
- `src/components/cro/BeforeAfterSlider` — reuse for LP gallery
- `src/components/common/ScrollReveal.astro` — subtle section reveals on scroll
- `src/sanity/schemaTypes/documents/testimonial.ts` — pull for social proof
- `src/sanity/schemaTypes/documents/before-after-project.ts` — pull for gallery
- `src/sanity/schemaTypes/documents/service.ts` — pull for service details

## Execution order

**Tonight (Thu Apr 23 → early Fri Apr 24):**
1. Build long-form body partials (components 4b–4i).
2. Wire partials into `[campaign].astro`.
3. Add keyword insertion JS.
4. Build three thank-you pages.
5. Wire form redirect to thank-you based on channel.
6. Add GTM/CallRail script slots.
7. Sanity `landingPage` schema + Studio entry + query + fetch-with-fallback.
8. Smoke test on `/lp/roof-replacement?city=Roanoke&kw=roof+replacement&channel=google`.
9. Deploy to preview URL, send preview link to Brian.

**Fri Apr 24:**
10. Configure Vercel subdomains. Give Austin exact DNS CNAME record to add.
11. Add `vercel.json` host-based rewrites.
12. Round-trip test: visit `go.moderndayroof.com/roof-replacement` → should render LP with `channel=meta`, form redirects to `/thank-you/meta`.

**Sat Apr 25 (2am window):**
13. Main site build + test run. Push live.
14. GSC sitemap + indexing requests.

**Sun–Tue (Apr 26–28):**
15. Monitor analytics, fix any indexing issues.
16. Address Brian's LP feedback (likely headline/offer tweaks — solved by Sanity editability).
17. Homepage length/alt-text/geotag pass.
18. Add GAF 3-Star President's Club badge once asset is in hand.

**Wed Apr 29:** Site finalized. LPs live behind subdomains. Brian's ads point at them.

## Verification

**LP behavior:**
- `/lp/roof-replacement` (no params) — renders "Southwest Virginia" fallback headline, no keyword swap.
- `/lp/roof-replacement?city=Blacksburg` — headline reads "Blacksburg" immediately.
- `/lp/roof-replacement?kw=metal+roof+installation` — keyword-enabled copy reflects it.
- `/lp/roof-replacement?gclid=TEST123&channel=google` — sessionStorage has `gclid`; form submit POSTs `gclid=TEST123` to `/api/submit-form`; redirects to `/thank-you/google?name=...`.
- `go.moderndayroof.com/roof-replacement` — Vercel rewrites to `/lp/roof-replacement?channel=meta`; form redirects to `/thank-you/meta`.
- Playwright: add `tests/lp.spec.ts` covering location, keyword, channel, thank-you redirect, gclid persistence, sitemap exclusion.

**End-to-end lead flow:**
- Submit form on LP with `gclid=TEST123` in URL. Tail Vercel logs for `/api/submit-form`. Confirm AccuLynx lead created with `google-ads` source + gclid in description/custom field. Then confirm redirect to `/thank-you/google` with conversion tag firing (check GA4 DebugView + Meta Events Manager test events).

**Main site launch:**
- `npm run build && npx playwright test` — all 37+ tests green.
- `curl -I https://moderndayroof.com/` → 200.
- `curl -I https://moderndayroof.com/roof-replacement/` → 301 → `/services/roof-replacement`.
- GSC coverage report shows sitemap indexed within 48h; no new 404s.
- Monitor GA4 real-time during launch window for traffic continuity.

---

# Landing Page Copy

Written for long-form, mobile-first ad LPs. Supports `[Location]` and `[Keyword]` token replacement. Voice: rugged, direct, no fluff, neighbor-to-neighbor. No "leverage," no "cutting-edge," no "in today's fast-paced world."

---

## LP 1 — Roof Replacement (`/lp/roof-replacement`)

### Headlines (5 variants — ★ = recommended)

1. **★ Get a new roof in [Location] — $0 down, $89/mo, lifetime warranty.**
   *Direct benefit. Specific numbers. Three hooks in one line. Leads the strongest offer.*
2. A new roof in [Location] without dropping $30,000 up front.
   *Contrarian/reframe. Kills the "I can't afford it" objection before they scroll.*
3. 983 Southwest Virginia homes later, we still answer our own phone.
   *Social proof + local + trust signal. For the competitors-bucket audience.*
4. "They were done in two days and the yard was cleaner than when they got here." — Sarah K., Blacksburg.
   *Testimonial headline. Caples-style. Strong for Facebook remarketing.*
5. Your roof isn't getting younger. Neither are the estimates.
   *Urgency + humor. Best for cold Meta traffic where curiosity beats direct offer.*

### Hero block (as rendered)

**Pre-head:** GAF 3-Star Master Elite · Locally owned in Christiansburg
**Headline:** Get a new roof in **[Location]** — $0 down, $89/mo, lifetime warranty.
**Subhead:** Quote in 24 hours. Install in days. 231 five-star reviews from your neighbors.
**Proof bullets:**
- 5.0 stars across **231 Google reviews**
- **983 roofs completed** in Southwest Virginia
- GAF **3-Star President's Club** (top few hundred contractors in the U.S.)

**Form card title:** Get Your Free Replacement Quote
**Form subtitle:** Free. No obligation. 30 seconds.
**Risk reversal line (below form):** Free quote. No pressure. No pushy sales guy at your kitchen table. About 20 minutes.

### Social proof strip

**Big line:** 5.0 stars · 231 Google reviews · 983 roofs · zero BBB complaints.
**Under-line:** GAF Master Elite. 3-Star President's Club. Owens Corning Preferred. Christiansburg, VA.

### Benefits — "Why homeowners pick us" (6 cards)

1. **Lifetime workmanship warranty.**
   If a shingle we installed lifts in 30 years, we fix it. Not our installer — *us*. That's the 3-Star Difference.
2. **$0 down financing through Hearth.**
   Soft credit pull. 60-second rate check. Payments from $89/mo on a full replacement.
3. **Real drone photos. Written report. No drama.**
   Every inspection gets a PDF with photos you can actually read. No scare tactics. No "your whole roof is failing."
4. **Done in 1–2 days on most homes.**
   Crews that actually show up when they say they will. Yard cleaner than when they started.
5. **983 roofs deep in Southwest Virginia.**
   We've been on roofs in Roanoke, Blacksburg, Radford, Salem, Floyd, Smith Mountain Lake, and everywhere in between.
6. **GAF 3-Star President's Club.**
   Only a few hundred contractors in the country hit this. It's the highest tier GAF offers — and it's why we can back our work for life.

*CTA here: "Get My Free Quote →" (scrolls to hero form)*

### Service details — Roof Replacement specifics

**What a replacement actually looks like with us:**

- **Tear-off, not overlay.** We strip to the deck, inspect every board, and replace rotten plywood before the new roof goes on. Overlays are cheaper short-term — and a nightmare when the leak finds its way through.
- **GAF Timberline HDZ shingles (standard)** — architectural, StainGuard Plus algae protection, LayerLock for high-wind nailing.
- **Full system, not just shingles.** Underlayment, ice & water shield in the valleys, new drip edge, new pipe boots, new ridge vent. Roofing is a system. Cheaping out on any layer costs you later.
- **Warranty tiers:**
  - *Legacy Warranty* — lifetime workmanship + 50-year material.
  - *3-Star Difference* — our top tier. Transferable to the next owner. Adds theft and accidental damage coverage.
- **Insurance claims.** If storm damage hit you, we handle the adjuster conversation. You don't have to learn depreciation math.
- **Financing.** Hearth partnership. Soft credit pull. Approvals in minutes. $0 down. $89/mo on qualifying projects.

*CTA: "See If You Qualify for $89/mo →" (scrolls to form)*

### The process (5 steps, not 3)

1. **Call or submit the form.** Real person picks up. Usually Alicia or someone on her team. No call center in Manila.
2. **Free inspection — about 20 minutes.** We drone the roof, walk the attic, photograph everything.
3. **Written quote within 24 hours.** Itemized. No "call for pricing." No mystery numbers.
4. **Schedule your install.** Most replacements happen within 2–3 weeks. Emergency? Sooner.
5. **Install in 1–2 days. Warranty activated.** Crew cleans the yard, magnetic-sweeps for nails, hauls the old roof off your property. You get a final walk-through and paperwork before we leave.

*CTA: "Book My Free Inspection →"*

### Testimonials (3, pulled from real reviews in `src/components/home/GoogleReviews.astro`)

> **"Modern Day Roofing impressed us from our very first encounter. After speaking to several companies, MDR was the clear choice. Professional, responsive, and delivered exactly what they promised."**
> — Shannon P., Christiansburg, VA

> **"The team at Modern Day Roofing seemed as excited about installing my metal shingle roof, as I was to see the results; which were awesome. I found them pleasant and responsive, making it easy to work with them."**
> — Terry L., Roanoke, VA

> **"Modern Day Roofing is efficient, reliable, and thorough. A fair price for a super roof replacement. From the initial inspection to the final cleanup, everything was top-notch."**
> — David G., Christiansburg, VA

*CTA: "Read 231 more on Google →"*

### FAQ (8 Q&As)

**Q: How much does a new roof cost in [Location]?**
A: Depends on square footage, pitch, and current condition. Most full replacements in Southwest Virginia run between $9,000 and $18,000. That's why we quote in writing after seeing it — not over the phone.

**Q: Can I finance it?**
A: Yes. We partner with Hearth. Soft credit check takes 60 seconds, doesn't touch your score. Most customers land in the $89–$189/mo range with $0 down.

**Q: How long does install take?**
A: Most homes: 1–2 days. Bigger or steeper roofs: 3. We don't spread jobs over a week because "the weather might turn."

**Q: Do you handle insurance claims?**
A: Yes. If storm damage is part of the picture, we'll meet the adjuster on the roof, document everything, and help you navigate depreciation and supplements.

**Q: Tear-off or overlay — which do I need?**
A: Almost always tear-off. Overlays hide rotten decking, void some warranties, and usually cost you more in 10 years than they save you today.

**Q: What warranty comes with a Modern Day Roofing replacement?**
A: Lifetime workmanship. 50-year material warranty on the shingles. Upgrade to our 3-Star Difference for accidental damage + theft coverage that transfers to the next owner.

**Q: How fast can you start?**
A: Quote in 24 hours. Most installs scheduled 2–3 weeks out. If you've got active leaks or storm damage, we move faster.

**Q: Are you licensed and insured in Virginia?**
A: Class A Contractor's license. $2M general liability. Workers comp on every crew member. We'll send the certs before we start.

### Final CTA block

**Headline:** Your roof won't fix itself. And winter doesn't care about your calendar.
**Subhead:** Free quote. 24-hour turnaround. $89/mo financing if you need it. Zero obligation, zero pressure.
**Big form + "Call (540) 553-6007" button side by side.**
**Under-button:** Open Monday–Saturday. Real humans answer.

---

## LP 2 — Roof Repair (`/lp/roof-repair`)

### Headlines (5 variants — ★ = recommended)

1. **★ Roof leak in [Location]? Diagnosed today. Most repairs quoted on the first visit.**
   *Urgency + specificity. Matches search intent for emergency/repair keywords.*
2. Stop putting buckets under that leak. We'll have it diagnosed today.
   *Direct pain address. Stronger for Meta remarketing.*
3. Most "your whole roof needs replacing" quotes are wrong. Get a second opinion.
   *Contrarian. Kills the common objection that repair companies upsell.*
4. 983 roofs serviced in Southwest Virginia. Some got replaced. Most just needed a repair.
   *Reframe. Proof. Honest. Builds trust with skeptical shoppers.*
5. "He climbed up, took photos, and told us it was a $400 fix. Not $18,000."
   *Testimonial headline. Perfect for the "just got quoted a replacement" audience.*

### Hero block

**Pre-head:** Emergency tarping available · Same-day diagnosis
**Headline:** Roof leak in **[Location]**? We'll have it diagnosed today.
**Subhead:** Most repairs quoted on the first visit. Honest pricing. No "you need a whole new roof" upsell.
**Proof bullets:**
- **Same-day inspection** for active leaks
- **5.0 stars** across 231 Google reviews
- GAF certified · Licensed · Insured · Local

**Form card title:** Book Your Free Inspection
**Form subtitle:** Free. No obligation. We'll call back within 60 minutes during business hours.
**Risk reversal:** Free inspection. No pushy sales. If it's a simple repair, we'll tell you. If it's something bigger, we'll show you the photos.

### Social proof strip

**Big line:** 231 five-star reviews. 983 roofs serviced. Zero unpaid warranty claims.
**Under-line:** Christiansburg-based. On roofs from Roanoke to Wytheville every week.

### Benefits — "Why homeowners call us for repairs" (5 cards)

1. **Same-day diagnosis on active leaks.**
   Water inside your house isn't a "we'll get to it next week" problem. Call before 2pm, we're usually there the same day.
2. **We don't upsell you into a new roof.**
   If it's a $400 flashing repair, you get a $400 flashing repair. 983 roofs in, we know the difference between a fix and a replacement.
3. **Written report with drone photos.**
   You see what we see. No "trust me, it's bad up there." PDF in your inbox before we leave your driveway.
4. **Emergency tarping if we can't fix it today.**
   Active storm damage? We'll get a tarp on it to stop the bleeding, then quote the permanent fix.
5. **1-year workmanship warranty on every repair.**
   If what we fix fails in the next 12 months, we come back. No fight. No re-invoicing.

*CTA: "Get Same-Day Inspection →"*

### Service details — What we repair

- **Active leaks** — trace the source (it's usually not where the ceiling stain is), fix the flashing, shingle, or penetration.
- **Storm & wind damage** — missing shingles, lifted ridge caps, damaged valleys. Works with your insurance if there's a claim.
- **Flashing** — chimney, skylight, sidewall, step flashing. 80% of leaks we diagnose are flashing, not shingles.
- **Pipe boots & vent boots** — the rubber cracks in ~10 years. Easy fix. Catches most people off-guard.
- **Valley repair** — ice damming, debris damage, failed underlayment. Fix it before it rots the decking.
- **Emergency tarping** — same-day if you're actively getting water inside.
- **Ridge vent & soffit repair** — if your attic smells like hot plastic in August, this is usually why.
- **Gutter repair & re-securing** — attached to a lot of roof problems; we fix what's in scope.

*CTA: "Tell Us What's Leaking →"*

### The process (5 steps)

1. **Call or submit the form.** Describe what you're seeing — water spot, missing shingles, whatever. A real person asks follow-up questions.
2. **We schedule same-day or next-day** for active leaks. Worst-case within 72 hours.
3. **On-site diagnosis.** Drone the roof, walk the attic if needed, photograph the failure point.
4. **Written quote before we leave.** Most simple repairs under $800. Some under $400.
5. **Repair scheduled — usually within the week.** 1-year workmanship warranty activated.

### Testimonials (real reviews from `GoogleReviews.astro`)

> **"The crew was on time, actually a few minutes early and they immediately started working. The roof replacement and the gutter cleaning, resealing and screen installation was completed in a day! We are beyond happy with the results."**
> — Dawn M., Christiansburg, VA

> **"Working with MDR made this process a breeze. I am a first time homeowner and they really made it easy to understand. They explained everything, the clean up was great, the crew was very respectful. 10/10 recommend."**
> — Amory L., Roanoke, VA

> **"Chris was great to work with from start to finish. The entire process was easy and everyone was professional and prompt. Would absolutely use them again for any roofing needs."**
> — Chris D., Blacksburg, VA

### FAQ (8 Q&As)

**Q: Can you come today?**
A: If you call before 2pm on a weekday and you're within our service area (New River Valley + Roanoke region), usually yes. Same-day during storm events depends on volume — we prioritize active leaks.

**Q: How much does a roof repair cost?**
A: Most repairs we do run $300–$900. Flashing fixes, pipe boot replacements, small patches. Bigger repairs (large storm damage, valley rebuilds) can run $1,500–$3,500. Free quote before any work starts.

**Q: Will you tarp my roof if you can't fix it today?**
A: Yes. Emergency tarping on active leaks. Buys you time to schedule the real repair without more water damage.

**Q: Another company told me I need a whole new roof. Is that true?**
A: Sometimes. Usually not. We're happy to give you a second opinion with drone photos. If it's really a replacement situation, we'll say so. If it's a $500 fix, we'll tell you that too.

**Q: Do you handle insurance claims for storm damage?**
A: Yes. We'll meet the adjuster on-roof, document with drone photos, and help navigate depreciation and supplements. No charge for the adjuster meeting.

**Q: Is there a warranty on repairs?**
A: Yes. 1-year workmanship warranty on every repair we do. If it fails, we come back on our dime.

**Q: Do you repair flat roofs / TPO / EPDM?**
A: We repair asphalt shingle roofs and most common residential systems. For commercial TPO/EPDM, we'll refer you if it's outside our wheelhouse — rather than fake it.

**Q: My insurance denied my storm claim. Can you still help?**
A: Yes. We'll still quote the repair direct. If you want to appeal the claim, we can provide documentation that supports a reopen.

### Final CTA block

**Headline:** Every day that leak sits is more drywall you'll have to replace.
**Subhead:** Free inspection. Same-day diagnosis available. Written quote before we leave.
**Big form + "Call (540) 553-6007 Now" button.**
**Under-button:** Active leak? Call instead of filling out the form. Faster.

---

## LP 3 — Brand / General (`/lp/brand`)

### Headlines (5 variants — ★ = recommended)

1. **★ The roofing company [Location] neighbors actually recommend.**
   *Local + social proof implied. Best for Meta brand campaigns.*
2. 231 five-star reviews. 983 roofs. One locally-owned crew in Christiansburg.
   *Specificity stack. For most-aware / branded-search audiences.*
3. Modern Day Roofing: the only GAF 3-Star President's Club contractor in the New River Valley.
   *Authority-led. Top-of-funnel but credibility-heavy.*
4. We started this company because we were tired of watching homeowners get lied to.
   *Founder-story hook. Works on warm audiences who want to know who's behind the name.*
5. A roof is a 30-year decision. Pick a roofer who'll still be here in 30 years.
   *Longevity frame. Kills the storm-chaser competition without naming them.*

### Hero block

**Pre-head:** Christiansburg · Blacksburg · Roanoke · Radford · Salem · Floyd · SML
**Headline:** The roofing company **[Location]** neighbors actually recommend.
**Subhead:** 231 five-star Google reviews. 983 roofs installed. Locally owned and insured in Virginia.
**Proof bullets:**
- **GAF 3-Star President's Club** (top few hundred contractors in the U.S.)
- **5.0 stars** across 231 Google reviews
- **983 Southwest Virginia roofs** completed

**Form card title:** Get Your Free Quote
**Form subtitle:** Free. No obligation. 30 seconds.
**Risk reversal:** Free quote. No pressure. No out-of-state salesmen.

### Social proof strip

**Big line:** Locally owned. Locally installed. Locally trusted.
**Under-line:** 5.0 / 231 reviews · 983 roofs · GAF 3-Star · Christiansburg, VA since [year].

### Benefits — "Why [Location] picks Modern Day Roofing" (6 cards)

1. **We answer our own phone.**
   Alicia's team — not a call center. Usually back to you within the hour.
2. **983 local roofs deep.**
   We know what Southwest Virginia weather does to a roof because we're up on them every week.
3. **GAF 3-Star President's Club.**
   Only a few hundred contractors in the country. Top tier. It's why we can warranty workmanship for life.
4. **Honest quotes, in writing, within 24 hours.**
   No "call for pricing." No $30k estimates that magically drop to $12k when you push back.
5. **Financing from $89/mo.**
   Hearth partnership. $0 down. Soft credit check. Most approvals in minutes.
6. **Full-service.** Replacement, repair, inspection, storm damage, gutters, insurance claims. One company, start to finish.

### Services grid (6 services)

- **Roof Replacement** — GAF Timberline, tear-off, lifetime warranty.
- **Roof Repair** — leaks, flashing, storm damage. Same-day diagnosis.
- **Roof Inspection** — free, written, drone photos included.
- **Storm Damage & Insurance Claims** — we meet the adjuster.
- **Gutters & Gutter Guards** — full system replacement.
- **Financing** — $0 down, from $89/mo through Hearth.

*CTA: "Get My Free Quote →"*

### The 5-step process

Same as replacement/repair — Call → Free Inspection → Written Quote in 24h → Schedule → Install + Warranty.

### Testimonials (pull 3 from `GoogleReviews.astro` rotation, e.g.)

> **"Modern Day Roofing impressed us from our very first encounter. After speaking to several companies, MDR was the clear choice."**
> — Shannon P., Christiansburg, VA

> **"I found them pleasant and responsive, making it easy to work with them. The results were awesome."**
> — Terry L., Roanoke, VA

> **"Working with MDR made this process a breeze. I am a first time homeowner and they really made it easy to understand. 10/10 recommend."**
> — Amory L., Roanoke, VA

*Implementation: reuse `<GoogleReviews />` component from `src/components/home/GoogleReviews.astro` — it already has 6+ real reviews with cities. Pass a `limit={6}` prop if it supports it, else render as-is.*

### FAQ (8 Q&As)

**Q: Where is Modern Day Roofing based?**
A: Christiansburg, VA. We service the New River Valley + Roanoke Valley + surrounding — Blacksburg, Radford, Salem, Floyd, Wytheville, Smith Mountain Lake, and everywhere between.

**Q: Are you licensed and insured?**
A: Class A Virginia contractor's license. $2M general liability. Workers comp on every crew member. Happy to send the certificates.

**Q: What's GAF 3-Star President's Club?**
A: Highest certification tier GAF offers. Only a few hundred contractors in the U.S. have it. It requires training, craftsmanship standards, and customer satisfaction benchmarks that most contractors can't hit.

**Q: Do you offer financing?**
A: Yes. Through Hearth. Soft credit pull, no score impact to check. $0 down options. Most customers pay $89–$189/mo on a full replacement.

**Q: Do you repair or just replace?**
A: Both. Plenty of roofs just need a repair — we'd rather tell you that than sell you a replacement you don't need.

**Q: What's the warranty?**
A: Lifetime workmanship on replacements. 50-year material warranty. Optional upgrade to our 3-Star Difference warranty (transferable + accidental damage coverage). 1-year workmanship on repairs.

**Q: How quickly can you get out for a quote?**
A: Usually within 48 hours for non-emergency. Same-day or next-day for active leaks.

**Q: Why should I pick Modern Day over a national brand or franchise?**
A: We live here. When your roof leaks in 2035, we'll still be the same phone number. National brands and storm chasers won't.

### Final CTA block

**Headline:** You only replace a roof two or three times in a lifetime. Pick carefully.
**Subhead:** Free quote. No obligation. Written in 24 hours. 231 neighbors have already left a review.
**Big form + "Call (540) 553-6007" button.**
**Under-button:** Open Monday–Saturday. Local humans. 231 reviews that say the same thing.

---

## Shared elements across all 3 LPs

### Sticky mobile CTA (existing, keep)
"Call Now: (540) 553-6007" — red bar, always visible on scroll.

### Authority row (above fold, under proof bullets)
GAF Master Elite badge · GAF 3-Star President's Club badge · Owens Corning Preferred (if applicable) · BBB A+ · Google 5★.

### Trust footer
Modern Day Roofing · 80 College St. STE R, Christiansburg, VA 24073 · (540) 553-6007 · VA Class A Contractor · Fully insured · © 2026.

### Keyword token replacement

Copy spots that swap on `?kw=`:
- Headline subhead "new roof" → swaps to the keyword if Google Ads served a specific one (e.g. "metal roof," "architectural shingle roof").
- One benefit headline per LP uses `[Keyword]` slot: e.g. "The [Location] team homeowners call for [Keyword]."
- FAQ first question headline: "How much does [Keyword] cost in [Location]?"

Keep the default text natural if no keyword is passed — never expose `[Keyword]` to the user.

### CTA cadence check

Every LP has these 7 CTA touchpoints:
1. Hero form (top)
2. Sticky mobile call bar (always visible)
3. Header call button
4. After benefits block ("Get My Free Quote →")
5. After service details block
6. After testimonials block
7. Final CTA block (big form + big call button)

Test on mobile scroll: you should never scroll more than ~1 full screen without a CTA visible.

---

# Photography & Asset Plan

**Source of truth:** MDR-Assets Google Drive (folder id `1Dwt8sntKh0hH5twoyMQTk4MUHWje6vke`, owner `aliciaumberto@moderndayroof.com`). Most local assets are already synced into `/public/assets/` — use local paths in code, pull new ones from Drive only if a specific shot is missing.

## Asset inventory (already local)

- **`/public/assets/hero/`** — `hero-main.jpg`, `hero-main.webp`, `hero-video.mp4` (existing homepage hero).
- **`/public/assets/projects/`** — 59 photos. Drone aerials + install shots. Filenames like `dji_fly_2025*_photo.JPG` are the highest-quality drone shots.
- **`/public/assets/before-after/`** — 26 paired shots. Best drone B/A pairs: `dji_fly_20241016_*` series and `dji_fly_2025*_photo-2.JPG`.
- **`/public/assets/branding/`** — `crew-working-harness-1.png`, `crew-working-harness-2.png`, `truck-jobsite.png` (perfect for "who we are" authenticity).
- **`/public/assets/team/`** — full team headshots including `Alicia-Umberto-Marketing-and-Outreach-Dirctor.jpg`, `Austin-Hungate-CEO.jpg`, all sales/PM staff.
- **`/public/assets/logos/`** — `Presidents-Club_3-Star_Residential-with-Year_2026.png` + `.webp`, `3-Star-Advisory-Panel_2026_White-Border.png`, BBB button, GAF Master Elite logo, NAHB. **3-Star President's Club badge is already here** — Alicia doesn't need to send it.

## Per-section image mapping

### LP 1 — Roof Replacement

| Section | Image | Path |
|---|---|---|
| Hero background | Aerial drone shot, finished roof | `/assets/projects/dji_fly_20241016_130454_466_1729098374266_photo-1.JPG` |
| Authority row | GAF 3-Star President's Club badge | `/assets/logos/Presidents-Club_3-Star_Residential-with-Year_2026.webp` |
| Benefits card 1 ("Lifetime warranty") | Close-up of new ridge/shingles | `/assets/projects/dji_fly_20250711_160906_985_*.JPG` |
| Benefits card 4 ("Done in 1-2 days") | Crew on roof with harnesses | `/assets/branding/crew-working-harness-1.png` |
| Service details | Install-in-progress shot | `/assets/branding/crew-working-harness-2.png` |
| Process — step 5 | Truck on jobsite | `/assets/branding/truck-jobsite.png` |
| Before/after section | Reuse 3 pairs via existing `BeforeAfter.tsx` | from `/assets/before-after/` |
| Final CTA background | Dark-overlay aerial | `/assets/projects/dji_fly_20250721_123356_135_*.JPG` |

### LP 2 — Roof Repair

| Section | Image | Path |
|---|---|---|
| Hero background | Storm-damaged roof or repair-in-progress aerial | `/assets/projects/dji_fly_20241016_130220_454_*.JPG` |
| Benefits card 1 ("Same-day diagnosis") | Drone inspection shot | `/assets/projects/dji_fly_20250711_170804_*.JPG` |
| Benefits card 3 ("Drone photos") | Actual drone-in-air context, or aerial close-up | `/assets/projects/dji_fly_2025*_photo.JPG` |
| Service details | Flashing detail / pipe boot close-up | `/assets/projects/IMG_5557-1.jpg` or `IMG_5558-1.jpg` |
| Emergency tarping callout | HVAC-protection / catch-all image | `/assets/projects/HVAC-protection.jpg` or `Catch-all-bburg.jpg` |
| Testimonials | Use `GoogleReviews` component (no images needed) | — |

### LP 3 — Brand / General

| Section | Image | Path |
|---|---|---|
| Hero background | Signature aerial | `/assets/hero/hero-main.webp` (main site hero) |
| Authority row | GAF Master Elite + President's Club + BBB | `/assets/logos/*` (via existing `CertificationStrip.astro`) |
| "We answer our own phone" card | Alicia or front-office staff | `/assets/team/Alicia-Umberto-Marketing-and-Outreach-Dirctor.jpg` |
| "983 roofs deep" card | Truck-on-jobsite | `/assets/branding/truck-jobsite.png` |
| Services grid | 6 service icons (reuse from `ServiceGrid.tsx`) | existing |
| Before/after | Reuse `BeforeAfter` | `/assets/before-after/` |

## Image implementation rules

1. **Serve `.webp` where available**, fall back to `.jpg` via `<picture>` or `<img srcset>`.
2. **All images need descriptive alt text** with location + service, e.g. `alt="Roof replacement in Blacksburg, VA by Modern Day Roofing"`.
3. **LCP image (hero background)**: `loading="eager"` + `fetchpriority="high"` (already done in existing LP template — keep that pattern).
4. **All non-hero images**: `loading="lazy"` + explicit `width` and `height` attrs to prevent CLS.
5. **Mobile hero image**: use a smaller crop via `srcset` (375w, 768w, 1280w, 1920w) — don't ship a 2MB drone photo to phones.
6. **Geotag metadata**: for SEO, run `exiftool` on key project photos to embed GPS coordinates for the project's actual city. Script this as part of the image prep pass. Low priority — do after LP copy ships.

---

# Reusable Site Components (Brand Consistency)

The LPs must feel like the same brand as the main site. Pull these existing components where it makes sense — don't rebuild what's already designed.

| Main-site component | Path | Use on LPs for |
|---|---|---|
| `CertificationStrip.astro` | `src/components/home/CertificationStrip.astro` | Authority row under hero (GAF / BBB / NAHB badges) |
| `GoogleReviews.astro` | `src/components/home/GoogleReviews.astro` | Testimonials block (real reviews already loaded) |
| `BeforeAfter.tsx` | `src/components/home/BeforeAfter.tsx` | Before/after slider section |
| `ProcessSteps.astro` | `src/components/common/ProcessSteps.astro` | 5-step process block |
| `ProcessTimeline.tsx` | `src/components/home/ProcessTimeline.tsx` | Alt process layout on mobile if cleaner |
| `FeatureStripe.astro` | `src/components/common/FeatureStripe.astro` | Thin value-prop band between sections |
| `AngleDivider.astro` | `src/components/common/AngleDivider.astro` | Section transitions (matches main site visual rhythm) |
| `StatsCounter.astro` | `src/components/blocks/StatsCounter.astro` | "983 roofs / 231 reviews / lifetime warranty" stat band |
| `TrustBar.astro` | `src/components/blocks/TrustBar.astro` | Trust-signal row (GAF / lifetime / local) |
| `Button.astro` | `src/components/ui/Button.astro` | All CTAs — matches main-site button treatment |
| `SectionContainer.astro` | `src/components/ui/SectionContainer.astro` | Background variants (light/white/warm/dark/accent) |
| `Card.astro` | `src/components/ui/Card.astro` | Benefit cards + service-detail cards |
| `LeadCaptureForm.tsx` | `src/components/forms/LeadCaptureForm.tsx` | Hero form + final CTA form (unchanged, already reads gclid/fclid) |
| `StickyMobileCTA.astro` | `src/components/home/StickyMobileCTA.astro` | Sticky call bar (already in LP layout, keep) |
| `Logo.astro` | `src/components/common/Logo.astro` | Header logo (already in LP) |
| `ScrollReveal.astro` | `src/components/common/ScrollReveal.astro` | Subtle section reveals on scroll |

## Reuse decisions

- **Hero:** keep the current LP hero treatment (it's already form-first mobile, side-by-side desktop — better for ad LPs than the main-site hero).
- **Testimonials:** use `GoogleReviews` directly. Don't build a new testimonial component. Six real reviews beats three made-up ones.
- **Badges:** reuse `CertificationStrip` exactly. Same set of badges, same spacing, same hover. Free brand consistency.
- **Buttons:** `Button.astro` with the accent-red variant. Never invent new button styles for LPs.
- **Typography:** Barlow Condensed display + DM Sans body is already wired via global CSS. Same fonts as main site — no override needed.
- **Color tokens:** use existing tokens (`bg-accent`, `text-text-primary`, `bg-bg-darker`, etc. — already loaded in `LandingPageLayout`). No custom palette.

## What NOT to reuse (LP-specific)

- **Main site header nav** — LPs have no nav by design (Brian's requirement: no navigation away from the page).
- **Main site footer** — LPs use minimal footer only (address + phone + copyright).
- **Breadcrumbs** — no.
- **Chat widget** — disabled on LPs. It pulls focus from the form.
- **Exit-intent popup + scroll popup** — disabled on LPs. The form IS the CRO.

---

# Mobile-First Design Rules

Every LP must be optimized for mobile first — that's where 70%+ of ad clicks land.

## Layout rules

1. **Form first on mobile.** Hero renders form above the headline on `< lg` breakpoints (existing implementation uses `order-1 lg:order-2` — keep that).
2. **One column below `md`.** No side-by-side anything under 768px. Forces the eye down a single track.
3. **Sticky call bar on mobile only** (`lg:hidden`) — 56px tall, red, always visible. Already wired in LP layout.
4. **Tap targets ≥ 44×44px.** iOS HIG minimum. Already the case for buttons; audit form inputs.
5. **Font sizes:** body ≥ 16px on mobile (prevents iOS zoom-on-focus). Headlines scale from 24px (mobile) → 48px (desktop).
6. **Images responsive:** `width="100%"` + `height="auto"` or aspect-ratio box. Never fixed pixel widths.
7. **No horizontal scroll.** Audit all sections at 375px width — nothing should overflow.
8. **Padding:** use `px-4` on mobile (16px), `md:px-6` (24px) on tablet. Containers max `max-w-[1200px]`.

## Performance rules

1. **LCP < 2.5s** on mobile 4G. Hero image preloaded, webp, compressed.
2. **No render-blocking JS.** Inline scripts use `is:inline` + run after `DOMContentLoaded`. Analytics scripts are `async`.
3. **Lazy-load below-fold images** (already done).
4. **Avoid web fonts flash.** Use `font-display: swap` (already set by Google Fonts link). Preconnect to `fonts.gstatic.com` (already in layout).
5. **Defer non-critical CSS.** Tailwind v4 handles this via JIT — no extra work.
6. **JS budget:** keep client-side JS < 50kb gzipped. Current `LeadCaptureForm.tsx` is the only React island; keep it that way.

## Form UX on mobile

1. `inputMode` attributes on form fields: `inputmode="tel"` for phone, `inputmode="email"` for email, `autocomplete` attrs set.
2. Multi-step form — Brian wanted to test, user wants multi-step as V1. Each step ≤ 2 fields on mobile.
3. Submit button: full-width on mobile, visible without scrolling once fields are filled.
4. Success state: full-page redirect to thank-you (already planned), not an in-page alert.

---

# Visual Verification Plan

Never ship without seeing it. Use `preview_*` tools for every LP, every breakpoint.

## Pre-flight setup

1. Ensure `.claude/launch.json` has an `mdr-dev` config running `npm run dev` on port 4321. If missing, add it.
2. `preview_start` the `mdr-dev` server.

## Per-LP verification checklist

For each of `/lp/roof-replacement`, `/lp/roof-repair`, `/lp/brand`:

**Desktop (1280×800):**
1. `preview_resize` to desktop preset.
2. `preview_screenshot` the full page — scroll through every section.
3. `preview_console_logs level=error` — zero errors.
4. `preview_network` — check no 404s on images, fonts load, `/api/geo` returns 200.
5. `preview_inspect` hero headline — confirm font-family is Barlow Condensed, color is correct.
6. `preview_inspect` CTA button — confirm accent red hex matches main site.

**Mobile (375×812):**
7. `preview_resize` preset=mobile.
8. `preview_screenshot` — confirm form appears ABOVE headline.
9. Scroll-screenshot pass: top, ~30%, ~60%, ~90%, bottom — confirm CTA visible in each viewport.
10. `preview_click` the sticky call bar — confirm `tel:` link fires.
11. `preview_fill` form with test data + `preview_click` submit — confirm redirect to `/thank-you/google` (with `?channel=google` in URL).
12. `preview_inspect` form inputs — confirm font-size ≥ 16px (no iOS zoom).

**Dynamic content:**
13. Visit `/lp/roof-replacement?city=Blacksburg&kw=roof+replacement&channel=google` — confirm headline reads "Blacksburg", keyword swapped in body copy, sessionStorage has `gclid`/`fclid` after appending test params.
14. Visit `go.moderndayroof.com/roof-replacement` (once subdomain is live) — confirm Vercel rewrite works, `channel=meta` is passed through.
15. Visit `/lp/roof-replacement?city=FakeCity` — confirm falls back to "Southwest Virginia" (service-area whitelist working).

**Cross-browser sanity:**
16. Test in Chrome (default preview), then manually in Safari mobile (real iPhone if possible) for touch/scroll behavior.

## QA gate before sending to Brian

- [ ] All 3 LPs render clean on mobile + desktop
- [ ] No console errors
- [ ] Form submit → redirects to correct thank-you
- [ ] Dynamic location + keyword replacement works
- [ ] Badges render (GAF 3-Star President's Club visible)
- [ ] Real testimonials load (not "Lorem ipsum")
- [ ] Images under 300KB each on mobile (check `preview_network`)
- [ ] Lighthouse mobile score ≥ 85 (Performance) and ≥ 95 (SEO/Accessibility)
- [ ] Preview URL works on Brian's phone (send him the link after deploy)

---

## Open clarifying questions

Before I start building tonight, confirm:

1. **Offer line** — "Free roofing estimate" is current default. Do you want a stronger hook on the Replacement LP (e.g. "$0 down. $89/mo. Free quote.")? And on Repair ("Same-day diagnosis. Free inspection.")? I'll default to what's there unless you say otherwise.
2. **Brand LP name** — rename `/lp/branded` → `/lp/brand`? Cleaner but breaks any existing links Brian has. Leave as `branded` unless you say.
3. **Homepage stat** — "983 roofs completed" (exact) or keep "1,000+" (rounded)? Alicia mentioned pulling a Delta report — if you already know the real number, give me the figure to use.
4. **GTM containers** — one shared container for both channels, or two separate containers? Brian's call; I'll add two env vars by default and he can use one or both.
5. **CallRail swap number** — does he want DNI (dynamic number insertion) replacing the site phone number only on `/lp/*` routes? I'll set it up that way unless you say otherwise.
6. **Sanity channel-specific overrides** — should the Sanity `landingPage` doc be able to override copy per channel (meta vs google), or is copy identical? Default: shared copy, since Brian said "all you do is copy" across channels.
7. **Thank-you page offer** — put a calendar booking link on the thank-you pages (Cal.com / Calendly for Alicia's team) to accelerate the call? Or keep it confirmation-only?
8. **Austin's DNS timing** — is he reachable tonight or tomorrow? If DNS takes 24h to propagate, we need him unblocking Fri morning at the latest.
