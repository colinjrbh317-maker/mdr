# Modern Day Roofing — SEO Page Expansion Strategy

**Date:** 2026-03-27
**Prepared for:** Colin / Alicia (Modern Day Roofing)
**Current Site:** moderndayroof.com
**Competitors Analyzed:** cenvarroofing.com (25+ locations, 100+ blog posts), romanroofing.com (200+ pages)

---

## Executive Summary

MDR currently has **~45 indexable pages** (8 services, 17 areas, 15 blog posts, 4 CMS pages, plus static pages). Cenvar has **150+ pages** and Roman Roofing has **200+ pages**. This plan adds **200+ new pages** across 6 strategies to close the gap and dominate local search in SW Virginia.

**UPDATED 2026-03-27:** Colin confirmed MDR offers: **Commercial Roofing, Siding, Skylights, Flat Roofing (TPO/EPDM), and Roof Coatings.** MDR has **231 Google reviews at 5 stars.** Videos from Alicia coming next week.

**The single highest-ROI move:** Location + Service combo pages (e.g., "Roof Replacement in Roanoke, VA"). Roman Roofing does this for every city — it's their #1 traffic driver.

---

## Current Site Inventory

### Services (8 pages)
| Service | Slug | Parent |
|---------|------|--------|
| Roof Replacement | /services/roof-replacement | — |
| Shingle Roofing | /services/shingle-roofing | Roof Replacement |
| Metal Roofing | /services/metal-roofing | Roof Replacement |
| Timber Seal | /services/timber-seal | Roof Replacement |
| Roof Repair | /services/roof-repair | — |
| Roof Maintenance | /services/roof-maintenance | — |
| Gutters | /services/gutters | — |
| Storm Damage | /services/storm-damage | — |

### Service Areas (17 pages)
- **Hubs (2):** New River Valley, Roanoke Area
- **Cities (15):** Christiansburg, Blacksburg, Radford, Pulaski, Dublin, Floyd, Wytheville, Roanoke, Salem, Vinton, Troutville, Bedford, Lexington, Covington, Smith Mountain Lake

### Blog Posts (15)
Categories: Seasonal Guides (2), Contractor Tips (2), Cost & Pricing (1), Materials & Comparisons (4), Maintenance & Care (1), Warranties & Certifications (2), Insurance & Claims (1), Storm & Weather (2)

### Other Pages (8)
Homepage, FAQ, Roofing Systems, About, Contact, Financing, Gallery, Privacy, Terms

---

## STRATEGY 1: Location + Service Combo Pages (HIGHEST PRIORITY)

**Why this matters:** When someone searches "roof replacement Roanoke VA" or "gutter installation Christiansburg", Google wants a page that mentions BOTH the service AND the city. Right now, MDR has separate service pages and separate area pages — but no combined pages. Roman Roofing creates these for every city and it's their biggest traffic source.

**The math:** 10 core services x 15 cities = **150 new pages** (with confirmed new services)

However, we should start with the highest-value combos first.

### Phase 1A — Top 5 Cities x Top 3 Services = 15 pages (DO FIRST)

These target the highest-volume searches:

| City | Roof Replacement | Roof Repair | Storm Damage |
|------|-----------------|-------------|--------------|
| Roanoke | /areas/roanoke/roof-replacement | /areas/roanoke/roof-repair | /areas/roanoke/storm-damage |
| Christiansburg | /areas/christiansburg/roof-replacement | /areas/christiansburg/roof-repair | /areas/christiansburg/storm-damage |
| Blacksburg | /areas/blacksburg/roof-replacement | /areas/blacksburg/roof-repair | /areas/blacksburg/storm-damage |
| Salem | /areas/salem/roof-replacement | /areas/salem/roof-repair | /areas/salem/storm-damage |
| Bedford | /areas/bedford/roof-replacement | /areas/bedford/roof-repair | /areas/bedford/storm-damage |

**Target keywords per page:**
- "roof replacement [city] VA"
- "roofing contractor [city] VA"
- "roof repair near me [city]"
- "storm damage roof [city] Virginia"

### Phase 1B — Remaining Cities x Top 3 Services = 30 pages

Extend to: Radford, Pulaski, Dublin, Floyd, Wytheville, Vinton, Troutville, Lexington, Covington, Smith Mountain Lake

### Phase 1C — All Cities x Remaining Services = 30 pages

Add: Metal Roofing, Gutters combos for all 15 cities

### Page Template (each combo page needs):
1. H1: "[Service] in [City], VA"
2. 300-500 words of unique content mentioning local landmarks/context
3. Service-specific FAQ (3-5 questions)
4. Customer testimonial from that area (if available)
5. Before/after gallery (if available for that area)
6. Clear CTA with phone number
7. JSON-LD LocalBusiness + Service schema
8. Internal links to: parent service page, parent area page, related services
9. Relevant photo from Google Drive (NOT repeated across pages)

**Implementation:** Create a new Sanity schema `serviceAreaService` (or use the existing page builder with a new route pattern). Each page is a combination document referencing a service + serviceArea.

---

## STRATEGY 2: New Service Pages & Sub-Pages

### 2A — Storm Damage Sub-Pages (Cenvar & Roman both have these)

