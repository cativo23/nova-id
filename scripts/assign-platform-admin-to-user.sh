#!/bin/bash
# Assign platform_admin role to a user by email.
# Updates Kratos (metadata_public.role, admin-only) and Keto (ranks:platform_admin#member@user:ID).
#
# Prerequisites:
#   - Run ./scripts/setup-all-permissions.sh first (grants permissions to platform_admin).
#   - Kratos Admin and Keto Read/Write must be reachable. If using Zero Trust
#     (ports not exposed), temporarily uncomment in docker-compose.yml:
#       - "4434:4434" under kratos
#       - "4466:4466" and "4467:4467" under keto
#     Then: docker compose up -d && ./scripts/assign-platform-admin-to-user.sh [email]

set -e

EMAIL="${1:-cativo23.kt@gmail.com}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://localhost:4434}"
KETO_READ_URL="${KETO_READ_URL:-http://localhost:4466}"
KETO_WRITE_URL="${KETO_WRITE_URL:-http://localhost:4467}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Assigning platform_admin role to: $EMAIL"
echo "  Kratos: $KRATOS_ADMIN_URL"
echo "  Keto:   $KETO_READ_URL / $KETO_WRITE_URL"
echo ""

echo "Looking up user..."
IDENTITIES=$(curl -sf "$KRATOS_ADMIN_URL/admin/identities" 2>/dev/null || true)
if [ -z "$IDENTITIES" ] || [ "$IDENTITIES" = "null" ]; then
  echo -e "${RED}✗ Cannot reach Kratos Admin at $KRATOS_ADMIN_URL${NC}"
  echo "  Ensure the service is running and the port is exposed."
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

echo "Checking Keto role membership..."
RANKS_JSON=$(curl -sf "$KETO_READ_URL/relation-tuples?namespace=ranks&subject_id=user:$USER_ID" 2>/dev/null || true)
if [ -z "$RANKS_JSON" ]; then
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

echo "Adding platform_admin role membership in Keto..."
KETO_PUT=$(curl -s -o /tmp/keto_put.txt -w "%{http_code}" -X PUT \
  "$KETO_WRITE_URL/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"ranks\",
    \"object\": \"platform_admin\",
    \"relation\": \"member\",
    \"subject_id\": \"user:$USER_ID\"
  }")

if [ "$KETO_PUT" != "200" ] && [ "$KETO_PUT" != "201" ] && [ "$KETO_PUT" != "204" ]; then
  echo -e "${RED}✗ Keto write failed (HTTP $KETO_PUT)${NC}"
  cat /tmp/keto_put.txt 2>/dev/null
  exit 1
fi
echo -e "${GREEN}✓ User assigned to platform_admin in Keto${NC}"
echo ""

echo -e "${GREEN}✓ Done. $EMAIL now has platform_admin and its permissions.${NC}"
echo ""
echo "platform_admin includes: view_users, add_users, edit_users, delete_users,"
echo "change_permissions, manage_permissions, admin panel access."
echo ""
