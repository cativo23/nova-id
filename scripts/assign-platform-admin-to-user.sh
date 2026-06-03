#!/bin/bash
# Assign platform_admin role to a user by email.
# Updates Kratos (metadata_public.role, admin-only) and Keto (Platform:nova#admins@user:ID).
# Permissions are computed in OPL (administer/manage_users derive from Platform:nova#admins);
# only the membership tuple is written here — no separate permission-grant step required.
#
# NETWORK: This script must run on the compose network (nova-id-ory-internal) to reach
# the internal Keto and Kratos hostnames. The recommended way is:
#   docker compose run --rm keto-seed sh /scripts/assign-platform-admin-to-user.sh [email]
# OR copy it into the keto-seed container's volume and run from there.
# Keto write/read and Kratos admin ports are NOT exposed to the host by default (zero-trust).
# For host-exposed setups, override the URLs via env vars:
#   KRATOS_ADMIN_URL=http://localhost:4434 \
#   KETO_READ_URL=http://localhost:4466 \
#   KETO_WRITE_URL=http://localhost:4467 \
#   ./scripts/assign-platform-admin-to-user.sh [email]

set -e

EMAIL="${1:-cativo23.kt@gmail.com}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://kratos:4434}"
KETO_READ_URL="${KETO_READ_URL:-http://keto:4466}"
KETO_WRITE_URL="${KETO_WRITE_URL:-http://keto:4467}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Assigning platform_admin role to: $EMAIL"
echo "  Kratos: $KRATOS_ADMIN_URL"
echo "  Keto:   $KETO_READ_URL / $KETO_WRITE_URL"
echo ""

echo "Looking up user..."
IDENTITIES_BODY=$(mktemp)
IDENTITIES_CODE=$(curl -s -o "$IDENTITIES_BODY" -w "%{http_code}" "$KRATOS_ADMIN_URL/admin/identities" 2>/dev/null || echo "000")
IDENTITIES=$(cat "$IDENTITIES_BODY"); rm -f "$IDENTITIES_BODY"
if [ "$IDENTITIES_CODE" = "000" ]; then
  echo -e "${RED}✗ Cannot reach Kratos Admin at $KRATOS_ADMIN_URL${NC}"
  echo "  Cannot reach Kratos at $KRATOS_ADMIN_URL — run this on the compose network (docker compose run) or expose the port."
  exit 1
fi
if [ -z "$IDENTITIES" ] || [ "$IDENTITIES" = "null" ]; then
  echo -e "${RED}✗ Cannot reach Kratos Admin at $KRATOS_ADMIN_URL (HTTP $IDENTITIES_CODE)${NC}"
  echo "  Ensure the service is running and reachable."
  exit 1
fi

USER_JSON=$(echo "$IDENTITIES" | jq -r --arg e "$EMAIL" '.[] | select(.traits.email == $e) | .')
if [ -z "$USER_JSON" ] || [ "$USER_JSON" = "null" ]; then
  echo -e "${RED}✗ No user found with email: $EMAIL${NC}"
  exit 1
fi

USER_ID=$(echo "$USER_JSON" | jq -r '.id')
CURRENT_ROLE=$(echo "$USER_JSON" | jq -r '.metadata_public.role // "platform_user"')
echo -e "${GREEN}✓ Found user: $USER_ID (current role: $CURRENT_ROLE)${NC}"
echo ""

if [ "$CURRENT_ROLE" = "platform_admin" ]; then
  echo "User already has platform_admin. Syncing Keto membership..."
fi

echo "Updating Kratos identity (metadata_public.role -> platform_admin)..."
SCHEMA_ID=$(echo "$USER_JSON" | jq -r '.schema_id')
STATE=$(echo "$USER_JSON" | jq -r '.state')
# role is admin-only: stored in identity metadata_public (writable ONLY via the Admin API),
# never in user-editable traits. Strip any legacy role/rank from traits.
TRAITS=$(echo "$USER_JSON" | jq -c '.traits | del(.role) | del(.rank)')
META_PUBLIC=$(echo "$USER_JSON" | jq -c '(.metadata_public // {}) | . + {"role": "platform_admin"}')
PAYLOAD=$(jq -n -c --arg sid "$SCHEMA_ID" --arg st "$STATE" --argjson tr "$TRAITS" --argjson mp "$META_PUBLIC" \
  '{schema_id: $sid, state: $st, traits: $tr, metadata_public: $mp}')

