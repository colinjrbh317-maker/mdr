# MDR Full SEO Audit Report
**Date:** 2026-03-26 | **Site:** moderndayroof.com | **Overall Score: 7.5/10**

---

## Executive Summary

The MDR website has a **strong technical foundation** — sitemap, robots.txt, canonical tags, redirects, analytics, and structured data are all well-implemented. The biggest opportunities are in **on-page SEO** (missing H1s, weak titles), **local SEO gaps**, and **missing pages/schemas** that leave ranking potential on the table.

### Top 5 Priority Issues
1. **Homepage missing H1 tag** — Critical for keyword targeting
2. **No custom 404 page** — Lost recovery opportunity
3. **Missing Twitter Card meta tags** — Reduced social sharing quality
4. **Weak page titles** (About, Contact) — Not keyword-optimized
5. **Missing structured data** on About, Financing, Gallery, listing pages

---

## Audit Findings by Category

### 1. TECHNICAL SEO — Score: 9/10

| Element | Status | Score |
|---------|--------|-------|
| Sitemap (61 URLs) | Implemented, auto-generated | 9/10 |
| Robots.txt | Properly configured, blocks /studio and /api/ | 10/10 |
| 301 Redirects | 26 permanent redirects in vercel.json | 10/10 |
| Canonical Tags | Dynamic, on all pages | 10/10 |
| ISR Config | 60-second expiration via Vercel adapter | 10/10 |
| SSL/HTTPS | Full HTTPS | 10/10 |
| 404 Page | **MISSING** — redirects to default Vercel 404 | 0/10 |
| URL Structure | Clean, consistent patterns | 10/10 |

**Issue: Duplicate `/homepage/` in sitemap** — CMS page may duplicate root `/`

---

### 2. ON-PAGE SEO — Score: 6.5/10

| Page | Title Quality | H1 | Meta Desc | Score |
|------|--------------|-----|-----------|-------|
| Homepage | Strong ("Roofing Contractor in Christiansburg & Roanoke VA") | **MISSING** | Uses default | 7/10 |
| About | Weak ("About Us") | Emotional, not keyword | Custom | 6/10 |
| Contact | Weak ("Get Your Free Estimate") | CTA-focused | Custom | 6/10 |
| Financing | Strong | Good | Custom | 8/10 |
| Gallery | Moderate | Good | Custom | 5/10 |
| Services Index | Strong | Good | Custom | 8/10 |
| Service [slug] | CMS-driven (strong when filled) | Dynamic | CMS | 8/10 |
| Areas Index | Strong | Good | Custom | 7/10 |
| Area [slug] | Strong ("Roofing Contractor in [City], VA") | Good | CMS | 8/10 |
| Blog Index | Strong | Good | Custom | 7/10 |
| Blog [slug] | CMS-driven | Dynamic | CMS | 8/10 |
| FAQ | **PAGE MISSING** | N/A | N/A | 0/10 |
| Roofing Systems | **PAGE MISSING** | N/A | N/A | 0/10 |

**Critical Issues:**
- Homepage has NO H1 tag — the hero section only uses `<p>` and `<h2>` tags
- About title "About Us" wastes keyword opportunity → should be "About Modern Day Roofing | GAF Master Elite Contractor"
- Contact title "Get Your Free Estimate" → should be "Free Roofing Estimate in Christiansburg & Roanoke VA"
- FAQ page referenced in nav but file doesn't exist
- Roofing Systems page referenced in nav but may be CMS-driven

---

### 3. STRUCTURED DATA — Score: 7.5/10

**Implemented (6 schema types):**
- Homepage: `Organization` + `RoofingContractor`
- Service pages: `Service` + conditional `FAQPage`
- Area pages: `LocalBusiness` + `RoofingContractor`
- Blog posts: `BlogPosting`
- Contact: `RoofingContractor`
- Breadcrumbs: `BreadcrumbList` (all pages)
- Testimonials block: `LocalBusiness` with `aggregateRating`

