#!/usr/bin/env node
/**
 * verify-contact-form.mjs
 *
 * Submits the MDR contact form against the local dev server (or preview/prod URL)
 * and polls Mailtrap for receipt + Sanity for the lead document. Fails if either
 * side doesn't land within timeout.
 *
 * Env vars:
 *   BASE_URL                default http://localhost:4321
 *   MAILTRAP_API_TOKEN
 *   MAILTRAP_ACCOUNT_ID
 *   MAILTRAP_INBOX_ID
 *   SANITY_PROJECT_ID       default cy8sc3xd
 *   SANITY_DATASET          default production
 *   SANITY_API_TOKEN        read token
 */

import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const MAILTRAP_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_ACCOUNT = process.env.MAILTRAP_ACCOUNT_ID;
const MAILTRAP_INBOX = process.env.MAILTRAP_INBOX_ID;
const SANITY_PROJECT = process.env.SANITY_PROJECT_ID ?? 'cy8sc3xd';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'production';
const SANITY_TOKEN = process.env.SANITY_API_TOKEN;

if (!MAILTRAP_TOKEN || !MAILTRAP_ACCOUNT || !MAILTRAP_INBOX) {
  console.error('Missing Mailtrap env vars (MAILTRAP_API_TOKEN, MAILTRAP_ACCOUNT_ID, MAILTRAP_INBOX_ID)');
  process.exit(1);
}

const marker = `MDR-VERIFY-${Date.now()}`;
const payload = {
  name: `Verify Bot ${marker}`,
  email: `verify-${Date.now()}@mailtrap.inbox`,
  phone: '555-555-5555',
  message: `Automated verification ping. Marker: ${marker}`,
  service: 'roof-replacement',
};

console.log(`[verify-contact-form] submitting marker=${marker}`);
const formRes = await fetch(`${BASE}/api/forms/lead`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!formRes.ok) {
  console.error(`[verify-contact-form] form POST failed ${formRes.status}: ${await formRes.text()}`);
  process.exit(1);
}

// Poll Mailtrap
let emailFound = false;
const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  await sleep(3_000);
  const r = await fetch(
    `https://mailtrap.io/api/accounts/${MAILTRAP_ACCOUNT}/inboxes/${MAILTRAP_INBOX}/messages?search=${marker}`,
    { headers: { 'Api-Token': MAILTRAP_TOKEN } },
  );
  if (!r.ok) continue;
  const msgs = await r.json();
  if (Array.isArray(msgs) && msgs.length > 0) {
    console.log(`[verify-contact-form] ✅ email received: "${msgs[0].subject}"`);
    emailFound = true;
    break;
  }
}

if (!emailFound) {
  console.error('[verify-contact-form] ❌ email never arrived in Mailtrap');
  process.exit(1);
}

// Verify Sanity lead doc (if token configured)
if (SANITY_TOKEN) {
  const groq = encodeURIComponent(`*[_type=="lead" && message match "${marker}"][0]{name, email, _createdAt}`);
  const r = await fetch(
    `https://${SANITY_PROJECT}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${groq}`,
    { headers: { 'Authorization': `Bearer ${SANITY_TOKEN}` } },
  );
  const { result } = await r.json();
  if (!result) {
    console.error('[verify-contact-form] ❌ Sanity lead doc not found');
    process.exit(1);
  }
  console.log(`[verify-contact-form] ✅ Sanity lead doc exists: ${result.name}`);
}

console.log('[verify-contact-form] ✅ all checks passed');
process.exit(0);
