# Lessons from Building a Professional Services Website (Astro 5)

> Context: These lessons come from building PlanWell Financial Planning — a lead-gen website for a small professional services firm. The roofing site shares the same DNA: local business, appointment-driven, trust-heavy, mobile-first audience.

---

## 1. Astro is the Right Call for This Type of Site

Astro 5 with static site generation is ideal for service businesses. Fast page loads, great SEO out of the box, and you only add JavaScript where you actually need interactivity (calculators, forms, modals).

**What we got right:**
- Static pages for service descriptions, about, blog — zero JS shipped
- Client-side JS only for interactive tools (calculators, multi-step forms)
- ISR (Incremental Static Regeneration) via Vercel adapter so CMS content updates go live within 60 seconds without manual redeploys

**What to watch for:**
- `is:inline` scripts in Astro **cannot import modules**. If you need data in an inline script, embed it directly via a `<script define:vars={{ data }}>` pattern or serialize it into the HTML
- Don't fight Astro's island architecture. If a component needs JS, make it an explicit island (`client:load`, `client:visible`). Don't try to bolt interactivity onto static components after the fact

---

## 2. Forms: Keep the Backend Simple

We went through three iterations before landing on the right form handling pattern. Learn from our mistakes.

**What works:**
- Forms POST to a webhook endpoint (we used n8n, but any webhook service works)
- Webhook writes to Google Sheets as the primary data store
- Sends email notifications to the business owner
- No custom backend needed for a site this size

**Gotchas:**
- n8n webhooks have an "Active" toggle that's easy to miss — forms silently fail if the workflow is inactive. Test your form submissions after every deploy
- Google Sheets OAuth tokens expire. Build a re-auth flow or use service account credentials
- For multi-step forms (we had a 5-step webinar signup), manage state client-side and submit everything in one POST at the end. Don't submit per-step — it creates partial records

**For the roofing site specifically:**
- Contact/quote request forms should capture: name, phone, email, address, service type, urgency
- Phone number is king for roofers. Make `tel` the input type — it pulls up the number pad on mobile
- Consider a "click to call" CTA that's even more prominent than the form on mobile

---

## 3. Mobile-First is Non-Negotiable

Our audience (federal employees) skews desktop, and we STILL had to rebuild several components for mobile. A roofing site audience will be even more mobile-heavy — homeowners searching after a storm, on their phone.

**Hard-won rules:**
- Input font size must be **16px minimum** or iOS Safari will auto-zoom the page when users tap an input field. This one burned us twice
- Touch targets: **48px minimum height** on all buttons and interactive elements. We used 56px and it felt right
- Sticky CTAs work great on mobile — `position: sticky; bottom: 0` keeps the "Get a Quote" or "Call Now" button visible while scrolling
- Grid layouts: design for 2-column on desktop, collapse to single column on mobile. Don't try to maintain complex grids on small screens
- Test on actual phones, not just browser dev tools. The keyboard overlay on mobile hides half the screen — make sure your forms still work when that happens

---

## 4. Blog Content Migration is Harder Than You Think

We migrated 469 blog posts from WordPress. It was painful.

**What went wrong:**
- Migration script downloaded cover images but **missed all inline images** (charts, photos within articles). 99.8% of articles ended up with broken image references
- WordPress Elementor markup came along for the ride — bloated HTML with deeply nested wrapper divs
- We ended up storing raw HTML as legacy content rather than converting to the CMS's native format. This creates tech debt

**What to do instead:**
- If migrating from WordPress: download ALL images (not just featured images) from `wp-content/uploads/` before touching anything else
- Strip CMS-specific markup (Elementor, Gutenberg blocks, Divi shortcodes) during migration, not after
- Convert to your target CMS's native content format immediately. Living with legacy HTML "temporarily" becomes permanent
- If the roofing site has existing content, audit it first: How many posts? How many have images? What format are they in?

---

## 5. SEO: Get the Basics Right Before Getting Clever

We ran a full SEO audit and found embarrassing basics were wrong on our homepage despite having 130+ blog articles.

**Must-haves for a roofing site:**
- **Title tag:** Include your primary keyword + location. "Roof Repair & Replacement in [City] | [Company Name]" not "Welcome to Our Website"
- **H1:** Must contain your target keyword. Emotional headlines are nice but search engines need keywords in the H1
- **Meta description:** Include a differentiator + social proof if you have it. "Licensed & insured since 2005. 500+ roofs replaced. Free estimates."
- **Every service page** needs unique title, description, and H1. Don't reuse the same meta across pages

**Blog SEO specifics:**
- Internal linking between related posts is free SEO juice. We built a script to find and insert internal link opportunities across all 174 posts
- If the roofing site has location pages (city/neighborhood), interlink them with service pages
- Schema markup (JSON-LD) for LocalBusiness, Service, and FAQ types. Astro makes this easy — just drop a `<script type="application/ld+json">` in the head

---

## 6. Redirects: Set Them Up Day One

We had 40+ redirects defined in `astro.config.mjs` for the WordPress migration. Every old URL that doesn't redirect is a dead link that hurts SEO and loses potential customers.

**Pattern:**
```javascript
// astro.config.mjs
redirects: {
  '/old-url': '/new-url',
  '/services/roof-repair-city': '/roof-repair',
  '/blog/category/tips': '/blog',
}
```

