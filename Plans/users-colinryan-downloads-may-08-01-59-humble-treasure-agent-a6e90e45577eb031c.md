# Rilla Integration Research — Findings

**Date:** 2026-05-11. Research-only, no code.

---

## 1. What Portable.io's Rilla connector actually is

**It is not a real, shipped connector.** Portable.io auto-generates SEO landing pages for thousands of {source}/{destination} combinations — Rilla × MySQL, Rilla × Salesforce, Rilla × Postgres, Rilla × BigQuery, Rilla × Snowflake, Rilla × Redshift, etc. all exist as URLs. But:

- Rilla **does not appear in Portable.io's actual connectors catalog** (`/connectors`). The catalog lists "1500+ connectors" alphabetically; Rilla is absent.
- The Rilla/Salesforce page contains zero technical specifics. Its CTA is **"Request A Connector"** with a contact form: *"If you're looking for a point-to-point integration between Rilla and Salesforce... fill in this form and we'll get in touch!"*
- The MySQL page references generic "Rilla API Documentation" but provides no schema, no endpoints, no tables, no sync frequency, no auth method.
- Portable.io's positioning is: *"We build new connectors in hours or days. Send us the name of the tool and we'll dig in."*

**Translation:** Portable.io would *try* to build a Rilla connector if you paid them. They haven't. The page is lead-gen, not a product. URLs: [rilla/mysql](https://portable.io/connectors/rilla/mysql), [rilla/salesforce](https://portable.io/connectors/rilla/salesforce), [catalog](https://portable.io/connectors), [long-tail](https://portable.io/learn/long-tail-elt-connectors).

## 2. How would Portable.io get Rilla data?

They don't say, because they haven't built it. **However — a real outbound endpoint does exist:** `https://api.apirilla.com/webhooks/spotio`. This is documented in the SPOTIO × Rilla integration: SPOTIO sends Rilla a webhook on "activity created," and Rilla ingests it. So `api.apirilla.com` is Rilla's **inbound** webhook host — not an outbound data feed.

