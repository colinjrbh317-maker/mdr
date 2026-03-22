# SEO & Website Audit Report

## Executive Summary

**Overall Website Health: C-** (Needs Significant Work)

Modern Day Roofing has real strengths to build on: genuine customer reviews, GAF Master Elite certification, a clear Southwest Virginia service area, and a WordPress site that's functional and mobile-friendly. However, the website is currently **leaving significant organic traffic and customer conversions on the table** due to several issues that are highly fixable.

The core problems fall into five categories:

1. **Empty content sections** (Blog and FAQ pages exist but contain zero content)  
2. **Missing technical SEO fundamentals** (No structured data/schema markup anywhere)  
3. **Templated location pages** with visible errors and duplicate content  
4. **Weak keyword rankings** for high-intent local searches  
5. **Missed conversion opportunities** (no trust signals above the fold, no project gallery, no pricing transparency)

The good news: every one of these issues is solvable, and fixing them should produce measurable ranking and traffic improvements within 60-90 days.

---

## 1\. Crawlability & Indexation

This section covers whether Google can find, crawl, and index the website properly.

### Robots.txt

The robots.txt file (which tells search engines what to crawl) is correctly configured to allow all crawling. However, **it does not reference the XML sitemap**, which is a missed best practice.

**Recommendation:** Add a sitemap declaration to robots.txt.

### XML Sitemap

A sitemap exists at `/sitemap.xml` and was last updated February 9, 2026\. It currently contains only two sub-sitemaps:

- `page-sitemap.xml` (site pages)  
- `custom-testimonial-sitemap.xml` (testimonial pages)

This is functional but minimal. As new content (blog posts, service pages) is added, they should be automatically included.

### Site Architecture

The site currently has approximately **33 discoverable pages**:

| Section | Pages | Status |
| :---- | :---- | :---- |
| Homepage | 1 | Good |
| Service Pages | 3 | Roof Replacement, Repair, Inspection |
| Location Pages | \~10 | Roanoke, Blacksburg, Christiansburg, Salem, Radford, Pulaski, Wytheville, Floyd, Smith Mtn Lake, Troutville |
| Blog | 1 | **Empty \-- zero posts** |
| FAQs | 1 | **Empty \-- no content** |
| Testimonials | \~8 | Individual customer testimonial pages |
| Other | \~5 | Contact, Referral Program, Privacy Policy, Sitemap, Giveaway |

**Critical Finding:** The Blog and FAQ pages are indexed by Google but contain **zero content**. Google sees these as thin/empty pages, which hurts the overall quality signals for the entire domain.

---

## 2\. Technical Foundations

### Platform & Security

| Element | Status |
| :---- | :---- |
| Platform | WordPress 6.9.1 \+ Elementor 3.35.3 |
| Analytics | Site Kit by Google 1.171.0 |
| HTTPS | Active and valid |
| Mobile Viewport | Correctly configured |
| Indexing Directives | Properly set to `index, follow` |

The platform stack is standard and well-maintained.

### Structured Data / Schema Markup (CRITICAL GAP)

**No structured data was found anywhere on the website.** This is a critical gap for a local service business.

Structured data (also called schema markup) is code that helps Google understand your business and display rich results in search. Without it, the site is invisible to several Google features:

| Missing Schema Type | What It Enables |
| :---- | :---- |
| **LocalBusiness** | Business name, address, phone, hours, service area appearing directly in search results |
| **Service** | Individual services (roof replacement, repair, inspection) appearing as rich results |
| **FAQPage** | FAQ answers appearing directly in Google search results |
| **Review / AggregateRating** | Star ratings and review counts showing in search results |
| **BreadcrumbList** | Navigation breadcrumbs in search results |

**Why this matters:** Competitors who have structured data implemented get more visual real estate in search results (star ratings, service details, FAQ dropdowns), which directly increases their click-through rates at the expense of sites that don't have it.

### Meta Descriptions

Meta descriptions are the short text previews that appear under your page title in Google search results. They directly influence whether someone clicks your result or a competitor's.

| Page | Custom Meta Description? | Current State |
| :---- | :---: | :---- |
| Homepage | Yes | Acceptable but could be more compelling |
| Services | No | Auto-generated, truncated with "\[...\]" |
| Roof Replacement | No | Auto-generated, starts with "Roof Replacement Roof Replacement..." |
| Roof Inspection | No | Auto-generated, starts with "Roof Inspection Roof Inspections..." |
| Roof Repair | No | Auto-generated from page content |
| Blog | No | Shows "Blog Grid" |
| FAQs | No | No description at all |
| Contact | No | Auto-generated dump of address and form fields |
| Location Pages | Mixed | Some have basic descriptions, several do not |

**Impact:** When Google auto-generates meta descriptions, they're often nonsensical or unpersuasive. Every page should have a hand-written, 150-160 character meta description that compels the searcher to click.

### Open Graph (Social Sharing) Images

Several pages use a decorative vector graphic (`vector-1.png`) as the social sharing image instead of actual photos of completed roofing work. When someone shares a page from the site on Facebook, this is the image that appears.