**Rules:**
- Use 301 (permanent) redirects, not 302
- Define them in config, not in middleware — cleaner and more maintainable
- Test them in preview/staging before deploying to production
- If replacing an old site, crawl every URL on the current site and map them to new URLs. Tools like Screaming Frog make this easy

---

## 7. Email and Outlook: Test in the Worst Client

Most of our B2B audience uses Outlook, and it's a nightmare for HTML email rendering.

**What we learned:**
- Outlook desktop **does not auto-load images**. Users see a "download images" prompt. Your emails must make sense without any images visible
- Use background colors and text-based CTAs, not image-based buttons
- Table-based layouts are still the most reliable for Outlook (yes, in 2026)
- Test every email template in Outlook desktop before going live. Litmus or Email on Acid can automate this

**For the roofing site:**
- Confirmation emails after quote requests should be text-heavy, image-light
- Include the business phone number prominently in every email — some people will just call instead of clicking

---

## 8. Calculators and Interactive Tools Convert

We built 4 retirement calculators. They're the highest-engagement pages on the site. For a roofing site, the equivalent is a cost estimator or ROI calculator.

**Implementation lessons:**
- Keep calculator logic client-side (no server round-trips needed for simple math)
- Use `type="tel"` for number inputs on mobile — brings up the number pad
- Show results immediately without a page reload — update a results div with JS
- Add `aria-live="polite"` to your results section so screen readers announce changes
- Sticky "Calculate" button on mobile keeps the CTA visible while scrolling through inputs

**Roofing calculator ideas:**
- Roof replacement cost estimator (square footage + material + pitch)
- Insurance claim timeline calculator
- Energy savings calculator (for metal/cool roofs)
- These generate leads AND build trust

---

## 9. Testimonials and Social Proof: Start Collecting Early

We waited too long on this. By the time we needed testimonials, we had compliance hoops to jump through.

**For the roofing site:**
- Start asking for reviews/testimonials from day one of the site build
- Google Business Profile reviews are the most valuable — they show in search results
- On-site testimonials should include: specific service performed, location (neighborhood/city), and before/after if possible
- Video testimonials from homeowners are gold for roofing — even smartphone quality

---

## 10. The Two-System Architecture Saves Sanity

We split our work into two systems and it prevented a LOT of confusion:

1. **Website code** (pages, components, styles) — managed with structured phase-based development
2. **Business automation** (emails, webhooks, CRM integrations) — managed with directives + Python scripts

**Why this matters:**
- Website features and backend automation have completely different testing, deployment, and failure modes
- Mixing them leads to "I changed the email template and broke the contact page" situations
- Keep your `execution/` scripts separate from your `src/` website code
- Document your automation flows — future-you won't remember why that webhook exists

---

## 11. Vercel Deployment Specifics

**Configuration that worked:**
```javascript
// astro.config.mjs
adapter: vercel({ isr: { expiration: 60 } })
```

- ISR with 60-second expiration = CMS content changes go live automatically
- No manual redeploys for content updates
- Build errors prevent ISR from working — set up build failure notifications

**Environment variables:**
- Store all API keys, CMS tokens, and service credentials in Vercel's environment variable UI
- Don't commit `.env` files. Use `.env.example` with placeholder values for documentation

---

## 12. Performance Quick Wins

Things that made measurable differences in Core Web Vitals:

- **Image optimization:** Use Astro's `<Image>` component for automatic WebP conversion and responsive sizing. Don't serve 4000px images to mobile screens
- **Font loading:** Use `font-display: swap` to prevent invisible text during load. Preload your primary font
- **Above-the-fold content:** Don't lazy-load your hero image or primary CTA. Lazy-load everything below the fold
- **Minimize third-party scripts:** Google Analytics, Facebook Pixel, chat widgets — each one adds 100-300ms. Load them after the page is interactive (`defer` or dynamic import)

---

## 13. What I'd Do Differently

If starting over:

1. **Content format first:** Decide on your CMS content format before writing a single component. Don't migrate content twice
2. **Form testing pipeline:** Set up end-to-end form submission testing from day one. We caught silent failures too late
3. **Email templates early:** Design and test email templates in Outlook before the site launches, not after the first customer complaint
4. **Analytics before launch:** Set up conversion tracking (form submissions, phone clicks, quote requests) before going live. You can't optimize what you can't measure
5. **Mobile testing on real devices:** Browser dev tools lie. Test on a $200 Android phone over a cellular connection
6. **Collect testimonials in parallel:** Don't wait until the site is done. Start gathering social proof while building

---

## Quick Reference: Astro Patterns That Work

```astro
---
// Static data fetching at build time
const services = await getServices();
---

<!-- Static HTML, zero JS shipped -->
<section class="services-grid">
  {services.map(s => <ServiceCard service={s} />)}
</section>

<!-- Interactive island — JS only loads for this component -->
<CostCalculator client:visible />

<!-- Inline script with embedded data (can't import modules) -->
<script define:vars={{ phoneNumber: business.phone }}>
  document.getElementById('call-btn').href = `tel:${phoneNumber}`;
</script>
```

---

*Generated from PlanWell Financial Planning build experience (Astro 5 + Sanity CMS + Vercel). Adapt for your stack but the principles are universal.*
