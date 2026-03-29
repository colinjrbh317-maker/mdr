# SEO Migration Plan: WordPress → Astro/Vercel
**Site:** moderndayroof.com | **Date:** 2026-03-28
**Goal:** Zero ranking loss during platform migration (currently top 3 in roofing categories)

---

## Executive Summary

This is a **same-domain platform migration** — WordPress → Astro SSR on Vercel. The domain stays `moderndayroof.com`. This is the safest type of migration because Google sees it as a redesign, not a move. The primary risks are:

1. **Broken URLs** — old WordPress URLs that return 404 instead of 301
2. **Lost structured data** — schema markup gaps between old and new
3. **Crawl budget waste** — Google spending time on dead URLs
4. **Content parity gaps** — pages that existed on old site but don't on new

---

## PHASE 1: PRE-MIGRATION (Do Before DNS Switch)

### 1.1 Complete URL Audit & Redirect Map

**Old WordPress Site — Complete Sitemap Inventory (34 URLs):**

| # | Old WordPress URL | Current Redirect Target | Status |
|---|------------------|------------------------|--------|
| 1 | `/` | `/` (same) | ✅ Covered |
| 2 | `/home/` | `/` | ✅ In vercel.json |
| 3 | `/contact-us/` | `/contact` | ✅ In vercel.json |
| 4 | `/services/` | `/services` | ✅ In vercel.json |
| 5 | `/roof-replacement/` | `/services/roof-replacement` | ✅ In vercel.json |
| 6 | `/roof-repair/` | `/services/roof-repair` | ✅ In vercel.json |
| 7 | `/roof-inspections-and-safety/` | `/services/roof-maintenance` | ✅ In vercel.json |
| 8 | `/blog/` | `/blog` | ✅ In vercel.json |
| 9 | `/faqs/` | `/` | ✅ In vercel.json |
| 10 | `/local-roofing-services/` | `/areas` | ✅ In vercel.json |
| 11 | `/roanoke/` | `/areas/roanoke` | ✅ In vercel.json |
| 12 | `/radford/` | `/areas/radford` | ✅ In vercel.json |
| 13 | `/pulaski/` | `/areas/pulaski` | ✅ In vercel.json |
| 14 | `/christiansburg-roofing-company/` | `/areas/christiansburg` | ✅ In vercel.json |
| 15 | `/blacksburg-roofing-company/` | `/areas/blacksburg` | ✅ In vercel.json |
| 16 | `/salem-roofing-company/` | `/areas/salem` | ✅ In vercel.json |
| 17 | `/floyd-roofing-company/` | `/areas/floyd` | ✅ In vercel.json |
| 18 | `/wytheville-roofing-company/` | `/areas/wytheville` | ✅ In vercel.json |
| 19 | `/troutville-roofing-company/` | `/areas/troutville` | ✅ In vercel.json |
| 20 | `/smith-mountain-lake-roofing-company/` | `/areas/smith-mountain-lake` | ✅ In vercel.json |
| 21 | `/privacy-policy/` | `/` | ✅ In vercel.json (⚠️ Should → `/privacy`) |
| 22 | `/sitemap/` | `/sitemap-index.xml` | ✅ In vercel.json |
| 23 | `/referral-program/` | `/` | ✅ In vercel.json |
| 24 | `/roofgiveaway2026/` | `/` | ✅ In vercel.json |
| 25 | `/roanokehomeandgardengiveaway/` | `/` | ✅ Added to vercel.json |
| 26 | `/custom-testimonial/*` (9 pages) | `/` | ✅ Wildcard in vercel.json |
| 27 | `/testimonials/` | `/reviews` | ✅ Added (indexed by Google, not in WP sitemap) |

**WordPress artifact URLs (not in sitemap but Google may have indexed):**