**Recommendation:** Use high-quality project photos for each page's OG image to make social shares more compelling.

---

## 3\. On-Page SEO

### Title Tags

Title tags are the \#1 on-page ranking factor and what appears as the clickable blue link in Google search results.

| Page | Current Title | Issues Found |
| :---- | :---- | :---- |
| Homepage | "Modern Day Roofing | Roof Repair and Replacement Southwest VA" | Good |
| Services | "Services \- Modern Day Roofing" | Too generic; no service or location keywords |
| Roof Replacement | "Roof Replacement \- Modern Day Roofing" | Missing location qualifier |
| Roof Repair | "Roof Repair \- Modern Day Roofing" | Missing location qualifier |
| Roof Inspection | "Roof Inspection \- Modern Day Roofing" | Missing location qualifier |
| Roanoke | "Best Roanoke Roofing Company in Roanoke" | Redundant "Roanoke" twice |
| Blacksburg | "Best Blacksburg Roofing Company in Blacksburg" | Redundant city name |
| Christiansburg | "Best Christiansburg Roofing Company in Christiansburg VA" | Redundant city name |
| Blog | "Blog \- Modern Day Roofing" | Page is empty |
| FAQs | "FAQ's \- Modern Day Roofing" | Page is empty; grammatically incorrect apostrophe |

**What good titles look like:**

- Services: "Roofing Services in Southwest VA | Modern Day Roofing"  
- Roof Replacement: "Roof Replacement in Christiansburg & SW Virginia | Modern Day Roofing"  
- Roanoke: "Roanoke Roofing Company | Roof Repair & Replacement | Modern Day Roofing"

### Heading Structure

Headings (H1, H2, H3) create a content hierarchy that tells Google what each page is about. Every page should have exactly **one H1** containing the primary keyword.

**Issues found:**

- **Services page:** No H1 tag; content starts at H2  
- **Location pages:** Primary headings are set to H4 instead of H1  
- **Roof Replacement page:** Two duplicate H2 tags both saying "Roof Replacement"

These should be corrected so each page has a clear, single H1 followed by a logical H2/H3 hierarchy.

### Template Errors on Location Pages (CRITICAL)

**Christiansburg page** contains **visible placeholder errors** where city names were not properly filled in:

- `"the best "" roofing company"` (empty string where city name should be)  
- `"the best roof installer in """` (same issue)  
- `"we understand the unique needs of properties in """` (same issue)

**Blacksburg page** references the **wrong city** in one bullet point:

- Says: *"reinforcing our status as the best roof installer in Christiansburg"*  
- Should say: *"...best roof installer in Blacksburg"*

These errors look unprofessional to potential customers and signal low-quality, auto-generated content to Google.

---

## 4\. Content Quality & Gaps

### Empty Pages

**Blog Page**

The blog page at `/blog` exists and is indexed by Google, but it contains **zero blog posts**. It renders only the heading "Blog Grid" and a reCAPTCHA widget.

This represents the single biggest missed opportunity on the site. Educational blog content is the primary way roofing companies drive organic search traffic. High-value topics include:

- Roof replacement cost guides for Virginia  
- Storm damage inspection guides  
- Insurance claim walkthroughs  
- Material comparisons (shingle types, metal vs. asphalt)  
- Seasonal maintenance tips  
- GAF warranty and certification explainers  
- "How long does a roof replacement take?"

Each of these topics has hundreds to thousands of monthly searches in the Virginia market.

**FAQ Page**

The FAQ page at `/faqs` is also completely empty. It renders only the Call Now button and a reCAPTCHA widget.

This is a significant missed opportunity because:

1. FAQ content directly targets "People Also Ask" boxes in Google  
2. FAQ schema markup can display answers directly in search results  
3. FAQs build trust with potential customers during their research phase

### Location Pages: Duplicate Content Problem

All 10+ location pages (Roanoke, Blacksburg, Christiansburg, Salem, Radford, Pulaski, Wytheville, Floyd, Smith Mountain Lake, Troutville) follow the **exact same template** with only the city name swapped:

**Identical across all pages:**

- Same two customer testimonials (Erin Raymond and Donna Toler) on every single page  
- Same bullet-point structure  
- Same project photo (`0K4A0495-scaled`)  
- Same services list with identical descriptions  
- Same call-to-action sections

**Why this is a problem:** Google treats near-duplicate content as low quality. When 10 pages are virtually identical with only a city name changed, Google may:

- Choose to index only one or two of them  
- Demote them all in rankings  
- Filter them as thin/doorway pages

**What strong location pages look like:**

- Testimonials from customers **in that specific city**  
- Photos of actual projects completed **in that area**  
- Mention of local landmarks, neighborhoods, or weather-specific roofing concerns  
- Unique statistics (e.g., "We've completed 47 roofs in the Roanoke area")  
- 500+ words of genuinely unique content per page  
- An embedded Google Map showing the service area  
- Links to local resources or community involvement

### Missing Content That Competitors Have