MDR already has a Storm Damage page, but competitors break it into targeted sub-pages:

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Wind Damage Repair | /services/storm-damage/wind-damage | "wind damage roof repair Virginia" |
| Hail Damage Repair | /services/storm-damage/hail-damage | "hail damage roof [city] VA" |
| Emergency Roof Repair | /services/storm-damage/emergency-repair | "emergency roof repair near me" |
| Insurance Claims Help | /services/storm-damage/insurance-claims | "roof insurance claim Virginia" |

**4 new pages.** All factually accurate — MDR already does storm damage and insurance work.

### 2B — Gutter Sub-Pages (Roman has 3 gutter pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Seamless Gutters | /services/gutters/seamless-gutters | "seamless gutter installation [city]" |
| Gutter Guards | /services/gutters/gutter-guards | "gutter guard installation Virginia" |
| Gutter Repair | /services/gutters/gutter-repair | "gutter repair near me" |

**3 new pages.**

### 2C — Roof Inspection Page (MDR offers this but has no dedicated page!)

The moderndayroof.com homepage mentions roof inspections as a service, but there's no standalone service page for it. This is a huge miss.

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Roof Inspection | /services/roof-inspection | "free roof inspection [city] VA" |

**1 new page.**

### 2D — CONFIRMED New Service Categories (Colin verified 2026-03-27)

All five service categories confirmed. Here are the new pages to create:

#### Commercial Roofing (5 pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Commercial Roofing (parent) | /services/commercial-roofing | "commercial roofing contractor [city] VA" |
| Commercial Roof Repair | /services/commercial-roofing/repair | "commercial roof repair Virginia" |
| Commercial Roof Replacement | /services/commercial-roofing/replacement | "commercial roof replacement Roanoke" |
| Commercial Roof Coatings | /services/commercial-roofing/coatings | "commercial roof coating Virginia" |
| HOA Roofing | /services/commercial-roofing/hoa | "HOA roof replacement Virginia" |

#### Flat Roofing (4 pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Flat Roofing (parent) | /services/flat-roofing | "flat roof contractor Virginia" |
| TPO Roofing | /services/flat-roofing/tpo | "TPO roofing installation Virginia" |
| EPDM Roofing | /services/flat-roofing/epdm | "EPDM rubber roof Virginia" |
| Modified Bitumen | /services/flat-roofing/modified-bitumen | "modified bitumen roofing Virginia" |

#### Siding (4 pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Siding (parent) | /services/siding | "siding contractor [city] VA" |
| Vinyl Siding | /services/siding/vinyl | "vinyl siding installation Virginia" |
| James Hardie Fiber Cement | /services/siding/fiber-cement | "James Hardie siding Virginia" |
| Siding Repair | /services/siding/repair | "siding repair near me" |

#### Skylights (2 pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Skylight Installation | /services/skylights | "skylight installation Virginia" |
| Skylight Repair | /services/skylights/repair | "skylight repair leak fix Virginia" |

#### Roof Coatings (2 pages)

| New Page | Slug | Target Keyword |
|----------|------|----------------|
| Roof Coatings (parent) | /services/roof-coatings | "roof coating Virginia extend life" |
| Silicone Roof Coating | /services/roof-coatings/silicone | "silicone roof coating contractor" |

#### Business Data for Schema Markup
- **Google Reviews:** 231 reviews, 5.0 stars (use in AggregateRating JSON-LD on all pages)
- **Videos:** Alicia sending project videos next week — embed on service pages when received

**Total Strategy 2: 25 new service pages (8 original + 17 newly confirmed)**

---

## STRATEGY 3: Blog Content Expansion (Target: 50+ total posts)

MDR has 15 posts. Cenvar has 100+. Need at least 35 more posts to compete.

### 3A — High-Intent "Cost" Posts (these convert)

| # | Title | Target Keyword |
|---|-------|----------------|
| 1 | How Much Does a Metal Roof Cost in Virginia? (2026) | "metal roof cost Virginia" |
| 2 | Roof Repair Cost in Christiansburg VA (2026 Guide) | "roof repair cost Christiansburg VA" |
| 3 | Gutter Installation Cost in Roanoke VA | "gutter installation cost Roanoke" |
| 4 | Is a Metal Roof Worth It? ROI Breakdown for Virginia Homes | "is metal roof worth it" |
| 5 | How Much Do Seamless Gutters Cost in Virginia? | "seamless gutters cost Virginia" |
| 6 | Roof Replacement Financing Options in Virginia | "roof financing Virginia" |

### 3B — Local SEO Posts (city-specific)

| # | Title | Target Keyword |
|---|-------|----------------|
| 7 | Best Roofing Company in Blacksburg VA (2026) | "best roofing company Blacksburg VA" |
| 8 | Roofing Contractors in Salem VA: What to Look For | "roofing contractors Salem VA" |
| 9 | New River Valley Storm Season: Protect Your Roof | "storm damage New River Valley" |
| 10 | Smith Mountain Lake Home Roofing: Special Considerations | "roofing Smith Mountain Lake" |
| 11 | Roanoke VA Roofing Guide for First-Time Homeowners | "roofing Roanoke VA guide" |
| 12 | Bedford VA Roof Replacement: Neighborhoods We've Served | "roof replacement Bedford VA" |