| # | URL Pattern | Redirect Target | Action |
|---|-------------|----------------|--------|
| 27 | `/feed/` | — | Add redirect → `/` |
| 28 | `/comments/feed/` | — | Add redirect → `/` |
| 29 | `/wp-json/*` | — | Add redirect → `/` |
| 30 | `/wp-content/uploads/*` | — | See note below |
| 31 | `/author/*` | — | Add redirect → `/` |
| 32 | `/?s=*` (search) | — | Add redirect → `/` |
| 33 | `/?p=*` (short URLs) | — | Add redirect → `/` |

> **Note on `/wp-content/uploads/`**: These are image URLs that may be linked from external sites. Vercel won't serve these. Two options:
> 1. **Recommended**: Keep the old WordPress hosting alive for 6-12 months serving ONLY `/wp-content/uploads/*` via a subdomain (e.g., `old.moderndayroof.com`) and add redirect rules
> 2. **Alternative**: Download all images from WordPress, upload to Sanity/Vercel, and add specific redirects for the most-linked images

### 1.2 Redirect Fixes Needed in vercel.json

```json
// ADD these missing redirects:
{ "source": "/roanokehomeandgardengiveaway/", "destination": "/", "permanent": true },
{ "source": "/feed/", "destination": "/", "permanent": true },
{ "source": "/comments/feed/", "destination": "/", "permanent": true },
{ "source": "/author/:path*", "destination": "/", "permanent": true },
{ "source": "/wp-json/:path*", "destination": "/", "permanent": true },

// FIX this redirect (privacy page exists on new site):
// Change: { "source": "/privacy-policy/", "destination": "/", "permanent": true }
// To:     { "source": "/privacy-policy/", "destination": "/privacy", "permanent": true }
```

### 1.3 Pre-Migration Baseline (CRITICAL)

Capture these BEFORE switching:

- [ ] **Screaming Frog crawl** of current WordPress site (or use free alternative: `sitebulb` trial / `wget --spider`)
- [ ] **Google Search Console** → Export: Performance report (last 90 days), all indexed pages, all crawl errors
- [ ] **Google Analytics** → Export: Top 50 landing pages by organic traffic (last 90 days)
- [ ] **Backlink report** → Use Ahrefs free backlink checker or `site:moderndayroof.com` on Perplexity to identify top backlinked pages
- [ ] **Screenshot key pages** → Homepage, top 3 service pages, top 3 area pages (for visual comparison)
- [ ] **Page speed baseline** → Run PageSpeed Insights on homepage + 2 key pages, save reports
- [ ] **Keyword rankings** → Record current positions for these terms:
  - "roofing contractor Christiansburg VA"
  - "roof replacement Roanoke VA"
  - "roofing company near me" (from Christiansburg)
  - "roof repair Blacksburg VA"
  - "storm damage roof repair Virginia"

### 1.4 Google Search Console Preparation

- [ ] Verify you have **owner-level** access to GSC for `moderndayroof.com`
- [ ] Ensure the property is verified via DNS (most durable method — survives platform changes)
- [ ] If currently verified via HTML file or meta tag, add DNS verification BEFORE migration
- [ ] Download "Links" report (both internal and external) from GSC

---

## PHASE 2: MIGRATION DAY

### 2.1 DNS/Deployment Sequence

1. **Deploy new Astro site to Vercel** on a preview URL first (e.g., `mdr-preview.vercel.app`)
2. **Run redirect test suite** against preview: `npx playwright test tests/redirects.spec.ts`
3. **Verify all 34+ URLs** return proper 301s on the preview deployment
4. **Switch DNS** — point `moderndayroof.com` A/CNAME records to Vercel
5. **Immediately after DNS propagation**:
   - Verify homepage loads correctly
   - Verify 3 random old URLs redirect properly
   - Verify robots.txt is accessible
   - Verify sitemap-index.xml is accessible

### 2.2 Immediate Post-Switch Actions (First 2 Hours)

