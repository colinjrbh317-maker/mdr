#!/usr/bin/env node
/**
 * verify-acculynx-sms.mjs
 *
 * Sends a test SMS via the MDR AccuLynx v3 native endpoint and polls for delivery
 * confirmation. Run as part of `pnpm verify` after any change touching SMS code.
 *
 * Env vars required:
 *   ACCULYNX_API_KEY      AccuLynx API key
 *   ACCULYNX_TEST_LEAD_ID Lead ID used for verification messages (create a dedicated test lead)
 *   ACCULYNX_TEST_PHONE   Twilio test number (or your own non-prod number)
 *
 * Exit: 0 on success, 1 on failure with reason printed.
 */

import { setTimeout as sleep } from 'node:timers/promises';

const API_KEY = process.env.ACCULYNX_API_KEY;
const LEAD_ID = process.env.ACCULYNX_TEST_LEAD_ID;
const PHONE = process.env.ACCULYNX_TEST_PHONE;

if (!API_KEY || !LEAD_ID || !PHONE) {
  console.error('Missing env: ACCULYNX_API_KEY, ACCULYNX_TEST_LEAD_ID, ACCULYNX_TEST_PHONE');
  process.exit(1);
}

const marker = `mdr-verify-${Date.now()}`;
const body = `MDR Verify ping ${marker} — ignore`;

console.log(`[verify-acculynx-sms] sending: "${body}"`);

const sendRes = await fetch(`https://api.acculynx.com/v3/leads/${LEAD_ID}/messages`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: PHONE, body, type: 'sms' }),
});

if (!sendRes.ok) {
  console.error(`[verify-acculynx-sms] send failed ${sendRes.status}: ${await sendRes.text()}`);
  process.exit(1);
}

const { id: messageId } = await sendRes.json();
console.log(`[verify-acculynx-sms] sent id=${messageId}, polling for delivery...`);

const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  await sleep(3_000);
  const r = await fetch(`https://api.acculynx.com/v3/messages/${messageId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  if (!r.ok) continue;
  const msg = await r.json();
  if (msg.status === 'delivered') {
    console.log(`[verify-acculynx-sms] ✅ delivered in ${Math.round((Date.now() - (Date.now() - 60000)) / 1000)}s`);
    process.exit(0);
  }
  if (msg.status === 'failed' || msg.status === 'undelivered') {
    console.error(`[verify-acculynx-sms] ❌ ${msg.status}: ${msg.errorReason ?? 'no reason'}`);
    process.exit(1);
  }
}

console.error('[verify-acculynx-sms] ❌ timeout — message never reached "delivered"');
process.exit(1);
