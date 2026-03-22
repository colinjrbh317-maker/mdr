# MDR Website Overhaul: Generic → Professional Roofing Powerhouse

## Context

Modern Day Roofing's website has all 9 development phases complete (structure, CMS, pages, SEO, CRO) but looks **generic and template-y**. Three critical bugs prevent forms and hero from rendering. All images are placeholders. Social proof is weak ("10+ years", "100%", "50mi"). The client is switching to a new Sanity project they own (`2rj2jdb4`) and has provided all real assets via Google Drive.

**Goal:** Transform this into a conversion-optimized, professional roofing website that rivals Erie Home, Bone Dry Roofing, and top GAF Master Elite contractors — with real assets, compelling social proof, and working forms.

---

## Competitive Research Insights (Applied Throughout)

**What top roofing sites do that MDR doesn't yet:**

| Pattern | Erie Home / Top Sites | MDR Current | MDR Target |
|---------|----------------------|-------------|------------|
| Hero | Full-bleed video/image, "America's Most Trusted" headline, inline quote form | Empty (hydration broken), generic "We Protect Your Home" | Full-bleed real project photo, benefit-driven headline, inline form |
| Social Proof | "Top 1% GAF", "4.9 stars from 2,000+ reviews", "15,000+ families served" | "10+ years", "100%", "50mi" — weak/generic | "1,200+ Roofs Completed", "Top 2% GAF Master Elite", "4.9★ 150+ Reviews" |
| Trust Bar | GAF badge + BBB + specific review count + years with real number | Generic icons, placeholder badge image | Real GAF badge image, BBB A+ logo, Google review count pulled live |
| Forms | Sticky hero form, repeated in sidebar, pop-ups, footer | Broken (jsxDEV error) | Working forms: hero, sidebar, popups, mobile sticky |
| Before/After | Interactive sliders with real project photos, material captions | Empty slider, no images | Real before/after from Drive with project details |
| Mobile | Persistent bottom CTA bar (Call + Quote) | Broken (StickyMobileCTA uses broken form) | Working sticky CTA with click-to-call + working modal form |
| Color Feel | Navy + white + metallic = "premium trustworthy" | Burgundy + navy — good palette but underutilized | Enhance contrast, add more white space, premium photo treatment |
| Stats | Specific numbers: "1,500+ roofs", "25 years", "4.9★ 200+ reviews" | Round/vague: "500+", "10+", "100%", "50mi" | Real numbers from MDR's actual track record |

---

## Erie Home Homepage Section Order (Our Blueprint)

Analyzed from live site on 2026-03-22. MDR's homepage should follow this proven conversion flow, adapted for a regional contractor:

### Erie Home's Exact Section Order:
1. **Header** — Logo, nav, "See All Locations" + phone + "Get My Free Estimate" CTA button
2. **Hero** — Full-bleed project photo background, eyebrow "Industry-Best Residential Solutions", H1 "The Nation's Most Trusted Roofing and Basement Contractor", dual CTAs: "Get My Free Estimate" + "Why Erie Home?"
3. **Services Overview** — "How Erie Home Can Help" — 2 large cards (Roofing / Basement) with browse CTAs
4. **Product Feature** — Split layout: large product photo left + "Quality Products That Outlast" copy right with "Discover Our Products" CTA
5. **Financing** — "Flexible Financing Available" with copy + "Learn About Our Financing" CTA
6. **Google Reviews** — Dark background, "4.8 Nationwide Rating out of 40,000+ Reviews" header with Facebook/Google/BBB logos, then 3-card carousel of REAL Google reviews (name, city, stars, Google logo, full quote), "Read All Reviews" link
7. **Why Choose Us** — "Full-Service Residential Solutions" — 3 cards: Expert Installation, Backed by a Warranty, No Stress Ownership (icon + heading + paragraph each)
8. **Company Story** — Split layout: "The Nation's Leading Roofing Provider" copy + "400,000 customers' homes since 1976" stat + "Why Erie Home?" CTA + photo
9. **Certification Strip** — Horizontal row of badge logos: BBB, EPA Lead-Safe, NAHB, Made in America, QR Top 500
10. **Seasonal Promos Carousel** — 3 slides with seasonal/promotional offers, each with photo + CTA
11. **Project Gallery Carousel** — 4 project photos in auto-scrolling carousel
12. **Before/After** — "High-Quality Products, Expert Installation" + "View Before and After Gallery" CTA
13. **Featured Testimonial** — Large quote block with customer name/location + "Hear More From Our Satisfied Customers" CTA
14. **Footer** — Logo, description, phone, CTA, 4-column links, social icons, legal

