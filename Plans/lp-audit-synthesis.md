# LP Audit Synthesis — 5 Personas + Brian's Reference LP

Six parallel audits (Karen/urgent leak · Marcus/researcher · Linda/2nd opinion · Tyler/first-time · Dave/insurance) plus Firecrawl of `lp.allnaturaltreeexperts.com/tree-services/`.

## Unified score average
- Replacement LP: ~6.8/10
- Repair LP: ~7.0/10
- Brand LP: ~6.0/10 (weakest — needs most work)

## CRITICAL consensus (all agents flagged)

| # | Issue | Fix | Who flagged |
|---|-------|-----|-------------|
| 1 | iOS auto-zoom on form inputs (text-sm = 14px) | Force 16px min font-size on all inputs | Tyler |
| 2 | SMS consent wall (62 words + required to proceed) | Collapse to 1 line, move to step 2, make optional | Karen, Marcus, Tyler |
| 3 | Header phone number hidden on mobile (<640px) | Show the number at all breakpoints | Tyler |
| 4 | "We Call Within 24 Hours" undercuts urgency | "Often within the hour" or "Same-day for active leaks" | Karen, Linda, Dave |
| 5 | CTA language inconsistent ("Book" / "Continue" / "Get My Free Quote") | Standardize per LP — one phrase | Karen, Tyler |
| 6 | SSR vs JS location mismatch (first paint shows "Southwest Virginia") | Read ?city= server-side in Astro frontmatter | Marcus |
| 7 | "Zero unpaid warranty claims" unverifiable | Remove or replace with verifiable stat | Karen |

## HIGH-IMPACT adds (Brian's LP has, MDR doesn't)

1. **Stat tile strip below hero** — "983 Roofs | 5.0★ | 231 Reviews | Lifetime Warranty"
2. **Mid-page CTA interrupt bar** — dark full-width row with form + phone CTAs
3. **Real testimonial pull quote IN hero** — not buried below fold
4. **Phone-first CTAs on each service detail card** — tel: link, not form anchor
5. **Numbered "Why choose us" (01-06)** — big ordinal headers, scannable
6. **"What's included in every visit" 7-point checklist** — addresses visit-experience anxiety
7. **Horizontal auto-scrolling photo strips** between sections
8. **Credential baked into every service card** ("Our GAF 3-Star crew...")
9. **Sticky call bar on desktop too** (currently mobile-only)
10. **Pain-point qualifying bullets in hero** ("Is your roof leaking after the last storm?")

## Persona-specific needs

**Karen (urgent leak)**
- "Is this an emergency?" flag at top of form → emergency queue
- Real Roanoke review quote in hero (not buried)
- "$300-$900 most repairs" near form
- Crew/van photo (not just drone)
- VA contractor license # in footer

**Marcus (researcher)**
- $89/mo math transparency (Hearth logo + example: "$12k / 120mo / 8.99% = $139/mo")
- Rate table: $10k/$12k/$15k/$18k × 3 terms
- Soft CTA: "Download our Roof Replacement Checklist" (email capture)
- Sample itemized quote
- Shingle visualizer / color options
- FAQ: "Why do quotes vary $8k?"

**Linda (second opinion)**
- Branded LP has ZERO "second opinion" language — must add
- "Text a photo of your quote to (540) 553-6007" callout
- Explicit $9k-$18k range on competitors LP
- Salem-specific signal (not just token swap)

**Tyler (first-time)**
- Price range above fold (both LPs)
- Jargon translations inline: GAF, flashing, pipe boot, underlayment, ridge vent, drip edge, depreciation, Hearth, soft credit pull, LayerLock, StainGuard
- Brand LP → reframe as triage ("Not sure if you need repair or replacement? We'll tell you straight")
- "Text us" option in hero (not just form step 1)

**Dave (insurance)**
- Insurance proof point in hero
- Insurance-specific process lane (adjuster meeting + supplement step)
- Plain-English: "Depreciation = dollars insurance withholds upfront"
- "Your deductible is your only out-of-pocket" (aspirational close)
- HAAG certification if MDR has it
- Insurance-mentioning testimonial

## Implementation priority — ships TONIGHT

**TIER 1 (must-do)**
1. iOS zoom fix (text-base on inputs)
2. Header phone number at all breakpoints
3. "24 hours" → "within the hour"
4. Stat tile strip below hero
5. Mid-page CTA interrupt bar
6. Horizontal photo carousel between sections
7. Embed photos in benefit cards (user's main ask)
8. Numbered 01-06 "Why choose us" format
9. Collapse SMS consent to 1 line

**TIER 2 (if time)**
10. Inline jargon translations (top 10 terms)
11. Price range callout above fold
12. Real testimonial quote in hero
13. Hearth financing example math
14. "Text us your quote" callout on competitors/branded
15. Second-opinion language on branded LP

**TIER 3 (later)**
16. SSR location substitution
17. Brand LP triage reframe
18. Insurance-specific process variant
19. Downloadable research checklist

## Decision: keep form-first on mobile
Both MDR and Brian's LP use form-first on mobile. My personas complained but Brian's pattern is proven for Google Ads high-intent traffic. The real fix is adding more trust signals *above* the form (stat tiles, real testimonial pull quote) so mobile users see credibility before the form demands.