HTTP=$(curl -s -o /tmp/kratos_update.json -w "%{http_code}" -X PUT \
  "$KRATOS_ADMIN_URL/admin/identities/$USER_ID" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ "$HTTP" != "200" ]; then
  echo -e "${RED}✗ Kratos update failed (HTTP $HTTP)${NC}"
  cat /tmp/kratos_update.json | jq '.' 2>/dev/null || cat /tmp/kratos_update.json
  exit 1
fi
echo -e "${GREEN}✓ Kratos identity updated${NC}"
echo ""

echo "Checking existing Keto Platform:nova#admins membership..."
KETO_READ_BODY=$(mktemp)
KETO_READ_CODE=$(curl -s -o "$KETO_READ_BODY" -w "%{http_code}" "$KETO_READ_URL/relation-tuples?namespace=Platform&object=nova&relation=admins&subject_id=user:$USER_ID" 2>/dev/null || echo "000")
RANKS_JSON=$(cat "$KETO_READ_BODY"); rm -f "$KETO_READ_BODY"
if [ "$KETO_READ_CODE" = "000" ]; then
  echo -e "  ${YELLOW}⚠ Cannot reach Keto Read at $KETO_READ_URL — run this on the compose network (docker compose run) or expose the port.${NC}"
  RANKS_JSON=""
elif [ -z "$RANKS_JSON" ]; then
  echo -e "  ${YELLOW}⚠ Cannot reach Keto Read at $KETO_READ_URL${NC}"
fi

echo "${RANKS_JSON:-{\"relation_tuples\":[]}}" | jq -c '.relation_tuples[]?' 2>/dev/null | while IFS= read -r t; do
  [ -z "$t" ] || [ "$t" = "null" ] && continue
  NAMESPACE=$(echo "$t" | jq -r '.namespace // empty')
  OBJECT=$(echo "$t" | jq -r '.object // empty')
  RELATION=$(echo "$t" | jq -r '.relation // empty')
  SUBJECT=$(echo "$t" | jq -r 'if .subject_id then .subject_id elif .subject_set.subject_id then .subject_set.subject_id else empty end')
  [ -z "$SUBJECT" ] && continue
  ENC_NS=$(printf '%s' "$NAMESPACE" | jq -sRr @uri)
  ENC_OBJ=$(printf '%s' "$OBJECT" | jq -sRr @uri)
  ENC_REL=$(printf '%s' "$RELATION" | jq -sRr @uri)
  ENC_SUB=$(printf '%s' "$SUBJECT" | jq -sRr @uri)
  DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "$KETO_WRITE_URL/admin/relation-tuples?namespace=$ENC_NS&object=$ENC_OBJ&relation=$ENC_REL&subject_id=$ENC_SUB")
  if [ "$DEL_CODE" = "200" ] || [ "$DEL_CODE" = "204" ]; then
    echo "  ✓ Removed from role: $OBJECT"
  fi
done

echo "Writing Platform:nova#admins membership to Keto..."
# OPL: admins relation on Platform:nova grants computed permits administer + manage_users.
# No separate permission-grant step is needed — Keto evaluates these from the OPL policy.
KETO_PUT=$(curl -s -o /tmp/keto_put.txt -w "%{http_code}" -X PUT \
  "$KETO_WRITE_URL/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"Platform\",
    \"object\": \"nova\",
    \"relation\": \"admins\",
    \"subject_id\": \"user:$USER_ID\"
  }")

if [ "$KETO_PUT" = "000" ]; then
  echo -e "${RED}✗ Cannot reach Keto at $KETO_WRITE_URL — run this on the compose network (docker compose run) or expose the port.${NC}"
  exit 1
elif [ "$KETO_PUT" != "200" ] && [ "$KETO_PUT" != "201" ] && [ "$KETO_PUT" != "204" ]; then
  echo -e "${RED}✗ Keto write failed (HTTP $KETO_PUT)${NC}"
  cat /tmp/keto_put.txt 2>/dev/null
  exit 1
fi
echo -e "${GREEN}✓ User added to Platform:nova#admins in Keto${NC}"
echo ""

echo -e "${GREEN}✓ Done. $EMAIL now has platform_admin (Platform:nova#admins).${NC}"
echo ""
echo "OPL-computed permits: administer, manage_users."
echo ""