### MDR Homepage Blueprint (Adapted from Erie Home):

```
1.  HEADER — Logo, nav, phone (540) 553-6007, "Get a Free Quote" CTA
2.  HERO — Full-bleed real project photo, "Virginia's Premier Roofing Contractor" headline,
    sub: "GAF Master Elite Certified | Christiansburg & Roanoke", inline form (desktop) / CTA (mobile)
3.  TRUST BAR — GAF Master Elite badge, BBB A+, "4.9★ 150+ Reviews" w/ Google logo, "Since [year]"
4.  SERVICES GRID — "Expert Roofing Solutions" — 6 service cards with real photos:
    Roof Replacement | Metal Roofing | Shingle Roofing | Storm Damage | Roof Repair | Gutters
5.  PRODUCT FEATURE — Split: project photo + "Quality That Lasts a Lifetime" + GAF system details
6.  GOOGLE REVIEWS — Dark BG, "4.9★ from 150+ Google Reviews" + real review cards (name, city, stars, quote)
    with Google logo on each card + "Read All Reviews" link to Google Business Profile
7.  STATS COUNTER — "1,200+ Roofs" | "15+ Years" | "Top 2% GAF" | "4.9★ Rating" (animated count-up)
8.  PROCESS STEPS — "Our Proven Process" — 4 steps: Inspection → Quote → Installation → Warranty
9.  BEFORE/AFTER — Interactive slider with real project photos + "View Full Gallery" CTA
10. FINANCING — "Flexible Financing Available" + "$0 Down" messaging + CTA
11. CERTIFICATION STRIP — GAF Master Elite, GAF Golden Pledge, BBB A+, Licensed & Insured, Locally Owned
12. CTA SECTION — Dark/accent BG, "Ready to Protect Your Home?" + dual CTAs (Schedule + Call)
13. FOOTER — Logo, both addresses, hours, phone, email, social icons, service/area/company links
```

