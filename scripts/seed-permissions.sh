#!/usr/bin/env bash
# seed-permissions.sh — Idempotent bootstrap: write Platform:nova#admins tuples to Keto
# for every Kratos identity whose metadata_public.role == "platform_admin".
#
# DESIGN INTENT:
#   - This script is meant to run INSIDE the Docker Compose network (nova-id-ory-internal)
#     so it can reach keto:4467 (write) and kratos:4434 (admin) by container hostname.
#   - It is invoked automatically by the keto-seed compose service on every `docker compose up`.
#   - For manual runs from the host, override the URLs via env vars:
#       KETO_WRITE_URL=http://localhost:4467 \
#       KRATOS_ADMIN_URL=http://localhost:4434 \
#       docker compose run --rm keto-seed
#     NOTE: The host ports are NOT exposed by default (zero-trust). Use this form only when
#     temporarily exposing ports for debugging, or use `docker compose run` which joins the network.
#
# SOURCE OF TRUTH:
#   - Keto is the authoritative permission store. Once a tuple is written here, Keto is the
#     source of truth — not Kratos metadata.
#   - metadata_public.role == "platform_admin" is ONLY used for bootstrapping the initial seed.
#     The BFF app-onboarding Action (A1) writes App:<appId>#members / #admins tuples directly
#     to Keto without relying on Kratos metadata.
#   - PUT is idempotent (upsert) — safe to re-run any number of times.
set -euo pipefail

KETO_WRITE_URL="${KETO_WRITE_URL:-http://keto:4467}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://kratos:4434}"

echo "[seed-permissions] KETO_WRITE_URL=${KETO_WRITE_URL}"
echo "[seed-permissions] KRATOS_ADMIN_URL=${KRATOS_ADMIN_URL}"
echo ""

# Fetch all Kratos identities
echo "[seed-permissions] Fetching Kratos identities..."
IDENTITIES=$(curl -sf "${KRATOS_ADMIN_URL}/admin/identities")

if [ -z "${IDENTITIES}" ] || [ "${IDENTITIES}" = "null" ]; then
  echo "[seed-permissions] ERROR: No response from Kratos admin API at ${KRATOS_ADMIN_URL}" >&2
  exit 1
fi

# Extract IDs of identities where metadata_public.role == "platform_admin"
# NOTE: The identity schema does NOT allow role in traits (additionalProperties: false).
#       Admin role is stored in metadata_public (writable only via the Admin API), never traits.
ADMIN_IDS=$(printf '%s' "${IDENTITIES}" | \
  jq -r '.[] | select(.metadata_public.role == "platform_admin") | .id')

if [ -z "${ADMIN_IDS}" ]; then
  echo "[seed-permissions] No identities with metadata_public.role=platform_admin found. Nothing to seed."
  exit 0
fi

echo "[seed-permissions] Found platform_admin identities:"
printf '%s\n' "${ADMIN_IDS}" | while IFS= read -r id; do
  echo "  - ${id}"
done
echo ""

SEEDED=0
FAILED=0

printf '%s\n' "${ADMIN_IDS}" | while IFS= read -r id; do
  SUBJECT="user:${id}"
  PAYLOAD="{\"namespace\":\"Platform\",\"object\":\"nova\",\"relation\":\"admins\",\"subject_id\":\"${SUBJECT}\"}"

  echo -n "[seed-permissions] Writing Platform:nova#admins@${SUBJECT} ... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}")

  if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "201" ] || [ "${HTTP_CODE}" = "204" ]; then
    echo "OK (HTTP ${HTTP_CODE})"
    SEEDED=$((SEEDED + 1))
  else
    echo "FAILED (HTTP ${HTTP_CODE})" >&2
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "[seed-permissions] Done."