### 3C — Educational / Informational Posts (build authority)

| # | Title | Target Keyword |
|---|-------|----------------|
| 13 | Standing Seam vs Exposed Fastener Metal Roofing | "standing seam vs exposed fastener" |
| 14 | What Color Roof Is Best for Your Virginia Home? | "best roof color" |
| 15 | How Roof Ventilation Works (And Why It Matters) | "roof ventilation explained" |
| 16 | What Is a Drip Edge and Why Does Your Roof Need One? | "drip edge roofing" |
| 17 | Attic Insulation and Your Roof: The Connection | "attic insulation roof" |
| 18 | What Happens During a Professional Roof Inspection? | "what happens roof inspection" |
| 19 | How to Choose Between Roof Repair and Replacement | "repair vs replace roof" |
| 20 | Virginia Building Codes for Roofing: What Homeowners Should Know | "Virginia roofing building codes" |
| 21 | The Truth About Roof Algae and Black Streaks | "roof algae black streaks" |
| 22 | How Wind Speed Ratings Work for Roofing Shingles | "shingle wind rating" |
| 23 | Understanding Roof Pitch: Why Slope Matters | "roof pitch explained" |
| 24 | What Is Flashing and Why Does It Fail? | "roof flashing failure" |

### 3D — Seasonal / Timely Content

| # | Title | Target Keyword |
|---|-------|----------------|
| 25 | Fall Roof Prep Checklist for Virginia Homeowners | "fall roof maintenance Virginia" |
| 26 | Summer Heat and Your Roof: What You Should Know | "heat damage roof" |
| 27 | Should You Replace Your Roof Before Winter in Virginia? | "replace roof before winter" |
| 28 | Post-Storm Roof Damage Checklist (Printable) | "storm damage checklist" |
| 29 | When Is the Best Time to Replace Your Roof in Virginia? | "best time replace roof Virginia" |

### 3E — Trust / Social Proof Posts

| # | Title | Target Keyword |
|---|-------|----------------|
| 30 | Why We Use GAF Timberline HDZ Shingles on Every Job | "GAF Timberline HDZ review" |
| 31 | Our Roof Replacement Process: What to Expect Step by Step | "roof replacement process" |
| 32 | What Makes a GAF Master Elite Contractor Different? (Our Story) | "GAF Master Elite contractor" |
| 33 | Real Roof Replacement Photos: Before and After Gallery | "roof replacement before after" |
| 34 | How We Handle Storm Damage Claims (Case Study) | "storm damage claim process" |
| 35 | Timber Seal Explained: Why Wood Preservation Matters | "timber seal wood preservation" |

### 3F — New Service Category Posts (for confirmed new services)

| # | Title | Target Keyword |
|---|-------|----------------|
| 36 | Commercial Roofing in Virginia: What Business Owners Need to Know | "commercial roofing Virginia" |
| 37 | TPO vs EPDM: Best Flat Roof Materials for Virginia Businesses | "TPO vs EPDM Virginia" |
| 38 | How Much Does Commercial Roof Replacement Cost in Roanoke? | "commercial roof cost Roanoke" |
| 39 | Vinyl Siding vs James Hardie Fiber Cement: Virginia Comparison | "vinyl vs fiber cement siding Virginia" |
| 40 | Signs You Need New Siding on Your Virginia Home | "signs need new siding" |
| 41 | Skylight Installation Guide: Costs, Benefits, and What to Expect | "skylight installation cost Virginia" |
| 42 | Roof Coatings: How to Extend Your Roof's Life by 10+ Years | "roof coating extend life" |
| 43 | HOA Roofing Requirements in Virginia: What You Need to Know | "HOA roofing requirements Virginia" |
| 44 | Flat Roof Maintenance: Preventing Ponding and Leaks | "flat roof maintenance tips" |
| 45 | Best Siding Colors for Virginia Mountain Homes | "best siding colors Virginia" |

**Total Strategy 3: 45 new blog posts**

---

## STRATEGY 4: New Standalone Pages

### 4A — Pages Competitors Have That MDR Is Missing

| Page | Slug | Why It Matters |
|------|------|---------------|
| Reviews / Testimonials Hub | /reviews | Dedicated page ranks for "modern day roofing reviews" |
| Meet the Team | /about/team | Trust signal, ranks for company name searches |
| Our Process | /our-process | Conversion page showing step-by-step workflow |
| Warranty Information | /warranty | Ranks for "roofing warranty Virginia", builds trust |
| Careers | /careers | Ranks for "roofing jobs [city] VA" (8+ searches/mo per city) |
| Community / Giving Back | /community | Like Cenvar's "Cenvar Gives" — humanizes brand |
| Project Showcase | /projects | Like Cenvar's "Recent Roofing Jobs" — detailed case studies |
| Referral Program | /referral-program | CONFIRMED: needs dedicated page with program details, form, incentive structure |
| Roof Estimator / Calculator | /roof-cost-estimator | Interactive tool — HUGE engagement & lead gen |
| Emergency Roofing | /emergency | Ranks for "emergency roof repair near me" |

**10 new standalone pages**

### 4B — Resource / Guide Pages (Pillar Content)