- [ ] **Google Search Console** → Submit new sitemap (`/sitemap-index.xml`)
- [ ] **Google Search Console** → Use URL Inspection tool on homepage → Request Indexing
- [ ] **Google Search Console** → Use URL Inspection tool on top 5 ranking pages → Request Indexing
- [ ] **Google Business Profile** → Verify website URL still resolves (same domain, should be fine)
- [ ] **Test every redirect** — curl each old URL and verify 301 + correct destination
- [ ] **Verify structured data** — Run Google Rich Results Test on homepage, 1 service page, 1 area page
- [ ] **Verify canonical tags** — Check homepage, service pages, area pages all have correct `<link rel="canonical">`
- [ ] **Check for accidental noindex** — View source on homepage, verify NO `<meta name="robots" content="noindex">`

---

## PHASE 3: POST-MIGRATION MONITORING

### 3.1 Daily Checks (Days 1-7)

| Day | Action | What to Look For |
|-----|--------|-----------------|
| Day 1 | Check GSC Coverage report | New crawl errors? 404s? |
| Day 1 | Check GSC Performance | Any sudden traffic drop? |
| Day 2 | Check GSC Crawl Stats | Is Googlebot finding the new site? |
| Day 3 | Re-check keyword rankings | Positions should be stable or fluctuating slightly |
| Day 4 | Check GSC for "Excluded" pages | Any important pages being excluded? |
| Day 5 | Review server logs / Vercel analytics | Identify any 404s being hit frequently |
| Day 7 | Full keyword ranking check | Compare to baseline |

### 3.2 Weekly Checks (Weeks 2-8)

| Week | Action | Expected Behavior |
|------|--------|------------------|
| Week 2 | Full GSC Performance comparison | Traffic should stabilize (±10% of baseline) |
| Week 3 | Check indexed page count | Should match or exceed old site count |
| Week 4 | Comprehensive ranking check | Rankings should recover to baseline |
| Week 6 | Page speed comparison | New site should score higher (Astro > WordPress) |
| Week 8 | Final migration success assessment | Traffic ≥ baseline = success |

### 3.3 Emergency Response Plan

**If rankings drop >20% within first week:**
1. Check GSC for crawl errors — fix any 404s immediately
2. Check if Googlebot is being blocked (robots.txt, server errors)
3. Verify structured data hasn't broken
4. Check for accidental noindex tags
5. Submit URL inspection requests for affected pages
6. **DO NOT PANIC** — temporary fluctuation (2-4 weeks) is normal during migration

**If rankings drop >50%:**
1. All of the above, PLUS:
2. Check if the old WordPress site is still accessible (creating duplicate content)
3. Verify canonical tags aren't pointing to wrong URLs
4. Check for redirect loops
5. Contact Google via GSC if issues persist after 2 weeks

---

## PHASE 4: STRUCTURED DATA CONTINUITY

### Current WordPress Schema (from Yoast):
- `WebSite` — on all pages
- `Organization` — on all pages
- `SearchAction` — site search

### New Astro Site Schema (verified from SEO audit):
- `Organization` + `RoofingContractor` — homepage ✅
- `Service` + conditional `FAQPage` — service pages ✅
- `LocalBusiness` + `RoofingContractor` — area pages ✅
- `BlogPosting` — blog posts ✅
- `RoofingContractor` — contact page ✅
- `BreadcrumbList` — all pages ✅
- `LocalBusiness` with `aggregateRating` — testimonials block ✅

**Assessment**: New site has **MORE** structured data than old site. No loss expected.

---

## PHASE 5: CONTENT PARITY CHECK

| Old Page | New Equivalent | Content Match |
|----------|---------------|---------------|
| Homepage | Homepage | ✅ Improved (more sections) |
| Services listing | `/services` | ✅ Improved (8 services vs 3) |
| Roof Replacement | `/services/roof-replacement` | ✅ Parity |
| Roof Repair | `/services/roof-repair` | ✅ Parity |
| Roof Inspections | `/services/roof-maintenance` | ✅ Parity (renamed) |
| Contact | `/contact` | ✅ Parity |
| FAQs | FAQ content on homepage/services | ⚠️ Merged (redirect to `/` is ok) |
| Area pages (10) | `/areas/*` (17 pages) | ✅ Improved (more cities) |
| Blog | `/blog` | ⚠️ Old WP blog had no posts; new has 15 |
| Privacy Policy | `/privacy` | ✅ Parity |
| Referral Program | Redirect to `/` | ✅ Acceptable (page discontinued) |
| Custom Testimonials (9) | Redirect to `/` | ✅ Acceptable (reviews on multiple pages now) |

