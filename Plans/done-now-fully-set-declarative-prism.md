# Fully Set Up PostHog — Implementation Plan

## Context

PostHog is already loaded on every non-`/studio` page via [src/components/analytics/PostHog.astro](../src/components/analytics/PostHog.astro) (autocapture + session recording + pageviews). `PUBLIC_POSTHOG_KEY` is now set in Vercel. But PostHog is currently blind to the things that actually matter for a lead-gen roofing site:

- No `form_submitted` / `Lead` event — forms fire GA4 + Meta Pixel but not PostHog.
- No `phone_click` event — 33 files render `tel:` links, none tracked.
- No `posthog.identify()` on lead submit — every lead is anonymous, breaking person-level funnels & recordings.
- No UTM / gclid / fclid super-properties — attribution is lost after the first pageview.
- No reverse proxy — ad blockers (uBlock / Brave / Safari ITP) silently drop 20–40% of events.
- No server-side `lead_created` event — if the client crashes after POST, PostHog never sees the conversion even though AccuLynx did.

Goal: instrument the four events that drive revenue, identify leads, restore attribution, survive ad blockers, and capture the server-confirmed lead. Same pattern as the existing GA4/Meta Pixel wiring — no re-architecture.

## Scope & Approach

All browser-side PostHog calls guard on `window.posthog?.capture` so they're safe when the key is missing. We mirror the existing pattern in [LeadCaptureForm.tsx:56-66](../src/components/forms/LeadCaptureForm.tsx) (GA4 + Meta Pixel on success) by adding PostHog next to them.

### 1. Reverse proxy via Vercel rewrites (ad-blocker resistance)

Add to [vercel.json](../vercel.json) at top level (no `rewrites` key today):

```json
"rewrites": [
  { "source": "/ingest/static/:path*", "destination": "https://us-assets.i.posthog.com/static/:path*" },
  { "source": "/ingest/:path*", "destination": "https://us.i.posthog.com/:path*" }
]
```

Then update `.env` (prod + preview) and [.env.example](../.env.example):
- `PUBLIC_POSTHOG_HOST=https://moderndayroof.com/ingest`

And in [src/components/analytics/PostHog.astro](../src/components/analytics/PostHog.astro) add `ui_host: 'https://us.posthog.com'` to `posthog.init()` so "View in PostHog" links still resolve to the real app.

### 2. UTM / click-ID super-properties (attribution)

In [src/components/analytics/PostHog.astro](../src/components/analytics/PostHog.astro), inside the `loaded:` callback, parse `window.location.search` for `utm_source/medium/campaign/term/content`, `gclid`, `fclid` and call `posthog.register({...})` so every subsequent event carries them. Reuse the session-storage values [GclidCapture.astro](../src/components/common/GclidCapture.astro) already sets.

### 3. `form_submitted` event + `posthog.identify()` on lead

In each of the 7 client form components — right next to the existing `gtag`/`fbq` success block — add:

```ts
const ph = (window as any).posthog;
if (ph?.capture) {
  ph.identify(email?.trim() || phone.trim(), {
    email: email?.trim() || undefined,
    name: name.trim(),
    phone: phone.trim(),
    city: address?.trim() || undefined,
  });
  ph.capture("form_submitted", {
    source,                    // e.g. "contact-form", "financing-funnel"
    service: service?.trim() || undefined,
    has_email: !!email?.trim(),
    has_address: !!address?.trim(),
    landing_page: sessionStorage.getItem("landing_page") || "",
  });
}
```

Files to edit (all already fetch `/api/submit-form`):
- [src/components/forms/LeadCaptureForm.tsx](../src/components/forms/LeadCaptureForm.tsx) — after line 66
- [src/components/forms/LeadCaptureFormMini.tsx](../src/components/forms/LeadCaptureFormMini.tsx)
- [src/components/forms/ContactForm.tsx](../src/components/forms/ContactForm.tsx)
- [src/components/forms/ReferralForm.tsx](../src/components/forms/ReferralForm.tsx)
- [src/components/financing/FinancingFunnel.tsx](../src/components/financing/FinancingFunnel.tsx)
- [src/components/cro/EngagementPopup.tsx](../src/components/cro/EngagementPopup.tsx)
- [src/components/cro/MobileRetentionPopup.tsx](../src/components/cro/MobileRetentionPopup.tsx)
- [src/components/cro/ExitIntentPopup.tsx](../src/components/cro/ExitIntentPopup.tsx)
- [src/components/quiz/RoofQuiz.tsx](../src/components/quiz/RoofQuiz.tsx)

