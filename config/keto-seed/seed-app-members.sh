#!/usr/bin/env bash
# seed-app-members.sh — Idempotent: write App:<APP_ID>#members tuples to Keto
# for the seeded demo identities (admin@nova.test, user@nova.test). Without these
# tuples the A1.4 consent gate and the A1.5 per-request rule fail-closed deny
# everyone for the test app. PUT is an upsert — safe to re-run.
#
# Runs INSIDE the compose network (reaches keto:4467 + kratos:4434 by hostname).
set -euo pipefail

KETO_WRITE_URL="${KETO_WRITE_URL:-http://keto:4467}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://kratos:4434}"
APP_ID="${APP_ID:-nova-id-test-app}"
# Emails to grant membership. Space-separated.
MEMBER_EMAILS="${MEMBER_EMAILS:-admin@nova.test user@nova.test}"

echo "[seed-app-members] KETO_WRITE_URL=${KETO_WRITE_URL} APP_ID=${APP_ID}"

IDENTITIES=$(curl -sf "${KRATOS_ADMIN_URL}/admin/identities")
if [ -z "${IDENTITIES}" ] || [ "${IDENTITIES}" = "null" ]; then
  echo "[seed-app-members] ERROR: no response from Kratos admin at ${KRATOS_ADMIN_URL}" >&2
  exit 1
fi

SEEDED=0
FAILED=0
for email in ${MEMBER_EMAILS}; do
  ID=$(printf '%s' "${IDENTITIES}" | jq -r --arg e "${email}" \
    '.[] | select(.traits.email == $e) | .id')
  if [ -z "${ID}" ]; then
    echo "[seed-app-members] WARN: no identity for ${email}; skipping."
    continue
  fi
  SUBJECT="user:${ID}"
  PAYLOAD="{\"namespace\":\"App\",\"object\":\"${APP_ID}\",\"relation\":\"members\",\"subject_id\":\"${SUBJECT}\"}"
  echo -n "[seed-app-members] App:${APP_ID}#members@${SUBJECT} ... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
    -H "Content-Type: application/json" -d "${PAYLOAD}")
  if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "201" ] || [ "${HTTP_CODE}" = "204" ]; then
    echo "OK (HTTP ${HTTP_CODE})"; SEEDED=$((SEEDED + 1))
  else
    echo "FAILED (HTTP ${HTTP_CODE})" >&2; FAILED=$((FAILED + 1))
  fi
done

echo "[seed-app-members] complete: ${SEEDED} seeded, ${FAILED} failed."
[ "${FAILED}" -gt 0 ] && exit 1 || exit 0