**Missing schemas:**
| Page | Missing Schema | Priority |
|------|---------------|----------|
| About | `Organization` with team `Person` array | Medium |
| Financing | `FAQPage` (has hardcoded FAQ data) | Medium |
| Gallery | `ImageObject` array | Low |
| Services listing | `CollectionPage` | Low |
| Areas listing | `CollectionPage` | Low |
| Blog listing | `CollectionPage` or `Blog` | Low |

**Enhancement opportunities:**
- Homepage missing `sameAs` (social profiles), `email`, `foundingDate`, `image` (logo)
- TestimonialsBlock uses `LocalBusiness` type — should be `Organization`
- Area pages missing `openingHoursSpecification`
- No `AggregateRating` on homepage Organization schema

---

### 4. SOCIAL META / OG TAGS — Score: 6/10

| Element | Status |
|---------|--------|
| og:type | Implemented ("website") |
| og:title | Implemented (dynamic) |
| og:description | Implemented (dynamic) |
| og:url | Implemented (canonical URL) |
| og:image | Implemented (default + dynamic per page) |
| **twitter:card** | **MISSING** |
| **twitter:title** | **MISSING** |
| **twitter:description** | **MISSING** |
| **twitter:image** | **MISSING** |

---

### 5. INTERNAL LINKING — Score: 9/10

**Strengths:**
- No orphan pages detected — every page accessible from nav, footer, or cross-links
- Service-area cross-linking: area pages link to services, services link to related services
- Hub-child hierarchy properly linked (areas, services)
- Breadcrumbs with JSON-LD on all hierarchical pages
- Footer covers 13+ unique destinations
- Multiple CTAs per page (form, phone, link)

**Gaps:**
- Blog posts don't have explicit service/area links (relies on prose markdown)
- No "View All Services" button on service detail pages
- No "View All Areas" button on area detail pages
- Contact page has minimal internal navigation (intentional — conversion-focused)

---

### 6. PERFORMANCE — Score: 8/10

**Implemented:**
- Font preloading (Archivo Black, DM Sans) with `display=swap`
- Preconnect to fonts.googleapis.com and cdn.sanity.io
- Lazy loading on below-fold images
- Eager loading on above-fold images (hero, logo, trust bar)
- ISR with 60-second cache

**Missing:**
- No `fetchpriority="high"` on LCP images
- No `decoding="async"` on images
- No explicit Core Web Vitals optimization

---

### 7. ANALYTICS & TRACKING — Score: 10/10

- GA4 (conditional via env var)
- Meta Pixel (conditional via env var)
- Hotjar (conditional via env var)
- GCLID capture for Google Ads attribution
- CRO popup tracking (exit intent, scroll depth)

---

### 8. LOCAL SEO — Score: 6/10

**Based on 2025-2026 roofing local SEO best practices:**

| Factor | MDR Status | Gap |
|--------|-----------|-----|
| GBP optimization | Unknown (not in codebase) | Need to verify GBP listing |
| NAP consistency | Consistent across site pages | Good |
| Review strategy | Testimonials on site, no GBP review link | Add GBP review link |
| Service+city pages | 15 city pages exist | Good — could add service+city combos |
| Local citations | Not visible in codebase | Need to build on HomeAdvisor, Angi, BBB, Yelp |
| Local backlinks | Not visible in codebase | Need community sponsorships |
| Geo-tagged photos | No geo-tagging on project photos | Add EXIF data |
| sameAs social links | Missing from schema markup | Add to Organization JSON-LD |
| GBP categories | Not in codebase | Verify: "Roofing Contractor" primary |
| LocalBusiness schema | On area pages + contact | Good |

---

## Prioritized Execution Plan

### Priority 1: CRITICAL (Do Now) — High Impact, Easy Fixes