| Content Gap | Why It Matters |
| :---- | :---- |
| **Cost/Pricing Guide** | "How much does a roof replacement cost?" is one of the highest-volume roofing searches |
| **Insurance Claims Guide** | Homeowners searching for help with roof insurance claims are high-intent buyers |
| **About Us / Team Page** | No company story, founder info, or team photos \= weak trust signals |
| **Before/After Project Gallery** | Visual proof of work quality is the \#1 factor in choosing a roofer |
| **Financing Information** | Financing availability removes a major purchase objection |
| **GAF Warranty Explainer** | Master Elite certification is a major differentiator but isn't being leveraged |

---

## 5\. Local SEO & Competitive Position

### NAP (Name, Address, Phone) Consistency

- **Business Name:** Modern Day Roofing  
- **Address:** 80 College St. STE R, Christiansburg, VA 24073  
- **Phone:** (540) 553-6007  
- **Email:** [sales@moderndayroof.com](mailto:sales@moderndayroof.com)

This information is present on the Contact page. It should be consistently displayed in the footer of every page sitewide.

### Directory & Review Presence

| Platform | Listed? | Rating |
| :---- | :---: | :---- |
| HomeAdvisor | Yes | 5.0 stars |
| GAF Directory | Yes | Master Elite Certified |
| Facebook | Yes | Active with posts |
| BBB | Yes | Profile exists; has complaints page |
| Yelp | Yes | Present, reviews available |
| Trustindex | Yes | 4.3 stars |
| Angi / Angie's List | Not prominent | \-- |
| Thumbtack | Not found | \-- |
| Nextdoor | Not found | \-- |

### Competitive Keyword Rankings

**Search: "roofing company Roanoke VA"**

Modern Day Roofing **does NOT appear in the top 10 organic results.** The following competitors and directories rank ahead:

1. Yelp (directory listing)  
2. Best Choice Roofing  
3. BBB (directory)  
4. Big Lick Roofing  
5. John T. Morgan Roofing  
6. Skywalker Roofing  
7. Yahoo Local  
8. Cenvar Roofing  
9. Reddit  
10. Vinton Roofing Company

**Search: "roofing company Christiansburg / Blacksburg VA"**

Modern Day Roofing appears around **position 5** for Christiansburg-related queries, behind Yelp, Best Choice Roofing, BBB, and other directories.

**What this means:** For the most valuable roofing keywords in the service area, the site is not visible to searchers who are actively looking for a roofer. This is the combined result of thin content, no structured data, weak backlink profile, and location pages that don't differentiate from competitors.

---

## 6\. Conversion Optimization

Even when visitors do reach the site, there are several missed opportunities to turn them into leads.

### What's Working

- Contact forms are present on every page  
- Click-to-call phone number is prominent  
- Referral program page encourages word-of-mouth  
- reCAPTCHA protects forms from spam

### What's Not Working

**No trust signals above the fold.** The homepage hero area doesn't immediately display:

- GAF Master Elite badge  
- Star ratings / review count  
- Years in business or number of roofs completed  
- BBB accreditation

These are the first things a homeowner looks for when evaluating a roofing company, and they should be visible without scrolling.

**No before/after project gallery.** Visual proof of completed work is the \#1 conversion factor for roofing companies. The site has no dedicated gallery showing the quality of their work.

**No pricing transparency.** There are no cost ranges, "starting at" pricing, or financing details anywhere on the site. Homeowners researching roof replacement want at least a ballpark before they call. Competitors who provide this information capture these leads first.

**Duplicate forms on Contact page.** The contact page contains two different forms ("Main contact form" and "Contact Page Lower Form") with slightly different field sets. This creates confusion about which to fill out.

**No urgency triggers.** There are no seasonal promotions, limited-time offers, or scarcity elements encouraging visitors to take action now rather than continuing to browse competitors.

**Missing About Us / Team page.** There's no company story, no founder photo, no team bios. For a high-consideration purchase like a roof, homeowners want to know who they're hiring. This is also a major factor in Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) quality guidelines.

---

## Summary of Findings by Severity

### Critical (Directly Hurting Rankings & Conversions)

- No structured data / schema markup on any page  
- Blog page is empty (zero posts)  
- FAQ page is empty (zero content)  
- Location pages are near-duplicate templates  
- Template errors with visible `""` placeholders on Christiansburg page  
- Wrong city referenced on Blacksburg page  
- Not ranking for primary service-area keywords

### High (Significant Missed Opportunities)

- No custom meta descriptions on most pages  
- No About Us / Team page  
- No before/after project gallery  
- No cost/pricing content  
- No insurance claims guide  
- Heading hierarchy issues across the site  
- Title tags missing location keywords on service pages  
- No trust badges visible above the fold on homepage

### Medium (Should Be Addressed)

- Robots.txt missing sitemap reference  
- OG images using generic graphics instead of project photos  
- Duplicate contact forms on Contact page  
- No financing information page  
- Limited directory presence (missing Angi, Thumbtack, Nextdoor)

---

*Report prepared February 2026\. Data gathered via Firecrawl site crawl, Google search analysis, and manual page review.*  