ChatWidget already has `lead_submitted` — extend it with `posthog.identify()` in the same block at [src/components/chat/ChatWidget.tsx:304](../src/components/chat/ChatWidget.tsx:304).

### 4. Global click tracking (one listener, not 33 edits)

Add a small `<script is:inline>` at the bottom of `<body>` in [src/layouts/Layout.astro](../src/layouts/Layout.astro) (after line 183, gated on `!isStudio`):

```js
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest?.("a, button");
  if (!a) return;
  const ph = (window as any).posthog;
  if (!ph?.capture) return;
  const href = a.getAttribute("href") || "";
  if (href.startsWith("tel:")) {
    ph.capture("phone_click", { number: href.replace("tel:", ""), location: a.dataset.ctaLocation || window.location.pathname });
  } else if (a.dataset.cta === "quote" || /free estimate|get.*quote/i.test(a.textContent || "")) {
    ph.capture("quote_cta_click", { location: window.location.pathname, label: (a.textContent || "").trim().slice(0, 60) });
  }
});
```

No per-file edits needed. Delegated listener survives `client:idle` hydration.

### 5. Server-side `lead_created` event (source of truth)

Install `posthog-node` (package.json add), add `POSTHOG_API_KEY` to `.env` + Vercel (same public key works), then in [src/pages/api/submit-form.ts:94](../src/pages/api/submit-form.ts) — right after the `console.log("[AccuLynx] Lead created...")` line — fire:

```ts
import { PostHog } from "posthog-node";
const ph = new PostHog(import.meta.env.PUBLIC_POSTHOG_KEY, { host: "https://us.i.posthog.com", flushAt: 1, flushInterval: 0 });
ph.capture({
  distinctId: email?.trim() || phone.trim(),
  event: "lead_created",
  properties: {
    source, service, has_financing: isFinancingLead,
    acculynx_job_id: result.jobId, acculynx_contact_id: result.contactId,
    gclid, fclid, landing_page,
  },
});
await ph.shutdown();
```

This is the only event that proves a real lead made it through spam filter + AccuLynx — use it as the conversion metric in PostHog dashboards.

### 6. PII masking in recordings (privacy)

In the form components, add `data-ph-mask` to every `<input name="name|email|phone|address">`. Session-recording config already honors `maskTextSelector: '[data-ph-mask]'` (PostHog.astro:25).

### 7. Privacy policy update

Append a PostHog disclosure paragraph to [src/pages/privacy.astro](../src/pages/privacy.astro) — same style as the existing GA4/Meta Pixel mentions.

## Out of scope (defer)

- Feature flags / A/B experiments — infrastructure is ready, content decisions not yet made.
- Surveys (NPS post-submit) — easy to add in PostHog UI later, no code.
- GA4 → PostHog consent banner — Virginia isn't GDPR/CPRA-covered for a single-state contractor.

## Verification

1. `npm run build` — must succeed with no TS errors.
2. `npm run dev` — open DevTools Network tab:
   - Confirm PostHog requests go to `/ingest/*` (reverse proxy working).
   - Submit a test lead via [ContactForm](../src/components/forms/ContactForm.tsx); see `form_submitted` + `$identify` + `lead_created` (from server) in Network.
   - Click a `tel:` link in the header; see `phone_click`.
   - Click a "Free Estimate" button; see `quote_cta_click`.
3. In PostHog UI → Activity: confirm all 4 events land with expected properties, and that the Person is identified (not `anonymous_*`).
4. Session recording: open Recordings, play the test session, verify name/email/phone inputs are masked.
5. UTM test: visit `?utm_source=google&utm_campaign=test`, submit form; confirm `form_submitted` has `utm_source=google` as a property.
6. Ad-blocker test: enable uBlock Origin, repeat step 2; events should still flow (via `/ingest`).
7. Build funnel in PostHog: Pageview → `quote_cta_click` → `form_submitted` → `lead_created` and sanity-check drop-off.

## Files to modify (summary)

- [src/components/analytics/PostHog.astro](../src/components/analytics/PostHog.astro) — UTM register + ui_host
- [src/layouts/Layout.astro](../src/layouts/Layout.astro) — global click listener
- [vercel.json](../vercel.json) — `rewrites` block
- [.env.example](../.env.example) — update `PUBLIC_POSTHOG_HOST`
- [src/pages/api/submit-form.ts](../src/pages/api/submit-form.ts) — server-side `lead_created`
- [src/pages/privacy.astro](../src/pages/privacy.astro) — PostHog disclosure
- 9 form/chat components — `identify` + `form_submitted` + `data-ph-mask` on PII inputs
- `package.json` — add `posthog-node`
