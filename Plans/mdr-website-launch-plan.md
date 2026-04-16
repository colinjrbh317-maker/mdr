# MDR Website Pre-Launch Change Plan
**Source:** Meeting with Alicia (CMO) — April 13, 2026
**Target launch:** 2–4 weeks from April 13 (late April / early May 2026)
**Status:** Planning phase

---

## ⚠️ BLOCKERS

### 1. GWS Drive Auth Broken
The Google Workspace OAuth client was deleted. Running `gws drive files list` returns 401. Need to re-authenticate before pulling any assets from MDR-assets Drive folder.
- **Fix:** Run `gws generate-skills` or re-authorize GWS CLI
- **Blocked tasks:** Favicon upload, before/after photos, Hearth widget embed, metal roof photos

### 2. Alicia's Action Items (blocks these tasks)
- ✋ Updated roof count / stats (replaces "600+")
- ✋ Hearth calculator widget embed code (from assets)
- ✋ Labeled before/after photos with roof type
- ✋ More gutter photos
- ✋ Roofing systems component photos (deck, ice barrier, etc.)
- ✋ Correct certification badges (replacing old 3-star)
- ✋ Community events content (CTE takeover, annual giveaway, veterans)
- ✋ Google Search Console — set up with full permissions, give Colin access
- ✋ HotJar — set up tracking
- ✋ Google Ads campaign structure from assets (for landing page copy alignment)

---

## TRACK A — Bug Fixes (Do First, No Dependencies)

| # | Task | Location | Notes |
|---|------|----------|-------|
| A1 | Fix team photo rotation | About page | Rodrigo, AJ, Paul all rotated ~270° — fix EXIF orientation |
| A2 | Fix "Schedule Inspection" button | About page | White text on white background — fix contrast |
| A3 | Fix Wytheville location photo | `/areas/wytheville` | Current photo looks too urban/dense — swap for rural image |
| A4 | Fix credentials badges | About page | Remove old 3-star badge *(need correct badge from Alicia)* |
| A5 | Loosen spam filter | `src/lib/spam-filter.ts` | Make lenient — 1-2 spam/day acceptable vs. losing real leads |
| A6 | Update Google rating stat | Homepage | 4.9 → 5.0 |
| A7 | Make "Get Free Quote" text clickable | Services pages | Mentioned as not linked during walkthrough |

---

## TRACK B — CRO / Popup Strategy Overhaul

**New strategy:**
- **Everywhere:** 0% financing angle (announcement bar, hero, service pages, inline CTAs)
- **Exit intent:** $500 off — last-resort save
- **Engagement popup:** $500 off — triggers after 5min + intent signals (no form submitted)
- **Ad traffic:** $500 off — show on landing page as sticky banner or fast-trigger popup

| # | Task | Details |
|---|------|---------|
| B1 | Update announcement bar | Replace current message with **"0% Down Financing Available — Apply in Minutes"** |
| B2 | Add financing CTA to homepage hero | Inline "0% Down" badge/callout near primary CTA |
| B3 | Add 0% financing banner to Full Replacement page | Banner across page + inline CTA block — financing is where full replacement leads convert |
| B4 | Remove $500 off from inline services promo | Replace with 0% financing promo in that slot |
| B5 | Update exit intent popup | Keep as $500 off — confirm this is already working |
| B6 | Build engagement-based popup | Triggers when: 5min on site + intent signals (3+ clicks OR 2+ page views OR hover on CTA) AND no form submitted AND no call button clicked → show $500 off popup |
| B7 | Ad landing page sticky banner | Show $500 off as sticky bottom banner on all `/lp/*` pages |

---

## TRACK C — Referral Form Overhaul

| # | Task | Details |
|---|------|---------|
| C1 | Build two-tab referral form | **Tab 1 — "I'm Referring Someone":** Your name + contact → Their name + contact<br>**Tab 2 — "I Was Referred":** Your name + contact → Who referred you (name) |
| C2 | Tag referral leads in AccuLynx | Set `parentLeadSource = "Referral"` for all referral form submissions |
| C3 | Ensure both names captured in payload | Both referrer + referee names sent to CRM |

---

## TRACK D — Financing Page / Quiz Updates

| # | Task | Details |
|---|------|---------|
| D1 | Replace payment estimate widget with Hearth calculator | Show Hearth calculator embed **only on results screen** (after info captured) *(needs Hearth embed from assets)* |
| D2 | Update low-credit-score result copy | Change from "Great news!" → **"You may still qualify — and it won't affect your credit"**. Add: "No credit effect until you're funded through Hearth — not even a soft pull." |
| D3 | Add "looking at multiple options" to roof type quiz | Add tab/option: "Comparing shingles & metal" — alongside shingle, metal, flat/low-slope, not sure |

