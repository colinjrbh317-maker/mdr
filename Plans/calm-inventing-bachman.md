# Visual Polish & Gallery Overhaul Plan

## Context
Colin reviewed the live site and identified several visual issues: too much gap between hero and trust bar, unwanted testimonials in the service grid, a dated gallery page, broken/missing images across the site, and design bugs like white-on-white buttons. This plan addresses all of them in a systematic order.

---

## Phase 1: Quick Fixes (~10 min, parallel)

### 1A. Reduce hero-to-trust-bar gap
**Files:** `src/pages/index.astro`, `src/components/ui/SectionContainer.astro`

- Add `"xs"` padding option to SectionContainer: `py-4 md:py-6 px-4 md:px-6`
- Remove the `AngleDivider` between hero and trust bar (line ~86 in index.astro)
- Change trust bar SectionContainer from `padding="sm"` to `padding="xs"`
- Net effect: ~120px gap reduction

### 1B. Remove 3 testimonials from ServiceGrid
**File:** `src/components/home/ServiceGrid.tsx`

Delete the `testimonial` property from 3 service objects:
- Line 15: Roof Replacement — "Done in one day..."
- Line 22: Metal Roofing — "Professional and on time..."
- Line 41: Storm Damage — "They made this process a breeze..."

Leave the optional `testimonial?` field and conditional render code intact.

---

## Phase 2: Gallery Page Overhaul (~45 min)

**File:** `src/pages/gallery.astro` (major rewrite)

### 2A. Add hero section with background image
- Replace warm SectionContainer header with full-width hero
- Background: `/assets/projects/dji_fly_20251105_160154_425_1762438973026_photo.JPG` with dark overlay
- White text: "Project Gallery" heading, subtitle, breadcrumb

### 2B. Card-based project grid (Cenvar-inspired)
- Replace CSS columns masonry with `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card: rounded-xl, white bg, border, hover shadow
- Card content: hero image (aspect-4/3), category badge overlay, title, location
- Each card gets `data-category` so filters actually work (currently broken)
- Assign proper categories to each existing project

### 2C. Fix broken gallery image
- "Architectural Shingle Replacement" references a `.webp` that doesn't exist
- Update to use the `.jpg` version that does exist

### 2D. Fix CTA white-on-white button
- Line 146: Change `variant="secondary"` to inline white-outline button
- Use: `class="border-2 border-white text-white hover:bg-white/10"` (like other accent-section CTAs)

---

## Phase 3: Site-Wide Image & Design Audit (~30 min)

### 3A. Playwright image audit
- Crawl all pages on localhost
- Check every `<img>` for: empty src, failed load (naturalWidth=0), 404
- Output a report of all broken images with page + src

### 3B. Fix all broken images found
- Replace broken image references with working alternatives from `public/assets/`
- Ensure every page has relevant, loading images

### 3C. Playwright visual scan for design errors
- Screenshot every page type (desktop + mobile)
- Check for: invisible text (low contrast), broken layouts, misaligned elements
- Fix any additional white-on-white or contrast issues found (the `.dark-section` cascade bug may affect other pages too)

---

## Verification
1. Run `curl` smoke test on all key pages (200 status)
2. Playwright script to verify zero broken images
3. Visual screenshot comparison of gallery, homepage hero gap, and service grid
4. Commit and push to both remotes (`origin` + `colin`)

---

## Critical Files
| File | Changes |
|------|---------|
| `src/pages/index.astro` | Remove AngleDivider, change trust bar padding |
| `src/components/ui/SectionContainer.astro` | Add "xs" padding option |
| `src/components/home/ServiceGrid.tsx` | Remove 3 testimonial properties |
| `src/pages/gallery.astro` | Full overhaul — hero, card grid, filters, CTA fix |
| Various pages | Fix broken image references found by audit |