| Page | Slug | Why It Matters |
|------|------|---------------|
| Complete Homeowner's Guide to Roofing in Virginia | /guides/roofing-guide-virginia | Pillar page linking to all blog posts |
| Storm Damage Resource Center | /guides/storm-damage-guide | Pillar for all storm-related content |
| Roof Material Comparison Guide | /guides/roofing-materials | Pillar linking to material comparison posts |

**3 pillar pages** (long-form, 2000+ words, linking to related blog posts)

---

## STRATEGY 5: Image Audit & Management

### Current Problem
- Many pages share the same stock/generic photos
- Images aren't matched to specific service or city context
- Google Drive has real project photos that should replace stock images

### Image Audit Plan

**Step 1: Google Drive Inventory**
- Access Google Drive folder: https://drive.google.com/drive/folders/1Dwt8sntKh0hH5twoyMQTk4MUHWje6vke
- Catalog every image with: filename, description, which service it relates to, which city (if identifiable)
- Tag images by service type: replacement, repair, metal, shingle, gutters, storm damage, timber seal

**Step 2: Page-to-Image Mapping**
Create a mapping spreadsheet:

| Page | Current Image(s) | Needed Image Type | Best Drive Match | Generate? |
|------|------------------|-------------------|-----------------|-----------|
| /services/roof-replacement | [current] | Crew working on roof, completed job | [match] | If needed |
| /services/metal-roofing | [current] | Metal roof close-up, finished metal roof | [match] | If needed |
| /areas/roanoke | [current] | Roanoke skyline/neighborhood with roof | [match] | Yes likely |
| ... | ... | ... | ... | ... |

**Step 3: Image Generation for Gaps (use `/nano-banana-pro` skill)**
Use the NanoBanana Pro skill (Gemini 3.1 Flash Image) to generate:
- City-specific hero images (Roanoke skyline, Blue Ridge Mountains backdrop)
- Neighborhood-specific images (Cave Spring homes, Grandin Village architecture)
- Service-specific action shots that don't exist in Drive
- Before/after composites for the gallery
- Supports text-to-image + image-to-image editing, 14 aspect ratios, up to 4K

**Step 4: No Repeats Rule**
- Each page gets unique primary image
- Service pages: show the actual service being performed
- Area pages: show local landmarks or neighborhoods
- Blog posts: topically relevant header image

**Generation style guide (to match "Rugged Premium Light" design):**
- Warm natural lighting, not overly processed
- Real-looking (not obviously AI-generated)
- Include Virginia landscape elements where possible
- Professional crew shots, clean job sites
- Consistent color temperature across generated images

---

## STRATEGY 6: Innovative & Accretive SEO Opportunities

### 6A — Interactive Roof Cost Estimator (HIGHEST IMPACT)
Build an interactive calculator at /roof-cost-estimator:
- User enters: roof size (or sq footage of home), material preference, city
- Shows: estimated price range, financing options
- Captures: lead information (email, phone) before showing detailed estimate
- **Why:** Cenvar has one. It's the #1 lead gen tool for roofing sites. Targets "how much does a roof cost" searches.

### 6B — Neighborhood-Level Pages (Researched via Perplexity API)

Go deeper than city-level. Create pages for specific neighborhoods where homeowners actually search.

#### Roanoke Area Neighborhoods (20 targets)

| Priority | Neighborhood | Why Target |
|----------|-------------|------------|
| HIGH | Cave Spring | Top-rated suburb, large family homes, strong search volume |
| HIGH | Grandin Village | Historic turn-of-century homes, active homeowner community |
| HIGH | South Roanoke | Historic homes, parks, high property values |
| HIGH | Hollins | Residential + university area, easy access to amenities |
| HIGH | Old Southwest | Historic district, Victorian/Craftsman homes needing maintenance |
| MED | Raleigh Court | Walkable, early 20th-century homes near medical centers |
| MED | Hunting Hills | Estate-like homes, low turnover, high-value roofing jobs |
| MED | Wasena | 1920s suburb along Roanoke River, older roofs |
| MED | Bonsack | Affordable community with good commutes |
| MED | Downtown Roanoke | Walkable core with residential options |
| MED | Forest Hills | Safe family area with turn-of-the-century homes |
| MED | Villa Heights | 1920s-1960s homes near Roanoke Country Club |
| LOW | Williamson Road | Popular real estate area |
| LOW | Greater Deyerle | Established residential community |
| LOW | Franklin-Colonial | Established neighborhood |
| LOW | Melrose-Rugby | Streetcar history, unique older homes |
| LOW | Gainsboro | Cultural history, community roots |
| LOW | Washington Park | Central area, 1920-1960 homes |
| LOW | Loudon-Melrose | Renewed investment, diverse homes |
| LOW | Shenandoah West | West-central residential |

#### Christiansburg / NRV Neighborhoods (15 targets)