---

## TRACK E — Google Ads Landing Pages (8 pages)

All landing pages:
- **NOT indexed** (`<meta name="robots" content="noindex">` + excluded from sitemap)
- Dynamic location insertion based on geo (Roanoke / Christiansburg / NRV / fallback: "Near You")
- Minimal nav (logo only), no distractions, strong single CTA
- $500 off sticky banner
- Form that feeds AccuLynx with `leadSource` matching campaign

| Page URL | Campaign | Headline angle | CTA |
|----------|----------|----------------|-----|
| `/lp/roof-repair` | Roof Repair 07/06/24 | "Fast, Reliable Roof Repair in [Location]" | Book Free Inspection |
| `/lp/roof-replacement` | Roof Replacement 07/02/24 | "Full Roof Replacement in [Location] — 0% Down Financing" | Get Free Estimate |
| `/lp/roof-inspection-christiansburg` | Roof Inspection Christiansburg | "Free Roof Inspection in Christiansburg, VA" | Book Inspection |
| `/lp/roof-inspection-roanoke` | Roof Inspection Roanoke | "Free Roof Inspection in Roanoke, VA" | Book Inspection |
| `/lp/roof-financing` | Roof Financing & Cost | "Roof Financing in [Location] — 0% Down, Low Monthly Payments" | Check If I Qualify |
| `/lp/branded` | Branded | "Modern Day Roofing — [Location]'s Trusted Roofer" | Get Free Quote |
| `/lp/roofing-company` | Roofing Company 07/02/24 | "Top-Rated Roofing Company in [Location]" | Get Free Estimate |
| `/lp/competitors` | Competitors | "Why Homeowners in [Location] Choose MDR Over the Rest" | Get Free Quote |

---

## TRACK F — Content & Photos (requires Alicia's assets)

| # | Task | Dependency |
|---|------|------------|
| F1 | Update "600+ roofs" stat | ✋ Alicia to confirm new number (or use "10,000+ squares installed") |
| F2 | Add before/after photos | ✋ Alicia to provide labeled photos from Drive assets |
| F3 | Metal roof section — 3 categories | ✋ Alicia to label: Timber Steel (metal shingle) / Standing Seam / [3rd type] |
| F4 | Roofing systems page photos | ✋ Alicia to provide component photos (deck, ice barrier, etc.) |
| F5 | Gutter photos | ✋ Alicia to provide gutter job photos |
| F6 | Community events content | ✋ Alicia to provide: CTE takeover, annual giveaway, veterans giveaway details |
| F7 | Update certification badges | ✋ Alicia to confirm correct badge level + provide assets |
| F8 | Favicon | ✋ Pull from MDR-assets Drive (once GWS auth fixed) |

---

## TRACK G — SEO / Tech (some have dependencies)

| # | Task | Dependency |
|---|------|------------|
| G1 | Google Search Console setup | ✋ Alicia setting up with full permissions |
| G2 | Sitemap — verify all pages included, LP pages excluded | None |
| G3 | Review widget sync from Google | Auto-sync every few days — currently only 5-star reviews show (confirmed correct) |

---

## Stats to Update (Homepage)

| Current | New | Notes |
|---------|-----|-------|
| 4.9 rating | 5.0 | Alicia confirmed |
| "600+" roofs | **1,000+ Roofs Installed** | Round number, safe to use |
| *(no sq ft stat)* | **10,000+ Squares Installed Last Year** | Alicia confirmed this number in meeting — add as second stat |

---

## Priority Order (suggested execution sequence)

**Week 1 — Can build now:**
1. Track A bug fixes (A1–A7)
2. Track B popup/CRO strategy (B1–B7)
3. Track C referral form (C1–C3)
4. Track D financing quiz updates (D1–D3) — minus Hearth embed until assets available
5. Track E landing pages (E — all 8)

**Week 2 — When assets arrive from Alicia:**
6. Track F content/photos (F1–F8)
7. Favicon + certification badges
8. Track G SEO/tech (G1–G3)

**Before go-live:**
- Full QA pass — every button, every form, every link
- Hotjar installed and recording
- Google Search Console verified
- Test all 8 landing page URLs + form submissions → confirm AccuLynx receipt
- Spam filter re-tested with real-looking test submissions