| # | Fix | File | Why It Matters |
|---|-----|------|----------------|
| 1 | **Add H1 to homepage** | `src/pages/index.astro` or `HeroErie.astro` | Google uses H1 as primary relevance signal. Missing H1 = no keyword anchor for homepage |
| 2 | **Add Twitter Card meta tags** | `src/layouts/Layout.astro` | 4 meta tags. Without them, Twitter/X shares look broken — no image, no card |
| 3 | **Fix About page title** | `src/pages/about.astro` | "About Us" → "About Modern Day Roofing \| GAF Master Elite Contractor" — keyword opportunity |
| 4 | **Fix Contact page title** | `src/pages/contact.astro` | "Get Your Free Estimate" → "Free Roofing Estimate \| Christiansburg & Roanoke VA" |
| 5 | **Add sameAs to homepage Organization schema** | `src/pages/index.astro` | Social profiles in schema help Google connect GBP, social, and website as one entity |

### Priority 2: HIGH (This Week) — Meaningful SEO Gains

| # | Fix | File | Why It Matters |
|---|-----|------|----------------|
| 6 | **Create custom 404 page** | `src/pages/404.astro` | Branded 404 with nav links + CTA recovers lost visitors. Current default Vercel 404 is a dead end |
| 7 | **Add `fetchpriority="high"` to hero image** | `HeroErie.astro` | Tells browser to prioritize LCP image — direct Core Web Vitals improvement |
| 8 | **Add `email` and `foundingDate` to Organization schema** | `src/pages/index.astro` | Enriches knowledge graph signals for local pack ranking |
| 9 | **Add FAQPage schema to Financing page** | `src/pages/financing.astro` | Has hardcoded FAQ content but no schema — missed rich result opportunity |
| 10 | **Fix TestimonialsBlock schema type** | `src/components/blocks/TestimonialsBlock.astro` | Change `LocalBusiness` → `Organization` for aggregateRating — more semantically correct |

### Priority 3: MEDIUM (This Month) — Incremental Improvements

| # | Fix | File | Why It Matters |
|---|-----|------|----------------|
| 11 | **Add CollectionPage schema to listing pages** | `services/index.astro`, `areas/index.astro`, `blog/index.astro` | Helps Google understand page type and hierarchy |
| 12 | **Add Organization schema to About page** | `src/pages/about.astro` | E-E-A-T signal — shows team, credentials, expertise |
| 13 | **Add `decoding="async"` to all images** | Multiple block components | Minor performance optimization across all image-heavy pages |
| 14 | **Add explicit service+city internal links to blog posts** | CMS content | Blog posts should link to relevant service and area pages for authority flow |
| 15 | **Remove `/homepage/` from sitemap** | CMS or sitemap config | Potential duplicate content issue with root `/` |

### Priority 4: LOW (Ongoing) — Polish & Enhancement

| # | Fix | Why |
|---|-----|-----|
| 16 | Add `image` (logo URL) to Organization schema | Knowledge panel completeness |
| 17 | Add `openingHoursSpecification` to area page schemas | Local relevance signal per city |
| 18 | Add `inLanguage: "en-US"` to BlogPosting schema | Minor schema completeness |
| 19 | Add GBP review link CTA on testimonials section | Drive more Google reviews |
| 20 | Build NAP citations on HomeAdvisor, Angi, BBB, Yelp | Off-site local SEO (manual task) |

---

## What's Already Working Well

- **26 properly configured 301 redirects** preserving old URL authority
- **Comprehensive analytics** (GA4 + Meta Pixel + Hotjar + GCLID)
- **Strong ISR config** (60s cache) for fresh CMS content
- **No orphan pages** — every page reachable from nav/footer
- **Proper breadcrumbs** with JSON-LD on all hierarchical pages
- **6 schema types** implemented across major page types
- **Service-area cross-linking** creating strong internal authority flow
- **Dynamic canonical tags** preventing duplicate content
- **Font preloading** with display=swap preventing FOIT
- **Lazy/eager loading** strategy for images

---

## Recommended Execution Order

**Session 1 (30 min):** Items 1-5 (H1, Twitter cards, titles, sameAs)
**Session 2 (45 min):** Items 6-10 (404 page, performance, schemas)
**Session 3 (30 min):** Items 11-15 (Collection schemas, blog links)
**Ongoing:** Items 16-20 (polish, off-site SEO)

Total estimated development time: ~2 hours for items 1-15
