# MDR Pre-Launch Meeting with Alicia

**Target launch:** this week
**Goal:** everything we need to flip the site from WordPress to the new site without losing leads, rankings, or email.

---

## Before the meeting — what I'm handling

- Spending cap on the AI chat so bots can't run up the bill
- Rate limits on the contact form and chat
- Security headers + automated dependency updates on the code
- Final QA pass and redirect tests
- Monday email to you explaining the Hotjar → PostHog swap

## From you before launch day — what I need and why

1. **Google Search Console access (Owner level).** So I can submit the new sitemap and catch any crawl issues the moment they appear.
2. **GA4 Measurement ID.** So Google Analytics history doesn't reset — we keep all historical traffic data.
3. **Meta Pixel ID.** So Facebook/Instagram ad attribution keeps working.
4. **WordPress admin access** (or you handle it with me on call). Day we switch, the old site needs to be taken down/hidden. Otherwise Google can punish us for showing the same content in two places.
5. **Current WordPress hosting info** (provider + login). Two reasons: (a) if anything goes wrong day-of-switch, we need to be able to flip back. (b) we want to shut it down fully a week or two after launch.
6. **Confirmation that nothing weird is hanging off the domain.** Mainly: anyone besides you using `@moderndayroof.com` email? Any third-party tools (Mailchimp, calendar tools, chat widgets) sending email from the domain? If yes, we need to protect those settings when we flip DNS.
7. **Google/Meta/TikTok ad accounts** — are any campaigns running? If yes, we need to make sure conversion tracking keeps firing after the switch.
8. **The April 13 content items** — any that are ready? (roof count stat, Hearth calculator embed, before/after photos, gutter photos, roofing systems photos, correct badges, community events content, Google Ads campaign breakdown)
9. **GoDaddy account security.** Two-factor authentication on, "transfer lock" on. Prevents anyone from stealing the domain.
10. **Are you on the Google Analytics, Meta Ads, and PostHog accounts with me?** So we're not single-points-of-failure.

## Day we flip the switch — who does what

**You:**
- Screenshot every DNS record in GoDaddy first (backup)
- Change two DNS records (I send you exactly what to type)
- Leave email records untouched

**Me:**
- Add the domain to Vercel
- Wait for it to go live (30-60 min)
- Run the redirect test — every old WordPress URL should send people to the right new page
- Submit the sitemap to Google
- Hide the old WordPress site (needs your admin access)
- Monitor for errors the first few hours

**Both:**
- Test that email still sends and receives
- Test the contact form end-to-end

## First week after launch — what I'll do

- Check Google Search Console daily for any errors
- Watch for broken pages and fix any redirects we missed
- Compare traffic to the baseline I captured before launch
- Update you mid-week on how rankings are holding

## Your post-launch to-dos

- Verify website URL on Google Business Profile, Facebook, Instagram, LinkedIn, Nextdoor still points to `https://moderndayroof.com` (it should — same domain)
- Post "new website" announcement on your social channels
- After 2-3 weeks, we cancel WordPress hosting

---

## Open questions for the meeting

### Security / rollback
- Who hosts WordPress right now?
- Who has WordPress admin access?
- Is the hosting paid through at least May?
- Has WordPress had any recent security issues or scans?

### Email / domain
- Besides you, anyone else use `@moderndayroof.com`?
- Any other tools tied to the domain?
- Is GoDaddy account 2FA on?

### Analytics / ads
- Am I added as admin on GA4? Meta Pixel?
- Any Google Ads / Meta Ads / TikTok Ads campaigns active right now?
- Any other tools on the WordPress site we should know about (chat widget, booking tool, review tool, CRM integration)?

### Directories / social
- Does MDR have a Bing Places listing? Apple Business Connect?
- Anyone managing citations for MDR (BrightLocal, Yext, etc.)?
- Who runs the Nextdoor page?

### Content (from April 13 meeting — what's ready?)
- Updated roof count stat
- Hearth calculator embed
- Before/after photos labeled by roof type
- More gutter photos
- Roofing systems component photos
- Correct certification badges
- Community events content (CTE, annual giveaway, veterans)
- Google Ads campaign structure for landing pages

### Launch logistics
- Preferred day/time to flip the switch this week?
- Who else should get launch-day updates besides you?