| Priority | Neighborhood | Why Target |
|----------|-------------|------------|
| HIGH | Clifton Town Center | New construction community — new roofs need maintenance programs |
| HIGH | Hethwood-Prices Fork | Blacksburg area, established residential |
| HIGH | Downtown Blacksburg | Core neighborhood, near Virginia Tech |
| HIGH | East Town Central | Popular Christiansburg neighborhood |
| MED | Stafford Farms | Christiansburg community |
| MED | Diamond Hill | Christiansburg community |
| MED | Kensington | Christiansburg community |
| MED | Ellett-Jennelle | Near Christiansburg, active listings |
| MED | Panhandle | Christiansburg neighborhood |
| MED | 114 Corridor | Christiansburg area |
| LOW | Westhill (Blacksburg) | Multiple housing types |
| LOW | The Preserve | Near Christiansburg |
| LOW | Fiddler's Green | Blacksburg community |
| LOW | Kabrich Crescent | Blacksburg neighborhood |
| LOW | Farmview-Ramble | Near Christiansburg |

**Page URL pattern:** `/areas/roanoke/cave-spring`, `/areas/christiansburg/clifton-town-center`
**Target keywords:** "roofing contractor Cave Spring Roanoke VA", "roof replacement Hollins VA"
**Estimated pages:** HIGH priority first = 8 Roanoke + 3 NRV = **11 neighborhood pages in Wave 4**, expanding to 35 total
- **Why:** Hyper-local searches have lower competition and higher intent. A homeowner in Cave Spring searching "roofer Cave Spring VA" will click a page that names their neighborhood over a generic "Roanoke" page.

### 6C — Review Schema Markup on Every Page
Add AggregateRating JSON-LD to service pages and area pages. This gets star ratings in Google search results.
```json
{
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "reviewCount": "231",
  "bestRating": "5"
}
```

### 6D — FAQ Schema on Every Service Page
Add FAQPage JSON-LD to every service and area page. This gives expandable FAQ rich results in Google, taking up more SERP real estate.

### 6E — Video Content Integration
- Embed project walk-through videos on service pages
- Create short "How we do [service]" videos for each service page
- YouTube videos rank independently AND boost page SEO
- **Action:** Film 3-5 minute videos of actual jobs, embed on relevant pages

### 6F — Google Business Profile Posts
- Weekly GBP posts linking to new blog content
- Post before/after photos with service + city tags
- **Why:** GBP posts boost Map Pack rankings, the #1 source of roofing leads

### 6G — Internal Linking Mesh
Build a strategic internal linking structure:
- Every blog post links to relevant service page(s) + area page(s)
- Every service page links to 2-3 related blog posts
- Every area page links to available services in that area
- Breadcrumb navigation with JSON-LD on every page (already exists)
- **Why:** Internal links are the most underrated SEO lever

### 6H — Google Ads Landing Pages (Subdomain Strategy)
**CONFIRMED:** Google Ads planned for future. MDR is considering subdomains for ad traffic.
- **Subdomain approach:** `ads.moderndayroof.com/roofing-roanoke-va`
- Keeps ad landing pages separate from organic site
- Can be more aggressive with CTAs without hurting organic SEO
- Top 3 cities first: Roanoke, Christiansburg, Blacksburg
- **Note:** Build these when Google Ads launch is confirmed. Not in current wave plan.

### 6I — Seasonal Storm Damage Landing Page
Create a dynamic landing page that activates during storm season:
- /storm-season — "Virginia Storm Season Roof Protection"
- Tie into weather alerts, emergency response messaging
- **Why:** Storm-related searches spike 500-1000% during events

### 6J — Competitor Comparison Pages
Create tasteful comparison content:
- "MDR vs. Getting Multiple Roofing Quotes: Why You Only Need One"
- "What to Look for in a Roanoke Roofing Contractor (Checklist)"
- **Why:** Captures comparison-shopping traffic

### 6K — AI-Powered Roof Damage Assessment
Add a feature where homeowners can upload a photo of their roof, and AI provides a preliminary damage assessment. This is genuinely innovative:
- Generates massive engagement and leads
- Creates shareable/viral content ("Check your roof damage for free")
- Positions MDR as technologically advanced
- Implementation: Gemini Vision API to analyze uploaded photos

---

## STRATEGY 7: Comprehensive Backlink & Internal Linking Strategy

### 7A — Internal Link Silo Architecture

Build a strategic internal linking mesh across the entire site. Every page should link to and from related pages to distribute authority and improve crawlability.

**Silo Structure:**
```
Homepage
├── /services (hub)
│   ├── /services/roof-replacement → links to: area combo pages, related blog posts, gallery
│   ├── /services/commercial-roofing → links to: flat roofing, coatings, area combos
│   ├── /services/siding → links to: area combos, siding blog posts
│   └── (all services cross-link to related services)
├── /areas (hub)
│   ├── /areas/roanoke → links to: all roanoke service combos, roanoke blog posts, roanoke neighborhoods
│   ├── /areas/christiansburg → links to: all christiansburg combos, NRV blog posts
│   └── (area pages link to sibling areas in same hub)
├── /blog (hub)
│   └── Every post links to 2-3 service pages + 1-2 area pages
└── Standalone pages cross-link to relevant services + areas
```

