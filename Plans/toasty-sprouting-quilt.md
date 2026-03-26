# MDR Website Visual Audit & Fix Plan

## Context

Colin reviewed the MDR website and identified ~20 visual/UX issues spanning the homepage, services pages, financing, blog, FAQ, roofing systems, and about pages. The site has solid structure from 9 phases of development but needs creative polish, contrast fixes, missing assets, and per-page layout differentiation. This plan addresses every issue Colin raised plus additional problems discovered during the audit.

---

## Issues Identified (Audit Summary)

### Colin's Issues (numbered from his request)

| # | Issue | Root Cause | Severity |
|---|-------|-----------|----------|
| 1 | Logo missing in header | Logo file exists (`/assets/web/logo-horizontal.png`) but is dark on transparent header — invisible against dark hero | HIGH |
| 2 | "Get a Free Quote" button too close to hero | Header spacer is `h-[68px]` but hero starts immediately; no visual breathing room | MEDIUM |
| 3 | GAF President's Club logo missing in trust bar | Logo file exists and is referenced correctly; likely a CMS image loading/size issue — it IS showing in the TrustBar but may be too small or slow to load | LOW |
| 4 | Service button text (navy blue) blends in | On the homepage ServiceGrid, the cards have dark overlays with white text. But on the services INDEX page, parent service card titles use `text-text-primary` (navy #0F172A) on white cards — which IS readable but looks flat/boring. Colin wants more visual distinction. | MEDIUM |
| 5 | Reviews not genuine / no links to Google | Reviews are hardcoded placeholders (Jake S., Megan T., etc). "Read All Reviews" link goes to generic Google Maps search, not actual business profile | HIGH |
| 6 | "Top U.S. Contractors" messaging boring | StatsCounter shows "2% - Top U.S. Contractors" and hero says "GAF Master Elite Top 2% of US Contractors" — needs punchier messaging | MEDIUM |
| 7 | Need 5 certification logos | CertificationStrip.astro already has all 5 logos configured. Files exist in `/assets/logos/`. May have display issue (opacity-80, sizing) | LOW |
| 8 | "Schedule Free Inspection" white on white | Homepage final CTA section uses `background="accent"` (red) with `Button variant="secondary"` which renders as white bg, dark text on red section — this WORKS. But Colin perceives it as white-on-white, meaning the secondary variant isn't standing out enough against the visual flow | MEDIUM |
| 9 | "Call" phone button red on white blending | The ghost button on accent sections uses custom classes but may not contrast enough | MEDIUM |

### Colin's Page-Specific Issues

| Page | Issues |
|------|--------|
| `/services` (index) | No hero images; text squished/unformatted; empty image placeholders everywhere |
| `/services/[slug]` (detail) | No hero photos (same CMS image issue); text dense/wall-of-text; ScrollReveal animation blocking content |
| `/financing` | Boring hero (no image, just light background); needs color/visual interest |
| `/blog` | Boring; text formatting issues; missing blog post images |
| `/faq` | Boring (though Colin says "fine I guess") |
| `/roofing-systems` | Missing photos |
| `/about` | Missing photos at bottom; otherwise solid |
| **All pages** | Header disappears on scroll-to-top (transparent header with white text becomes invisible on light-background pages) |
| **All pages** | ScrollReveal animation hides content until scroll — Colin wants it removed |
| **All pages** | Each page should have distinct layout appropriate to its content |

### Additional Issues Found During Audit

| Issue | Location | Description |
|-------|----------|-------------|
| Services images from CMS missing | `/services` | `ImagePlaceholder` component shows dashed-border empty boxes — CMS has no `featuredImage` set for services |
| Blog post images from CMS missing | `/blog` | Same issue — blog posts in CMS likely lack featured images |
| Header transparent on light pages | Header.astro | On pages with light/warm hero backgrounds (services index, financing, blog), transparent header makes nav text invisible |
| No white logo variant | Logo.astro | Only one logo file — needs white version for transparent header on dark backgrounds |
| Stats "Top U.S. Contractors" | StatsCounter | Boring label; also the ring animation for "2%" looks odd at small numbers |
| CTA buttons on accent sections | index.astro | Secondary button variant (white bg) on red accent section could be confusing |

---

## Execution Plan

### Phase 1: Global Fixes (affects all pages)

#### 1A. Sticky Header Fix — Always Visible
**Files:** `src/components/layout/Header.astro`

**Problem:** Header is `fixed top-0` but becomes transparent at page top on desktop. On pages WITHOUT dark heroes (services, financing, blog), transparent header with white text is invisible.

**Fix:** Change header logic so it's ALWAYS solid white with dark text, EXCEPT on the homepage where it starts transparent over the dark hero. Detect page type via a prop or data attribute.

- Add `data-transparent-header` attribute to pages with dark heroes (homepage, FAQ, roofing-systems, service detail pages)
- Default header behavior: solid white background, dark text
- Only pages with `data-transparent-header` get the scroll-based transparent→white transition
- This ensures header is ALWAYS visible on every page

#### 1B. Remove ScrollReveal Animation
**Files:** All files importing ScrollReveal, `src/components/common/ScrollReveal.astro`

**Problem:** ScrollReveal starts content at `opacity: 0` and `translateY(20px)`, hiding it until scroll. Colin finds this annoying — "removes the animation that prevents you from seeing what's next."

**Fix:** Make ScrollReveal a pass-through (keep the component for easy re-enabling later, but set initial state to visible):
- Change `.scroll-reveal` CSS: `opacity: 1; transform: none;`
- This effectively disables the animation without breaking any page that imports it
- Files affected: `index.astro`, `services/[slug].astro`, `blog/index.astro`, `areas/[slug].astro`, `GoogleReviews.astro`

#### 1C. Logo Visibility Fix
**Files:** `src/components/common/Logo.astro`, possibly add white logo variant

**Problem:** Dark logo invisible on transparent header over dark heroes.

**Fix:**
- Use CSS filter to make logo white when header is in transparent mode: `filter: brightness(0) invert(1)` when `--nav-text` is white
- Or add a `data-theme` attribute to header and use CSS to swap logo styles
- Simplest approach: use `filter: brightness(0) invert(1)` class toggled by header scroll state

### Phase 2: Homepage Fixes

#### 2A. Hero Section Messaging Improvement
**Files:** `src/components/home/HeroErie.astro`

**Problem:** "GAF Master Elite — Top 2% of U.S. Contractors" is boring/bland.

**Fix:** Change eyebrow text to something more compelling:
- Replace with: `GAF Master Elite Certified | President's Club Award Winner`
- Or: `Award-Winning GAF Master Elite Contractor`
- The specific "Top 2%" stat should move to a different location (trust bar or stats section)

#### 2B. Service Grid Text Readability (Homepage)
**Files:** `src/components/home/ServiceGrid.tsx`

**Problem:** Colin says the heading text on service buttons blends in. The overlay cards use white text on dark gradient — but the titles use `text-white` which on some images with lighter areas may not be enough contrast.

**Fix:**
- Add a stronger bottom gradient on cards: `from-black/95 via-black/60 to-transparent` → increase to `from-black/100 via-black/80 to-black/10`
- Make titles larger/bolder with more text-shadow
- Add a subtle accent color underline or border-left on titles
- Consider adding a semi-transparent dark bar behind title text area

#### 2C. Trust Bar Logo Fix
**Files:** `src/components/blocks/TrustBar.astro`

**Problem:** GAF President's Club logo may not display properly.

**Fix:** Verify the image path loads correctly. Increase the container size from `w-16 h-16` to ensure visibility. Add fallback text if image fails.

#### 2D. CTA Button Contrast Fixes (Homepage Bottom)
**Files:** `src/pages/index.astro`

**Problem:** "Schedule Free Inspection" (secondary/white button) and "Call" (ghost button) on the red accent section don't stand out.

**Fix:**
- Change "Schedule Free Inspection" from `variant="secondary"` to a custom white button style: `bg-white text-accent font-bold hover:bg-gray-100` with larger size
- Change "Call" button: use `bg-transparent text-white border-2 border-white font-bold` — make border fully opaque, not `border-white/30`

#### 2E. Stats Counter Messaging
**Files:** `src/components/blocks/StatsCounter.astro`

**Problem:** "Top U.S. Contractors" is boring; "2%" doesn't communicate the achievement well.

**Fix:** Change the stat to something more impactful:
- Option A: "Top 2%" label → "GAF's Highest Honor" or "Elite Contractor Status"
- Option B: Replace the 2% stat entirely with something like "50+ year" / "Warranty Coverage" or "100%" / "Licensed & Insured"

#### 2F. Google Reviews — Authenticity & Links
**Files:** `src/components/home/GoogleReviews.astro`

**Problem:** Reviews are fake/placeholder. "Read All Reviews" goes to generic URL.

**Fix:**
- Replace placeholder reviews with REAL reviews from the business's Google profile
- Update "Read All Reviews on Google" href to actual Google Business Profile URL
- Need: Real Google Business Profile URL (will use a search to find it or ask Colin)
- Add individual review links if possible (Google review deep links)

#### 2G. Certification Strip Improvements
**Files:** `src/components/home/CertificationStrip.astro`

**Problem:** Logos are at 80% opacity and may be too small.

**Fix:**
- Remove `opacity-80` — show logos at full brightness
- Increase logo height from `h-16 md:h-20` to `h-20 md:h-24`
- Verify all 5 logo files load correctly
- Add link to relevant certification pages where applicable

### Phase 3: Services Pages

#### 3A. Services Index — Add Hero Image & Fix Layout
**Files:** `src/pages/services/index.astro`

**Problem:** Boring warm-background hero with no image. Text is squished.

**Fix:**
- Replace warm hero with a dark hero section featuring one of the drone/project photos from `/assets/web/` as a background image with gradient overlay
- Add more spacing to the text (increase `mt-4` to `mt-6`, add `leading-relaxed`)
- For services without CMS images: use the real project photos from `/assets/web/` as fallback images mapped to each service type
- Add visual badges/icons to service cards

#### 3B. Service Detail Pages — Image Fallbacks & Text Formatting
**Files:** `src/pages/services/[slug].astro`

**Problem:** When CMS has no featured image, the hero shows an ImagePlaceholder (dashed border box). Text is dense wall-of-text.

**Fix:**
- Add a mapping of service slug → fallback hero image from `/assets/web/` photos
- Format body content: add `prose-lg` class, increase line-height, better heading spacing
- Add visual elements to break up text: accent-colored pull quotes, icon lists
- Remove ScrollReveal wrapper from body content (per Phase 1B)

### Phase 4: Content Pages

#### 4A. Financing Page — Visual Hero
**Files:** `src/pages/financing.astro`

**Problem:** Boring light hero with no visual interest.

**Fix:**
- Add a real photo background to the hero (a completed roof project photo)
- Use dark hero style similar to service detail pages
- Add more visual elements: colored cards for benefits, accent dividers

#### 4B. Blog/Education Hub — Visual Polish
**Files:** `src/pages/blog/index.astro`

**Problem:** Boring, text formatting issues, missing images.

**Fix:**
- Add fallback images for blog posts without CMS images (use a set of generic roofing stock photos from the web assets)
- Improve card styling with better shadows, hover effects
- Fix text hierarchy and spacing
- Make category filters more visually distinct

#### 4C. FAQ Page — Visual Enhancement
**Problem:** CMS-driven page — limited ability to change without modifying blocks. But can improve the hero.

**Fix:** This is driven by Sanity page builder blocks, so changes would need to happen in block components or CMS content. Flag for later CMS content update.

#### 4D. Roofing Systems Page — Photos
**Problem:** Missing photos, CMS-driven.

**Fix:** Same as FAQ — CMS content update needed. Can improve block components.

#### 4E. About Page — Bottom Photos
**Files:** `src/pages/about.astro` (if exists) or CMS blocks

**Problem:** Missing photos at the bottom of About page.

**Fix:** Check if this is hardcoded or CMS-driven and add appropriate images.

### Phase 5: Mobile Optimization Sweep

- Verify header sticky behavior on mobile across all pages
- Check all button sizes hit 48px minimum touch target
- Ensure text is legible on mobile (no truncation, proper sizing)
- Test service cards stack properly
- Verify blog post cards are readable on mobile

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `src/components/layout/Header.astro` | Smart sticky header (always visible, page-aware transparency) |
| `src/components/common/Logo.astro` | CSS filter for white variant on dark backgrounds |
| `src/components/common/ScrollReveal.astro` | Disable animation (opacity: 1 by default) |
| `src/components/home/HeroErie.astro` | Improve eyebrow messaging |
| `src/components/home/ServiceGrid.tsx` | Stronger contrast on card overlays, better text readability |
| `src/components/blocks/TrustBar.astro` | Fix logo sizing, verify display |
| `src/components/home/GoogleReviews.astro` | Real reviews, real Google Business URL |
| `src/components/home/CertificationStrip.astro` | Full opacity, larger logos |
| `src/components/blocks/StatsCounter.astro` | Better messaging for "Top 2%" stat |
| `src/pages/index.astro` | Fix CTA button variants on accent section |
| `src/pages/services/index.astro` | Dark hero with image, fix spacing, image fallbacks |
| `src/pages/services/[slug].astro` | Image fallbacks, text formatting, remove ScrollReveal |
| `src/pages/financing.astro` | Visual hero with photo background |
| `src/pages/blog/index.astro` | Fallback images, visual polish |
| `src/layouts/Layout.astro` | Possibly pass page context to header for transparency logic |

---

## Verification Plan

1. **Visual verification**: Take Playwright screenshots of every modified page (desktop + mobile)
2. **Contrast check**: Verify all text/button combinations have sufficient contrast
3. **Header test**: Scroll up/down on every page — header must ALWAYS be visible
4. **Logo test**: Logo visible on both dark (homepage hero) and light (services index) backgrounds
5. **Animation test**: Content visible immediately on page load without needing to scroll
6. **Image test**: No broken images or empty placeholders on any page
7. **Link test**: "Read All Reviews on Google" opens correct Google Business page
8. **Mobile test**: All pages render properly at 390px width
9. **Build test**: `npm run build` completes without errors

---

## Decisions (Confirmed by Colin)

1. **Images**: Hardcode fallback images — map each service/blog to real project photos from `/assets/web/`
2. **Reviews**: Find and use REAL reviews from Google Business Profile
3. **CMS pages**: Update BOTH block components AND CMS content for FAQ/Roofing Systems via Sanity MCP
4. **Messaging**: Award-focused — "Award-Winning GAF Master Elite Contractor" / "President's Club Winner"

---

## Execution Order (Prioritized)

### Wave 1 — Global fixes (highest impact, affects all pages)
1. **Header always-visible fix** (Header.astro + Layout.astro)
2. **Logo white variant** (Logo.astro — CSS filter approach)
3. **Remove ScrollReveal animation** (ScrollReveal.astro)

### Wave 2 — Homepage (most visible page)
4. **Hero messaging** → award-focused copy
5. **ServiceGrid contrast** → stronger gradients, text shadows
6. **CTA button contrast** → fix white-on-red and call button
7. **Certification strip** → full opacity, larger logos
8. **Stats counter messaging** → "President's Club Winner"
9. **Google Reviews** → real reviews from Google + correct URL
10. **Trust bar logo fix** → verify display

### Wave 3 — Services pages
11. **Services index** → dark hero with photo, fallback images, spacing
12. **Service detail** → fallback hero images, text formatting

### Wave 4 — Content pages
13. **Financing** → photo hero background
14. **Blog index** → fallback images, visual polish
15. **FAQ** → update CMS content + block component styling
16. **Roofing Systems** → update CMS content + add photos
17. **About** → add missing bottom photos

### Wave 5 — Mobile + verification
18. Mobile sweep across all pages
19. Playwright screenshots for visual verification
20. Build test