**Key differences from current MDR homepage:**
- Google Reviews section is NEW (Erie's most powerful section)
- Trust bar moves UP (immediately after hero, not buried)
- Stats use real specific numbers, not generic rounds
- Certification strip is NEW (horizontal badge row)
- Services use real photos, not icons
- Before/After has real content
- Financing section gets prominent placement

---

## Skills & Tools for Execution

The following PAI skills will be used during execution:

| Skill | Phase | Purpose |
|-------|-------|---------|
| **Browser** | All | Visual verification after each change, screenshot comparison with Erie Home |
| **MasterUI** | Phase 5 | Professional UI design decisions, component polish, anti-generic design patterns |
| **frontend-design** | Phase 5 | Production-grade frontend with high design quality, avoid AI aesthetics |
| **ui-ux-pro-max** | Phase 5 | 50 styles, 21 palettes, font pairings — informed design decisions |
| **seo-audit** | Phase 8 | Technical SEO verification before launch |
| **homepage-audit** | Phase 8 | Full conversion audit of finished homepage |
| **Art** | Phase 3 | Image processing, optimization, OG image generation if needed |
| **simplify** | All | Code quality review after major changes |

---

## Phase 1: Critical Bug Fixes (P0 — Must Do First)
**Why:** Nothing else matters if forms don't work and the hero is empty.

### 1.1 Fix React Hydration Errors
**Problem:** `TypeError: jsxDEV is not a function` on LeadCaptureForm, and framer-motion fails to load for HeroBackground, ServiceGrid, BeforeAfter.

**Root Cause:** Likely React 19 + `@astrojs/react` JSX runtime mismatch in dev mode, or framer-motion version incompatibility with React 19.

**Fix:**
- Check `@astrojs/react` version compatibility with React 19
- May need to pin `@astrojs/react` or update it
- Test: `framer-motion@12.x` with React 19 — if incompatible, either downgrade React to 18 or upgrade framer-motion
- Verify all `client:load` / `client:visible` directives work after fix

**Files:**
- `package.json` — dependency versions
- `astro.config.mjs` — React integration config
- All React components in `src/components/home/`, `src/components/forms/`, `src/components/cro/`

**Verification:** Load localhost, all pages render forms, hero animates, no console hydration errors.

### 1.2 Fix Stats Counter Data
**Problem:** Shows "0+" on page load (animation might not trigger, or initial values wrong).

**Fix:**
- Update stats to use **real MDR numbers** (get from Alicia or use credible estimates):
  - "1,200+" Roofs Completed (or whatever their real number is)
  - "15+" Years Experience
  - "4.9★" Average Rating
  - "150+" 5-Star Reviews
- Ensure IntersectionObserver animation triggers properly
- If exact numbers unavailable, use conservative but specific numbers (NOT round "100%" or "50mi")

**Files:**
- `src/components/blocks/StatsCounter.astro` — hardcoded defaults
- `src/pages/index.astro` — if stats are passed as props

---

## Phase 2: Sanity Project Migration
**Why:** Client needs ownership of their CMS. Must happen before content population.

### 2.1 Switch Project Configuration
**Files to update (5 total):**
- `sanity.config.ts` line 11: `cy8sc3xd` → `2rj2jdb4`
- `sanity.cli.ts` line 5: `cy8sc3xd` → `2rj2jdb4`
- `astro.config.mjs` line 14: `cy8sc3xd` → `2rj2jdb4`
- `.env` line 1: `PUBLIC_SANITY_PROJECT_ID=2rj2jdb4`
- `.env.example` line 1: update reference

### 2.2 Deploy Schemas to New Project
- Run `npx sanity@latest schema deploy` to push all 24 schemas
- Verify in Sanity Studio that all document types appear
- Dataset remains `production`

### 2.3 Recreate Singleton Documents
- Create `siteSettings` document with all real business data (phone, email, addresses, hours, social links)
- Create `navigation` document with menu structure
- Use Sanity MCP (now pointing to new project) to create these

### 2.4 Recreate Content Documents
- Services (8): roof-replacement, shingle-roofing, metal-roofing, timber-seal, roof-repair, roof-maintenance, gutters, storm-damage
- Service Areas (17): 2 hubs (Roanoke, NRV) + 15 cities
- Blog posts (15): re-create from existing content
- Pages: homepage, about, FAQ, roofing-systems
- Testimonials: create from any available reviews
- Before/After projects: create from Drive photos

**Approach:** Script this with Sanity MCP `create_documents_from_json` for efficiency. Content text already exists in the current project — query it out, then push to new project.

**Verification:** All pages load with CMS content from new project, no 404s, Studio accessible at `/studio`.

---

## Phase 3: Google Drive Asset Integration
**Why:** Real photos are the #1 differentiator between "template" and "professional."

### 3.1 Pull Assets from Google Drive
- Use Google Drive API with credentials at `/Users/colinryan/MDR/credentials.json` + `token.json`
- Download all assets from folder `1Dwt8sntKh0hH5twoyMQTk4MUHWje6vke`
- Organize into local directories:
  ```
  assets/
  ├── logos/          # Company logos, badges
  ├── hero/           # Hero background images
  ├── projects/       # Project/job photos
  ├── team/           # Team headshots
  ├── before-after/   # Before & after pairs
  ├── favicons/       # Favicon files
  ├── videos/         # Video content
  └── service-photos/ # Service-specific images
  ```

### 3.2 Upload to Sanity
- Upload hero images, project photos, team photos, service photos to Sanity via asset upload
- Associate images with their respective documents (services, areas, blog posts, etc.)
- Upload logo to siteSettings

### 3.3 Replace Favicons
- Replace default Astro favicons in `public/` with MDR favicons from Drive

**Verification:** Every page shows real photography. No placeholder icons or Unsplash stock visible anywhere.

---

## Phase 4: Social Proof & Trust Signals Overhaul
**Why:** This is what the client specifically called out as "terrible." Top roofing sites lead with specific, impressive numbers.

### 4.1 Stats Counter Redesign
**Current (weak):** `500+ | 10+ | 100% | 50mi`
**Target (compelling):** Real numbers that match what Erie Home and top contractors display.

Recommended stats (verify with Alicia for accuracy):
- **"1,200+"** Roofs Completed — *specific volume builds confidence*
- **"15+"** Years Serving Virginia — *ties to local commitment*
- **"4.9★"** Google Rating — *precise rating > "100% satisfaction"*
- **"Top 2%"** of U.S. Contractors — *GAF Master Elite exclusivity*

**Design upgrade:**
- Replace generic SVG ring animation with something more impactful
- Add subtle background texture or gradient
- Each stat gets a micro-icon (roof icon, star, badge, map pin)
- Consider animated count-up on scroll (keep, but fix the trigger)

### 4.2 Trust Bar Enhancement
**Current:** Generic placeholders for GAF badge, stars, years, reviews.

**Target (inspired by Erie Home / Nu Look):**
- Real GAF Master Elite badge image (from Drive assets)
- BBB A+ Rated badge (real image)
- Google Reviews: "4.9★ from 150+ reviews" with Google logo
- "Since 2011" or actual founding year
- Make these links where possible (GAF badge links to GAF profile, Google links to reviews)

### 4.3 Testimonials Section
- Pull real Google Reviews or create testimonial documents in Sanity with real customer quotes
- Include customer first name, city, and star rating
- Photo if available, initials avatar if not
- Horizontal scroll-snap carousel (already built, just needs real content)

### 4.4 Google Reviews Section (NEW — Erie Home's Most Powerful Pattern)
**This is the single most impactful section Erie Home has.** Dark background, specific aggregate rating, real review cards.

**Implementation:**
- Create new component `src/components/home/GoogleReviews.astro`
- Dark background (`bg-darker` or `bg-dark`)
- Header: "4.9★ from 150+ Google Reviews" with Google logo + BBB badge
- 3-card carousel of real Google reviews, each showing:
  - Service type tag ("Roofing" / "Storm Damage" / etc.)
  - 5 gold stars + Google logo
  - Full review quote text
  - Customer first name + city ("Jake S. — Christiansburg, VA")
- "Read All Reviews" link to Google Business Profile
- For initial launch: manually curate 6-10 best Google Reviews into Sanity testimonial documents
- Future: integrate Google Places API for live review pulls

### 4.5 Certification Strip (NEW)
Horizontal row of real badge/logo images (inspired by Erie Home's strip):
- GAF Master Elite badge
- GAF Golden Pledge Warranty logo
- BBB A+ Accredited Business badge
- "Locally Owned & Operated" badge
- VA Licensed & Insured

**Create:** `src/components/home/CertificationStrip.astro`

**Files:**
- `src/components/blocks/StatsCounter.astro`
- `src/components/blocks/TrustBar.astro`
- `src/components/blocks/TrustBarBlock.astro`
- `src/components/blocks/TestimonialsBlock.astro`
- `src/components/home/GoogleReviews.astro` (NEW)
- `src/components/home/CertificationStrip.astro` (NEW)
- `src/pages/index.astro`

---

## Phase 5: Visual & UX Polish
**Why:** The difference between "template" and "professional" is in the details — photo treatment, whitespace, typography weight, hover states, and cohesion.

### 5.1 Hero Section Overhaul
**Current:** White card overlay on broken background. Headline "We Protect Your Home."

**Target (Erie Home pattern — adapted for regional contractor):**

Erie Home uses: full-bleed project photo background → dark gradient overlay → eyebrow text ("Industry-Best Residential Solutions") → bold H1 ("The Nation's Most Trusted...") → dual CTA buttons. No inline form in hero — clean and focused.

**MDR Hero Blueprint:**
- **Background:** Full-bleed real project photo from Drive (completed roof, beautiful home) with dark gradient overlay (bottom-up, 60% opacity)
- **Eyebrow:** "GAF Master Elite® — Top 2% of U.S. Contractors" (small, uppercase, accent color)
- **H1:** "Virginia's Premier Roofing Contractor" (Barlow Condensed, bold, white, large)
- **Sub-headline:** "Serving Christiansburg, Roanoke & the New River Valley since [year]. Premium materials. Lifetime protection." (DM Sans, white/80%, medium)
- **CTAs:** Dual buttons — "Get My Free Estimate" (primary/accent) + "Why Choose MDR?" (outline/white)
- **Desktop form option:** Consider Erie-style clean hero (no form) OR keep right-side form card. Test both — Erie goes clean, but for a regional contractor the form-in-hero can convert higher.
- **Mobile:** Full hero image, stacked text, single prominent CTA, form accessible via scroll or sticky bar
- **Trust mini-badges below CTA:** Small row of "GAF Master Elite" + "BBB A+" + "4.9★ Google" badges (grayscale or white)

**Files:**
- `src/components/home/HeroErie.astro` — rebuild hero layout
- `src/components/home/HeroBackground.tsx` — fix hydration, use real image

### 5.2 Services Section Polish
**Current:** 5-card grid with placeholder icons, hover zoom effect.

**Target:**
- Real photos as card backgrounds (from Drive service-specific photos)
- Overlay gradient (dark bottom) with service name and 1-line description
- Hover: slight scale + description expand
- Consider 3-across grid (not 5) for better visual weight on desktop

**Files:**
- `src/components/home/ServiceGrid.tsx`
- `src/components/home/ServicesAndGallery.astro`

### 5.3 Before/After Gallery
**Current:** Empty slider with no images.

**Target:**
- Load real before/after pairs from Drive
- Interactive slider with project details (location, material used, scope)
- "View Full Gallery" link to `/gallery` page
- Gallery page: masonry grid with lightbox slider per project

**Files:**
- `src/components/home/BeforeAfter.tsx`
- `src/components/cro/BeforeAfterSlider.tsx`
- `src/pages/gallery.astro`

### 5.4 Process Section Enhancement
**Current:** 4-step timeline with emoji icons (🔍📄🔨🛡️).

**Target:**
- Replace emoji with professional icons (Lucide or custom SVGs)
- Consider numbered steps with connecting line (already has timeline)
- Add subtle background (warm section) for visual separation

**Files:**
- `src/components/home/ProcessSection.astro`
- `src/components/home/ProcessTimeline.tsx`

### 5.5 Footer Enhancement
**Current:** Basic 4-column footer with correct data.

**Target:**
- Add both office addresses (Christiansburg + Roanoke) as formatted blocks
- Add business hours
- Social media icons for all 4 platforms (Facebook, Instagram, LinkedIn, Nextdoor)
- "24/7 Emergency Storm Damage Service" callout
- Consider adding a mini-form or "Call Now" CTA in footer

**Files:**
- `src/components/layout/Footer.astro`

### 5.6 Contact Page Fix
**Current:** Form not rendering (hydration error). No map, no address display.

**Target (after bug fix):**
- Split layout: left = value props + contact info, right = working form
- Both office addresses with embedded Google Maps
- Direct phone link and email
- Business hours displayed
- "24-hour response guarantee" badge

**Files:**
- `src/pages/contact.astro`

### 5.7 About Page
- Real team photos from Drive
- Company story with real imagery
- Certifications showcase
- "Meet the Team" section with headshots

### 5.8 Global Typography & Spacing Review
- Ensure heading hierarchy is consistent across all pages
- Verify adequate whitespace between sections
- Check that dark-section text contrast meets WCAG AA
- Verify all link hover states are consistent

---

## Phase 6: Form & Notification Setup
**Why:** Forms are the primary conversion mechanism. They must work AND deliver leads.

### 6.1 Fix Form Submission Flow
- Verify `/api/submit-form` endpoint works end-to-end
- Test webhook delivery to Google Sheets
- Ensure GA4 `generate_lead` and Meta Pixel `Lead` events fire

### 6.2 Email Notifications
- Add email notification to form submission endpoint
- Send to `sales@moderndayroof.com`
- Include: name, phone, email, message, source page, timestamp
- Consider using a service like Resend, SendGrid, or simple SMTP

### 6.3 Text Notifications (Future)
- Alicia mentioned wanting text notifications
- Can integrate Twilio or similar — discuss approach with client

### 6.4 CRM Integration (Future)
- Alicia wants CRM integration but hasn't specified which CRM
- For now, ensure Google Sheets capture is reliable
- Design the form data to be CRM-ready (structured fields, source tracking)

**Files:**
- `src/pages/api/submit-form.ts`
- `src/components/forms/LeadCaptureForm.tsx`

---

## Phase 7: Analytics & Tracking
**Why:** Can't optimize what you can't measure.

### 7.1 Meta Pixel
- Already configured (`720703229613803` in `.env`)
- Verify `PageView` and `Lead` events fire correctly after bug fixes

### 7.2 GA4
- Waiting on Alicia for access
- `PUBLIC_GA4_ID` env var ready in Layout.astro
- Verify `generate_lead` conversion event fires on form submit

### 7.3 Hotjar
- Waiting on Alicia for access
- `PUBLIC_HOTJAR_ID` env var ready in Layout.astro

### 7.4 Google Search Console
- Alicia will provide access
- Verify sitemap submission
- Monitor indexing after launch

### 7.5 GCLID Tracking
- Already built: `GclidCapture.astro` captures gclid from URL params
- Stored in sessionStorage, attached to form submissions
- Verify this flow works end-to-end

---

## Phase 8: Final QA & Launch Prep

### 8.1 Cross-Page Testing
- Run all 37 Playwright tests (update any that fail from changes)
- Manual review of every page on desktop + mobile
- Verify all internal links work (no 404s)
- Check all JSON-LD schema validates (Google Rich Results Test)

### 8.2 Performance
- Lighthouse audit all key pages (target 90+ all categories)
- Verify Core Web Vitals (LCP, CLS, FID)
- Image optimization: ensure Sanity serves WebP via CDN
- Font loading: verify Barlow Condensed + DM Sans load efficiently

### 8.3 SEO Verification
- All pages have unique title tags and meta descriptions
- Canonical URLs correct
- sitemap.xml includes all pages
- robots.txt allows crawling
- 301 redirects from old WordPress URLs still working

### 8.4 DNS & Domain
- Alicia adding Colin to GoDaddy
- Point DNS to Vercel
- Verify SSL certificate
- Test www vs non-www redirect

### 8.5 Launch Checklist
- [ ] All forms submit and deliver notifications
- [ ] All images are real (no placeholders)
- [ ] Phone number correct everywhere
- [ ] Both addresses displayed correctly
- [ ] Social links work
- [ ] Analytics firing (GA4, Meta Pixel, Hotjar)
- [ ] Mobile sticky CTA works
- [ ] Exit intent popup works
- [ ] SSL valid
- [ ] 301 redirects work
- [ ] sitemap submitted to Search Console
- [ ] Client final review approved

---

## Execution Order & Dependencies

```
Phase 1 (Bug Fixes) ──→ Phase 2 (Sanity Migration) ──→ Phase 3 (Assets)
                                                      ──→ Phase 4 (Social Proof)
                                                      ──→ Phase 5 (Visual Polish)
                         Phase 1 ──→ Phase 6 (Forms/Notifications)
                                    Phase 7 (Analytics — as access arrives)
         All Phases ──→ Phase 8 (QA & Launch)
```

Phase 1 is the absolute prerequisite. Phases 3-5 can run in parallel after Phase 2. Phase 6 can start after Phase 1. Phase 7 is gated by Alicia providing access. Phase 8 is the final gate.

---

## Key Files Summary

| Category | Files |
|----------|-------|
| **Config (Sanity migration)** | `sanity.config.ts`, `sanity.cli.ts`, `astro.config.mjs`, `.env`, `.env.example` |
| **Bug fixes** | `package.json`, all React components in `home/`, `forms/`, `cro/` |
| **Hero** | `src/components/home/HeroErie.astro`, `HeroBackground.tsx` |
| **Social Proof** | `src/components/blocks/StatsCounter.astro`, `TrustBar.astro`, `TrustBarBlock.astro` |
| **Forms** | `src/components/forms/LeadCaptureForm.tsx`, `FormModal.tsx`, `StickyMobileCTA.tsx` |
| **API** | `src/pages/api/submit-form.ts` |
| **Layout** | `src/layouts/Layout.astro`, `src/components/layout/Footer.astro`, `Header.astro` |
| **Pages** | `src/pages/index.astro`, `contact.astro`, `gallery.astro`, all dynamic routes |
| **Styles** | `src/styles/global.css` |
| **Sanity** | `src/sanity/lib/queries.ts`, `src/sanity/schemaTypes/` (24 schemas) |

---

## Verification Plan

1. **After Phase 1:** `npm run dev` → no console errors, forms render on all pages, hero visible
2. **After Phase 2:** Studio loads at `/studio` on new project, all content queries return data
3. **After Phase 3:** Visual audit — every page shows real photography, no placeholders
4. **After Phase 4:** Homepage social proof is specific and compelling, not generic
5. **After Phase 5:** Side-by-side with Erie Home — MDR should hold its own visually
6. **After Phase 6:** Submit test form → receive email at sales@moderndayroof.com
7. **After Phase 7:** GA4/Meta Pixel/Hotjar all firing (verify in respective dashboards)
8. **After Phase 8:** Full Playwright suite passes, Lighthouse 90+, client approves
