# Lead Intake System with Spam Filtering → AccuLynx CRM

## Context

MDR website forms currently send leads to Google Sheets via a fire-and-forget webhook. There is no CRM integration — leads must be manually entered into AccuLynx. The only spam protection is a honeypot field, which catches basic bots but will not stop sophisticated spam. Before connecting forms directly to AccuLynx, we need a multi-layer spam filtering system so the CRM doesn't fill up with junk.

**Goal:** Website form submissions → spam filter → AccuLynx CRM (auto-created as leads), with clean data and zero manual entry.

---

## Research Findings

### AccuLynx API — Lead Creation IS Possible

Despite our earlier technical discovery saying the API was read-only for jobs, the AccuLynx API v2 **does** support creating leads. The flow is:

1. **`POST /contacts` — Create Contact** (required field: `contactType` only)
   - Accepts: first name, last name, phone, email, address, company
2. **`POST /jobs/Createjob` — Create Job** (required: `contactId` + location address)
   - Accepts: job category, work type, priority, trade types, lead source
3. **`POST /leads` — Create Lead** (V1 endpoint, still functional but deprecated)
   - V2 equivalent is Create Contact + Create Job

**Our approach:** Create contact first → use returned `contactId` to create job with lead source = "Website Form Submission"

Sources:
- https://apidocs.acculynx.com/reference/postcreatelead
- https://apidocs.acculynx.com/changelog
- https://composio.dev/toolkits/acculynx

### Spam Filtering — Server-Side Only (No CAPTCHA)

No third-party CAPTCHA widget needed. Local roofing contractor site doesn't attract the same bot volume as SaaS. Server-side filtering catches 95%+ of spam with zero user friction and zero external dependencies.

**Multi-layer approach (defense in depth):**
1. Honeypot field (already exists — catches basic bots)
2. Phone validation (must be valid US 10-digit number)
3. Email validation (format check + disposable domain blocklist)
4. Content scoring (name quality, URL density in message, gibberish detection)
5. Rate limiting (IP-based, max 3 submissions per 5 min)
6. Duplicate detection (hash of name+phone+email, reject within 10-min window)

If spam becomes a problem later, we add hCaptcha or Cloudflare Turnstile as a second layer.

---

## Implementation Plan

### Step 1: Spam Filter Module — `src/lib/spam-filter.ts`

Create a standalone spam filter utility with these functions:

```typescript
// Core validation functions
isValidUSPhone(phone: string): boolean
  // Strip non-digits, must be exactly 10 digits (or 11 starting with 1)
  // Reject obvious fakes: all same digit, sequential, 555-xxxx

isDisposableEmail(email: string): boolean
  // Check against ~50 domain blocklist (mailinator, guerrillamail, tempmail, yopmail, etc.)

isValidName(name: string): boolean
  // Min 2 chars, no URLs, not all numbers, no excessive special chars

scoreMessage(message: string): number
  // Count URLs (>2 = spam signal), check for common spam phrases
  // ("click here", "buy now", "casino", "crypto", pharmacy keywords)

isDuplicate(name: string, phone: string, email: string): boolean
  // Hash of name+phone+email → check in-memory Set with 10-min TTL

getRateLimited(ip: string): boolean
  // In-memory Map: IP → timestamp array, max 3 per 5 minutes

// Main entry point
spamCheck(data, ip): { pass: boolean; reason?: string; score: number }
  // Runs all checks, returns aggregate pass/fail with score 0-100
  // Score > 60 = spam → silent fake-success response
```

### Step 2: AccuLynx API Client — `src/lib/acculynx.ts`

```typescript
// TypeScript client for AccuLynx API v2
// Auth: Bearer token from ACCULYNX_API_KEY env var
// Base URL: https://api.acculynx.com/api/v2

createContact(data: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): Promise<{ contactId: string }>

createJob(contactId: string, data: {
  leadSource: string;      // "Website Form Submission"
  serviceType?: string;    // from form dropdown
  address: string;         // location for the job
}): Promise<{ jobId: string }>

// Error handling: 1 retry on 5xx, log errors, never throw to caller
// Returns null on failure so submit-form.ts can fall back to Sheets
```

### Step 3: Update API Endpoint — `src/pages/api/submit-form.ts`

New flow:

```
Incoming POST →
  1. Honeypot check (existing) → silent fake success
  2. spamCheck(body, request IP) → if fails, silent fake success + log
  3. If passes:
     a. AccuLynx: createContact() → createJob() (async, don't block response)
     b. Google Sheets webhook (existing, keep as backup)
     c. Return real success to user
  4. If AccuLynx fails: still send to Sheets, still return success
```

Key changes to existing code:
- Import and call `spamCheck()` after honeypot
- Import and call AccuLynx client after spam filter passes
- Extract IP from request headers (`x-forwarded-for` on Vercel)
- Keep all existing functionality (GA4 tracking fields, webhook, etc.)

### Step 4: Environment Variables

Add to `.env` and Vercel environment:
```
ACCULYNX_API_KEY=<copy from acculynx-agent/.env>
ACCULYNX_API_URL=https://api.acculynx.com/api/v2
```

No CAPTCHA keys needed.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/spam-filter.ts` | CREATE | Spam scoring, validation, rate limiting, duplicate detection |
| `src/lib/acculynx.ts` | CREATE | AccuLynx API client (createContact + createJob) |
| `src/pages/api/submit-form.ts` | MODIFY | Add spam filter pipeline + AccuLynx integration |
| `.env` | MODIFY | Add ACCULYNX_API_KEY + ACCULYNX_API_URL |

No changes needed to frontend form components — spam filtering is entirely server-side.

---

## Verification Plan

1. **Honeypot still works** — Submit with `website` field filled → fake success, no CRM entry
2. **Invalid phone rejected** — Submit with "123" as phone → fake success, no CRM entry
3. **Disposable email blocked** — Submit with mailinator.com email → fake success, no CRM entry
4. **Gibberish name blocked** — Submit with "asdfghjkl" or URL as name → blocked
5. **Spam message caught** — Message with 5+ URLs → blocked
6. **Rate limiting works** — Submit 4x rapidly → 4th gets fake success, no CRM entry
7. **Duplicate detection** — Same name+phone+email within 10 min → blocked
8. **AccuLynx contact created** — Valid submission → new contact appears in AccuLynx
9. **AccuLynx job created** — Contact gets a job with lead source "Website Form Submission"
10. **Google Sheets backup** — Valid submission still hits Google Sheets webhook
11. **CRM failure graceful** — If AccuLynx API is down, form still succeeds + Sheets gets data
12. **Build passes** — `pnpm build` succeeds
13. **Existing Playwright tests pass** — no regressions

---

## Decisions (Confirmed)

- **Spam filtering:** Server-side only — no CAPTCHA widget (add hCaptcha/Turnstile later if needed)
- **API Key:** Use same `ACCULYNX_API_KEY` from acculynx-agent project
- **Lead Assignment:** Unassigned — team picks up via normal workflow
- **CRM Fallback:** Google Sheets webhook stays as backup if AccuLynx API fails
- **No frontend changes:** All spam filtering is server-side, forms stay exactly as-is