**Assessment**: Content parity is excellent. New site has MORE content than old site.

---

## PHASE 6: TECHNICAL CHECKLIST

### Before Migration:
- [ ] All redirects added to `vercel.json` (including the missing ones above)
- [ ] Playwright redirect tests updated and passing
- [ ] Sitemap generating correctly (verify URL count)
- [ ] robots.txt not blocking important paths
- [ ] All pages have unique `<title>` and `<meta description>`
- [ ] All pages have canonical tags
- [ ] Structured data validates (no errors in Google Rich Results Test)
- [ ] 404 page exists and returns proper 404 status code
- [ ] HTTPS enforced on all pages
- [ ] Mobile rendering verified
- [ ] Page speed optimized (target: 90+ on mobile)

### After Migration:
- [ ] Old WordPress hosting decommissioned (or reduced to image-only serving)
- [ ] DNS TTL lowered to 300s before switch, restored to 3600s after confirming success
- [ ] GSC sitemap submitted
- [ ] GBP verified
- [ ] Bing Webmaster Tools updated (if applicable)
- [ ] Any directory listings (Yelp, BBB, Angi) verified — they link to moderndayroof.com which stays the same

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Temporary ranking fluctuation (2-4 weeks) | HIGH | LOW | Normal — monitor, don't panic |
| Missing redirect causes 404 | MEDIUM | MEDIUM | Complete redirect audit above ✅ |
| Duplicate content (old WP still accessible) | LOW | HIGH | Shut down WordPress or add noindex |
| Structured data loss | LOW | MEDIUM | New site has MORE schema ✅ |
| Page speed regression | VERY LOW | LOW | Astro is faster than WordPress ✅ |
| Google Business Profile disconnect | VERY LOW | HIGH | Same domain — no action needed |

---

## CRITICAL ACTION ITEMS (Sorted by Priority)

### Must Do Before Migration:
1. **Add missing redirect** for `/roanokehomeandgardengiveaway/` → `/`
2. **Add WordPress artifact redirects** (feed, author, wp-json)
3. **Fix privacy redirect** → `/privacy` instead of `/`
4. **Capture baseline data** (GSC export, rankings, PageSpeed)
5. **Verify DNS verification** in GSC (not HTML file-based)
6. **Lower DNS TTL** to 300 seconds, 24 hours before switch

### Must Do During Migration:
7. **Deploy to preview URL first** and test all redirects
8. **Switch DNS** only after preview passes all tests
9. **Submit new sitemap** to GSC within 1 hour

### Must Do After Migration:
10. **Request re-indexing** of top 5-10 pages via GSC URL Inspection
11. **Shut down WordPress** or add `noindex, nofollow` to prevent duplicate content
12. **Monitor daily** for first 7 days, weekly for 8 weeks
13. **Keep old WordPress backup** available for emergency rollback (30 days)

---

## EXPECTED TIMELINE

| Timeframe | Expected Behavior |
|-----------|------------------|
| Day 1-3 | Googlebot discovers new site, rankings may wobble ±5 positions |
| Week 1-2 | Most pages re-indexed, rankings stabilizing |
| Week 3-4 | Rankings should match or exceed pre-migration baseline |
| Month 2-3 | Full recovery + potential improvement from faster site + more content |

**Why rankings should IMPROVE after migration:**
- Astro SSR is significantly faster than WordPress (better Core Web Vitals)
- New site has 48+ pages vs old site's 25 pages (more indexable content)
- Better structured data (6 schema types vs 2)
- Better internal linking structure
- Better mobile experience
- More comprehensive service and area coverage