**Specific Internal Linking Rules:**
1. **Every service page** links to: 3 related blog posts, 2-3 top city combo pages, parent/child services, gallery
2. **Every area page** links to: all services available in that area, 2 local blog posts, sibling areas, hub page
3. **Every area+service combo page** links to: parent service, parent area, 2 related blog posts, CTA to contact
4. **Every blog post** links to: 1-2 service pages (contextual), 1 area page (if locally relevant), related posts
5. **Footer sitewide:** Top 5 services, top 5 areas, latest 3 blog posts
6. **Sidebar/related content widgets** on blog posts: "Services mentioned in this article", "We serve these areas"

**Anchor Text Strategy:**
- Use natural, keyword-rich anchors: "roof replacement in Roanoke" (not "click here")
- Vary anchors across pages to avoid over-optimization
- Use exact-match for service+city combos: "storm damage repair Christiansburg VA"

### 7B — External Backlink Acquisition

**Tier 1 — Local Citations & Directories (50+ submissions)**

| Directory | Priority | Action |
|-----------|----------|--------|
| Google Business Profile | CRITICAL | Fully optimize, weekly posts, respond to all reviews |
| Yelp | HIGH | Claim, optimize, add photos |
| Angi (Angie's List) | HIGH | Claim business page |
| HomeAdvisor | HIGH | List with all service categories |
| BBB (Better Business Bureau) | HIGH | Get accredited, A+ rating |
| NRCA (National Roofing Contractors Association) | HIGH | Member listing |
| GAF Contractor Locator | HIGH | Already Master Elite — ensure listing links to site |
| Nextdoor | HIGH | Already have page — optimize with service keywords |
| Houzz | MED | Create profile with project photos |
| Thumbtack | MED | List services |
| Porch.com | MED | Contractor listing |
| Roanoke Regional Chamber of Commerce | MED | Member listing with backlink |
| Montgomery County Chamber of Commerce | MED | Member listing |
| Virginia DPOR (contractor license) | MED | Verify listing links back |

**Tier 2 — Local Partnership Backlinks**

| Partner Type | Backlink Tactic |
|-------------|----------------|
| Real estate agents (Roanoke/NRV) | "Recommended contractors" page link exchange |
| Insurance agents | "Preferred roof repair" resource page |
| HOA management companies | Vendor list inclusion |
| Local news (Roanoke Times, NRV News) | Press releases for community work, storm response |
| Home inspectors | Cross-referral resource pages |
| Building supply stores | Partner/contractor spotlight |

**Tier 3 — Content-Driven Backlinks**

| Tactic | How |
|--------|-----|
| Storm response content | After storms, publish timely content → pitch to local news for links |
| Before/after case studies | Detailed project stories → pitch to home improvement blogs |
| Community involvement | Sponsor local events → earn sponsor page backlinks |
| Expert roundups | Contribute to "best roofers in Virginia" articles |
| Video embeds | YouTube videos embedded on external sites create backlinks |
| Infographics | "Cost of Roofing in Virginia" infographic → shareable, earnable links |

**Quarterly Backlink Targets:**
- Q1: 30 local citations submitted, 5 partnership backlinks secured
- Q2: 10 content-driven backlinks, 5 more partnerships
- Ongoing: Weekly GBP posts, monthly press releases for community/storm content

### 7C — NAP Consistency Audit
Ensure Name, Address, Phone is IDENTICAL across all listings:
- **Name:** Modern Day Roofing
- **Christiansburg:** 80 College St. STE R, Christiansburg, VA 24073
- **Roanoke:** 2740 Franklin Rd SW, Roanoke, VA 24014
- **Phone:** (540) 553-6007
- **Website:** https://moderndayroof.com

Any variation (e.g., "Modern Day Roof" vs "Modern Day Roofing", "Suite R" vs "STE R") hurts local SEO.

---

## STRATEGY 8: SEO Skill Execution Pipeline

**Use these PAI skills systematically during each wave of execution:**

### Skill 1: `/keyword-research` (RUN BEFORE EACH WAVE)
- Run for each new service category before building pages
- Identifies exact search volumes, difficulty scores, and content gaps
- Outputs prioritized keyword clusters to `./brand/keyword-plan.md`
- **When:** Before Wave 1, before Wave 2, before Wave 3
- **Example runs:**
  - `/keyword-research` for "commercial roofing Virginia" cluster
  - `/keyword-research` for "siding contractor Virginia" cluster
  - `/keyword-research` for "flat roofing Virginia" cluster
  - `/keyword-research` for "[neighborhood] roofing" clusters

### Skill 2: `/seo-content` (RUN FOR EACH BLOG POST & PILLAR PAGE)
- Takes target keyword → produces publication-ready article
- Performs live SERP analysis, integrates People Also Ask
- Generates Article + FAQ JSON-LD schema markup
- **When:** Every blog post in Waves 1-4
- **Process per post:**
  1. Run `/keyword-research` for the target keyword cluster
  2. Run `/seo-content` with the target keyword
  3. Run `/de-ai-ify` to ensure human voice
  4. Upload to Sanity CMS as blog post

### Skill 3: `/seo-audit` (RUN QUARTERLY)
- Full technical SEO audit of moderndayroof.com
- Identifies: missing meta tags, broken links, crawl issues, schema gaps, page speed
- **When:**
  - Before Wave 1 starts (baseline audit)
  - After Wave 2 completes (mid-build check)
  - After Wave 4 completes (final audit)
  - Then quarterly ongoing

### Skill 4: `/nano-banana-pro` (USE FOR ALL IMAGE GENERATION)
- NanoBanana Pro skill for Gemini-powered image generation
- Use for: city-specific hero images, service photos, blog header images
- Generate at 2K+ resolution, match "Rugged Premium Light" design system
- **Process:**
  1. Check Google Drive for real photo match first
  2. If no match → use `/nano-banana-pro` with detailed prompt
  3. Upload generated image to Sanity asset pipeline
  4. Assign to specific page — NO REPEATS

### Blog Content Pipeline (Skill Chain)
For each blog post:
```
/keyword-research → /seo-content → /de-ai-ify → upload to Sanity
```

For pillar/guide pages:
```
/keyword-research → /seo-content (long-form mode) → /de-ai-ify → build as Astro page
```

---

## Priority Execution Roadmap

### Pre-Wave — SEO Baseline (Day 1)
1. Run `/seo-audit` on moderndayroof.com (baseline report)
2. Run `/keyword-research` for core roofing keywords in SW Virginia
3. Submit to 20 local citations/directories (NAP consistency)
4. Set up GBP posting schedule

### Wave 1 — Quick Wins (Week 1-2) — ~30 pages + backlinks
**Pages:**
1. Roof Inspection service page (1 page — it's literally missing)
2. Commercial Roofing parent + 4 sub-pages (5 pages)
3. Top 5 cities x Roof Replacement combo pages (5 pages)
4. Emergency Roofing standalone page (1 page)
5. Reviews/Testimonials hub page (1 page)
6. Warranty Information page (1 page)
7. Referral Program page with details, form, incentives (1 page)
8. Storm Damage sub-pages: wind, hail, emergency, insurance (4 pages)
9. 6 high-intent blog posts via `/seo-content` → `/de-ai-ify` pipeline
10. AggregateRating JSON-LD site-wide (231 reviews, 5.0 stars)
11. FAQ schema on all service + area pages

**Backlinks:**
12. Submit remaining 30 local citations/directories
13. Reach out to 5 local real estate agents for partnership backlinks
14. Internal linking: connect all new pages into silo structure

### Wave 2 — Core Expansion (Week 3-4) — ~40 pages + backlinks
**Run `/keyword-research` for new service categories before building**

**Pages:**
1. Flat Roofing parent + TPO, EPDM, Modified Bitumen (4 pages)
2. Siding parent + Vinyl, Fiber Cement, Repair (4 pages)
3. Skylights + Skylight Repair (2 pages)
4. Roof Coatings + Silicone Coating (2 pages)
5. Top 5 cities x Roof Repair combo pages (5 pages)
6. Top 5 cities x Storm Damage combo pages (5 pages)
7. Gutter sub-pages: seamless, guards, repair (3 pages)
8. Meet the Team, Our Process, Careers pages (3 pages)
9. 10 local SEO blog posts via `/seo-content` pipeline (city-specific)
10. Pillar pages: Roofing Guide, Storm Guide (2 pages)
11. Image audit + replacement via Google Drive + `/nano-banana-pro`

**Backlinks:**
12. 5 insurance agent partnership backlinks
13. Chamber of Commerce memberships (Roanoke + Montgomery County)
14. Run `/seo-audit` mid-build check
15. Full internal linking audit — ensure every page links to 3+ related pages

### Wave 3 — Scale (Week 5-8) — ~60 pages + backlinks
**Pages:**
1. Remaining 10 cities x top 3 services (30 pages)
2. Top 5 cities x Commercial Roofing, Siding, Flat Roofing combos (15 pages)
3. Roof Cost Estimator interactive tool (1 tool)
4. 10 educational blog posts via `/seo-content` pipeline
5. Project Showcase page with case studies
6. Community/Giving Back page
7. Embed Alicia's videos on service pages (when received)

**Backlinks:**
8. Pitch storm response content to Roanoke Times / local news
9. Create shareable infographic: "Cost of Roofing in Virginia 2026"
10. 5 home inspector partnership backlinks
11. Weekly GBP posts linking to new content

### Wave 4 — Full Scale + Innovation (Week 9-12) — ~100+ pages
**Run `/keyword-research` for neighborhood keywords before building**

**Pages:**
1. All cities x remaining services (Metal, Gutters, Siding, Skylights, Coatings combos) (60+ pages)
2. HIGH priority neighborhood pages: 8 Roanoke + 3 NRV = 11 pages
3. MED priority neighborhood pages: 10+ additional pages
4. Remaining blog posts to hit 55+ total (15+ posts via `/seo-content`)
5. Blog posts for new service categories (commercial, siding, skylights, flat roofing)
6. AI Roof Damage Assessment tool (Gemini Vision API)

**Backlinks:**
7. Expert roundup contributions to home improvement blogs
8. Video embeds on external sites (once Alicia's videos are live)
9. Run final `/seo-audit` — comprehensive post-build check
10. Full internal linking pass — ensure 300+ page site is fully meshed

---

## Technical Implementation Notes

### For Location+Service Combo Pages
**Option A (Recommended):** New Astro dynamic route at `src/pages/areas/[area]/[service].astro`
- Query both serviceArea and service by slug
- Merge content: area-specific intro + service details + local testimonials
- Generate static paths from all valid combinations

**Option B:** New Sanity document type `serviceAreaService` with references to both
- More CMS control but more content to manage
- Better for unique per-page content

### For Blog Expansion
- Use existing blogPost schema — it's solid
- Add new categories: "Cost & Pricing", "Local Guides", "DIY & Tips", "Case Studies"
- Each post: 800-1500 words, 1 unique featured image, internal links to 2+ service/area pages

### For Image Generation
- NanoBanana Pro via Gemini API (key saved to .env)
- Generate at 2K resolution minimum
- Upload to Sanity asset pipeline
- Style: warm, natural, Virginia landscape elements

---

## Questions for Colin — ANSWERED 2026-03-27

1. ~~Does MDR do any commercial roofing work?~~ **YES** — Commercial Roofing confirmed. 5 pages added.
2. ~~Does MDR offer siding, skylights, or window services?~~ **YES** — Siding (4 pages), Skylights (2 pages) confirmed.
3. ~~Does MDR do flat roofing (TPO, EPDM)?~~ **YES** — Flat Roofing confirmed. 4 pages added.
4. ~~Does MDR do roof coatings?~~ **YES** — Roof Coatings confirmed. 2 pages added.
5. ~~Are there specific neighborhoods in Roanoke/Christiansburg you'd want individual pages for?~~ **YES** — Researched via Perplexity API. 20 Roanoke + 15 NRV neighborhoods identified. See Strategy 6B.
6. ~~Do you have any video content of jobs being done?~~ **YES** — Alicia sending videos next week (week of 2026-03-30).
7. ~~Is there a referral program page that should exist?~~ **YES** — Confirmed. Dedicated /referral-program page in Wave 1.
8. ~~How many Google reviews does MDR have?~~ **231 reviews, 5.0 stars**
9. ~~Any plans for Google Ads?~~ **YES, future.** Subdomain approach (ads.moderndayroof.com). Build when ads launch is confirmed.

**All questions answered. Plan is fully executable.**

---

## Expected Impact

| Metric | Current | After Wave 1 | After Wave 2 | After All Waves |
|--------|---------|-------------|-------------|-----------------|
| Total Indexable Pages | ~45 | ~75 | ~115 | 300+ |
| Service Pages | 8 | 15 | 25 | 25 |
| Location Pages | 17 | 17 | 17 | 17 |
| Location+Service Combos | 0 | 5 | 15 | 150 |
| Neighborhood Pages | 0 | 0 | 0 | 35 |
| Blog Posts | 15 | 21 | 31 | 60+ |
| Standalone Pages | 8 | 13 | 18 | 20+ |
| External Backlinks (est.) | ~10 | ~50 | ~80 | ~150+ |
| Internal Links (per page avg) | ~3 | ~5 | ~6 | ~8 |
| Estimated Monthly Organic Traffic | ~200-500 | ~1,000-2,000 | ~3,000-5,000 | ~8,000-15,000 |

**Note:** With 5 new service categories, 35 neighborhood pages, and comprehensive backlink strategy, MDR's total addressable keyword space expands dramatically. 231 five-star reviews boost CTR by ~20-35% in SERPs. Backlink acquisition compounds over time.

---

## Appendix: Competitor Page Count Comparison

| Category | MDR (Current) | Cenvar | Roman | MDR (Target) |
|----------|--------------|--------|-------|--------------|
| Service Pages | 8 | 12+ | 25+ | 25 |
| Location Pages | 17 | 25+ | 35+ | 17 hubs |
| Neighborhood Pages | 0 | 0 | 0 | 35 |
| Location+Service Combos | 0 | ~50 | 150+ | 150 |
| Blog Posts | 15 | 100+ | 30+ | 60+ |
| Resource/Tool Pages | 1 (FAQ) | 5+ | 5+ | 5+ |
| Company Pages | 5 | 7+ | 8+ | 13+ |
| **Total** | **~45** | **~200** | **~250** | **~305+** |

**MDR will SURPASS both competitors in total page count after all 4 waves. No competitor has neighborhood-level pages — this is a unique advantage.**

---

## Appendix: SEO Skill Execution Schedule

| When | Skill | Target |
|------|-------|--------|
| Pre-Wave (Day 1) | `/seo-audit` | Baseline site audit |
| Pre-Wave (Day 1) | `/keyword-research` | Core roofing + location keywords |
| Wave 1 (6x) | `/seo-content` + `/de-ai-ify` | 6 cost/pricing blog posts |
| Wave 2 (start) | `/keyword-research` | New service category keywords |
| Wave 2 (10x) | `/seo-content` + `/de-ai-ify` | 10 local SEO blog posts |
| Wave 2 (end) | `/seo-audit` | Mid-build check |
| Wave 3 (10x) | `/seo-content` + `/de-ai-ify` | 10 educational blog posts |
| Wave 4 (start) | `/keyword-research` | Neighborhood keywords |
| Wave 4 (15x) | `/seo-content` + `/de-ai-ify` | 15 final blog posts |
| Wave 4 (end) | `/seo-audit` | Final comprehensive audit |
| Ongoing | `/nano-banana-pro` | Image generation for all pages |
| Quarterly | `/seo-audit` | Ongoing monitoring |
