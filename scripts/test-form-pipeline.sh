#!/usr/bin/env bash
# Smoke-tests the form-to-AccuLynx pipeline by POSTing one lead per source value.
# Each lead lands in AccuLynx and (if email provided) triggers the SendGrid auto-reply.
#
# Usage:
#   ./scripts/test-form-pipeline.sh                                   # local, all sources
#   ./scripts/test-form-pipeline.sh --base https://moderndayroof.com  # production
#   ./scripts/test-form-pipeline.sh --source emergency                # one source only
#   ./scripts/test-form-pipeline.sh --email you@example.com           # use a real inbox you can check
#   ./scripts/test-form-pipeline.sh --phone 5551234567                # use a phone you control
#
# The leads have a name like "Test Colin <source>" so Sierra can spot-and-dismiss them.

set -euo pipefail

BASE="http://localhost:4321"
EMAIL="qa+launch@moderndayroof.com"
PHONE="5555550199"   # placeholder; pass --phone for a real one
ONLY_SOURCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --phone) PHONE="$2"; shift 2 ;;
    --source) ONLY_SOURCE="$2"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

ENDPOINT="$BASE/api/submit-form"

# Each row: source|extra_json (extra fields merged into the POST body)
ROWS=(
  'contact-page|{"address":"123 Main St, Christiansburg, VA","service":"Roof Replacement","message":"QA test - contact page"}'
  'mobile-sticky-cta|{"service":"Roof Repair"}'
  'lp-roof-repair|{"address":"456 Oak Ave, Blacksburg, VA","service":"Roof Repair","gclid":"qa-gclid-1","landing_page":"/lp/roof-repair?channel=google"}'
  'lp-roof-repair-bottom|{"address":"789 Pine Dr, Roanoke, VA","service":"Roof Repair","gclid":"qa-gclid-2","landing_page":"/lp/roof-repair?channel=google"}'
  'lp-mini|{"landing_page":"/lp/roof-replacement?channel=google","gclid":"qa-gclid-mini"}'
  'referral-outbound|{"message":"QA test - I am referring John Smith / 5551234567"}'
  'referral-inbound|{"message":"QA test - I was referred by Jane Doe"}'
  'financing-funnel|{"address":"100 Loan St, Salem, VA","service":"Roof Replacement","message":"Financing funnel profile: {\"budget\":\"$15-25k\",\"timeline\":\"3-6 months\",\"homeowner\":\"yes\",\"propertyType\":\"single-family\",\"credit\":\"680-720\",\"income\":\"75k-100k\",\"employment\":\"W2\",\"qualificationTier\":\"Tier-A\"}"}'
  'ai-chatbot|{"chat_context":"User asked about emergency leak repair on Sunday","service":"Roof Repair"}'
  'roof-quiz|{"message":"QA test - quiz answers: 15-yr-old shingle, no recent storm damage"}'
  'emergency|{"address":"1 Storm Way, Christiansburg, VA","service":"Emergency Repair","message":"Tree on roof, active leak"}'
  'exit-intent-popup|{"service":"Roof Replacement"}'
  'phone-click-rescue|{}'
  'mobile-retention|{}'
)

if [[ -n "$ONLY_SOURCE" ]]; then
  filtered=()
  for row in "${ROWS[@]}"; do
    [[ "${row%%|*}" == "$ONLY_SOURCE" ]] && filtered+=("$row")
  done
  ROWS=("${filtered[@]}")
  if [[ ${#ROWS[@]} -eq 0 ]]; then
    echo "No row matched --source=$ONLY_SOURCE" >&2
    exit 1
  fi
fi

echo "POSTing ${#ROWS[@]} test lead(s) to $ENDPOINT"
echo "Email: $EMAIL  |  Phone: $PHONE"
echo "Sierra will see leads named 'Test Colin <source>'"
echo "----"

PASS=0
FAIL=0
for row in "${ROWS[@]}"; do
  source="${row%%|*}"
  extra="${row#*|}"

  body=$(jq -n \
    --arg name "Test Colin $source" \
    --arg phone "$PHONE" \
    --arg email "$EMAIL" \
    --arg source "$source" \
    --argjson extra "$extra" \
    '{name:$name, phone:$phone, email:$email, source:$source, sms_consent:false} + $extra')

  status=$(curl -s -o /tmp/mdr-form-resp.json -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$body")

  msg=$(jq -r '.message // .error // "(no message)"' /tmp/mdr-form-resp.json 2>/dev/null || echo "(non-json response)")

  if [[ "$status" == "200" ]]; then
    printf '  ✓  %-25s → %s\n' "$source" "$msg"
    PASS=$((PASS+1))
  else
    printf '  ✗  %-25s → HTTP %s — %s\n' "$source" "$status" "$msg"
    FAIL=$((FAIL+1))
  fi

  sleep 1   # spam-filter / AccuLynx rate-limit safety
done

echo "----"
echo "Pass: $PASS   Fail: $FAIL"
echo
echo "Next: open AccuLynx and verify each lead's note has:"
echo "  • Correct source label (or uppercase fallback)"
echo "  • Job priority = Urgent for the 'emergency' lead"
echo "  • GCLID line for lp-* leads"
echo "  • Quiz/financing profile for financing-funnel"
echo "  • Chat context for ai-chatbot"
echo "  • Submission timestamp in ET"

[[ $FAIL -eq 0 ]] || exit 1