The [Merge.dev case study](https://www.merge.dev/case-studies/rilla) confirms direction: **Rilla consumes** CRM data (Salesforce, HubSpot, Zoho, Pipedrive, Dynamics) via Merge's unified API. Customer CRM → Merge → Rilla. **Rilla does not expose its data outward via Merge.**

**Conclusion on the "private API exists, ask CS" theory:** weak. The webhook subdomain `api.apirilla.com` confirms infrastructure exists, but the documented direction is *inbound to Rilla*, not outbound. Worth asking CS, but don't bet on it.

## 3. Portable.io pricing

- Standard $1,800/mo (6 flows), Pro $2,800/mo (15 flows), Advanced $4,200/mo (25 flows). 14-day trial. Custom connectors included in Pro+.
- For a connector that doesn't exist yet, you're looking at Pro minimum (~$33k/yr) plus the risk Portable can't actually build it because Rilla has no public API.

## 4. Destinations Portable supports

Snowflake, BigQuery, Redshift, Postgres, MySQL — confirmed on the Rilla connector landing pages. **No webhook/REST endpoint destination listed.** Postgres lands closest to Railway-hosted FastAPI.

## 5. DIY alternatives — what actually exists

- **Email summaries to reps after meetings:** No evidence found. Rilla's marketing emphasizes in-app recordings, transcripts, analytics, voice comments, and coaching workflows — but no search hit confirms automatic transcript/summary email to the rep after each call. ([Pro Remodeler profile](https://proremodeler.com/forget-ride-alongs-100x-your-sales-coaching-rillavoice), [G2 reviews](https://www.g2.com/products/rilla/reviews) — review page returns 403/blocked.) **Worth a direct ask to Rilla CS** — most call-intel products (Gong, Otter, Fireflies) do this, and a "BCC our portal" rule would be the cheapest possible ingestion path.
- **Zapier:** No native Rilla connector. SPOTIO → Zapier works but only as a middleman if you're also a SPOTIO customer.
- **n8n / Make.com:** No native Rilla node found.
- **Bulk export from `app.rillavoice.com`:** No public docs confirm CSV/JSON/MD export. G2/Capterra would be the place to verify but those pages blocked WebFetch (anti-bot 403).
- **Mobile app share sheet (iOS/Android):** Rilla apps exist ([App Store](https://apps.apple.com/us/app/rilla-the-end-of-ridealongs/id1488233758), [Google Play](https://play.google.com/store/apps/details?id=com.rillavoice.recorderapp)) — share-sheet behavior unknown without device-side testing.
- **ServiceTitan marketplace:** Listed as a partner — the integration page 404s, suggesting it routes through ServiceTitan's side rather than exposing Rilla data.

## 6. The MD-files goal — per-call download from Rilla UI

Not confirmed. Marketing copy mentions "recordings, transcriptions, summaries" inside the web app at `app.rillavoice.com`, plus voice comments/highlight clips/coaching tasks — but no review or doc explicitly says "download transcript as MD/PDF/TXT." This is the **single highest-value question to ask Rilla CS** because if the answer is yes, the entire integration becomes "rep clicks Download → drag into our portal." Zero engineering.

## 7. Creative paths worth considering

- **Ask Rilla CS three direct questions:** (a) Is there a per-call transcript/summary download button in `app.rillavoice.com`? (b) Do you email the rep a recap/transcript after each recording, and can we BCC an address? (c) Is there a private API or webhook-out — even gated/enterprise — that exposes recording/transcript/summary objects?
- **SendGrid Inbound Parse on a "BCC the portal" recap email** — if (b) is yes, this is a half-day build.
- **Browser extension that scrapes the recording page** when a rep visits it in Chrome — client-side, rep-authenticated, no ToS issue (rep accessing their own data). Reads DOM, posts to FastAPI. ~1-2 day build but fragile if Rilla changes markup.
- **iOS Shortcut + share sheet** to forward Rilla content into the portal — depends on Rilla's mobile share-sheet implementation.
- **Manual upload UI** in the FastAPI portal — rep downloads MD/PDF from Rilla (if feature exists per #6) and drag-drops in.
- **Salesforce/HubSpot as the bus:** If MDR uses any CRM Rilla writes to via Merge, you might harvest Rilla-enriched fields from the CRM rather than Rilla itself.

## 8. Ranked recommendation (cheapest → most engineering)

1. **Email CS three questions (above). Cost: 0.** Highest expected value. The "download per call" answer alone could collapse the entire problem.
2. **Manual upload UI in the portal.** ~½ day. Works regardless of Rilla. Bad UX for reps long-term, fine for MVP.
3. **SendGrid Inbound Parse on recap emails** (conditional on CS confirming emails exist). ~½–1 day. Best ROI if the feature is there.
4. **Browser extension that scrapes the rep's own Rilla session.** ~2–3 days plus ongoing maintenance. Effective and ToS-defensible but fragile.
5. **Portable.io custom-build engagement.** ~$33k/yr + weeks. Only viable if Portable can actually negotiate a private feed with Rilla — which is uncertain because the case study shows Rilla as a consumer, not a producer, of integrated data.

**Bottom line:** The Portable.io page is a sales lure, not evidence of a hidden API. The real green lights are (a) Rilla owns `api.apirilla.com` and clearly has inbound webhook infrastructure, (b) Rilla has CRM-side integrations via Merge, and (c) Rilla almost certainly has *some* in-app download or share affordance worth confirming. Three CS questions before any engineering.

## Sources

- [portable.io/connectors/rilla/mysql](https://portable.io/connectors/rilla/mysql)
- [portable.io/connectors/rilla](https://portable.io/connectors/rilla)
- [portable.io/connectors/rilla/salesforce](https://portable.io/connectors/rilla/salesforce)
- [portable.io/connectors](https://portable.io/connectors)
- [portable.io/pricing](https://portable.io/pricing)
- [portable.io/learn/long-tail-elt-connectors](https://portable.io/learn/long-tail-elt-connectors)
- [merge.dev/case-studies/rilla](https://www.merge.dev/case-studies/rilla)
- [support.spotio.com — SPOTIO + Rilla Voice (api.apirilla.com webhook)](https://support.spotio.com/hc/en-us/articles/14530983742743-SPOTIO-Rilla-Voice)
- [spotio.com/integrations/rillavoice](https://spotio.com/integrations/rillavoice/)
- [marketplace.servicetitan.com/partner/rillavoice](https://marketplace.servicetitan.com/partner/rillavoice)
- [rilla.com](https://www.rilla.com/)
- [apps.apple.com — Rilla iOS app](https://apps.apple.com/us/app/rilla-the-end-of-ridealongs/id1488233758)
- [play.google.com — Rilla Android app](https://play.google.com/store/apps/details?id=com.rillavoice.recorderapp)
- [g2.com/products/rilla/reviews (blocked, 403)](https://www.g2.com/products/rilla/reviews)
