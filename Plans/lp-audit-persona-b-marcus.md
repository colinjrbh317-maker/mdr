# Persona B — Marcus (Replacement Researcher, Blacksburg, 42)

## Scorecard
- Clarity: 6/10 ("Southwest Virginia" showed instead of "Blacksburg" — SSR vs client-side JS bug)
- Trust: 7/10 (GAF repeated 5x but never explained in dollar terms)
- Visual: 7/10 (form-first on mobile problem)
- Mobile friction: 5/10 (form-first kills researchers)
- CTA: 5/10 (no soft micro-conversion for 3-week researcher)
- Would submit form: 3/10 (bookmarks, doesn't convert on first visit)

## Top 5 issues

**1. CRITICAL: Mobile form-before-copy.** `order-1 lg:order-2` form + `order-2 lg:order-1` copy = mobile sees cold form before trust signals.
- Fix: Flip both to default order (copy first) on ALL breakpoints.

**2. HIGH: $89/mo has no math behind it.** No loan amount, rate, or term. $89-$189 range is too wide to be useful.
- Fix: Concrete example — "e.g., $12,000 / 120 months / 8.99% APR = $139/mo" or a static rate table.

**3. HIGH: SSR vs JS location mismatch.** `?city=Blacksburg` fires only client-side. First paint shows "Southwest Virginia".
- Fix: Read `Astro.url.searchParams.get("city")` in frontmatter, replace `[Location]` server-side.

**4. MEDIUM: SMS consent wall = sales-call signal.** 62 words of legal boilerplate above submit.
- Fix: Collapse to "By submitting, you agree to our Privacy Policy. No spam." with small Terms link.

**5. MEDIUM: No non-commitment path.** Form or call only. Marcus is 10 days into 3 weeks of research.
- Fix: Soft mid-page CTA — "Download our Roof Replacement Checklist" email capture.

## Research-phase buyer needs
1. Sample itemized quote (tear-off / decking / underlayment / shingle tier / flashing / cleanup)
2. Financing rate table (loan × term × payment) with real APR
3. "What's in the quote vs storm chasers" comparison callout
4. FAQ: "Why do quotes vary $8k?" (decking condition, tier, W-2 vs sub, margins)
5. Before/after gallery on LP body (3-photo strip) — "Blacksburg, Oct 2025"

## $89/mo credibility fix
- Show Hearth logo + "Our financing partner"
- Static payment table: $10k/$12k/$15k/$18k × 3 terms = 12 cells
- Change "from $89/mo" → "from $89/mo depending on amount, term, approved rate"
- Pull a testimonial mentioning Hearth financing amount + payment

## Information gaps (all unanswered)
1. Employees or subs? ("Not our installer — us" implies subs)
2. Who comes to the inspection? (Alicia? salesperson? installer?)
3. Shingle colors / styles (no visualizer)
4. Rotted decking pricing (included? per-sheet upcharge?)
5. Legacy Warranty vs 3-Star Difference — cost difference + scenarios
6. Cancellation / change-order policy
7. December/January install availability

## Verdict
Bookmarks, doesn't convert. Testimonials + $9k-$18k range save him from leaving entirely. Will check Cenvar next — if they have a financing calculator, MDR loses him.
